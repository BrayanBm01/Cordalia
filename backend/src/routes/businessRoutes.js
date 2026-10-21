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
const { requireVendorActive } = require("../middlewares/vendorMiddleware");

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

// Funcionalidades COMERCIALES restringidas: requieren prueba gratuita
// vigente o suscripcion activa. Si la prueba vencio o la cuenta esta
// suspendida, el backend responde 403 con un mensaje claro. El vendedor
// conserva acceso al perfil, a la informacion de facturacion y a la
// pantalla de contratacion (/api/vendedor/*).
router.post("/", requireBusinessRole, requireVendorActive, businessController.create);
router.put("/:id", requireOwnedBusiness, requireVendorActive, businessController.update);
router.delete("/:id", requireOwnedBusiness, businessController.remove);
router.put("/:id/estado", requireAdmin, businessController.setEstado);

// Asociar/retirar destino (1:N → cada negocio pertenece a un destino)
router.put("/:id/destino", requireOwnedBusiness, requireVendorActive, businessController.setDestino);

// Imágenes (escritura protegida; lectura pública arriba)
router.post("/:id/imagenes", requireOwnedBusiness, requireVendorActive, businessController.addImage);
router.put("/:id/imagenes/:imageId/principal", requireOwnedBusiness, requireVendorActive, businessController.setPrimaryImage);
router.put("/:id/imagenes/:imageId", requireOwnedBusiness, requireVendorActive, businessController.updateImage);
router.delete("/:id/imagenes/:imageId", requireOwnedBusiness, requireVendorActive, businessController.deleteImage);

// Servicios (escritura protegida; lectura pública arriba)
router.post("/:id/servicios", requireOwnedBusiness, requireVendorActive, businessController.addService);
router.put("/:id/servicios/:serviceId", requireOwnedBusiness, requireVendorActive, businessController.updateService);
router.delete("/:id/servicios/:serviceId", requireOwnedBusiness, requireVendorActive, businessController.deleteService);

// Horarios (escritura protegida; lectura pública arriba)
router.post("/:id/horarios", requireOwnedBusiness, requireVendorActive, businessController.addHour);
router.put("/:id/horarios/:hourId", requireOwnedBusiness, requireVendorActive, businessController.updateHour);
router.delete("/:id/horarios/:hourId", requireOwnedBusiness, requireVendorActive, businessController.deleteHour);

// Redes sociales (escritura protegida; lectura pública arriba)
router.post("/:id/redes", requireOwnedBusiness, requireVendorActive, businessController.addSocialLink);
router.put("/:id/redes/:linkId", requireOwnedBusiness, requireVendorActive, businessController.updateSocialLink);
router.delete("/:id/redes/:linkId", requireOwnedBusiness, requireVendorActive, businessController.deleteSocialLink);

// Vehículos (flota)
router.get("/:id/vehiculos", requireOwnedBusiness, businessController.listVehiculos);
router.post("/:id/vehiculos", requireOwnedBusiness, requireVendorActive, businessController.addVehiculo);
router.put("/:id/vehiculos/:vehiculoId", requireOwnedBusiness, requireVendorActive, businessController.updateVehiculo);
router.delete("/:id/vehiculos/:vehiculoId", requireOwnedBusiness, requireVendorActive, businessController.deleteVehiculo);

// Conductores
router.get("/:id/conductores", requireOwnedBusiness, businessController.listConductores);
router.post("/:id/conductores", requireOwnedBusiness, requireVendorActive, businessController.addConductor);
router.put("/:id/conductores/:conductorId", requireOwnedBusiness, requireVendorActive, businessController.updateConductor);
router.delete("/:id/conductores/:conductorId", requireOwnedBusiness, requireVendorActive, businessController.deleteConductor);

module.exports = router;