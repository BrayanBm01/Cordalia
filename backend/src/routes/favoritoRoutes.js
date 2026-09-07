const express = require("express");
const router = express.Router();
const favoritoController = require("../controllers/favoritoController");
const requireAuth = require("../middlewares/authMiddleware");

// Todos los favoritos requieren sesión activa (guardar es solo para usuarios autenticados)
router.use(requireAuth);

router.get("/destinos", favoritoController.getDestinos);
router.post("/destinos/:id", favoritoController.addDestino);
router.delete("/destinos/:id", favoritoController.removeDestino);

router.get("/negocios", favoritoController.getNegocios);
router.post("/negocios/:id", favoritoController.addNegocio);
router.delete("/negocios/:id", favoritoController.removeNegocio);

module.exports = router;