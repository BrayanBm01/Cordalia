const verificarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {

    // autenticación
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "No autenticado"
      });
    }

    const rol = req.usuario.rol;

    // BLOQUEO CLAVE: usuario sin rol
    if (!rol) {
      return res.status(403).json({
        ok: false,
        mensaje: "Acceso denegado: usuario sin rol"
      });
    }

    // rol no permitido
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