const BusinessModel = require("../models/businessModel");

function requireBusinessRole(req, res, next) {
  if (!req.usuario || !["ADMIN", "BUSINESS"].includes(req.usuario.rol)) {
    return res.status(403).json({
      success: false,
      message: "Se requieren permisos de negocio",
    });
  }
  next();
}

async function loadVisibleBusiness(req, res, next) {
  try {
    const business = await BusinessModel.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Negocio no encontrado" });
    }
    // Sin sesión se trata como TOURIST: solo negocios aprobados son visibles.
    const rol = req.usuario?.rol || "TOURIST";
    const userId = req.usuario?.id;
    const visible =
      rol === "ADMIN" ||
      (rol === "BUSINESS" && business.owner_id === userId) ||
      business.estado === "approved";
    if (!visible) {
      return res.status(404).json({ success: false, message: "Negocio no encontrado" });
    }
    req.business = business;
    next();
  } catch (error) {
    next(error);
  }
}

async function requireOwnedBusiness(req, res, next) {
  try {
    const business = await BusinessModel.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Negocio no encontrado" });
    }
    if (req.usuario.rol !== "ADMIN" && business.owner_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos sobre este negocio",
      });
    }
    req.business = business;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireBusinessRole, loadVisibleBusiness, requireOwnedBusiness };