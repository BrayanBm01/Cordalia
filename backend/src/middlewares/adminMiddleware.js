function requireAdmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ success: false, message: "No autenticado" });
  }
  if (req.usuario.rol !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Se requieren permisos de administrador" });
  }
  next();
}

module.exports = requireAdmin;
