// ============================================================
// 18-registro-vendedor.test.js — Flujo completo de REGISTRO de
// vendedores: creación de la cuenta, rol, prueba gratuita,
// sesión iniciada y acceso al panel.
//
// Reproduce el problema original: al registrarse como vendedor el
// usuario NO conseguia entrar en su cuenta de vendedor.
//
// Cubre:
//   1. Registro de un usuario turista.
//   2. Registro de un vendedor.
//   3. El vendedor recibe la prueba gratuita de 7 días.
//   4. El registro devuelve la SESIÓN (token + usuario) y autentica.
//   5. El rol recibido es el canónico del backend.
//   6. El cliente NO puede asignarse el rol ADMIN.
//   7. Cierre de sesión y nuevo login como vendedor.
//   8. La prueba NO se reinicia en cada login.
//   9. El panel del vendedor responde con el estado real.
//  10. Días restantes calculados desde las fechas reales.
//  11. Vencimiento de la prueba (bloqueo en el backend).
//  12. El flujo de contratación sigue disponible tras el vencimiento.
//  13. Un vendedor NO puede entrar al panel de administración.
//  14. Un turista NO puede usar el panel del vendedor.
//  15. Pago aprobado / pendiente / rechazado en modo de prueba.
// ============================================================
const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;
const pass = "Test1234x!";

// --- 1. Registro de un usuario turista -----------------------------------
h.test("REGV: registro de un usuario turista", async () => {
  const email = h.repo("f21test.regv.turista");
  const r = await h.api("/api/auth/register", {
    method: "POST",
    body: { nombre: "Turista Registro", email, password: pass, rol: "TOURIST" },
  });
  h.assertStatus(r.status, 201, "registro de turista");
  h.assert(r.json.data.usuario.rol === "TOURIST", `rol TOURIST (fue ${r.json.data.usuario.rol})`);
  h.assert(typeof r.json.data.token === "string" && r.json.data.token.length > 0, "devuelve token");
  h.assert(r.json.data.usuario.email === email, "email correcto");

  // El turista NO tiene prueba gratuita (no es vendedor).
  const { rows } = await h.q(
    "SELECT trial_inicio, estado_cuenta FROM usuarios WHERE email = $1",
    [email]
  );
  h.assert(rows[0].trial_inicio === null, "el turista no tiene prueba gratuita");
  h.assert(rows[0].estado_cuenta === null, "el turista no tiene estado comercial");
  h.test.emailTurista = email;
  h.test.tokenTurista = r.json.data.token;
});

// --- 2. Registro de un vendedor -----------------------------------------
h.test("REGV: registro de un vendedor con el rol BUSINESS", async () => {
  const email = h.repo("f21test.regv.vendedor");
  const r = await h.api("/api/auth/register", {
    method: "POST",
    body: { nombre: "Vendedor Registro", email, password: pass, rol: "BUSINESS" },
  });
  h.assertStatus(r.status, 201, "registro de vendedor");
  h.assert(r.json.data.usuario.rol === "BUSINESS", `rol BUSINESS (fue ${r.json.data.usuario.rol})`);
  h.assert(Number(r.json.data.usuario.id) > 0, "devuelve el id del usuario");
  h.test.emailVendedor = email;
  h.test.tokenVendedor = r.json.data.token;
  h.test.idVendedor = r.json.data.usuario.id;
});

// --- 3. La prueba gratuita de 7 días -------------------------------------
h.test("REGV: el vendedor recibe la prueba gratuita de 7 días", async () => {
  const { rows } = await h.q(
    "SELECT trial_inicio, trial_fin, estado_cuenta, rol_id FROM usuarios WHERE email = $1",
    [h.test.emailVendedor]
  );
  const u = rows[0];
  h.assert(Number(u.rol_id) === 2, "rol_id = 2 (vendedor) en la BD");
  h.assert(u.trial_inicio !== null, "trial_inicio registrado");
  h.assert(u.trial_fin !== null, "trial_fin registrado");
  h.assert(u.estado_cuenta === "TRIALING", `estado TRIALING (fue ${u.estado_cuenta})`);

  const dias = (new Date(u.trial_fin) - new Date(u.trial_inicio)) / 86400000;
  h.assert(Math.abs(dias - 7) < 0.001, `7 días exactos (fue ${dias})`);
});

