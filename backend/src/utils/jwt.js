const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

if (!SECRET) {
  throw new Error("JWT_SECRET no configurado en el entorno");
}

function generarToken(id, rol) {
  return jwt.sign({ id, rol }, SECRET, { expiresIn: EXPIRES_IN });
}

function verificarToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { generarToken, verificarToken };
