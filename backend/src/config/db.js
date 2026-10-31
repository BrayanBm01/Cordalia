const { Pool } = require("pg");
require("dotenv").config();

const useSSL = process.env.DB_SSL === "true";

function envInt(nombre, porDefecto) {
  const valor = Number.parseInt(process.env[nombre] ?? "", 10);
  return Number.isInteger(valor) && valor > 0 ? valor : porDefecto;
}

// Limites del pool y timeouts: evitan que una consulta lenta o una fuga
// de conexiones deje la API sin recursos. Todos son configurables.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: envInt("DB_POOL_MAX", 10),
  idleTimeoutMillis: envInt("DB_IDLE_TIMEOUT_MS", 30000),
  connectionTimeoutMillis: envInt("DB_CONNECTION_TIMEOUT_MS", 5000),
  statement_timeout: envInt("DB_STATEMENT_TIMEOUT_MS", 15000),
  query_timeout: envInt("DB_QUERY_TIMEOUT_MS", 15000),
  application_name: "cordalia-api",
});

// Un error en un cliente inactivo no debe tumbar el proceso.
pool.on("error", (error) => {
  console.error("[db] Error en cliente inactivo del pool:", error.message);
});

// Comprobar la conexión sin dejar un cliente ocupado.
pool
  .query("SELECT NOW()")
  .then((res) => {
    console.log("✅ Conectado a PostgreSQL");
    console.log("🕒 Hora del servidor:", res.rows[0]);
  })
  .catch((err) => {
    console.error("❌ Error de conexión:", err.message);
  });

module.exports = pool;
