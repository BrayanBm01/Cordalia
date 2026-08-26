const pool = require("../config/db");

const LugarModel = {
  async findAll(search = null) {
    if (search) {
      const pattern = `%${search}%`;
      const { rows } = await pool.query(
        `SELECT id, nombre, descripcion, ubicacion, imagen
         FROM lugares
         WHERE nombre ILIKE $1 OR ubicacion ILIKE $1 OR descripcion ILIKE $1
         ORDER BY id ASC`,
        [pattern]
      );
      return rows;
    }
    const { rows } = await pool.query(
      "SELECT id, nombre, descripcion, ubicacion, imagen FROM lugares ORDER BY id ASC"
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      "SELECT id, nombre, descripcion, ubicacion, imagen FROM lugares WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  },

  async create(nombre, descripcion, ubicacion, imagen) {
    const { rows } = await pool.query(
      `INSERT INTO lugares (nombre, descripcion, ubicacion, imagen)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre, descripcion, ubicacion, imagen]
    );
    return rows[0];
  },

  async update(id, nombre, descripcion, ubicacion, imagen) {
    const { rows } = await pool.query(
      `UPDATE lugares
       SET nombre=$1, descripcion=$2, ubicacion=$3, imagen=$4
       WHERE id=$5 RETURNING *`,
      [nombre, descripcion, ubicacion, imagen, id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    const { rowCount } = await pool.query(
      "DELETE FROM lugares WHERE id = $1",
      [id]
    );
    return rowCount > 0;
  },

  async count() {
    const { rows } = await pool.query("SELECT COUNT(*)::int as count FROM lugares");
    return rows[0].count;
  },
};

module.exports = LugarModel;
