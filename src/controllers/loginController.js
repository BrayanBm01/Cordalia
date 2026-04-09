const bcrypt = require('bcrypt');
const db = require('../config/db');
const { generarToken } = require('../utils/jwtUtil');

const login = async (req, res) => {
    const { email, password } = req.body;

    // 🔍 Validar datos
    if (!email || !password) {
        return res.status(400).json({
            ok: false,
            mensaje: 'Datos incompletos'
        });
    }

    try {
        // 🔎 Buscar usuario
        const result = await db.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        const usuario = result.rows[0];

        // 🔐 Comparar contraseña
        const coincide = await bcrypt.compare(password, usuario.password);

        if (!coincide) {
            await db.query(
                'INSERT INTO login (usuario_id, exito) VALUES ($1, $2)',
                [usuario.id, false]
            );

            return res.status(401).json({
                ok: false,
                mensaje: 'Contraseña incorrecta'
            });
        }

        // 🔥 CORRECCIÓN CLAVE: usar rol_id
        const token = generarToken(usuario.id, usuario.rol_id);

        await db.query(
            'INSERT INTO login (usuario_id, exito) VALUES ($1, $2)',
            [usuario.id, true]
        );

        // 🎭 Mapear rol bonito (opcional pero PRO)
        const rolNombre = usuario.rol_id === 2 ? "ADMIN" : "USER";

        return res.status(200).json({
            ok: true,
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: rolNombre,
                rol_id: usuario.rol_id
            }
        });

    } catch (error) {
        console.error('Error en login:', error);

        return res.status(500).json({
            ok: false,
            mensaje: 'Error en el servidor'
        });
    }
};

module.exports = { login };