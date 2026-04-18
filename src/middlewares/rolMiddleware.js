const verificarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {

    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "No autenticado"
      });
    }

    const rol = req.usuario.rol;

    if (!rol) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario sin rol asignado. Contacta al administrador"
      });
    }

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