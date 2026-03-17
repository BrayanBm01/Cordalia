const pool = require("../config/db");

// Obtener todos los lugares
const getLugares = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM lugares_turisticos");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener uno por ID
const getLugarById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM lugares_turisticos WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Lugar no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear lugar
const createLugar = async (req, res) => {
  const { nombre, descripcion, ubicacion, imagen } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO lugares_turisticos (nombre, descripcion, ubicacion, imagen)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre, descripcion, ubicacion, imagen]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar lugar
const updateLugar = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, ubicacion, imagen } = req.body;

  try {
    const result = await pool.query(
      `UPDATE lugares_turisticos 
       SET nombre=$1, descripcion=$2, ubicacion=$3, imagen=$4
       WHERE id=$5 RETURNING *`,
      [nombre, descripcion, ubicacion, imagen, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar lugar
const deleteLugar = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM lugares_turisticos WHERE id = $1", [id]);
    res.json({ message: "Lugar eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getLugares,
  getLugarById,
  createLugar,
  updateLugar,
  deleteLugar,
};