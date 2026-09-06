const express = require("express");
const router = express.Router();
const businessController = require("../controllers/businessController");
const requireAuth = require("../middlewares/authMiddleware");
const { optionalAuth } = requireAuth;
const requireAdmin = require("../middlewares/adminMiddleware");
const {
  requireBusinessRole,
  loadVisibleBusiness,
  requireOwnedBusiness,
} = require("../middlewares/businessMiddleware");

// Destinos del negocio: GET es de solo lectura y funciona sin sesión
// (visibilidad según rol aplicado por loadVisibleBusiness). Se registra antes
// de requireAuth para que un visitante anónimo pueda consultarlo.
router.get("/:id/destinos", optionalAuth, loadVisibleBusiness, businessController.getDestinos);

router.use(requireAuth);

router.get("/categories", businessController.getCategories);
router.get("/", businessController.list);
router.get("/:id", loadVisibleBusiness, businessController.getById);

router.post("/", requireBusinessRole, businessController.create);
router.put("/:id", requireOwnedBusiness, businessController.update);
router.delete("/:id", requireOwnedBusiness, businessController.remove);
router.put("/:id/estado", requireAdmin, businessController.setEstado);

// Asociar/retirar destino (1:N → cada negocio pertenece a un destino)
router.put("/:id/destino", requireOwnedBusiness, businessController.setDestino);

// Imágenes
router.get("/:id/imagenes", loadVisibleBusiness, businessController.listImages);
router.post("/:id/imagenes", requireOwnedBusiness, businessController.addImage);
router.put("/:id/imagenes/:imageId/principal", requireOwnedBusiness, businessController.setPrimaryImage);
router.put("/:id/imagenes/:imageId", requireOwnedBusiness, businessController.updateImage);
router.delete("/:id/imagenes/:imageId", requireOwnedBusiness, businessController.deleteImage);

// Servicios
router.get("/:id/servicios", loadVisibleBusiness, businessController.listServices);
router.post("/:id/servicios", requireOwnedBusiness, businessController.addService);
router.put("/:id/servicios/:serviceId", requireOwnedBusiness, businessController.updateService);
router.delete("/:id/servicios/:serviceId", requireOwnedBusiness, businessController.deleteService);

// Horarios
router.get("/:id/horarios", loadVisibleBusiness, businessController.listHours);
router.post("/:id/horarios", requireOwnedBusiness, businessController.addHour);
router.put("/:id/horarios/:hourId", requireOwnedBusiness, businessController.updateHour);
router.delete("/:id/horarios/:hourId", requireOwnedBusiness, businessController.deleteHour);

// Redes sociales
router.get("/:id/redes", loadVisibleBusiness, businessController.listSocialLinks);
router.post("/:id/redes", requireOwnedBusiness, businessController.addSocialLink);
router.put("/:id/redes/:linkId", requireOwnedBusiness, businessController.updateSocialLink);
router.delete("/:id/redes/:linkId", requireOwnedBusiness, businessController.deleteSocialLink);

module.exports = router;