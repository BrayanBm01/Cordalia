const express = require("express");
const router = express.Router();

const {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  register
} = require("../controllers/usuariosController");

// 🔐 Middlewares
const verificarToken = require("../middlewares/jwtMiddleware");
const verificarRol = require("../middlewares/rolMiddleware");

// 🔓 REGISTRO (PÚBLICO)
router.post("/usuarios/register", register);

// 🔐 SOLO ADMIN
router.get("/usuarios", verificarToken, verificarRol("ADMIN"), getUsuarios);
router.get("/usuarios/:id", verificarToken, verificarRol("ADMIN"), getUsuarioById);
router.post("/usuarios", verificarToken, verificarRol("ADMIN"), createUsuario);
router.put("/usuarios/:id", verificarToken, verificarRol("ADMIN"), updateUsuario);
router.delete("/usuarios/:id", verificarToken, verificarRol("ADMIN"), deleteUsuario);

module.exports = router;