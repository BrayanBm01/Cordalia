const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const requireAuth = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/adminMiddleware");
const { optionalAuth } = require("../middlewares/authMiddleware");
const { reviewLimiter } = require("../middlewares/rateLimit");

// Lectura pública de reseñas de un negocio visible
router.get("/business/:businessId", optionalAuth, reviewController.listForBusiness);

router.use(requireAuth);
// Operaciones autenticadas de resenas (crear/editar/responder) limitadas
// por usuario para evitar spam.
router.use(reviewLimiter);

router.post("/business/:businessId", reviewController.create);
router.put("/:id", reviewController.update);
router.delete("/:id", reviewController.remove);
router.post("/:id/reply", reviewController.addReply);
router.delete("/:id/reply", reviewController.removeReply);

// Moderación (solo ADMIN)
router.get("/", requireAdmin, reviewController.adminList);
router.put("/:id/moderar", requireAdmin, reviewController.moderar);

module.exports = router;