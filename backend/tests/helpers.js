const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { Pool } = require("pg");

const BASE = process.env.API_BASE || "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL || "admin@exploraturismo.local";
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function repo(prefix = "f21test") {
  return `${prefix}.${Math.random().toString(36).slice(2, 10)}@test.com`;
}

async function api(pathname, { method = "GET", token, body } = {}) {
  const res = await fetch(BASE + pathname, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function login(email, password) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { status, json } = await api("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (status !== 429) return { status, json, token: json?.data?.token, usuario: json?.data?.usuario };
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  return { status: 429, json: { message: "Rate limit agotado tras reintentos" }, token: undefined, usuario: undefined };
}

async function createUser(adminToken, { nombre, email, password, rol_id }) {
  return api("/api/usuarios", {
    method: "POST",
    token: adminToken,
    body: { nombre, email, password, rol_id },
  });
}

async function q(text, params) {
  const r = await pool.query(text, params);
  return r;
}

async function countAdmins() {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS c FROM usuarios WHERE rol_id = 0"
  );
  return rows[0].c;
}

async function clearSession(email) {
  await q("UPDATE usuarios SET token_activo = NULL WHERE email = $1", [email]);
}

async function cleanupTestData() {
  await q("DELETE FROM usuarios WHERE email LIKE $1", ["f21test.%"]);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertStatus(status, esperado, msg) {
  assert(status === esperado, `${msg} (status ${status}, esperado ${esperado})`);
}

function assertMsg(json, textoEsperado) {
  assert(
    typeof json?.message === "string" &&
      json.message.toLowerCase().includes(textoEsperado.toLowerCase()),
    `mensaje esperado "${textoEsperado}" pero fue: ${JSON.stringify(json)}`
  );
}

// ---------- Suite runner ----------
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function main() {
  // Carga TODAS las suites ANTES de ejecutarlas: cada archivo registra sus
  // pruebas al requerirlo, por lo que requerir una suite después de llamar a
  // main() no ejecutaba nada. Se hace aquí para que `node tests/run-all.js` y
  // las ejecuciones individuales compartan el mismo runner.
  const suiteDir = __dirname;
  const suites = fs
    .readdirSync(suiteDir)
    .filter((f) => /^\d+-.*\.test\.js$/.test(f))
    .sort();
  const requireCacheAntes = new Set(Object.keys(require.cache));
  for (const suite of suites) {
    require(path.join(suiteDir, suite));
  }
  const suitesRequeridas = new Set();
  for (const clave of Object.keys(require.cache)) {
    if (requireCacheAntes.has(clave)) continue;
    const m = /[\\/](\d+-[^\\/]*\.test\.js)$/.exec(clave);
    if (m) suitesRequeridas.add(m[1]);
  }

  console.log(`\n  === Ejecutando ${tests.length} pruebas de ${suitesRequeridas.size} suites ===\n`);
  let pass = 0;
  let fail = 0;
  const failures = [];
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✓ ${t.name}`);
      pass++;
    } catch (e) {
      console.error(`  ✗ ${t.name}\n      ${e.message}`);
      fail++;
      failures.push(t.name);
    }
  }
  console.log(
    `\n  Resultado: ${pass} PASS, ${fail} FAIL` +
      (failures.length ? `\n  Fallos: ${failures.join(", ")}` : "")
  );
  await cleanupTestData();
  await pool.end();
  process.exit(fail ? 1 : 0);
}

module.exports = {
  BASE,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  repo,
  api,
  login,
  createUser,
  q,
  countAdmins,
  clearSession,
  cleanupTestData,
  assert,
  assertStatus,
  assertMsg,
  test,
  main,
};