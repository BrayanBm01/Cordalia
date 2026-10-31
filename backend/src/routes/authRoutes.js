const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const requireAuth = require("../middlewares/authMiddleware");
const {
  authLimiter,
  registerLimiter,
  googleLimiter,
  passwordResetLimiter,
} = require("../middlewares/rateLimit");

router.post("/register", registerLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/google", googleLimiter, authController.google);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);
router.put("/me", requireAuth, authController.updateProfile);
router.post("/password", requireAuth, authLimiter, authController.setPassword);
// Recuperación de contraseña (flujo de un solo uso con token).
router.post("/recuperar-password", passwordResetLimiter, authController.recuperarPassword);
router.post("/resetear-password", passwordResetLimiter, authController.resetearPassword);

module.exports = router;