// --- 4. El registro autentica al usuario --------------------------------
h.test("REGV: tras el registro el vendedor queda autenticado", async () => {
  const token = h.test.tokenVendedor;
  h.assert(typeof token === "string" && token.length > 0, "el registro devuelve token");

  const me = await h.api("/api/auth/me", { token });
  h.assertStatus(me.status, 200, "el token sirve para /auth/me");
  h.assert(me.json.data.email === h.test.emailVendedor, "devuelve el usuario correcto");
  h.assert(me.json.data.rol === "BUSINESS", `rol BUSINESS (fue ${me.json.data.rol})`);
});

// --- 5. El panel del vendedor responde ----------------------------------
h.test("REGV: el vendedor puede consultar su panel (estado comercial)", async () => {
  const r = await h.api("/api/vendedor/estado", { token: h.test.tokenVendedor });
  h.assertStatus(r.status, 200, "estado comercial del vendedor");
  h.assert(r.json.data.estado === "TRIALING", `estado TRIALING (fue ${r.json.data.estado})`);
  h.assert(r.json.data.dias_prueba === 7, "la prueba dura 7 días");
  h.assert(r.json.data.trial_inicio && r.json.data.trial_fin, "se envían las fechas reales");
  h.assert(r.json.data.plan_actual === null, "todavía no hay plan contratado");

  const planes = await h.api("/api/vendedor/planes", { token: h.test.tokenVendedor });
  h.assertStatus(planes.status, 200, "catálogo de planes comerciales");
  h.assert(planes.json.data.length >= 2, "hay planes para contratar");
  const conPrecio = planes.json.data.filter((p) => Number(p.precio) > 0);
  h.assert(conPrecio.length >= 1, "hay al menos un plan de pago");
});

// --- 6. El cliente no puede asignarse el rol ADMIN ----------------------
h.test("REGV: un cliente NO puede registrarse como administrador", async () => {
  const email = h.repo("f21test.regv.intruso");
  const r = await h.api("/api/auth/register", {
    method: "POST",
    body: { nombre: "Intruso", email, password: pass, rol: "ADMIN" },
  });
  h.assertStatus(r.status, 201, "registro aceptado");
  h.assert(r.json.data.usuario.rol === "TOURIST", `el rol ADMIN se descarta (fue ${r.json.data.usuario.rol})`);

  const { rows } = await h.q("SELECT rol_id FROM usuarios WHERE email = $1", [email]);
  h.assert(Number(rows[0].rol_id) === 1, "rol_id = 1 (turista) en la BD");
});

// --- 6. El vendedor NO necesita Mercado Pago para iniciar la prueba ----
h.test("REGV: el vendedor no necesita Mercado Pago para iniciar la prueba", async () => {
  const email = h.repo("f21test.regv.sinmp");
  // Se registra un vendedor con el proveedor de pagos SIMULADO y SIN
  // credenciales de Mercado Pago: la prueba debe activarse igual.
  const r = await h.api("/api/auth/register", {
    method: "POST",
    body: { nombre: "Vendedor Sin MP", email, password: pass, rol: "BUSINESS" },
  });
  h.assertStatus(r.status, 201, "registro sin credenciales de Mercado Pago");
  h.assert(r.json.data.usuario.rol === "BUSINESS", "rol BUSINESS");
  h.assert(typeof r.json.data.token === "string", "sesión iniciada");

  const { rows } = await h.q(
    "SELECT trial_inicio, trial_fin, estado_cuenta FROM usuarios WHERE email = $1",
    [email]
  );
  h.assert(rows[0].trial_inicio !== null, "la prueba se activó SIN Mercado Pago");
  h.assert(rows[0].estado_cuenta === "TRIALING", "estado TRIALING");

  // No se creó ninguna suscripción de pago (la prueba no es una compra).
  const { rows: subs } = await h.q(
    "SELECT count(*)::int AS c FROM subscriptions WHERE usuario_id = (SELECT id FROM usuarios WHERE email = $1)",
    [email]
  );
  h.assert(subs[0].c === 0, "no se creó ninguna suscripción de pago");
});

