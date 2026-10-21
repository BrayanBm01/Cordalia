/**
 * Reproduccion EXACTA del 500 + 409 del registro de vendedores en un
 * entorno identico a produccion: esquema con 001..018 y 020, pero SIN
 * la migracion 019 (la que falta en la BD de produccion).
 *
 * NO toca ninguna base de datos real: crea y destruye una BD aislada
 * `cordalia_repro_test` en el PostgreSQL local.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const fs = require("fs");
const { Client, Pool } = require("pg");

const RAIZ = path.join(__dirname, "..", "..");
const DIR_MIG = path.join(RAIZ, "database", "migrations");
const SCRATCH = "cordalia_repro_test";
const SIN_019 = "019_prueba_gratuita_suscripciones.sql";

const url = new URL(process.env.DATABASE_URL);
const cfg = {
  host: url.hostname,
  port: Number(url.port) || 5432,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: "postgres",
};

(async () => {
  const admin = new Client(cfg);
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH}`);
  await admin.query(`CREATE DATABASE ${SCRATCH}`);
  await admin.end();

  const c = new Client({ ...cfg, database: SCRATCH });
  await c.connect();
  await c.query(fs.readFileSync(path.join(RAIZ, "database", "schema.sql"), "utf8"));

  const migraciones = fs
    .readdirSync(DIR_MIG)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();
  for (const m of migraciones) {
    if (m === SIN_019) {
      console.log(`  (se OMITE ${m} -> replica la produccion actual)`);
      continue;
    }
    try {
      await c.query(fs.readFileSync(path.join(DIR_MIG, m), "utf8"));
    } catch (e) {
      console.log(`  ${m} -> fallo: ${e.message.slice(0, 90)}`);
    }
  }
  await c.end();

  // Base de datos aislada lista (sin 019). Se imprime la URL para el
  // proceso del servidor (es una BD local temporal; no es un secreto).
  const urlScratch = `postgresql://${cfg.user}:${encodeURIComponent(cfg.password)}@${cfg.host}:${cfg.port}/${SCRATCH}`;
  console.log(`\nBD_AISLADA=${urlScratch}`);

  // Comprobacion: las columnas de la 019 NO existen.
  const p = new Pool({ connectionString: urlScratch });
  const cols = await p.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='usuarios'
        AND column_name IN ('trial_inicio','trial_fin','estado_cuenta')`
  );
  console.log(`columnas de la 019 presentes: ${cols.rows.length} (esperado 0)`);
  await p.end();
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
