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
publicRouter.get("/:planId/precio", optionalAuth, planController.calcularPrecio);
publicRouter.get("/:planId/salidas", optionalAuth, planController.listSalidas);
publicRouter.get("/:planId/salidas/:salidaId/transporte", optionalAuth, planController.sugerirTransporteSalida);
publicRouter.get("/:planId/transporte/sugerir", optionalAuth, planController.sugerirTransporte);

// ---------------------------------------------------------------
// Router de negocio: montado en /api/businesses/:id/planes
// Lectura visible según rol (turista solo activos; dueño todo).
// Escritura solo dueño del negocio o admin.
// ---------------------------------------------------------------
const businessRouter = express.Router({ mergeParams: true });

businessRouter.get("/", optionalAuth, loadVisibleBusiness, planController.list);
businessRouter.get("/:planId", optionalAuth, loadVisibleBusiness, planController.getById);
businessRouter.get("/:planId/precio", optionalAuth, loadVisibleBusiness, planController.calcularPrecio);
businessRouter.get("/:planId/salidas", optionalAuth, loadVisibleBusiness, planController.listSalidas);
businessRouter.get("/:planId/transporte/sugerir", optionalAuth, loadVisibleBusiness, planController.sugerirTransporte);

businessRouter.use(requireAuth);

businessRouter.post("/", requireOwnedBusiness, planController.create);
businessRouter.put("/:planId", requireOwnedBusiness, planController.update);
businessRouter.delete("/:planId", requireOwnedBusiness, planController.remove);
businessRouter.put("/:planId/estado", requireOwnedBusiness, planController.setEstado);

// Imágenes del plan
businessRouter.post("/:planId/imagenes", requireOwnedBusiness, planController.addImage);
businessRouter.put("/:planId/imagenes/:imageId/principal", requireOwnedBusiness, planController.setPrimaryImage);
businessRouter.delete("/:planId/imagenes/:imageId", requireOwnedBusiness, planController.deleteImage);

// Salidas (fechas con cupo)
businessRouter.post("/:planId/salidas", requireOwnedBusiness, planController.createSalida);
businessRouter.put("/:planId/salidas/:salidaId", requireOwnedBusiness, planController.updateSalida);
businessRouter.delete("/:planId/salidas/:salidaId", requireOwnedBusiness, planController.deleteSalida);

// Inscripciones
businessRouter.get("/:planId/salidas/:salidaId/inscripciones", requireOwnedBusiness, planController.listInscripciones);
businessRouter.get("/:planId/salidas/:salidaId/inscripciones/resumen", requireOwnedBusiness, planController.resumenInscripciones);
businessRouter.post("/:planId/salidas/:salidaId/inscripciones", optionalAuth, planController.createInscripcion);
businessRouter.put("/:planId/salidas/:salidaId/inscripciones/:inscripcionId/cancelar", requireOwnedBusiness, planController.cancelarInscripcion);

// Transporte
businessRouter.get("/:planId/transporte", optionalAuth, loadVisibleBusiness, planController.listTransportes);
businessRouter.post("/:planId/transporte", requireOwnedBusiness, planController.addTransporte);
businessRouter.delete("/:planId/transporte/:transporteId", requireOwnedBusiness, planController.deleteTransporte);

// Transporte por salida
businessRouter.get("/:planId/salidas/:salidaId/transporte", requireOwnedBusiness, planController.sugerirTransporteSalida);
businessRouter.get("/:planId/salidas/:salidaId/transporte/sugerir", requireOwnedBusiness, planController.sugerirTransporteSalida);
businessRouter.get("/:planId/salidas/:salidaId/transporte/asignados", requireOwnedBusiness, planController.listSalidaTransportes);
businessRouter.post("/:planId/salidas/:salidaId/transporte", requireOwnedBusiness, planController.asignarTransporteSalida);
businessRouter.delete("/:planId/salidas/:salidaId/transporte/:transporteId", requireOwnedBusiness, planController.quitarSalidaTransporte);

module.exports = { publicRouter, businessRouter };