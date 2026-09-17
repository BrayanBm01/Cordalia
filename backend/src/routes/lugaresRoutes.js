const express = require("express");
const router = express.Router();
const lugaresController = require("../controllers/lugaresController");
const destinoContenidoController = require("../controllers/destinoContenidoController");
const requireAuth = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/adminMiddleware");
const { optionalAuth } = require("../middlewares/authMiddleware");

// Lectura pública de destinos (visitantes ven la información y sus negocios aprobados)
router.get("/", lugaresController.getAll);
router.get("/slug/:slug", lugaresController.getBySlug);
router.get("/:id", lugaresController.getById);
router.get("/:id/negocios", optionalAuth, lugaresController.getBusinesses);
// Contenido público de un destino: qué hacer, qué visitar e información de viaje.
router.get("/:id/contenido", destinoContenidoController.getContenidoPublico);
// Presupuesto real: costos por tu cuenta VS planes de negocios aprobados.
router.get("/:id/presupuesto", destinoContenidoController.getPresupuesto);

router.post("/", requireAuth, requireAdmin, lugaresController.create);
router.put("/:id", requireAuth, requireAdmin, lugaresController.update);
router.delete("/:id", requireAuth, requireAdmin, lugaresController.remove);

module.exports = router;
