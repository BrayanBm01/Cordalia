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

// 🔐 TODOS autenticados pueden ver
router.get("/lugares", verificarToken, getLugares);
router.get("/lugares/:id", verificarToken, getLugarById);

// 🔒 SOLO ADMIN puede crear
router.post("/lugares", verificarToken, verificarRol(["ADMIN"]), createLugar);

// 🔒 SOLO ADMIN
router.put("/lugares/:id", verificarToken, verificarRol(["ADMIN"]), updateLugar);
router.delete("/lugares/:id", verificarToken, verificarRol(["ADMIN"]), deleteLugar);

module.exports = router;