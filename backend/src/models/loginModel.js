const pool = require("../config/db");

const LoginModel = {
  async registrar(usuario_id, exito, ip_address = null, user_agent = null) {
    const { rows } = await pool.query(
      `INSERT INTO login (usuario_id, exito, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [usuario_id, exito, ip_address, user_agent]
    );
    return rows[0];
  },

  async historial(limit = 50) {
    const { rows } = await pool.query(
      `SELECT l.id, l.usuario_id, l.exito, l.fecha, l.ip_address, l.user_agent,
              u.nombre, u.email
       FROM login l
       LEFT JOIN usuarios u ON l.usuario_id = u.id
       ORDER BY l.fecha DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async historialUsuario(usuario_id) {
    const { rows } = await pool.query(
      `SELECT id, usuario_id, exito, fecha, ip_address, user_agent
       FROM login WHERE usuario_id = $1 ORDER BY fecha DESC`,
      [usuario_id]
    );
    return rows;
  },

  async contarExitosos() {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int as count FROM login WHERE exito = true"
    );
    return rows[0].count;
  },

  async contarFallidos() {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int as count FROM login WHERE exito = false"
    );
    return rows[0].count;
  },

  async count() {
    const { rows } = await pool.query("SELECT COUNT(*)::int as count FROM login");
    return rows[0].count;
  },

  async countSuccessfulToday() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int as count FROM login
       WHERE fecha::date = CURRENT_DATE AND exito = true`
    );
    return rows[0].count;
  },

  async countToday() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int as count FROM login
       WHERE fecha::date = CURRENT_DATE`
    );
    return rows[0].count;
  },

  async countFailedToday() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int as count FROM login
       WHERE fecha::date = CURRENT_DATE AND exito = false`
    );
    return rows[0].count;
  },

  async ultimaSesion(usuario_id) {
    const { rows } = await pool.query(
      `SELECT fecha, exito FROM login
       WHERE usuario_id = $1 AND exito = true
       ORDER BY fecha DESC LIMIT 1`,
      [usuario_id]
    );
    return rows[0] || null;
  },

  async intentosRecientes(usuario_id, minutos = 30) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int as count FROM login
       WHERE usuario_id = $1 AND exito = false
       AND fecha > NOW() - INTERVAL '1 minute' * $2`,
      [usuario_id, minutos]
    );
    return rows[0].count;
  },
};

module.exports = LoginModel;