const pool = require("../config/db");

const LugarModel = {
  async findAll() {
    const { rows } = await pool.query(
      "SELECT id, nombre, slug, descripcion, ubicacion, imagen, created_at, updated_at FROM lugares ORDER BY id ASC"
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      "SELECT id, nombre, slug, descripcion, ubicacion, imagen, created_at, updated_at FROM lugares WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const { rows } = await pool.query(
      "SELECT id, nombre, slug, descripcion, ubicacion, imagen, created_at, updated_at FROM lugares WHERE slug = $1",
      [slug]
    );
    return rows[0] || null;
  },

  async search(query) {
    const { rows } = await pool.query(
      `SELECT id, nombre, slug, descripcion, ubicacion, imagen, created_at, updated_at
       FROM lugares
       WHERE nombre ILIKE $1 OR descripcion ILIKE $1 OR ubicacion ILIKE $1
       ORDER BY nombre ASC`,
      [`%${query}%`]
    );
    return rows;
  },

  async create(nombre, slug, descripcion, ubicacion, imagen) {
    const { rows } = await pool.query(
      `INSERT INTO lugares (nombre, slug, descripcion, ubicacion, imagen)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, slug, descripcion, ubicacion, imagen, created_at, updated_at`,
      [nombre, slug, descripcion, ubicacion, imagen]
    );
    return rows[0];
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;

    const allowed = ["nombre", "slug", "descripcion", "ubicacion", "imagen"];
    const safeKeys = keys.filter((k) => allowed.includes(k));
    if (safeKeys.length === 0) return null;

    safeKeys.push("updated_at");
    const setClauses = safeKeys.map((k, i) => {
      if (k === "updated_at") return `${k}=NOW()`;
      return `${k}=$${i + 1}`;
    });
    const values = safeKeys
      .filter((k) => k !== "updated_at")
      .map((k) => fields[k]);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE lugares SET ${setClauses.join(", ")} WHERE id=$${values.length}
       RETURNING id, nombre, slug, descripcion, ubicacion, imagen, created_at, updated_at`,
      values
    );
    return rows[0] || null;
  },

  async delete(id) {
    const { rowCount } = await pool.query("DELETE FROM lugares WHERE id = $1", [id]);
    return rowCount > 0;
  },

  async count() {
    const { rows } = await pool.query("SELECT COUNT(*)::int as count FROM lugares");
    return rows[0].count;
  },
};

module.exports = LugarModel;
