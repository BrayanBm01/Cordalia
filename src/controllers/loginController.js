const db = require('../config/db');
const bcrypt = require('bcrypt');

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

        // Comparar contraseña encriptada
        const match = await bcrypt.compare(password, usuario.password);

        if (!match) {
            await db.query(
                'INSERT INTO login (usuario_id, exito) VALUES ($1, $2)',
                [usuario.id, false]
            );

            return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
        }

        // Login correcto
        await db.query(
            'INSERT INTO login (usuario_id, exito) VALUES ($1, $2)',
            [usuario.id, true]
        );

        res.json({
            mensaje: 'Login exitoso',
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

module.exports = { login };