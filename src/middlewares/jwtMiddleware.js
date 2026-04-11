const jwt = require("jsonwebtoken");

// 🔥 MISMO SECRET EN TODO EL PROYECTO
const SECRET_KEY = process.env.JWT_SECRET || "secreto";

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

    // ✅ Guardar todo el payload (id + rol)
    req.usuario = decoded;

    next();
  } catch (error) {
    console.log("ERROR JWT:", error.message);

    return res.status(403).json({
      error: "Token inválido o expirado",
    });
  }
};

module.exports = verificarToken;