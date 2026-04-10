const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // External Database URL
  ssl: {
    rejectUnauthorized: false
  }
});

// Conexión de prueba
pool.connect()
  .then(client => {
    console.log("✅ Conectado a PostgreSQL");
    return client.query("SELECT NOW()");
  })
  .then(res => {
    console.log("🕒 Hora del servidor:", res.rows[0]);
  })
  .catch(err => {
    console.error("❌ Error de conexión:", err);
  });

module.exports = pool;