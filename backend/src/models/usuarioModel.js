const pool = require("../config/db");

const UsuarioModel = {
  async findByEmail(email) {
    const { rows } = await pool.query(
      `SELECT id, nombre, email, password, rol_id, token_activo,
              avatar_url, proveedor, google_id, created_at, updated_at
       FROM usuarios WHERE email = $1`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, nombre, email, rol_id, avatar_url,
              proveedor, google_id, created_at, updated_at
       FROM usuarios WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByGoogleId(googleId) {
    const { rows } = await pool.query(
      `SELECT id, nombre, email, password, rol_id, token_activo,
              avatar_url, proveedor, google_id, created_at, updated_at
       FROM usuarios WHERE google_id = $1 AND google_id IS NOT NULL`,
      [googleId]
    );
    return rows[0] || null;
  },

  async create(nombre, email, hashedPassword = null, rol_id = 1, options = {}) {
    const {
      proveedor = "local",
      google_id = null,
      avatar_url = null,
    } = options;
    const password = hashedPassword || "";
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol_id, proveedor, google_id, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nombre, email, rol_id, avatar_url, proveedor, google_id, created_at, updated_at`,
      [nombre, email, password, rol_id, proveedor, google_id, avatar_url]
    );
    return rows[0];
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;

    const allowed = [
      "nombre", "email", "password", "rol_id", "avatar_url",
      "proveedor", "google_id", "updated_at"
    ];
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
      `UPDATE usuarios SET ${setClauses.join(", ")} WHERE id=$${values.length}
       RETURNING id, nombre, email, rol_id, avatar_url, proveedor, created_at, updated_at`,
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
      `SELECT id, nombre, email, rol_id, avatar_url, proveedor, created_at, updated_at
       FROM usuarios ORDER BY id ASC`
    );
    return rows;
  },

  async findAllWithSessionStatus() {
    const { rows } = await pool.query(
      `SELECT id, nombre, email, rol_id, avatar_url, proveedor,
              (token_activo IS NOT NULL) AS sesion_activa,
              created_at, updated_at
       FROM usuarios ORDER BY id ASC`
    );
    return rows;
  },

  async count() {
    const { rows } = await pool.query("SELECT COUNT(*)::int as count FROM usuarios");
    return rows[0].count;
  },

  async countAdmins() {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int as count FROM usuarios WHERE rol_id = 0"
    );
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
