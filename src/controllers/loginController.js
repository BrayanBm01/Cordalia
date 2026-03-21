const bcrypt = require('bcrypt');
const db = require('../config/db');
const { generarToken } = require('../utils/jwtUtil');

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Usuario no encontrado' });
        }

        const usuario = result.rows[0];

        const coincide = await bcrypt.compare(password, usuario.password);

        if (!coincide) {
            await db.query(
                'INSERT INTO login (usuario_id, exito) VALUES ($1, $2)',
                [usuario.id, false]
            );

            return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
        }

        // 🔥 GENERAR TOKEN
        const token = generarToken(usuario.email, usuario.rol);

        await db.query(
            'INSERT INTO login (usuario_id, exito) VALUES ($1, $2)',
            [usuario.id, true]
        );

        res.json({
            mensaje: 'Login exitoso',
            token, // 👈 AQUÍ ESTÁ EL JWT
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

module.exports = { login };