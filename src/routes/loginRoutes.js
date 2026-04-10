const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const { login } = require("../controllers/loginController");

// LOGIN
router.post("/", login);

// VERIFY TOKEN (CORREGIDO)
router.get("/verify", (req, res) => {
  const auth = req.headers.authorization;

  // No hay header
  if (!auth) {
    console.log(" No Authorization header");
    return res.json({ ok: false });
  }

  // Formato incorrecto
  if (!auth.startsWith("Bearer ")) {
    console.log(" Formato inválido:", auth);
    return res.json({ ok: false });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secreto"
    );

    console.log("TOKEN OK:", decoded);

    return res.json({
      ok: true,
      usuario: decoded // { id, rol }
    });

  } catch (error) {
    console.log("ERROR TOKEN:", error.message);

    return res.json({
      ok: false
    });
  }
});

module.exports = router;