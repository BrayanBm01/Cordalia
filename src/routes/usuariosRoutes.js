const express = require("express");
const router = express.Router();

const {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario
} = require("../controllers/usuariosController");

// 🔥 IMPORTANTE: importar register
const { register } = require("../controllers/usuariosController");

// GET
router.get("/usuarios", getUsuarios);
router.get("/usuarios/:id", getUsuarioById);

// POST
router.post("/usuarios", createUsuario);

// 🔥 NUEVA RUTA PARA REGISTRO
router.post("/usuarios/register", register);

// PUT
router.put("/usuarios/:id", updateUsuario);

// DELETE
router.delete("/usuarios/:id", deleteUsuario);

module.exports = router;