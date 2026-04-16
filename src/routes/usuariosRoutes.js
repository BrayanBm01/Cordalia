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

// RUTAS PÚBLICAS

// Registro (NO requiere token)
router.post("/usuarios/register", register);


// RUTAS PROTEGIDAS

// GET
router.get("/usuarios", verificarToken, getUsuarios);
router.get("/usuarios/:id", verificarToken, getUsuarioById);

// POST
router.post("/usuarios", verificarToken, createUsuario);

// PUT
router.put("/usuarios/:id", verificarToken, updateUsuario);

// DELETE
router.delete("/usuarios/:id", verificarToken, deleteUsuario);

module.exports = router;