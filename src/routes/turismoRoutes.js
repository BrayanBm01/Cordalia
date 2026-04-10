const express = require("express");
const router = express.Router();

const {
  getLugares,
  getLugarById,
  createLugar,
  updateLugar,
  deleteLugar,
} = require("../controllers/turismoController");

// Middlewares
const verificarToken = require("../middlewares/jwtMiddleware");
const verificarRol = require("../middlewares/rolMiddleware");

// PÚBLICO
router.get("/lugares", getLugares);
router.get("/lugares/:id", getLugarById);

// USUARIOS AUTENTICADOS
router.post("/lugares", verificarToken, createLugar);

// SOLO ADMIN
router.put("/lugares/:id", verificarToken, verificarRol("ADMIN"), updateLugar);
router.delete("/lugares/:id", verificarToken, verificarRol("ADMIN"), deleteLugar);

module.exports = router;