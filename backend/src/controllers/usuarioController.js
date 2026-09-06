const UsuarioModel = require("../models/usuarioModel");
const { hashPassword } = require("../utils/password");
const { isEmail, isNonEmptyString, sanitizeString } = require("../utils/validators");

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
    let { nombre, email, password, rol_id } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: "Nombre, email y contraseña son obligatorios" });
    }

    nombre = sanitizeString(nombre);
    email = sanitizeString(email).toLowerCase();
    password = sanitizeString(password);

    if (!isNonEmptyString(nombre, 2, 100)) {
      return res.status(400).json({ success: false, message: "Nombre inválido" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: "Email inválido" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existe = await UsuarioModel.findByEmail(email);
    if (existe) {
      return res.status(409).json({ success: false, message: "El email ya está registrado" });
    }

    const rolesValidos = [0, 1, 2];
    const rolNum = Number(rol_id);
    const rolFinal = rolesValidos.includes(rolNum) ? rolNum : 1;
    const hashed = await hashPassword(password);
    const usuario = await UsuarioModel.create(nombre, email, hashed, rolFinal);

    return res.status(201).json({
      success: true,
      message: "Usuario creado correctamente",
      data: usuario,
    });
  } catch (error) {
    console.error("Error create usuario:", error);
    return res.status(500).json({ success: false, message: "Error al crear usuario" });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let { nombre, email, password, rol_id } = req.body;

    const fields = {};

    if (nombre) {
      nombre = sanitizeString(nombre);
      if (!isNonEmptyString(nombre, 2, 100)) {
        return res.status(400).json({ success: false, message: "Nombre inválido" });
      }
      fields.nombre = nombre;
    }

    if (email) {
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

    if (password && sanitizeString(password).length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: "La contraseña debe tener al menos 6 caracteres" });
      }
      fields.password = await hashPassword(sanitizeString(password));
    }

    if (rol_id !== undefined && req.usuario.rol === "ADMIN") {
      const rolNum = Number(rol_id);
      fields.rol_id = [0, 1, 2].includes(rolNum) ? rolNum : 1;
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
    console.error("Error update usuario:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar usuario" });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await UsuarioModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }
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
