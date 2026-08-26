const express = require("express");
const router = express.Router();
const lugaresController = require("../controllers/lugaresController");
const requireAuth = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/adminMiddleware");

router.get("/", requireAuth, lugaresController.getAll);
router.get("/:id", requireAuth, lugaresController.getById);

router.post("/", requireAuth, requireAdmin, lugaresController.create);
router.put("/:id", requireAuth, requireAdmin, lugaresController.update);
router.delete("/:id", requireAuth, requireAdmin, lugaresController.remove);

module.exports = router;
