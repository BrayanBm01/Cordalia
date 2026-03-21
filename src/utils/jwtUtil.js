const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'miClaveSuperSecretaSeguraParaJWT123456';

// ✅ Generar token con email y rol
const generarToken = (email, rol) => {
    return jwt.sign(
        { email, rol },
        SECRET_KEY,
        { expiresIn: '24h' }
    );
};

// ✅ Extraer correo
const extraerCorreo = (token) => {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded.email;
};

// ✅ Extraer rol
const extraerRol = (token) => {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded.rol;
};

// ✅ Validar token
const validarToken = (token) => {
    try {
        jwt.verify(token, SECRET_KEY);
        return true;
    } catch (error) {
        return false;
    }
};

module.exports = {
    generarToken,
    extraerCorreo,
    extraerRol,
    validarToken
};