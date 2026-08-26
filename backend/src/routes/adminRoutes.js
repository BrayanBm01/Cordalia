const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const requireAuth = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/adminMiddleware");

router.use(requireAuth);
router.use(requireAdmin);

router.get("/stats", adminController.stats);
router.get("/login-history", adminController.loginHistory);

module.exports = router;
