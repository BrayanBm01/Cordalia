const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'miClaveSuperSecretaSeguraParaJWT123456';

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // ❌ No hay token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autenticado: se requiere token JWT' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);

        // Guardamos datos en request (como SecurityContext en Java)
        req.usuario = {
            email: decoded.email,
            rol: decoded.rol
        };

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

module.exports = verificarToken;