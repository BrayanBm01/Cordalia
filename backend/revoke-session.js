const { Pool } = require("pg");
const readline = require("readline");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: node revoke-session.js <email>");
    console.error("Ejemplo: node revoke-session.js admin@exploraturismo.local");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT id, nombre, email, rol_id, token_activo IS NOT NULL AS sesion_activa FROM usuarios WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      console.error("Usuario no encontrado:", email);
      process.exit(1);
    }

    const user = rows[0];
    const rolNombre = user.rol_id === 0 ? "ADMIN" : "USER";

    console.log("\n--- Usuario encontrado ---");
    console.log("  Nombre:", user.nombre);
    console.log("  Email:", user.email);
    console.log("  Rol:", rolNombre);
    console.log("  Sesión activa:", user.sesion_activa ? "SÍ" : "NO");

    if (!user.sesion_activa) {
      console.log("\nEste usuario no tiene una sesión activa. Nada que revocar.");
      process.exit(0);
    }

    const confirm = await ask("\n¿Deseas revocar esta sesión? [s/N] ");
    if (confirm.trim().toLowerCase() !== "s") {
      console.log("Operación cancelada.");
      process.exit(0);
    }

    const { rowCount } = await client.query(
      "UPDATE usuarios SET token_activo = NULL WHERE id = $1 AND token_activo IS NOT NULL",
      [user.id]
    );

    if (rowCount > 0) {
      console.log("\n✅ Sesión revocada correctamente.");
      console.log("  El usuario podrá volver a iniciar sesión normalmente.");
    } else {
      console.log("\nNo se pudo revocar la sesión.");
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    client.release();
    rl.close();
    await pool.end();
  }
}

main();