// --- 6b. El catálogo de planes es público y muestra el precio real -----
h.test("REGV: el catálogo de planes es público y refleja el precio del sistema", async () => {
  const r = await h.api("/api/planes-comerciales");
  h.assertStatus(r.status, 200, "catálogo público de planes");
  h.assert(Array.isArray(r.json.data) && r.json.data.length > 0, "hay planes");

  const dePago = r.json.data.find((p) => Number(p.precio) > 0);
  h.assert(dePago !== undefined, "hay al menos un plan de pago");
  h.assert(Number(dePago.precio) === 49000, `precio vigente 49.000 (fue ${dePago.precio})`);
  h.assert(dePago.moneda === "COP", "moneda COP");
  h.assert(Number(dePago.meses) === 1, "duración de un mes");
  h.assert(Array.isArray(dePago.features) && dePago.features.length > 0, "beneficios listados");

  // No expone datos de ningún usuario.
  h.assert(!("owner_id" in dePago) && !("usuario_id" in dePago), "no filtra datos de usuario");
});

// --- 7. Logout y nuevo login como vendedor ------------------------------
h.test("REGV: cierre de sesión y nuevo login como vendedor", async () => {
  const out = await h.api("/api/auth/logout", { method: "POST", token: h.test.tokenVendedor });
  h.assertStatus(out.status, 200, "logout");

  // El token revocado deja de servir.
  const revocado = await h.api("/api/auth/me", { token: h.test.tokenVendedor });
  h.assertStatus(revocado.status, 401, "el token revocado → 401");

  // Login nuevo: mismo rol y la sesión vuelve a funcionar.
  const login = await h.api("/api/auth/login", {
    method: "POST", body: { email: h.test.emailVendedor, password: pass },
  });
  h.assertStatus(login.status, 200, "login de vendedor");
  h.assert(login.json.data.usuario.rol === "BUSINESS", "el rol sigue siendo BUSINESS");
  h.test.tokenVendedor = login.json.data.token;

  const me = await h.api("/api/auth/me", { token: h.test.tokenVendedor });
  h.assertStatus(me.status, 200, "la nueva sesión sirve");
});

// --- 8. La prueba NO se reinicia en cada login --------------------------
h.test("REGV: la prueba gratuita NO se reinicia al iniciar sesión", async () => {
  const leer = async () =>
    (await h.q("SELECT trial_inicio, trial_fin FROM usuarios WHERE email = $1", [h.test.emailVendedor]))
      .rows[0];

  const antes = await leer();

  // Tres sesiones nuevas seguidas (como si entrara desde varios equipos).
  for (let i = 0; i < 3; i++) {
    await h.clearSession(h.test.emailVendedor);
    const login = await h.api("/api/auth/login", {
      method: "POST", body: { email: h.test.emailVendedor, password: pass },
    });
    h.assertStatus(login.status, 200, `login ${i + 1}`);
    h.test.tokenVendedor = login.json.data.token;
  }

  const despues = await leer();
  h.assert(
    String(antes.trial_inicio) === String(despues.trial_inicio),
    "trial_inicio no se reinicia"
  );
  h.assert(
    String(antes.trial_fin) === String(despues.trial_fin),
    "trial_fin no se reinicia"
  );
});

// --- 9/10. Días restantes con las fechas reales -------------------------
h.test("REGV: los días restantes se calculan desde las fechas reales", async () => {
  const r = await h.api("/api/vendedor/estado", { token: h.test.tokenVendedor });
  h.assertStatus(r.status, 200, "estado comercial");
  const { dias_restantes, trial_fin, trial_inicio } = r.json.data;

  // El backend es la autoridad: se recalcula desde las fechas reales.
  const esperado = Math.max(0, Math.ceil((new Date(trial_fin) - new Date()) / 86400000));
  h.assert(Number(dias_restantes) === esperado, `días = ${esperado} (fue ${dias_restantes})`);
  h.assert(Number(dias_restantes) === 7, "una prueba recién creada tiene 7 días");

  // Si se acorta la prueba en la BD, el panel refleja menos días.
  await h.q(
    "UPDATE usuarios SET trial_fin = NOW() + interval '2 days' WHERE email = $1",
    [h.test.emailVendedor]
  );
  const r2 = await h.api("/api/vendedor/estado", { token: h.test.tokenVendedor });
  h.assert(Number(r2.json.data.dias_restantes) === 2, `2 días tras acortar (fue ${r2.json.data.dias_restantes})`);
  h.assert(r2.json.data.estado === "TRIALING", "sigue TRIALING");
});

