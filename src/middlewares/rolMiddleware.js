const verificarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {

    // 🔥 YA NO leemos el token aquí
    // El jwtMiddleware ya lo hizo antes

    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "No autenticado"
      });
    }

    const { rol } = req.usuario;

    // 🔥 Validar rol (permite múltiples roles)
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