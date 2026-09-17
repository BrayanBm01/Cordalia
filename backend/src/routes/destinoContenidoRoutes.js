const express = require("express");
const destinoContenidoController = require("../controllers/destinoContenidoController");
const requireAuth = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/adminMiddleware");

// Rutas de catálogos (contenido disponible) -> solo administradores.
const contenidoRouter = express.Router();

contenidoRouter.get("/actividades", requireAuth, requireAdmin, destinoContenidoController.listActividades);
contenidoRouter.post("/actividades", requireAuth, requireAdmin, destinoContenidoController.createActividad);
contenidoRouter.put("/actividades/:id", requireAuth, requireAdmin, destinoContenidoController.updateActividad);
contenidoRouter.delete("/actividades/:id", requireAuth, requireAdmin, destinoContenidoController.deleteActividad);

contenidoRouter.get("/puntos", requireAuth, requireAdmin, destinoContenidoController.listPuntosInteres);
contenidoRouter.post("/puntos", requireAuth, requireAdmin, destinoContenidoController.createPuntoInteres);
contenidoRouter.put("/puntos/:id", requireAuth, requireAdmin, destinoContenidoController.updatePuntoInteres);
contenidoRouter.delete("/puntos/:id", requireAuth, requireAdmin, destinoContenidoController.deletePuntoInteres);

// Rutas de un destino (asignación de contenido + info de viaje) -> administradores.
// mergeParams: expone el :id del prefijo en el que se monta (/api/lugares/:id/administrar).
const lugarContenidoRouter = express.Router({ mergeParams: true });

lugarContenidoRouter.get("/", requireAuth, requireAdmin, destinoContenidoController.getAsignaciones);
lugarContenidoRouter.post(
  "/contenido/actividades",
  requireAuth,
  requireAdmin,
  destinoContenidoController.assignActividad
);
lugarContenidoRouter.delete(
  "/contenido/actividades/:actividadId",
  requireAuth,
  requireAdmin,
  destinoContenidoController.unassignActividad
);
lugarContenidoRouter.post(
  "/contenido/puntos",
  requireAuth,
  requireAdmin,
  destinoContenidoController.assignPuntoInteres
);
lugarContenidoRouter.delete(
  "/contenido/puntos/:puntoId",
  requireAuth,
  requireAdmin,
  destinoContenidoController.unassignPuntoInteres
);
lugarContenidoRouter.post("/info-viaje", requireAuth, requireAdmin, destinoContenidoController.upsertInfoViaje);

module.exports = { contenidoRouter, lugarContenidoRouter };