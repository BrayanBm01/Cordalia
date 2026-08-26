const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const requireAuth = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/adminMiddleware");

router.use(requireAuth);
router.use(requireAdmin);

router.get("/", usuarioController.getAll);
router.get("/:id", usuarioController.getById);
router.post("/", usuarioController.create);
router.post("/:id/revoke-session", usuarioController.revokeSession);
router.put("/:id", usuarioController.update);
router.delete("/:id", usuarioController.remove);

module.exports = router;
