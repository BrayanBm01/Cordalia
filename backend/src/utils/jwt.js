const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

if (!SECRET) {
  throw new Error("JWT_SECRET no configurado en el entorno");
}

// Un secreto corto es debil frente a ataques de fuerza bruta. En
// produccion se rechaza el arranque; en desarrollo solo se advierte
// para no romper entornos locales/pruebas.
if (SECRET.length < 32) {
  const mensaje =
    "JWT_SECRET es demasiado corto (mínimo recomendado: 32 caracteres)";
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${mensaje}. Genera uno con: openssl rand -hex 32`);
  }
  console.warn(`[jwt] ADVERTENCIA: ${mensaje}. No uses este valor en producción.`);
}

function generarToken(id, rol) {
  return jwt.sign({ id, rol }, SECRET, { expiresIn: EXPIRES_IN });
}

function verificarToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { generarToken, verificarToken };
