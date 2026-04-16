const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const { login } = require("../controllers/loginController");

// 🔑 LOGIN
router.post("/", login);

// 🔒 VERIFY TOKEN (PRO + CONSISTENTE CON SESIÓN ÚNICA)
router.get("/verify", async (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.json({ ok: false });
  }

  const token = auth.split(" ")[1];

  try {
    // 🔐 verificar JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // 🔍 validar en DB (CLAVE PARA EVITAR BUCLES)
    const result = await db.query(
      "SELECT id, rol_id, token_activo FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.json({ ok: false });
    }

    const usuario = result.rows[0];

    // 🔥 validar sesión única
    if (usuario.token_activo !== token) {
      return res.json({
        ok: false,
        mensaje: "Sesión inválida"
      });
    }

    // ✔ respuesta estable para frontend
    return res.json({
      ok: true,
      usuario: {
        id: usuario.id,
        rol: usuario.rol_id
      }
    });

  } catch (error) {
    return res.json({ ok: false });
  }
});

module.exports = router;