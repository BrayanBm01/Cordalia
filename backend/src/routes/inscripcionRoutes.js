// ============================================================
// Rutas de inscripciones turisticas (GRATUITAS).
//   GET /api/mis-inscripciones                -> perfil del usuario
//   GET /api/inscripciones/:id/comprobante    -> detalle (dueño/admin/negocio)
//
// NO existe ningun endpoint de pago turistico: los planes de viaje de
// Cordalia no se cobran. El cobro comercial de los vendedores vive en
// un router separado (/api/suscripciones) con su propio webhook.
// Todas las rutas privadas exigen sesión (requireAuth).
// ============================================================
const express = require("express");
const requireAuth = require("../middlewares/authMiddleware");
const inscripcionController = require("../controllers/inscripcionController");

const router = express.Router();
router.get("/mis-inscripciones", requireAuth, inscripcionController.misInscripciones);
router.get("/inscripciones/:inscripcionId/comprobante", requireAuth, inscripcionController.comprobante);
router.put("/inscripciones/:inscripcionId/cancelar", requireAuth, inscripcionController.cancelar);

module.exports = router;
