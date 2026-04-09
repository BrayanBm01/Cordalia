const jwt = require('jsonwebtoken');

// 🔥 MISMO SECRET EN TODO EL PROYECTO
const SECRET_KEY = process.env.JWT_SECRET || 'secreto';

// ✅ Generar token con id y rol
const generarToken = (id, rol) => {
    return jwt.sign(
        { id, rol },
        SECRET_KEY,
        { expiresIn: '2h' }
    );
};

// ✅ Decodificar token
const decodificarToken = (token) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (error) {
        console.log("❌ ERROR TOKEN:", error.message);
        return null;
    }
};

// ✅ Extraer id
const extraerId = (token) => {
    const decoded = decodificarToken(token);
    return decoded ? decoded.id : null;
};

// ✅ Extraer rol
const extraerRol = (token) => {
    const decoded = decodificarToken(token);
    return decoded ? decoded.rol : null;
};

// ✅ Validar token
const validarToken = (token) => {
    return decodificarToken(token) !== null;
};
module.exports = {
    generarToken,
    decodificarToken,
    extraerId,
    extraerRol,
    validarToken
};