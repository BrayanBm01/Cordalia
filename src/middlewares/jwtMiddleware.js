const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const verificarToken = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    // 🔒 validar header
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ mensaje: "Token requerido" });
    }

    const token = auth.split(" ")[1];

    // 🔐 verificar JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔍 buscar usuario
    const result = await pool.query(
      "SELECT id, rol_id, token_activo FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mensaje: "Usuario no existe" });
    }

    const usuario = result.rows[0];

    // 🔥 sesión única
    if (usuario.token_activo !== token) {
      return res.status(403).json({
        mensaje: "Sesión cerrada desde otro dispositivo"
      });
    }

    // 👤 usuario disponible en rutas
    req.usuario = {
      id: usuario.id,
      rol: usuario.rol_id
    };

    next();

  } catch (error) {
    return res.status(401).json({ mensaje: "Token inválido" });
  }
};

module.exports = verificarToken;