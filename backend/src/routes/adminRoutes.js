const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const requireAuth = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/adminMiddleware");

router.use(requireAuth);
router.use(requireAdmin);

router.get("/stats", adminController.stats);
router.get("/login-history", adminController.loginHistory);

// Gestión comercial de los vendedores (prueba, suscripción, suspensión).
router.get("/vendedores", adminController.vendedores);
router.put("/vendedores/:id/estado", adminController.setVendedorEstado);

module.exports = router;
