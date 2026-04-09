const app = require('./app');
require("dotenv").config();
const jwt = require("jsonwebtoken");
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Servidor corriendo en puerto " + PORT);
});

// 🔒 MIDDLEWARE
function verificarToken(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.redirect("/");
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secreto"
    );

    req.usuario = decoded;
    next();

  } catch (error) {
    return res.redirect("/");
  }
}