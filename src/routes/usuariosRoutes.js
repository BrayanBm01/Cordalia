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

// Middlewares
const verificarToken = require("../middlewares/jwtMiddleware");
const verificarRol = require("../middlewares/rolMiddleware");


// 🔓 REGISTRO (PÚBLICO)
router.post("/usuarios/register", register);


// 🔓 (opcional) crear usuario sin login
// si NO quieres esto público, elimínalo
router.post("/usuarios", createUsuario);


// 🔐 SOLO ADMIN puede ver todos los usuarios
router.get("/usuarios", verificarToken, verificarRol("ADMIN"), getUsuarios);


// 🔐 Usuario logeado puede ver su info (o admin)
router.get("/usuarios/:id", verificarToken, getUsuarioById);


// 🔐 SOLO ADMIN puede actualizar
router.put("/usuarios/:id", verificarToken, verificarRol("ADMIN"), updateUsuario);


// 🔐 SOLO ADMIN puede eliminar
router.delete("/usuarios/:id", verificarToken, verificarRol("ADMIN"), deleteUsuario);


module.exports = router;