const UsuarioModel = require("../models/usuarioModel");
const SuscripcionModel = require("../models/suscripcionModel");
const { hashPassword } = require("../utils/password");
const {
  isEmail,
  isValidPersonName,
  validatePassword,
  parseInteger,
  sanitizeString,
} = require("../utils/validators");

exports.getAll = async (req, res) => {
  try {
    const usuarios = await UsuarioModel.findAllWithSessionStatus();
    return res.json({ success: true, data: usuarios });
  } catch (error) {
    console.error("Error getAll usuarios:", error);
    return res.status(500).json({ success: false, message: "Error al obtener usuarios" });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await UsuarioModel.findById(id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }
    return res.json({ success: true, data: usuario });
  } catch (error) {
    console.error("Error getById usuario:", error);
    return res.status(500).json({ success: false, message: "Error al obtener usuario" });
  }
};

exports.create = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    let { nombre, email, password } = body;
    const { rol_id } = body;

    if (typeof nombre !== "string" || typeof email !== "string" || !password) {
      return res.status(400).json({ success: false, message: "Nombre, email y contraseña son obligatorios" });
    }

    nombre = sanitizeString(nombre);
    email = sanitizeString(email).toLowerCase();

    if (!isValidPersonName(nombre)) {
      return res.status(400).json({
        success: false,
        message:
          "Nombre inválido: usa solo letras, tildes, ñ, espacios, guiones o apóstrofos (2 a 100 caracteres)",
      });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: "Email inválido" });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    let rolFinal = 1;
    if (rol_id !== undefined && rol_id !== null && rol_id !== "") {
      const rolNum = parseInteger(rol_id, { min: 0, max: 2 });
      if (rolNum === null) {
        return res.status(400).json({ success: false, message: "Rol inválido" });
      }
      rolFinal = rolNum;
    }

    const existe = await UsuarioModel.findByEmail(email);
    if (existe) {
      return res.status(409).json({ success: false, message: "El email ya está registrado" });
    }

    // La contrasena se usa exactamente como se ingreso (sin recortar).
    const hashed = await hashPassword(password);
    const usuario = await UsuarioModel.create(nombre, email, hashed, rolFinal);

    // Vendedor nuevo -> prueba gratuita de 7 dias (misma regla que el
    // registro publico). Se asigna una sola vez y no se reinicia.
    if (rolFinal === 2) {
      await SuscripcionModel.asignarPruebaGratuita(usuario.id);
    }

    return res.status(201).json({
      success: true,
      message: "Usuario creado correctamente",
      data: usuario,
    });
  } catch (error) {
    if (error && error.code === "23505") {
      return res.status(409).json({ success: false, message: "El email ya está registrado" });
    }
    console.error("Error create usuario:", error);
    return res.status(500).json({ success: false, message: "Error al crear usuario" });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body && typeof req.body === "object" ? req.body : {};
    let { nombre, email, password } = body;
    const { rol_id } = body;

    const fields = {};

    if (nombre !== undefined) {
      if (typeof nombre !== "string" || !isValidPersonName(nombre)) {
        return res.status(400).json({
          success: false,
          message:
            "Nombre inválido: usa solo letras, tildes, ñ, espacios, guiones o apóstrofos (2 a 100 caracteres)",
        });
      }
      fields.nombre = sanitizeString(nombre);
    }

    if (email !== undefined) {
      if (typeof email !== "string") {
        return res.status(400).json({ success: false, message: "Email inválido" });
      }
      email = sanitizeString(email).toLowerCase();
      if (!isEmail(email)) {
        return res.status(400).json({ success: false, message: "Email inválido" });
      }
      const existing = await UsuarioModel.findByEmail(email);
      if (existing && existing.id != id) {
        return res.status(409).json({ success: false, message: "El email ya está en uso" });
      }
      fields.email = email;
    }

    if (password !== undefined && password !== null && password !== "") {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
      }
      // Sin recortar espacios: se guarda exactamente lo ingresado.
      fields.password = await hashPassword(password);
    }

    if (rol_id !== undefined && req.usuario.rol === "ADMIN") {
      const rolFinal = parseInteger(rol_id, { min: 0, max: 2 });
      if (rolFinal === null) {
        return res.status(400).json({ success: false, message: "Rol inválido" });
      }
      if (rolFinal !== 0) {
        const target = await UsuarioModel.findById(id);
        if (target && target.rol_id === 0) {
          const admins = await UsuarioModel.countAdmins();
          if (admins <= 1) {
            return res.status(403).json({
              success: false,
              message: "No se puede quitar el rol de administrador al último administrador",
            });
          }
        }
      }
      fields.rol_id = rolFinal;
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }

    const updated = await UsuarioModel.update(id, fields);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    return res.json({ success: true, message: "Usuario actualizado", data: updated });
  } catch (error) {
    if (error && error.code === "23505") {
      return res.status(409).json({ success: false, message: "El email ya está en uso" });
    }
    console.error("Error update usuario:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar usuario" });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await UsuarioModel.findById(id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    if (usuario.rol_id === 0) {
      if (Number(id) === req.usuario.id) {
        return res.status(403).json({
          success: false,
          message: "Un administrador no puede eliminarse a sí mismo",
        });
      }
      const admins = await UsuarioModel.countAdmins();
      if (admins <= 1) {
        return res.status(403).json({
          success: false,
          message: "No se puede eliminar al último administrador",
        });
      }
    }

    const deleted = await UsuarioModel.delete(id);
    return res.json({ success: true, message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error remove usuario:", error);
    return res.status(500).json({ success: false, message: "Error al eliminar usuario" });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await UsuarioModel.findById(id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    const revoked = await UsuarioModel.revokeSession(id);
    if (!revoked) {
      return res.status(400).json({ success: false, message: "La sesión ya estaba cerrada" });
    }

    return res.json({ success: true, message: "Sesión revocada correctamente" });
  } catch (error) {
    console.error("Error revokeSession:", error);
    return res.status(500).json({ success: false, message: "Error al revocar la sesión" });
  }
};
