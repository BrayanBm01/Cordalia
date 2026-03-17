const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

pool.connect()
  .then(client => {
    console.log("✅ Conectado a PostgreSQL");

    // prueba real de consulta
    return client.query("SELECT NOW()");
  })
  .then(res => {
    console.log("🕒 Hora del servidor:", res.rows[0]);
  })
  .catch(err => {
    console.error("❌ Error de conexión:", err);
  });

module.exports = pool;