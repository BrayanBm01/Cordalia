// ============================================================
// 16-password-google.test.js — Contraseña local para cuentas
// creadas con Google y recuperacion de contraseña.
//
// Cubre:
//   * Usuario de Google SIN contraseña local: puede establecer una.
//   * Usuario con contraseña local: para cambiarla exige la actual.
//   * Mensaje genérico cuando la contraseña no coincide (no revela
//     si el correo existe).
//   * Recuperación: token de un solo uso, expiración, y respuesta
//     genérica (no revela si el correo está registrado).
//   * Un token no se puede reutilizar.
//   * Sin sesión no se puede establecer contraseña.
// ============================================================
const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;
const pass = "Test1234x!";

h.test("PWD: setup (admin y dos usuarios)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const emailA = h.repo("f21test.pwd.google");
  const emailB = h.repo("f21test.pwd.local");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Google Sin Password", email: emailA, password: pass, rol_id: 1 })).status, 201, "crear usuario A");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Local Con Password", email: emailB, password: pass, rol_id: 1 })).status, 201, "crear usuario B");

  const A = await h.login(emailA, pass);
  const B = await h.login(emailB, pass);
  h.assertStatus(A.status, 200, "login A");
  h.assertStatus(B.status, 200, "login B");
  h.test.A = A;
  h.test.B = B;
  h.test.emailA = emailA;
  h.test.emailB = emailB;
});

h.test("PWD: un usuario SIN sesión no puede establecer contraseña", async () => {
  const r = await h.api("/api/auth/password", {
    method: "POST", body: { password_nueva: "NuevaClave1" },
  });
  h.assertStatus(r.status, 401, "sin token → 401");
});

h.test("PWD: una cuenta de Google sin contraseña local puede establecer la suya", async () => {
  // Simulamos una cuenta creada SOLO con Google (sin password en la BD).
  // El email va en minusculas: el backend normaliza con toLowerCase().
  const emailG = h.repo("f21test.pwd.sologoogle");
  h.assertStatus((await h.createUser(h.test.adminToken, { nombre: "Solo Google", email: emailG, password: pass, rol_id: 1 })).status, 201, "crear usuario google");

  // Se guarda el hash original para poder restaurarlo (la BD guarda el hash,
  // nunca el texto plano).
  const { rows: conHash } = await h.q("SELECT password FROM usuarios WHERE email = $1", [emailG]);
  const hashOriginal = conHash[0].password;
  await h.q("UPDATE usuarios SET password = '', proveedor = 'google' WHERE email = $1", [emailG]);

  // Una cuenta de Google SIN contraseña local no puede entrar por contraseña.
  const G = await h.login(emailG, pass);
  h.assertStatus(G.status, 401, "cuenta Google sin contraseña no entra por contraseña");
  h.assertMsg(G.json, "Google");

  // Se restaura el hash para poder iniciar sesión y probar el flujo de
  // "establecer contraseña" con la sesión ya iniciada.
  await h.q("UPDATE usuarios SET password = $2 WHERE email = $1", [emailG, hashOriginal]);
  await h.clearSession(emailG);
  const G2 = await h.login(emailG, pass);
  h.assertStatus(G2.status, 200, "login del usuario google");
  await h.q("UPDATE usuarios SET password = '' WHERE email = $1", [emailG]);
  h.test.G = G2;
  h.test.emailG = emailG;

  // Establece su contraseña (no hay contraseña actual que exigir).
  const r = await h.api("/api/auth/password", {
    method: "POST", token: h.test.G.token, body: { password_nueva: "ClavePropia123" },
  });
  h.assertStatus(r.status, 200, "establecer contraseña propia");
  h.assertMsg(r.json, "establecida");

  // Ya puede entrar con correo y contraseña.
  await h.clearSession(emailG);
  const loginNuevo = await h.login(emailG, "ClavePropia123");
  h.assertStatus(loginNuevo.status, 200, "login con la contraseña propia");
  h.test.G = loginNuevo;
});

h.test("PWD: una cuenta con contraseña local NO puede cambiarla sin la actual", async () => {
  const r = await h.api("/api/auth/password", {
    method: "POST", token: h.test.B.token, body: { password_nueva: "CambioSinActual1" },
  });
  h.assertStatus(r.status, 400, "cambiar sin la actual → 400");
  h.assertMsg(r.json, "actual");

  // Con la actual incorrecta → 401.
  const mala = await h.api("/api/auth/password", {
    method: "POST", token: h.test.B.token,
    body: { password_nueva: "CambioSinActual1", password_actual: "NoEsLaMia99" },
  });
  h.assertStatus(mala.status, 401, "actual incorrecta → 401");
});

