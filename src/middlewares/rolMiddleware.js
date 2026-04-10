const jwt = require("jsonwebtoken");

const verificarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({
        ok: false,
        mensaje: "No autorizado"
      });
    }

    const token = auth.split(" ")[1];

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "secreto"
      );

      const rol = decoded.rol; // AQUÍ ESTÁ LA CLAVE

      // VALIDAR ROL
      if (!rolesPermitidos.includes(rol)) {
        return res.status(403).json({
          ok: false,
          mensaje: "No tienes permisos"
        });
      }

      req.usuario = decoded;
      next();

    } catch (error) {
      return res.status(401).json({
        ok: false,
        mensaje: "Token inválido"
      });
    }
  };
};

module.exports = verificarRol;