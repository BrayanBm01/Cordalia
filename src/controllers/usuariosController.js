const pool = require("../config/db");
const bcrypt = require("bcrypt");

// Crear usuario (registro)
const createUsuario = async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO usuarios (nombre, email, password)
       VALUES ($1, $2, $3) RETURNING id, nombre, email`,
            [nombre, email, hashedPassword]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener usuarios
const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nombre, email FROM usuarios");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener por ID
const getUsuarioById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, nombre, email, rol_id FROM usuarios WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};