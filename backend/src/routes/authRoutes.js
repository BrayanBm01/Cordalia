const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const requireAuth = require("../middlewares/authMiddleware");
const { authLimiter, googleLimiter } = require("../middlewares/rateLimit");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/google", googleLimiter, authController.google);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);
router.put("/me", requireAuth, authController.updateProfile);
router.post("/password", requireAuth, authController.setPassword);
// Recuperación de contraseña (flujo de un solo uso con token).
router.post("/recuperar-password", authLimiter, authController.recuperarPassword);
router.post("/resetear-password", authLimiter, authController.resetearPassword);

module.exports = router;
