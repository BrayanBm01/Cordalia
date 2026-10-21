const express = require("express");
const promotionController = require("../controllers/promotionController");
const requireAuth = require("../middlewares/authMiddleware");
const { optionalAuth } = require("../middlewares/authMiddleware");
const { requireVendorActive } = require("../middlewares/vendorMiddleware");
const {
  loadVisibleBusiness,
  requireOwnedBusiness,
} = require("../middlewares/businessMiddleware");

// ---------------------------------------------------------------
// Router de negocio: montado en /api/businesses/:id/promociones
// Lectura visible según rol; escritura solo dueño o admin.
// Las promociones son informativas: no hay cobro ni checkout.
// ---------------------------------------------------------------
const businessRouter = express.Router({ mergeParams: true });

businessRouter.get("/", optionalAuth, loadVisibleBusiness, promotionController.list);
businessRouter.get("/:promoId", optionalAuth, loadVisibleBusiness, promotionController.getById);

businessRouter.use(requireAuth);

businessRouter.post("/", requireOwnedBusiness, requireVendorActive, promotionController.create);
businessRouter.put("/:promoId", requireOwnedBusiness, requireVendorActive, promotionController.update);
businessRouter.delete("/:promoId", requireOwnedBusiness, requireVendorActive, promotionController.remove);
businessRouter.put("/:promoId/estado", requireOwnedBusiness, requireVendorActive, promotionController.setEstado);

module.exports = { businessRouter };