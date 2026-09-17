// ============================================================
// Rutas de inscripciones y pagos (turista).
//   GET  /api/mis-inscripciones                -> perfil del usuario
//   GET  /api/inscripciones/:id/comprobante    -> comprobante (dueño/admin/negocio)
//   POST /api/inscripciones/:id/pagar          -> pago autorizado por backend
//   GET  /api/pagos/estado                     -> info del proveedor (público)
//   POST /api/pagos/webhook/mercadopago        -> webhook del proveedor (stub)
// Todas las rutas privadas exigen sesión (requireAuth).
// ============================================================
const express = require("express");
const requireAuth = require("../middlewares/authMiddleware");
const inscripcionController = require("../controllers/inscripcionController");

const router = express.Router();
router.get("/mis-inscripciones", requireAuth, inscripcionController.misInscripciones);
router.get("/inscripciones/:inscripcionId/comprobante", requireAuth, inscripcionController.comprobante);
router.post("/inscripciones/:inscripcionId/pagar", requireAuth, inscripcionController.pagar);

const pagosRouter = express.Router();
pagosRouter.get("/estado", inscripcionController.estadoPagos);
pagosRouter.post("/webhook/mercadopago", inscripcionController.webhookMercadopago);

module.exports = router;
module.exports.pagosRouter = pagosRouter;