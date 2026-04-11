const jwt = require("jsonwebtoken");

// 🔥 Usa siempre el mismo SECRET
const SECRET_KEY = process.env.JWT_SECRET || "secreto";

// ✅ Generar token
const generarToken = (id, rol) => {
  return jwt.sign(
    { id, rol }, // 🔥 importante: incluir rol
    SECRET_KEY,
    { expiresIn: "2h" }
  );
};

// ✅ Verificar y decodificar token
const verificarToken = (token) => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    console.log("ERROR TOKEN:", error.message);
    return null;
  }
};

// ✅ Extraer ID
const extraerId = (token) => {
  const decoded = verificarToken(token);
  return decoded ? decoded.id : null;
};

// ✅ Extraer ROL
const extraerRol = (token) => {
  const decoded = verificarToken(token);
  return decoded ? decoded.rol : null;
};

// ✅ Validar token
const validarToken = (token) => {
  return verificarToken(token) !== null;
};

module.exports = {
  generarToken,
  verificarToken, // 🔥 mejor nombre que "decodificar"
  extraerId,
  extraerRol,
  validarToken,
};