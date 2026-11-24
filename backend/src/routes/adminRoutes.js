const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const businessController = require("../controllers/businessController");
const BusinessModel = require("../models/businessModel");
const requireAuth = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/adminMiddleware");

router.use(requireAuth);
router.use(requireAdmin);

router.get("/stats", adminController.stats);
router.get("/login-history", adminController.loginHistory);

// Gestión comercial de los vendedores (prueba, suscripción, suspensión).
router.get("/vendedores", adminController.vendedores);
router.put("/vendedores/:id/estado", adminController.setVendedorEstado);

// ------------------------------------------------------------
// CRUD administrativo de negocios.
// `requireAuth` + `requireAdmin` (arriba) garantizan 401/403 incluso si
// un cliente manipula la petición HTTP. `loadAdminBusiness` carga también
// los negocios archivados para que el ADMIN pueda inspeccionarlos/restaurarlos.
// ------------------------------------------------------------
async function loadAdminBusiness(req, res, next) {
  try {
    const negocio = await BusinessModel.findById(req.params.id, true);
    if (!negocio) {
      return res.status(404).json({ success: false, message: "Negocio no encontrado" });
    }
    req.business = negocio;
    return next();
  } catch (error) {
    return next(error);
  }
}

router.get("/negocios", businessController.adminList);
router.post("/negocios", businessController.adminCreate);
router.get("/negocios/:id", businessController.adminGetById);
router.put("/negocios/:id", loadAdminBusiness, businessController.adminUpdate);
router.put("/negocios/:id/estado", businessController.adminSetEstado);
router.delete("/negocios/:id", businessController.adminRemove);
router.post("/negocios/:id/restaurar", businessController.adminRestore);

module.exports = router;
