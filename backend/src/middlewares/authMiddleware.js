const { verificarToken } = require("../utils/jwt");
const UsuarioModel = require("../models/usuarioModel");

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Token requerido" });
    }

    const token = auth.split(" ")[1];
    let decoded;
    try {
      decoded = verificarToken(token);
    } catch (err) {
      const msg = err.name === "TokenExpiredError" ? "Token expirado" : "Token inválido";
      return res.status(401).json({ success: false, message: msg });
    }

    if (!decoded.id) {
      return res.status(401).json({ success: false, message: "Token mal formado" });
    }

    const usuario = await UsuarioModel.findById(decoded.id);
    if (!usuario) {
      return res.status(401).json({ success: false, message: "Usuario no existe" });
    }

    const fullUser = await pool_findToken(decoded.id);
    if (!fullUser || fullUser.token_activo !== token) {
      return res.status(401).json({ success: false, message: "Sesión cerrada desde otro dispositivo" });
    }

    if (fullUser.rol_id === null) {
      return res.status(401).json({ success: false, message: "Usuario sin rol asignado" });
    }

    const rol = Number(fullUser.rol_id) === 0 ? "ADMIN" : Number(fullUser.rol_id) === 2 ? "BUSINESS" : "TOURIST";
    req.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol };
    next();
  } catch (error) {
    console.error("Error en requireAuth:", error);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
}

async function pool_findToken(id) {
  const pool = require("../config/db");
  const { rows } = await pool.query(
    "SELECT id, token_activo, rol_id FROM usuarios WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

module.exports = requireAuth;
