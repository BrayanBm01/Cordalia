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

// REGISTRO (PÚBLICO)
router.post("/register", register);

// GET
router.get("/", verificarToken, getUsuarios);
router.get("/:id", verificarToken, getUsuarioById);

// POST
router.post("/", verificarToken, createUsuario);

// PUT
router.put("/:id", verificarToken, updateUsuario);

// DELETE
router.delete("/:id", verificarToken, deleteUsuario);

module.exports = router;