const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const verificarToken = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    // validar header
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, mensaje: "Token requerido" });
    }

    const token = auth.split(" ")[1];

    // verificar JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ ok: false, mensaje: "Token expirado" });
      }
      return res.status(401).json({ ok: false, mensaje: "Token inválido" });
    }

    // validar payload
    if (!decoded.id) {
      return res.status(401).json({ ok: false, mensaje: "Token mal formado" });
    }

    // buscar usuario en DB
    const result = await pool.query(
      "SELECT id, rol_id, token_activo FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, mensaje: "Usuario no existe" });
    }

    const usuario = result.rows[0];

    // validar sesión única
    if (usuario.token_activo !== token) {
      return res.status(401).json({
        ok: false,
        mensaje: "Sesión cerrada desde otro dispositivo"
      });
    }

    // mapear rol (0 = ADMIN, 1 = USER)
    let rolNombre = "USER";
    if (usuario.rol_id === 0) {
      rolNombre = "ADMIN";
    }

    // guardar usuario en request
    req.usuario = {
      id: usuario.id,
      rol: rolNombre
    };

    next();

  } catch (error) {
    console.error("Error en verificarToken:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
};

module.exports = verificarToken;