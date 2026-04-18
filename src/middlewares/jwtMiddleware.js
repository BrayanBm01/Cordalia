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

    // BLOQUEO CLAVE: usuario sin rol
    if (usuario.rol_id === null) {
      return res.status(403).json({
        ok: false,
        mensaje: "Acceso denegado: usuario sin rol"
      });
    }

    // mapear rol correctamente
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

    // guardar en request
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