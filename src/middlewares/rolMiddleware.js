const verificarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {

    // 🔒 debe venir del jwtMiddleware
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "No autenticado"
      });
    }

    const rol = req.usuario.rol;

    // 🔍 validar rol
    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permisos"
      });
    }

    next();
  };
};

module.exports = verificarRol;