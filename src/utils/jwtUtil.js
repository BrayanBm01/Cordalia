const jwt = require("jsonwebtoken");

// 🔥 MISMO SECRET EN TODO EL PROYECTO
const SECRET_KEY = process.env.JWT_SECRET || "secreto";

// ✅ Generar token
const generarToken = (id, rol) => {
  return jwt.sign(
    { id, rol },
    SECRET_KEY,
    { expiresIn: "2h" }
  );
};

// ✅ Verificar token (con errores claros)
const verificarToken = (token) => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.log("❌ Token expirado");
    } else if (error.name === "JsonWebTokenError") {
      console.log("❌ Token inválido");
    } else {
      console.log("❌ Error token:", error.message);
    }
    return null;
  }
};

// ✅ Extraer ID
const extraerId = (token) => {
  const decoded = verificarToken(token);
  return decoded?.id || null;
};

// ✅ Extraer ROL
const extraerRol = (token) => {
  const decoded = verificarToken(token);
  return decoded?.rol || null;
};

// ✅ Validar token (true/false)
const validarToken = (token) => {
  return !!verificarToken(token);
};

module.exports = {
  generarToken,
  verificarToken,
  extraerId,
  extraerRol,
  validarToken,
};