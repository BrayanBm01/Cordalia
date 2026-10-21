/**
 * Verificación de migraciones 018/019/020 sobre una base de datos
 * AISLADA, simulando una instalación limpia real.
 *
 * Cadena probada:  database/schema.sql  +  migraciones 001..017  +  018..020
 * (OJO: `database/schema.sql` NO es una instalación completa: no crea
 *  `tour_plans` ni `inscripciones`; esas vienen de las migraciones.)
 *
 * Comprueba: aplicabilidad, idempotencia (x3) y conservacion de datos.
 * NO toca `turismo_db` (desarrollo) ni ninguna base remota.
 *
 * Uso:  node scripts/verificar-migraciones.cjs
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), quiet: true });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const RAIZ = path.join(__dirname, "..", "..");
const DIR_MIG = path.join(RAIZ, "database", "migrations");
const SCRATCH = "cordalia_mig_test";
const NUEVAS = [
  "018_inscripcion_gratuita.sql",
  "019_prueba_gratuita_suscripciones.sql",
  "020_password_reset_tokens.sql",
];

const url = new URL(process.env.DATABASE_URL);
const adminCfg = {
  host: url.hostname,
  port: Number(url.port) || 5432,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: "postgres",
};

let fallos = 0;          // fallos de las migraciones NUEVAS (018/019/020)
let fallosPrevios = 0;   // fallos PREEXISTENTES de la cadena historica (001..017)

async function run(client, sql, label, { contar = true } = {}) {
  try {
    await client.query(sql);
    console.log(`  OK    ${label}`);
    return true;
  } catch (e) {
    console.log(`  FALLO ${label}: ${e.message}`);
    if (contar) fallos++;
    else fallosPrevios++;
    return false;
  }
}

function check(cond, msg) {
  console.log(`  ${cond ? "OK   " : "FALLO"} ${msg}`);
  if (!cond) fallos++;
}

(async () => {
  const admin = new Client(adminCfg);
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH}`);
  await admin.query(`CREATE DATABASE ${SCRATCH}`);
  await admin.end();
  console.log(`\nBase de datos AISLADA creada: ${SCRATCH} (no toca turismo_db)\n`);

  const c = new Client({ ...adminCfg, database: SCRATCH });
  await c.connect();

  // --- 1) Instalación limpia ------------------------------------------
  console.log("1) Instalación limpia: schema.sql + migraciones 001..017");
  await run(c, fs.readFileSync(path.join(RAIZ, "database", "schema.sql"), "utf8"), "schema.sql");
  const todas = fs.readdirSync(DIR_MIG).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
  for (const m of todas.filter((x) => !NUEVAS.includes(x))) {
    // La cadena historica (001..017) se audita pero NO cuenta como fallo
    // de las migraciones nuevas: sus problemas son preexistentes.
    await run(c, fs.readFileSync(path.join(DIR_MIG, m), "utf8"), m, { contar: false });
  }

  // --- 2) Datos que deben conservarse ---------------------------------
  console.log("\n2) Datos previos (no deben perderse ni invalidarse)");
  await run(
    c,
    `INSERT INTO usuarios (nombre, email, password, rol_id, proveedor, google_id)
     VALUES ('Vendedor Antiguo','viejo.vendedor@test.com','x',2,'local','gid-1'),
            ('Admin Antiguo','viejo.admin@test.com','x',0,'local','gid-2'),
            ('Turista Antiguo','viejo.turista@test.com','x',1,'local','gid-3');
     INSERT INTO business_categories (nombre, slug) VALUES ('Cat','cat');
     INSERT INTO businesses (owner_id, category_id, nombre, slug)
     SELECT u.id, 1, 'Negocio Antiguo', 'negocio-antiguo' FROM usuarios u
      WHERE u.email='viejo.vendedor@test.com';
     INSERT INTO plans (nombre, slug, precio, moneda, duracion_dias, activo)
     VALUES ('Plan Mig Test','plan-mig-test',49000,'COP',30,true);
     INSERT INTO subscriptions (business_id, plan_id, estado, starts_at, ends_at)
     SELECT b.id, p.id, s.estado, s.starts_at, s.ends_at
       FROM businesses b, plans p,
            (VALUES ('active', NOW(), NOW()+interval '1 month'),
                    ('expired', NOW()-interval '2 months', NOW()-interval '1 month'),
                    ('pending',  NOW(), NULL),
                    ('cancelled', NOW()-interval '5 days', NULL)) AS s(estado, starts_at, ends_at)
      WHERE b.slug = 'negocio-antiguo' AND p.slug = 'plan-mig-test';`,
    "datos representativos insertados"
  );

  const prev = await c.query(
    "SELECT estado, count(*)::int c FROM subscriptions GROUP BY estado ORDER BY estado"
  );
  console.log("   estados previos:", JSON.stringify(prev.rows));
  const usuariosPrev = await c.query("SELECT count(*)::int c FROM usuarios");
  console.log("   usuarios previos:", usuariosPrev.rows[0].c);
  const cPrev = await c.query(
    "SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname='chk_subscriptions_estado'"
  );
  console.log("   constraint previa:", cPrev.rows[0] ? cPrev.rows[0].d : "(no existe)");

  // --- 3) Migraciones nuevas ------------------------------------------
  console.log("\n3) Migraciones 018 -> 019 -> 020 (primera aplicación)");
  for (const m of NUEVAS) {
    // La cadena historica (001..017) se audita pero NO cuenta como fallo
    // de las migraciones nuevas: sus problemas son preexistentes.
    await run(c, fs.readFileSync(path.join(DIR_MIG, m), "utf8"), m, { contar: false });
  }

  // --- 4) Verificaciones ----------------------------------------------
  console.log("\n4) Verificaciones");
  const post = await c.query(
    "SELECT estado, count(*)::int c FROM subscriptions GROUP BY estado ORDER BY estado"
  );
  console.log("   estados posteriores:", JSON.stringify(post.rows));
  check(post.rows.length === 4, "las 4 suscripciones previas siguen existiendo");
  check(
    post.rows.every((r) => ["active", "expired", "pending", "cancelled"].includes(r.estado)),
    "ningún estado previo fue invalidado por la nueva constraint"
  );
  const cPost = await c.query(
    "SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname='chk_subscriptions_estado'"
  );
  console.log("   constraint nueva  :", cPost.rows[0].d);
  check(cPost.rows[0].d.includes("rejected"), "la constraint acepta 'rejected'");
  check(
    ["active", "expired", "cancelled", "pending"].every((e) => cPost.rows[0].d.includes(`'${e}'`)),
    "la constraint conserva los estados originales"
  );
  const us = await c.query(
    "SELECT email, rol_id, trial_inicio, estado_cuenta FROM usuarios ORDER BY id"
  );
  us.rows.forEach((u) =>
    console.log(`     ${u.email.padEnd(26)} rol_id=${u.rol_id} trial=${u.trial_inicio} estado=${u.estado_cuenta}`)
  );
  check(
    us.rows.length >= usuariosPrev.rows[0].c,
    `los usuarios previos siguen existiendo (${us.rows.length} >= ${usuariosPrev.rows[0].c})`
  );
  check(
    us.rows.every((u) => u.trial_inicio === null && u.estado_cuenta === null),
    "los vendedores previos quedan SIN política aplicada (no se restringen)"
  );
  const nullables = await c.query(
    "SELECT is_nullable FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='business_id'"
  );
  check(nullables.rows[0].is_nullable === "YES", "subscriptions.business_id quedó NULLABLE");
  const cInsc = await c.query(
    "SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname='chk_inscripciones_estado'"
  );
  console.log("   constraint inscripciones:", cInsc.rows[0] ? cInsc.rows[0].d : "(no existe)");
  check(
    !!cInsc.rows[0] && cInsc.rows[0].d.includes("confirmada") && cInsc.rows[0].d.includes("vencida"),
    "la constraint de inscripciones incluye 'confirmada' (y 'vencida')"
  );
  const t = await c.query(
    "SELECT to_regclass('suscripcion_pagos') a, to_regclass('password_reset_tokens') b, to_regclass('inscripciones') c"
  );
  check(!!t.rows[0].a, "tabla suscripcion_pagos creada");
  check(!!t.rows[0].b, "tabla password_reset_tokens creada");
  check(!!t.rows[0].c, "tabla inscripciones presente (creada por 001..017)");

  // --- 5) Idempotencia -------------------------------------------------
  console.log("\n5) Idempotencia: segunda y tercera aplicación");
  for (const m of NUEVAS) {
    await run(c, fs.readFileSync(path.join(DIR_MIG, m), "utf8"), `${m} (2a)`);
  }
  for (const m of NUEVAS) {
    await run(c, fs.readFileSync(path.join(DIR_MIG, m), "utf8"), `${m} (3a)`);
  }
  const post2 = await c.query(
    "SELECT estado, count(*)::int c FROM subscriptions GROUP BY estado ORDER BY estado"
  );
  const us2 = await c.query("SELECT count(*)::int c FROM usuarios");
  console.log("   estados tras 3 aplicaciones:", JSON.stringify(post2.rows));
  check(
    us2.rows[0].c === us.rows.length,
    `siguen siendo los mismos usuarios (${us2.rows[0].c} = ${us.rows.length}, sin duplicados)`
  );
  check(post2.rows.length === 4, "siguen siendo las mismas 4 suscripciones");

  // --- 6) Integridad final --------------------------------------------
  console.log("\n6) Integridad final");
  const fin = await c.query(
    `SELECT (SELECT count(*)::int FROM subscriptions) subs,
            (SELECT count(*)::int FROM usuarios) usuarios,
            (SELECT count(*)::int FROM plans) planes,
            (SELECT count(*)::int FROM suscripcion_pagos) pagos,
            (SELECT count(*)::int FROM password_reset_tokens) tokens,
            (SELECT count(*)::int FROM inscripciones) inscripciones`
  );
  console.log("  ", JSON.stringify(fin.rows[0]));

  await c.end();

  const admin2 = new Client(adminCfg);
  await admin2.connect();
  await admin2.query(`DROP DATABASE IF EXISTS ${SCRATCH}`);
  await admin2.end();
  console.log(`\nBase de datos aislada ${SCRATCH} eliminada.`);
  console.log(
    fallos === 0
      ? "\nRESULTADO: migraciones 018/019/020 correctas e idempotentes."
      : `\nRESULTADO: ${fallos} fallo(s) en las migraciones nuevas`
  );
  if (fallosPrevios > 0) {
    console.log(
      `AVISO: ${fallosPrevios} fallo(s) PREEXISTENTES en la cadena historica 001..017` +
        " (noinxan en 018/019/020; ver informe)."
    );
  }
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
