// ============================================================
// Rutas de estado comercial y suscripciones del VENDEDOR.
//   GET  /api/vendedor/estado           -> prueba, dias restantes,
//                                          plan actual e historial
//   GET  /api/vendedor/planes           -> catalogo de planes
//   POST /api/vendedor/suscripciones    -> contratar plan (crea el
//                                          pago; NO activa la suscripcion)
//   PUT  /api/vendedor/suscripciones/:id/cancelar
//   POST /api/suscripciones/webhook/mercadopago -> notificacion del
//                                          proveedor (verifica firma)
//
// Estas rutas son de CONSULTA/contratacion: siguen disponibles aunque
// la prueba gratuita este vencida (el vendedor debe poder ver su
// estado y contratar). Las funcionalidades comerciales RESTRINGIDAS se
// bloquean en el middleware requireVendorActive.
// ============================================================
const express = require("express");
const requireAuth = require("../middlewares/authMiddleware");
const { requireBusinessRole } = require("../middlewares/businessMiddleware");
const suscripcionController = require("../controllers/suscripcionController");

const router = express.Router();

// El panel comercial es EXCLUSIVO del vendedor (y del administrador).
// Un turista autenticado recibe 403: no es su panel.
router.get("/vendedor/planes", requireAuth, requireBusinessRole, suscripcionController.planes);
router.get("/vendedor/estado", requireAuth, requireBusinessRole, suscripcionController.estado);
router.post("/vendedor/suscripciones", requireAuth, requireBusinessRole, suscripcionController.contratar);
router.put("/vendedor/suscripciones/:suscripcionId/cancelar", requireAuth, requireBusinessRole, suscripcionController.cancelar);

module.exports = router;

// La webhook la publica el proveedor: NO exige sesion, pero SI exige
// firma valida (verificada en el controlador).
module.exports.webhookRouter = express.Router();
module.exports.webhookRouter.post(
  "/suscripciones/webhook/mercadopago",
  suscripcionController.webhookMercadopago
);
