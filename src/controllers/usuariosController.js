const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// Crear usuario (registro)
const createUsuario = async (req, res) => {
  const { nombre, email, password, rol_id } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol_id)
       VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol_id`,
      [
        nombre,
        email,
        hashedPassword,
        rol_id ?? 1  // CLAVE AQUÍ
      ]
    );

    res.json(result.rows[0]);
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

// Actualizar usuario
const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE usuarios 
       SET nombre=$1, email=$2
       WHERE id=$3 RETURNING id, nombre, email, rol_id`,
      [nombre, email, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar usuario
const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario
}; 2