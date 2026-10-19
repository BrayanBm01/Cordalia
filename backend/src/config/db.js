const { Pool } = require("pg");
require("dotenv").config();

const useSSL = process.env.DB_SSL === "true";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

// Comprobar la conexión sin dejar un cliente ocupado
pool.query("SELECT NOW()")
  .then((res) => {
    console.log("✅ Conectado a PostgreSQL");
    console.log("🕒 Hora del servidor:", res.rows[0]);
  })
  .catch((err) => {
    console.error("❌ Error de conexión:", err.message);
  });

module.exports = pool;