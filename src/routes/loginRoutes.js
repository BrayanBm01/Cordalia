const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const { login } = require("../controllers/loginController");

// 🔐 LOGIN
router.post("/", login);

// 🔒 VERIFY TOKEN
router.get("/verify", (req, res) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.json({ ok: false });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secreto"
    );

    res.json({
      ok: true,
      usuario: decoded // aquí viene id y rol
    });

  } catch (error) {
    res.json({ ok: false });
  }
});

module.exports = router;