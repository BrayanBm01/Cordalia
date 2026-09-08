const express = require("express");
const planController = require("../controllers/planController");
const requireAuth = require("../middlewares/authMiddleware");
const { optionalAuth } = require("../middlewares/authMiddleware");
const {
  loadVisibleBusiness,
  requireOwnedBusiness,
} = require("../middlewares/businessMiddleware");

// ---------------------------------------------------------------
// Router público: montado en /api/planes
// Listado y detalle accesibles sin sesión (solo planes activos de
// negocios aprobados). El precio es SOLO informativo.
// ---------------------------------------------------------------
const publicRouter = express.Router();

publicRouter.get("/", optionalAuth, planController.list);
publicRouter.get("/:planId", optionalAuth, planController.getById);

// ---------------------------------------------------------------
// Router de negocio: montado en /api/businesses/:id/planes
// Lectura visible según rol (turista solo activos; dueño todo).
// Escritura solo dueño del negocio o admin.
// ---------------------------------------------------------------
const businessRouter = express.Router({ mergeParams: true });

businessRouter.get("/", optionalAuth, loadVisibleBusiness, planController.list);
businessRouter.get("/:planId", optionalAuth, loadVisibleBusiness, planController.getById);

businessRouter.use(requireAuth);

businessRouter.post("/", requireOwnedBusiness, planController.create);
businessRouter.put("/:planId", requireOwnedBusiness, planController.update);
businessRouter.delete("/:planId", requireOwnedBusiness, planController.remove);
businessRouter.put("/:planId/estado", requireOwnedBusiness, planController.setEstado);

// Imágenes del plan
businessRouter.post("/:planId/imagenes", requireOwnedBusiness, planController.addImage);
businessRouter.put("/:planId/imagenes/:imageId/principal", requireOwnedBusiness, planController.setPrimaryImage);
businessRouter.delete("/:planId/imagenes/:imageId", requireOwnedBusiness, planController.deleteImage);

module.exports = { publicRouter, businessRouter };