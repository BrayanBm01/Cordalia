const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const verificarToken = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, mensaje: "Token requerido" });
    }

    const token = auth.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ ok: false, mensaje: "Token expirado" });
      }
      return res.status(401).json({ ok: false, mensaje: "Token inválido" });
    }

    if (!decoded.id) {
      return res.status(401).json({ ok: false, mensaje: "Token mal formado" });
    }

    const result = await pool.query(
      "SELECT id, rol_id, token_activo FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, mensaje: "Usuario no existe" });
    }

    const usuario = result.rows[0];

    // sesión revocada
    if (usuario.token_activo !== token) {
      return res.status(401).json({
        ok: false,
        code: "SESSION_REVOKED",
        mensaje: "Sesión cerrada desde otro dispositivo"
      });
    }

    // usuario sin rol → bloquear aquí
    if (usuario.rol_id === null) {
      return res.status(403).json({
        ok: false,
        mensaje: "Usuario sin rol asignado"
      });
    }

    let rolNombre;
    if (usuario.rol_id === 0) {
      rolNombre = "ADMIN";
    } else if (usuario.rol_id === 1) {
      rolNombre = "USER";
    } else {
      return res.status(403).json({
        ok: false,
        mensaje: "Rol inválido"
      });
    }

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