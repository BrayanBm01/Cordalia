const verificarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {

    // No autenticado
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "No autenticado"
      });
    }

    const rol = req.usuario.rol;

    // Usuario sin rol asignado
    if (!rol) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario sin rol asignado. Contacta al administrador"
      });
    }

    // Rol no autorizado
    if (!rolesPermitidos.includes(rol)) {
      return res.status(401).json({
        ok: false,
        mensaje: "No autorizado para acceder a este recurso"
      });
    }

    next();
  };
};

module.exports = verificarRol;