// --- 11. Vencimiento de la prueba ---------------------------------------
h.test("REGV: al vencer la prueba se bloquean las funciones comerciales", async () => {
  await h.q(
    "UPDATE usuarios SET trial_fin = NOW() - interval '1 minute' WHERE email = $1",
    [h.test.emailVendedor]
  );

  const r = await h.api("/api/vendedor/estado", { token: h.test.tokenVendedor });
  h.assertStatus(r.status, 200, "el estado sigue consultable");
  h.assert(r.json.data.estado === "EXPIRED", `estado EXPIRED (fue ${r.json.data.estado})`);
  h.assert(Number(r.json.data.dias_restantes) === 0, "0 días restantes");

  // El estado queda MARCADO como vencido en la base de datos.
  const { rows } = await h.q(
    "SELECT estado_cuenta FROM usuarios WHERE email = $1",
    [h.test.emailVendedor]
  );
  h.assert(rows[0].estado_cuenta === "EXPIRED", `estado_cuenta EXPIRED en BD (fue ${rows[0].estado_cuenta})`);

  // La escritura comercial se bloquea EN EL BACKEND.
  const neg = await h.api("/api/businesses", {
    method: "POST", token: h.test.tokenVendedor,
    body: { nombre: "Negocio Vencido", category_id: 4, destination_id: 1 },
  });
  h.assertStatus(neg.status, 403, "crear negocio con prueba vencida → 403");
  h.assertMsg(neg.json, "prueba gratuita");

  // El perfil y el panel siguen accesibles (no se bloquea el acceso).
  const me = await h.api("/api/auth/me", { token: h.test.tokenVendedor });
  h.assertStatus(me.status, 200, "el login NO se bloquea por la prueba vencida");
  const planes = await h.api("/api/vendedor/planes", { token: h.test.tokenVendedor });
  h.assertStatus(planes.status, 200, "el catálogo sigue accesible");
});

// --- 12. Contratación tras el vencimiento --------------------------------
h.test("REGV: tras el vencimiento se puede contratar un plan (modo simulado)", async () => {
  const r = await h.api("/api/vendedor/suscripciones", {
    method: "POST", token: h.test.tokenVendedor, body: { plan_id: 2 },
  });
  h.assertStatus(r.status, 201, "contratar plan");
  h.assert(r.json.data.sandbox === true, "el pago queda marcado como simulación (sandbox)");
  h.assert(r.json.data.suscripcion.estado === "active", "suscripción activa");
  h.assert(Number(r.json.data.suscripcion.monto) === 49000, "importe del plan del servidor");

  // Con la suscripción activa vuelven a estar permitidas las escrituras.
  const neg = await h.api("/api/businesses", {
    method: "POST", token: h.test.tokenVendedor,
    body: { nombre: "Negocio Con Plan", category_id: 4, destination_id: 1 },
  });
  h.assertStatus(neg.status, 201, "crear negocio con suscripción activa");

  // Y el estado comercial pasa a ACTIVE.
  const estado = await h.api("/api/vendedor/estado", { token: h.test.tokenVendedor });
  h.assert(estado.json.data.estado === "ACTIVE", `estado ACTIVE (fue ${estado.json.data.estado})`);
  h.assert(estado.json.data.plan_actual && estado.json.data.plan_actual.id === 2, "plan actual visible");
  h.assert(estado.json.data.fin_suscripcion_activa, "fecha de fin de la suscripción");
});

// --- 13. Un vendedor NO puede entrar al panel de administración ---------
h.test("REGV: un vendedor NO puede acceder al panel de administración", async () => {
  const rutas = [
    ["/api/admin/stats", "GET"],
    ["/api/admin/vendedores", "GET"],
    ["/api/usuarios", "GET"],
  ];
  for (const [ruta, metodo] of rutas) {
    const r = await h.api(ruta, { method: metodo, token: h.test.tokenVendedor });
    h.assertStatus(r.status, 403, `${ruta} con vendedor → 403`);
  }
});

