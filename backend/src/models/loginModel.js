const pool = require("../config/db");

const LoginModel = {
  async registrar(usuario_id, exito) {
    await pool.query(
      "INSERT INTO login (usuario_id, exito) VALUES ($1, $2)",
      [usuario_id, exito]
    );
  },

  async historial(limit = 50) {
    const { rows } = await pool.query(
      `SELECT l.id, l.usuario_id, l.exito, l.fecha, u.nombre, u.email
       FROM login l
       LEFT JOIN usuarios u ON l.usuario_id = u.id
       ORDER BY l.fecha DESC
       LIMIT $1`,
      [limit]
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
};

module.exports = LoginModel;
