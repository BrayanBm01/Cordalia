const verificarRol = (rolRequerido) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        if (req.usuario.rol !== rolRequerido) {
            return res.status(403).json({ error: 'No autorizado' });
        }

        next();
    };
};

module.exports = verificarRol;