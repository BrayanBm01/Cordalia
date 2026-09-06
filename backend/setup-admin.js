const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setupAdmin() {
  const client = await pool.connect();
  try {
    const existing = await client.query(
      "SELECT id, nombre, email, rol_id FROM usuarios WHERE rol_id = 0 LIMIT 1"
    );

    if (existing.rows.length > 0) {
      const admin = existing.rows[0];
      console.log("Ya existe un administrador:");
      console.log("  Nombre:", admin.nombre);
      console.log("  Email:", admin.email);
      console.log("  La contraseña está hasheada con bcrypt y no se puede recuperar.");
      return;
    }

    const email = "admin@exploraturismo.local";
    const nombre = "Administrador";
    const password = crypto.randomBytes(12).toString("base64url") + "A1!";
    const hashed = await bcrypt.hash(password, 10);

    await client.query(
      "INSERT INTO usuarios (nombre, email, password, rol_id) VALUES ($1, $2, $3, 0)",
      [nombre, email, hashed]
    );

    console.log("Administrador creado:");
    console.log("  ADMIN EMAIL:", email);
    console.log("  ADMIN PASSWORD:", password);
    console.log("  (Cuenta de desarrollo, cambiar en producción)");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

setupAdmin();
