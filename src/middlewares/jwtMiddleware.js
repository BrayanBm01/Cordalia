const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'miClaveSuperSecretaSeguraParaJWT123456';

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // ❌ No hay token o formato incorrecto
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            ok: false,
            mensaje: 'No autenticado: token requerido'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);

        // 🔥 IMPORTANTE: usamos req.user (estándar)
        req.user = {
            id: decoded.id,
            rol: decoded.rol // 0 = ADMIN, 1 = USER
        };

        next();

    } catch (error) {

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                ok: false,
                mensaje: "Token expirado"
            });
        }

        return res.status(401).json({
            ok: false,
            mensaje: "Token inválido"
        });
    }
};

module.exports = verificarToken;