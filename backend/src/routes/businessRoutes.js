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

// Planes turísticos y promociones: lectura pública visible (solo activos de
// negocios aprobados). La escritura se protege dentro de cada submódulo.
router.use("/:id/planes", require("./planRoutes").businessRouter);
router.use("/:id/promociones", require("./promotionRoutes").businessRouter);

// Lectura pública de negocios: listado y detalle de un negocio.
// Sin sesión se trata como TOURIST (solo negocios aprobados son visibles).
router.get("/categories", businessController.getCategories);
router.get("/", optionalAuth, businessController.list);
router.get("/:id", optionalAuth, loadVisibleBusiness, businessController.getById);

// Imágenes, servicios, horarios y redes: lectura pública visible.
router.get("/:id/imagenes", optionalAuth, loadVisibleBusiness, businessController.listImages);
router.get("/:id/servicios", optionalAuth, loadVisibleBusiness, businessController.listServices);
router.get("/:id/horarios", optionalAuth, loadVisibleBusiness, businessController.listHours);
router.get("/:id/redes", optionalAuth, loadVisibleBusiness, businessController.listSocialLinks);

router.use(requireAuth);

router.post("/", requireBusinessRole, businessController.create);
router.put("/:id", requireOwnedBusiness, businessController.update);
router.delete("/:id", requireOwnedBusiness, businessController.remove);
router.put("/:id/estado", requireAdmin, businessController.setEstado);

// Asociar/retirar destino (1:N → cada negocio pertenece a un destino)
router.put("/:id/destino", requireOwnedBusiness, businessController.setDestino);

// Imágenes (escritura protegida; lectura pública arriba)
router.post("/:id/imagenes", requireOwnedBusiness, businessController.addImage);
router.put("/:id/imagenes/:imageId/principal", requireOwnedBusiness, businessController.setPrimaryImage);
router.put("/:id/imagenes/:imageId", requireOwnedBusiness, businessController.updateImage);
router.delete("/:id/imagenes/:imageId", requireOwnedBusiness, businessController.deleteImage);

// Servicios (escritura protegida; lectura pública arriba)
router.post("/:id/servicios", requireOwnedBusiness, businessController.addService);
router.put("/:id/servicios/:serviceId", requireOwnedBusiness, businessController.updateService);
router.delete("/:id/servicios/:serviceId", requireOwnedBusiness, businessController.deleteService);

// Horarios (escritura protegida; lectura pública arriba)
router.post("/:id/horarios", requireOwnedBusiness, businessController.addHour);
router.put("/:id/horarios/:hourId", requireOwnedBusiness, businessController.updateHour);
router.delete("/:id/horarios/:hourId", requireOwnedBusiness, businessController.deleteHour);

// Redes sociales (escritura protegida; lectura pública arriba)
router.post("/:id/redes", requireOwnedBusiness, businessController.addSocialLink);
router.put("/:id/redes/:linkId", requireOwnedBusiness, businessController.updateSocialLink);
router.delete("/:id/redes/:linkId", requireOwnedBusiness, businessController.deleteSocialLink);

// Vehículos (flota)
router.get("/:id/vehiculos", requireOwnedBusiness, businessController.listVehiculos);
router.post("/:id/vehiculos", requireOwnedBusiness, businessController.addVehiculo);
router.put("/:id/vehiculos/:vehiculoId", requireOwnedBusiness, businessController.updateVehiculo);
router.delete("/:id/vehiculos/:vehiculoId", requireOwnedBusiness, businessController.deleteVehiculo);

// Conductores
router.get("/:id/conductores", requireOwnedBusiness, businessController.listConductores);
router.post("/:id/conductores", requireOwnedBusiness, businessController.addConductor);
router.put("/:id/conductores/:conductorId", requireOwnedBusiness, businessController.updateConductor);
router.delete("/:id/conductores/:conductorId", requireOwnedBusiness, businessController.deleteConductor);

module.exports = router;