const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const verificarToken = async (req, res, next) => {
  const auth = req.headers.authorization;

  // 🔒 Verificar si viene el token
  if (!auth) {
    return res.status(401).json({ mensaje: "Token requerido" });
  }

  const token = auth.split(" ")[1];

  try {
    // Verificar token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secreto"
    );

    // Buscar usuario en DB
    const result = await pool.query(
      "SELECT token_actual FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mensaje: "Usuario no existe" });
    }

    // Validar sesión activa (evita múltiples logins)
    if (result.rows[0].token_actual !== token) {
      return res.status(403).json({ mensaje: "Sesión inválida" });
    }

    // Guardar usuario en request
    req.usuario = decoded;

    next();

  } catch (error) {
    return res.status(403).json({ mensaje: "Token inválido" });
  }
};

module.exports = verificarToken;