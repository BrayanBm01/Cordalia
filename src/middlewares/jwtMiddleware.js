const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.JWT_SECRET || "miClaveSuperSecretaSeguraParaJWT123456";

const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  // ❌ No hay token o formato incorrecto
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "No autenticado: se requiere token JWT",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);

    // ✅ Guardar TODO el payload
    req.usuario = decoded; // 🔥 id + rol

    next();
  } catch (error) {
    return res.status(403).json({
      error: "Token inválido o expirado",
    });
  }
};

module.exports = verificarToken;