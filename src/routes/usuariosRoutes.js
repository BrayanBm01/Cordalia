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

const verificarToken = require("../middlewares/jwtMiddleware");


// 🔓 RUTA PÚBLICA (REGISTRO)
router.post("/register", register);


// 🔒 RUTAS PROTEGIDAS (requieren token)

// Obtener todos los usuarios
router.get("/", verificarToken, getUsuarios);

// Obtener usuario por ID
router.get("/:id", verificarToken, getUsuarioById);

// Crear usuario (ADMIN o sistema interno)
router.post("/", verificarToken, createUsuario);

// Actualizar usuario
router.put("/:id", verificarToken, updateUsuario);

// Eliminar usuario
router.delete("/:id", verificarToken, deleteUsuario);

module.exports = router;