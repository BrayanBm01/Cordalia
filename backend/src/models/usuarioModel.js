const pool = require("../config/db");

const UsuarioModel = {
  async findByEmail(email) {
    const { rows } = await pool.query(
      "SELECT id, nombre, email, password, rol_id, token_activo FROM usuarios WHERE email = $1",
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await pool.query(
      "SELECT id, nombre, email, rol_id FROM usuarios WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  },

  async create(nombre, email, hashedPassword, rol_id = 1) {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol_id`,
      [nombre, email, hashedPassword, rol_id]
    );
    return rows[0];
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;

    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const values = keys.map((k) => fields[k]);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE usuarios SET ${setClauses.join(", ")} WHERE id=$${values.length} RETURNING id, nombre, email, rol_id`,
      values
    );
    return rows[0] || null;
  },

  async delete(id) {
    const { rowCount } = await pool.query(
      "DELETE FROM usuarios WHERE id = $1",
      [id]
    );
    return rowCount > 0;
  },

  async findAll() {
    const { rows } = await pool.query(
      "SELECT id, nombre, email, rol_id FROM usuarios ORDER BY id ASC"
    );
    return rows;
  },

  async findAllWithSessionStatus() {
    const { rows } = await pool.query(
      "SELECT id, nombre, email, rol_id, (token_activo IS NOT NULL) AS sesion_activa FROM usuarios ORDER BY id ASC"
    );
    return rows;
  },

  async count() {
    const { rows } = await pool.query("SELECT COUNT(*)::int as count FROM usuarios");
    return rows[0].count;
  },

  async setToken(id, token) {
    await pool.query("UPDATE usuarios SET token_activo = $1 WHERE id = $2", [token, id]);
  },

  async clearToken(id) {
    await pool.query("UPDATE usuarios SET token_activo = NULL WHERE id = $1", [id]);
  },

  async revokeSession(id) {
    const { rowCount } = await pool.query(
      "UPDATE usuarios SET token_activo = NULL WHERE id = $1 AND token_activo IS NOT NULL",
      [id]
    );
    return rowCount > 0;
  },
};

module.exports = UsuarioModel;
