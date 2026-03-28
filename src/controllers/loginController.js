const bcrypt = require('bcrypt');
const db = require('../config/db');
const { generarToken } = require('../utils/jwtUtil');

const login = async (req, res) => {
    const { email, password } = req.body;

    // Validación de datos
    if (!email || !password) {
        return res.status(400).json({ mensaje: 'Datos incompletos' });
    }

    try {
        // Buscar usuario
        const result = await db.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Usuario no encontrado' });
        }

        const usuario = result.rows[0];

        // Comparar contraseña
        const coincide = await bcrypt.compare(password, usuario.password);

        if (!coincide) {
            // Guardar intento fallido
            await db.query(
                'INSERT INTO login (usuario_id, exito) VALUES ($1, $2)',
                [usuario.id, false]
            );

            return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
        }

        // Generar token (MEJOR usar ID en vez de email)
        const token = generarToken(usuario.id, usuario.rol);

        // Guardar intento exitoso
        await db.query(
            'INSERT INTO login (usuario_id, exito) VALUES ($1, $2)',
            [usuario.id, true]
        );

        // Respuesta
        return res.status(200).json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error);

        return res.status(500).json({
            mensaje: 'Error en el servidor'
        });
    }
};

module.exports = { login };