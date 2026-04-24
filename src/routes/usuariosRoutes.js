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
const verificarRol = require("../middlewares/rolMiddleware");

// 🔓 RUTA PÚBLICA
router.post("/register", register);

// 🔒 RUTAS PROTEGIDAS

// SOLO ADMIN → ver todos
router.get("/", verificarToken, verificarRol(["ADMIN"]), getUsuarios);

// ADMIN o el mismo usuario
router.get("/:id", verificarToken, getUsuarioById);

// SOLO ADMIN → crear
router.post("/", verificarToken, verificarRol(["ADMIN"]), createUsuario);

// ADMIN o el mismo usuario
router.put("/:id", verificarToken, updateUsuario);

// SOLO ADMIN → eliminar
router.delete("/:id", verificarToken, verificarRol(["ADMIN"]), deleteUsuario);

module.exports = router;