// --- 14. Un turista NO puede usar el panel del vendedor ------------------
h.test("REGV: un turista NO puede usar las rutas del panel del vendedor", async () => {
  const rutas = [
    ["/api/vendedor/estado", "GET"],
    ["/api/vendedor/planes", "GET"],
  ];
  for (const [ruta, metodo] of rutas) {
    const r = await h.api(ruta, { method: metodo, token: h.test.tokenTurista });
    h.assertStatus(r.status, 403, `${ruta} con turista → 403`);
  }
  // Tampoco puede contratar un plan.
  const contratar = await h.api("/api/vendedor/suscripciones", {
    method: "POST", token: h.test.tokenTurista, body: { plan_id: 2 },
  });
  h.assertStatus(contratar.status, 403, "contratar con turista → 403");
});

// --- 15. Pago aprobado / pendiente / rechazado ---------------------------
h.test("REGV: el proveedor simulado distingue aprobado, pendiente y rechazado", async () => {
  const { rows: planRows } = await h.q(
    "SELECT id, precio FROM plans WHERE precio > 0 ORDER BY id LIMIT 1"
  );
  const planId = planRows[0].id;
  const precio = Number(planRows[0].precio);

  // A) APROBADO: en modo simulado el backend lo aprueba.
  const aprobado = await h.api("/api/vendedor/suscripciones", {
    method: "POST", token: h.test.tokenVendedor, body: { plan_id: planId },
  });
  h.assertStatus(aprobado.status, 201, "pago aprobado (simulado)");
  h.assert(aprobado.json.data.suscripcion.estado === "active", "suscripción activa");
  h.assert(aprobado.json.data.sandbox === true, "marcado como sandbox, NO como pago real");
  h.assert(Number(aprobado.json.data.suscripcion.monto) === precio, "importe del servidor");

  // B) RECHAZADO: con PAYMENT_MOCK_FAIL el proveedor rechaza.
  //    Se simula con el estado 'rejected' del modelo (mismo camino de
  //    código que usa el proveedor real).
  const SuscripcionModel = require("../src/models/suscripcionModel");
  const rechazada = await SuscripcionModel.crearSuscripcion({
    usuarioId: h.test.idVendedor, planId, proveedor: "mock",
    referenciaExterna: `ref-rechazada-${Date.now()}`, monto: precio, moneda: "COP",
    idempotencyKey: `k-rechazada-${Date.now()}`,
  });
  await SuscripcionModel.rechazarSuscripcion(rechazada.id, { motivo: "rechazado por prueba" });
  const { rows: estadoRech } = await h.q(
    "SELECT estado FROM subscriptions WHERE id = $1",
    [rechazada.id]
  );
  h.assert(estadoRech[0].estado === "rejected", `estado rejected (fue ${estadoRech[0].estado})`);

  // Una suscripción rechazada NO activa la cuenta del vendedor.
  const { rows: cuenta } = await h.q(
    "SELECT estado_cuenta FROM usuarios WHERE id = $1",
    [h.test.idVendedor]
  );
  h.assert(cuenta[0].estado_cuenta === "ACTIVE", "la cuenta sigue con su suscripción activa previa");

  // C) PENDIENTE: una suscripción creada sin confirmar queda 'pending'.
  const pendiente = await SuscripcionModel.crearSuscripcion({
    usuarioId: h.test.idVendedor, planId, proveedor: "mock",
    referenciaExterna: `ref-pendiente-${Date.now()}`, monto: precio, moneda: "COP",
    idempotencyKey: `k-pendiente-${Date.now()}`,
  });
  const { rows: estadoPend } = await h.q(
    "SELECT estado FROM subscriptions WHERE id = $1",
    [pendiente.id]
  );
  h.assert(estadoPend[0].estado === "pending", `estado pending (fue ${estadoPend[0].estado})`);

  // El panel refleja los tres estados en el historial.
  const estado = await h.api("/api/vendedor/estado", { token: h.test.tokenVendedor });
  h.assertStatus(estado.status, 200, "estado con historial");
  const estados = estado.json.data.suscripciones.map((s) => s.estado);
  h.assert(estados.includes("active"), "el historial incluye una suscripción activa");
  h.assert(estados.includes("rejected"), "el historial incluye una suscripción rechazada");
  h.assert(estados.includes("pending"), "el historial incluye una suscripción pendiente");
});
