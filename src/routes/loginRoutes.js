const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const verificarToken = require("../middlewares/jwtMiddleware");
const { login, logout } = require("../controllers/loginController");

// LOGIN
router.post("/", login);

// LOGOUT
router.post("/logout", verificarToken, logout);

// VERIFY TOKEN
router.get("/verify", async (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.json({ ok: false });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.id) {
      return res.json({ ok: false });
    }

    const result = await db.query(
      "SELECT id, nombre, email, rol_id, token_activo FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.json({ ok: false });
    }

    const usuario = result.rows[0];

    // Validar sesión única
    if (!usuario.token_activo || usuario.token_activo !== token) {
      return res.json({
        ok: false,
        mensaje: "Sesión inválida"
      });
    }

    return res.json({
      ok: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol_id
      }
    });

  } catch (error) {
    return res.json({ ok: false });
  }
});

module.exports = router;