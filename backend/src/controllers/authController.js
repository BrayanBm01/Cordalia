const UsuarioModel = require("../models/usuarioModel");
const LoginModel = require("../models/loginModel");
const { hashPassword, comparePassword } = require("../utils/password");
const { generarToken } = require("../utils/jwt");
const { isEmail, isNonEmptyString, sanitizeString } = require("../utils/validators");

const ROLES = { ADMIN: 0, USER: 1 };

function mapRolId(rol_id) {
  if (rol_id === 0 || rol_id === "0") return "ADMIN";
  return "USER";
}

exports.register = async (req, res) => {
  try {
    let { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: "Todos los campos son obligatorios" });
    }

    nombre = sanitizeString(nombre);
    email = sanitizeString(email).toLowerCase();
    password = sanitizeString(password);

    if (!isNonEmptyString(nombre, 2, 100)) {
      return res.status(400).json({ success: false, message: "Nombre debe tener entre 2 y 100 caracteres" });
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

    const hashed = await hashPassword(password);
    const usuario = await UsuarioModel.create(nombre, email, hashed, ROLES.USER);

    return res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente",
      data: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: "USER" },
    });
  } catch (error) {
    console.error("Error en register:", error);
    return res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email y contraseña son obligatorios" });
    }

    email = sanitizeString(email).toLowerCase();
    password = sanitizeString(password);

    const usuario = await UsuarioModel.findByEmail(email);
    if (!usuario) {
      return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }

    const coincide = await comparePassword(password, usuario.password);
    if (!coincide) {
      await LoginModel.registrar(usuario.id, false);
      return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }

    if (usuario.token_activo) {
      return res.status(403).json({ success: false, message: "Ya hay una sesión activa" });
    }

    if (usuario.rol_id === null || usuario.rol_id === undefined) {
      return res.status(401).json({ success: false, message: "Usuario sin rol asignado" });
    }

    const rolNombre = mapRolId(usuario.rol_id);
    const token = generarToken(usuario.id, rolNombre);

    await UsuarioModel.setToken(usuario.id, token);
    await LoginModel.registrar(usuario.id, true);

    return res.status(200).json({
      success: true,
      message: "Login exitoso",
      data: {
        token,
        usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: rolNombre },
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

exports.logout = async (req, res) => {
  try {
    await UsuarioModel.clearToken(req.usuario.id);
    return res.json({ success: true, message: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error("Error en logout:", error);
    return res.status(500).json({ success: false, message: "Error al cerrar sesión" });
  }
};

exports.me = async (req, res) => {
  try {
    const usuario = await UsuarioModel.findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }
    return res.json({
      success: true,
      data: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: req.usuario.rol },
    });
  } catch (error) {
    console.error("Error en me:", error);
    return res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const id = req.usuario.id;

    let { nombre, email, password } = req.body;
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

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }

    const updated = await UsuarioModel.update(id, fields);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    return res.json({ success: true, message: "Perfil actualizado", data: updated });
  } catch (error) {
    console.error("Error en updateProfile:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar" });
  }
};