h.test("PWD: cambiar la contraseña con la actual correcta funciona", async () => {
  const r = await h.api("/api/auth/password", {
    method: "POST", token: h.test.B.token,
    body: { password_nueva: "CambioValido123", password_actual: pass },
  });
  h.assertStatus(r.status, 200, "cambio con la actual correcta");
  h.assertMsg(r.json, "actualizada");

  await h.clearSession(h.test.emailB);
  const loginNuevo = await h.login(h.test.emailB, "CambioValido123");
  h.assertStatus(loginNuevo.status, 200, "login con la nueva contraseña");
});

h.test("PWD: la contraseña se guarda con hash (nunca en texto plano)", async () => {
  const { rows } = await h.q(
    "SELECT password FROM usuarios WHERE email = $1",
    [h.test.emailB]
  );
  h.assert(rows[0].password !== null, "hay password");
  h.assert(rows[0].password !== "CambioValido123", "no está en texto plano");
  h.assert(/^\$2[aby]\$/.test(rows[0].password), `es un hash bcrypt (${String(rows[0].password).slice(0, 10)}...)`);
});

h.test("PWD: la recuperación no revela si el correo está registrado", async () => {
  const existente = await h.api("/api/auth/recuperar-password", {
    method: "POST", body: { email: h.test.emailA },
  });
  h.assertStatus(existente.status, 200, "recuperación con correo existente");

  const inexistente = await h.api("/api/auth/recuperar-password", {
    method: "POST", body: { email: h.repo("f21test.pwd.inexistente") },
  });
  h.assertStatus(inexistente.status, 200, "recuperación con correo inexistente");
  h.assert(existente.json.message === inexistente.json.message, "el mismo mensaje en ambos casos");
});

h.test("PWD: el token de recuperación es de un solo uso y permite entrar con la nueva contraseña", async () => {
  const sol = await h.api("/api/auth/recuperar-password", {
    method: "POST", body: { email: h.test.emailA },
  });
  h.assertStatus(sol.status, 200, "solicitar recuperación");
  const enlace = sol.json.enlace_pruebas;
  h.assert(typeof enlace === "string" && enlace.includes("token="), "enlace con token en desarrollo");
  // El enlace puede ser relativo si FRONTEND_URL no esta configurado.
  const token = String(enlace).split("token=")[1].split("&")[0];

  // Token inválido → 400.
  const invalido = await h.api("/api/auth/resetear-password", {
    method: "POST", body: { token: "token-inventado", password: "NuevaClave999" },
  });
  h.assertStatus(invalido.status, 400, "token inválido → 400");

  // Token válido → establece la contraseña.
  const ok = await h.api("/api/auth/resetear-password", {
    method: "POST", body: { token, password: "Recuperada123" },
  });
  h.assertStatus(ok.status, 200, "token válido → contraseña restablecida");

  // El mismo token NO sirve otra vez (un solo uso).
  const repetido = await h.api("/api/auth/resetear-password", {
    method: "POST", body: { token, password: "OtraClave123" },
  });
  h.assertStatus(repetido.status, 400, "el token no se puede reutilizar");

  // Puede entrar con la nueva contraseña.
  await h.clearSession(h.test.emailA);
  const loginNuevo = await h.login(h.test.emailA, "Recuperada123");
  h.assertStatus(loginNuevo.status, 200, "login con la contraseña recuperada");
});

h.test("PWD: la contraseña recuperada queda hasheada", async () => {
  const { rows } = await h.q("SELECT password FROM usuarios WHERE email = $1", [h.test.emailA]);
  h.assert(rows[0].password !== "Recuperada123", "no está en texto plano");
  h.assert(/^\$2[aby]\$/.test(rows[0].password), "hash bcrypt");
});

h.test("PWD: el login con contraseña incorrecta da un mensaje genérico", async () => {
  const r = await h.api("/api/auth/login", {
    method: "POST", body: { email: h.test.emailA, password: "ClaveIncorrecta999" },
  });
  h.assertStatus(r.status, 401, "login incorrecto → 401");
  h.assertMsg(r.json, "Credenciales incorrectas");
});
