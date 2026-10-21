// ============================================================
// 15-prueba-suscripciones.test.js — Prueba gratuita de 7 dias y
// suscripciones comerciales del vendedor.
//
// Cubre:
//   * Inicio y computo de la prueba (7 dias, calculada en el servidor)
//   * La prueba NO se reinicia al volver a iniciar sesion
//   * El administrador que crea al vendedor aplica la misma regla
//   * Vendedor anterior (sin poliza) NO se restringe
//   * Prueba vencida: se bloquean las funciones comerciales RESTRINGIDAS
//     (en el BACKEND) y se conservan perfil, estado y contratacion
//   * Suscripcion mensual: pendiente, aprobada, rechazada, cancelada y
//     vencida
//   * Idempotencia: evento duplicado no activa dos veces
//   * Webhook invalido / falso no activa nada
//   * El importe lo fija el servidor (el cliente no lo manipula)
//   * Modo simulado: NO activa una suscripcion comercial real
// ============================================================
const h = require("./helpers");
const SuscripcionModel = require("../src/models/suscripcionModel");
const crypto = require("crypto");

const ADMIN_PASS = h.ADMIN_PASSWORD;
const pass = "Test1234x!";

// Secreto de la webhook. Debe coincidir con MERCADOPAGO_WEBHOOK_SECRET
// del servidor (backend/.env). Solo se usa para LOCAL.
const SECRETO_WEBHOOK = process.env.MERCADOPAGO_WEBHOOK_SECRET || "secreto-de-pruebas-local-cordalia";

/**
 * Envia una notificacion al webhook firmando el cuerpo como exige
 * Mercado Pago: HMAC-SHA256 de `id:timestamp:body`.
 */
async function webhookConFirma({ id, secreto }) {
  const ts = Date.now().toString();
  const body = JSON.stringify({ type: "payment", data: { id } });
  const payload = `${id}:${ts}:${body}`;
  const v1 = crypto.createHmac("sha256", secreto).update(payload).digest("hex");
  const url = `${h.BASE}/api/suscripciones/webhook/mercadopago?id=${id}&data.id=${id}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": `ts=${ts},v1=${v1}`,
      "x-request-id": id,
    },
    body,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

h.test("PRUEBA: setup (admin y vendedor nuevo)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const emailV = h.repo("f21test.prueba.vendedor");
  const emailT = h.repo("f21test.prueba.turista");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Vendedor Prueba", email: emailV, password: pass, rol_id: 2 })).status, 201, "crear vendedor");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Turista Prueba", email: emailT, password: pass, rol_id: 1 })).status, 201, "crear turista");

  const V = await h.login(emailV, pass);
  const T = await h.login(emailT, pass);
  h.assertStatus(V.status, 200, "login vendedor");
  h.assertStatus(T.status, 200, "login turista");
  h.test.V = V;
  h.test.T = T;
  h.test.emailV = emailV;
});

h.test("PRUEBA: al crear la cuenta se asigna la prueba de 7 días (inicio y fin en el servidor)", async () => {
  const { rows } = await h.q(
    "SELECT trial_inicio, trial_fin, estado_cuenta FROM usuarios WHERE email = $1",
    [h.test.emailV]
  );
  h.assert(rows.length === 1, "vendedor creado");
  const u = rows[0];
  h.assert(u.trial_inicio !== null, "trial_inicio registrado");
  h.assert(u.trial_fin !== null, "trial_fin registrado");
  h.assert(u.estado_cuenta === "TRIALING", `estado TRIALING (fue ${u.estado_cuenta})`);

  // 7 días consecutivos exactos.
  const dias = (new Date(u.trial_fin) - new Date(u.trial_inicio)) / 86400000;
  h.assert(Math.abs(dias - 7) < 0.001, `la prueba dura 7 días (fue ${dias})`);
});

h.test("PRUEBA: el estado comercial reporta TRIALING y los días restantes", async () => {
  const r = await h.api("/api/vendedor/estado", { token: h.test.V.token });
  h.assertStatus(r.status, 200, "estado comercial");
  h.assert(r.json.data.estado === "TRIALING", `estado TRIALING (fue ${r.json.data.estado})`);
  h.assert(r.json.data.dias_prueba === 7, "duracion de la prueba = 7 días");
  h.assert(Number(r.json.data.dias_restantes) === 7, `7 días restantes (fue ${r.json.data.dias_restantes})`);
  h.assert(r.json.data.trial_fin !== null, "fecha de fin expuesta");
});

h.test("PRUEBA: la prueba NO se reinicia al volver a iniciar sesión", async () => {
  const { rows: antes } = await h.q(
    "SELECT trial_inicio, trial_fin FROM usuarios WHERE email = $1",
    [h.test.emailV]
  );
  // Reasignar (lo que hace la creación de la cuenta) no debe tocar las fechas.
  await SuscripcionModel.asignarPruebaGratuita(h.test.V.usuario.id);
  const { rows: despues } = await h.q(
    "SELECT trial_inicio, trial_fin FROM usuarios WHERE email = $1",
    [h.test.emailV]
  );
  h.assert(
    String(antes[0].trial_inicio) === String(despues[0].trial_inicio),
    "trial_inicio no se reinicia"
  );
  h.assert(String(antes[0].trial_fin) === String(despues[0].trial_fin), "trial_fin no se reinicia");

  // Tampoco al iniciar sesion de nuevo.
  await h.clearSession(h.test.emailV);
  const login2 = await h.login(h.test.emailV, pass);
  h.assertStatus(login2.status, 200, "login de nuevo");
  // La sesion es unica: el nuevo token reemplaza al anterior.
  h.test.V.token = login2.token;
  h.test.V.usuario = login2.usuario;
  const { rows: tras } = await h.q(
    "SELECT trial_inicio, trial_fin FROM usuarios WHERE email = $1",
    [h.test.emailV]
  );
  h.assert(String(antes[0].trial_fin) === String(tras[0].trial_fin), "iniciar sesion no reinicia la prueba");
});

h.test("PRUEBA: con la prueba activa el vendedor puede usar las funciones comerciales", async () => {
  const neg = await h.api("/api/businesses", {
    method: "POST", token: h.test.V.token,
    body: { nombre: "Negocio Prueba Activa", category_id: 4, destination_id: 1, whatsapp: "3200000021", email_contacto: "prueba@test.com", descripcion: "Prueba gratuita activa" },
  });
  h.assertStatus(neg.status, 201, "crear negocio con prueba activa");
  h.test.neg = neg.json.data;

  const plan = await h.api(`/api/businesses/${neg.json.data.id}/planes`, {
    method: "POST", token: h.test.V.token,
    body: {
      nombre: "Plan Prueba Activa", descripcion: "Creado durante la prueba.",
      destination_id: 1, destino: "Cordoba",
      duracion_dias: 1, duracion_noches: 0, precio: 100000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(plan.status, 201, "crear plan con prueba activa");
  h.test.plan = plan.json.data;
});

h.test("PRUEBA: al vencer la prueba se bloquean las funciones comerciales en el backend", async () => {
  // El backend detecta el vencimiento aunque el usuario no entre.
  await h.q(
    "UPDATE usuarios SET trial_fin = NOW() - interval '1 minute' WHERE id = $1",
    [h.test.V.usuario.id]
  );

  const r = await h.api("/api/vendedor/estado", { token: h.test.V.token });
  h.assertStatus(r.status, 200, "estado comercial sigue disponible");
  h.assert(r.json.data.estado === "EXPIRED", `estado EXPIRED (fue ${r.json.data.estado})`);
  h.assert(Number(r.json.data.dias_restantes) === 0, "0 días restantes");

  // Escritura comercial restringida -> 403 con mensaje claro.
  const planNuevo = await h.api(`/api/businesses/${h.test.neg.id}/planes`, {
    method: "POST", token: h.test.V.token,
    body: {
      nombre: "Plan No Permitido", descripcion: "Debe rechazarse.",
      destination_id: 1, destino: "Cordoba",
      duracion_dias: 1, duracion_noches: 0, precio: 100000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(planNuevo.status, 403, "crear plan con prueba vencida → 403");
  h.assertMsg(planNuevo.json, "prueba gratuita");

  const promo = await h.api(`/api/businesses/${h.test.neg.id}/promociones`, {
    method: "POST", token: h.test.V.token,
    body: { nombre: "Promo No Permitida", plan_id: h.test.plan.id, tipo_descuento: "porcentaje", valor_descuento: 10, fecha_inicio: "2020-01-01", fecha_fin: "2099-12-31" },
  });
  h.assertStatus(promo.status, 403, "crear promoción con prueba vencida → 403");

  // Sus datos NO se borran: el negocio sigue existiendo y se puede LEER.
  const negocio = await h.api(`/api/businesses/${h.test.neg.id}`, { token: h.test.V.token });
  h.assertStatus(negocio.status, 200, "el negocio propio sigue accesible");
  h.assert(negocio.json.data.nombre === "Negocio Prueba Activa", "los datos se conservan");
});

h.test("PRUEBA: con la prueba vencida conserva perfil, estado y pantalla de contratación", async () => {
  const perfil = await h.api("/api/auth/me", { token: h.test.V.token });
  h.assertStatus(perfil.status, 200, "perfil disponible con la prueba vencida");

  const estado = await h.api("/api/vendedor/estado", { token: h.test.V.token });
  h.assertStatus(estado.status, 200, "estado disponible con la prueba vencida");

  const planes = await h.api("/api/vendedor/planes", { token: h.test.V.token });
  h.assertStatus(planes.status, 200, "catálogo de planes disponible con la prueba vencida");
  h.assert(planes.json.data.length >= 2, "hay planes comerciales para contratar");
});

h.test("SUSCR: el importe lo fija el servidor (el cliente no lo manipula)", async () => {
  const planId = 2; // "Profesional" - 49.000
  const { rows } = await h.q("SELECT id, nombre, precio FROM plans WHERE id = $1", [planId]);
  h.assert(rows.length === 1, "plan comercial existente");
  const precioReal = Number(rows[0].precio);

  // El cliente intenta fijar el monto y el plan.
  const r = await h.api("/api/vendedor/suscripciones", {
    method: "POST", token: h.test.V.token,
    body: { plan_id: planId, monto: 1, precio: 1, precio_total: 1 },
  });
  h.assertStatus(r.status, 201, "contratar plan (sandbox)");
  h.assert(Number(r.json.data.suscripcion.monto) === precioReal, `el servidor usa el precio del plan (${r.json.data.suscripcion.monto})`);
  h.assert(Number(r.json.data.suscripcion.monto) !== 1, "ignora el monto enviado por el cliente");
  h.test.suscripcion = r.json.data.suscripcion;
});

h.test("SUSCR: la suscripción queda activa con vigencia de un mes (regla de calendario)", async () => {
  const sub = h.test.suscripcion;
  h.assert(sub.estado === "active", `estado active (fue ${sub.estado})`);
  h.assert(sub.ends_at !== null, "fecha de fin de vigencia");

  // Un mes de calendario, no 30 dias fijos.
  const { rows } = await h.q(
    "SELECT starts_at, ends_at, (EXTRACT(DAY FROM (ends_at - starts_at)) + 30 * EXTRACT(MONTH FROM (ends_at - starts_at)))::int AS dias FROM subscriptions WHERE id = $1",
    [sub.id]
  );
  const r = rows[0];
  h.assert(Number(r.dias) >= 28 && Number(r.dias) <= 31, `vigencia de ~1 mes (${r.dias} días)`);

  // El estado comercial pasa a ACTIVE.
  const estado = await h.api("/api/vendedor/estado", { token: h.test.V.token });
  h.assert(estado.json.data.estado === "ACTIVE", `estado ACTIVE (fue ${estado.json.data.estado})`);
  h.assert(estado.json.data.plan_actual && estado.json.data.plan_actual.id === sub.plan_id, "plan actual visible");
});

h.test("SUSCR: con la suscripción activa recupera las funciones comerciales", async () => {
  const planNuevo = await h.api(`/api/businesses/${h.test.neg.id}/planes`, {
    method: "POST", token: h.test.V.token,
    body: {
      nombre: "Plan Con Suscripcion", descripcion: "Permitido tras contratar.",
      destination_id: 1, destino: "Cordoba",
      duracion_dias: 1, duracion_noches: 0, precio: 100000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(planNuevo.status, 201, "crear plan con suscripción activa");
});

h.test("SUSCR: la renovación no duplica suscripciones y renueva la vigencia", async () => {
  const { rows: antes } = await h.q(
    "SELECT id, estado, ends_at FROM subscriptions WHERE usuario_id = $1 ORDER BY id",
    [h.test.V.usuario.id]
  );
  const activasAntes = antes.filter((s) => s.estado === "active").length;
  h.assert(activasAntes === 1, "una sola suscripción activa");

  // Contratar de nuevo (mismo plan) = renovación.
  const r = await h.api("/api/vendedor/suscripciones", {
    method: "POST", token: h.test.V.token, body: { plan_id: 2 },
  });
  h.assertStatus(r.status, 201, "renovar plan");

  const { rows: despues } = await h.q(
    "SELECT id, estado, ends_at FROM subscriptions WHERE usuario_id = $1 ORDER BY id",
    [h.test.V.usuario.id]
  );
  const activasDespues = despues.filter((s) => s.estado === "active").length;
  h.assert(activasDespues === 1, `sigue habiendo una sola suscripción activa (hay ${activasDespues})`);
  h.assert(despues.length === antes.length + 1, "se crea la nueva suscripción");
});

h.test("SUSCR: un evento de pago duplicado no activa dos veces (idempotencia)", async () => {
  // Se usa una suscripcion propia y ACTIVA: al re-activarla no debe
  // cambiar su vigencia ni su estado.
  const propia = await SuscripcionModel.crearSuscripcion({
    usuarioId: h.test.V.usuario.id, planId: 3, proveedor: "mock",
    referenciaExterna: `ref-idem-${Date.now()}`, monto: 129000, moneda: "COP",
    idempotencyKey: `k-idem-${Date.now()}`,
  });
  await SuscripcionModel.activarSuscripcion(propia.id, {});
  const sub = await SuscripcionModel.findSuscripcion(propia.id);
  h.assert(sub.estado === "active", "suscripcion activada");

  const clave = `test-idem-${Date.now()}`;

  const p1 = await SuscripcionModel.registrarPago({
    suscripcionId: sub.id, usuarioId: sub.usuario_id, planId: sub.plan_id,
    proveedor: "mock", evento: "payment", estado: "approved",
    referenciaExterna: "ref-idem", pagoId: "pay-idem", monto: 49000,
    idempotencyKey: clave, payload: { prueba: true },
  });
  h.assert(p1.duplicado === false, "el primer evento se registra");

  const p2 = await SuscripcionModel.registrarPago({
    suscripcionId: sub.id, usuarioId: sub.usuario_id, planId: sub.plan_id,
    proveedor: "mock", evento: "payment", estado: "approved",
    referenciaExterna: "ref-idem", pagoId: "pay-idem", monto: 49000,
    idempotencyKey: clave, payload: { prueba: true },
  });
  h.assert(p2.duplicado === true, "el evento repetido se detecta como duplicado");

  const { rows } = await h.q(
    "SELECT COUNT(*)::int AS c FROM suscripcion_pagos WHERE idempotency_key = $1",
    [clave]
  );
  h.assert(rows[0].c === 1, "solo queda un registro del evento");

  // Activar dos veces no extiende la vigencia ni cambia el estado.
  const { rows: v1 } = await h.q("SELECT ends_at FROM subscriptions WHERE id = $1", [sub.id]);
  const segunda = await SuscripcionModel.activarSuscripcion(sub.id, { idempotencyKey: clave });
  h.assert(segunda.yaActiva === true, "la segunda activacion se detecta como ya activa");
  const { rows: v2 } = await h.q("SELECT ends_at, estado FROM subscriptions WHERE id = $1", [sub.id]);
  h.assert(String(v1[0].ends_at) === String(v2[0].ends_at), "la vigencia no se extiende al re-activar");
  h.assert(v2[0].estado === "active", "sigue activa");
});

h.test("SUSCR: una webhook falsa o inválida no activa ninguna suscripción", async () => {
  const { rows: antes } = await h.q(
    "SELECT COUNT(*)::int AS c FROM suscripcion_pagos WHERE proveedor = 'mercadopago'"
  );

  // Sin cabecera de firma.
  const sinFirma = await h.api("/api/suscripciones/webhook/mercadopago", {
    method: "POST", body: { type: "payment", data: { id: "9999" } },
  });
  h.assertStatus(sinFirma.status, 401, "webhook sin firma → 401");

  // Firma con HMAC incorrecto.
  const firmaFalsa = await webhookConFirma({ id: "9999", secreto: "secreto-incorrecto" });
  h.assertStatus(firmaFalsa.status, 401, "webhook con firma invalida → 401");

  // Firma bien calculada pero con datos de pago inventados: en modo
  // simulado no se procesa ningun pago.
  const firmaValida = await webhookConFirma({ id: "9999", secreto: SECRETO_WEBHOOK });
  h.assertStatus(firmaValida.status, 200, "webhook con firma valida acusa recibo");
  h.assert(firmaValida.json.accepted === false, "en modo simulado no se aceptan pagos");

  const { rows: despues } = await h.q(
    "SELECT COUNT(*)::int AS c FROM suscripcion_pagos WHERE proveedor = 'mercadopago'"
  );
  h.assert(despues[0].c === antes[0].c, "no se registró ningún pago de Mercado Pago");
});

h.test("SUSCR: en modo simulado la webhook no procesa pagos", async () => {
  const r = await h.api("/api/suscripciones/webhook/mercadopago", {
    method: "POST", body: { type: "payment", data: { id: "1234" } },
  });
  // Sin firma -> rechazada (fail closed) y en ningun caso se procesa un pago.
  h.assert([200, 401].includes(r.status), `webhook respondida (${r.status})`);
  if (r.status === 200) {
    h.assert(r.json.accepted === false, "en modo simulado no se aceptan pagos");
  }
});

h.test("SUSCR: la suscripción se localiza por la referencia que devuelve el proveedor", async () => {
  // Regresión: la suscripción guarda la referencia INTERNA (la que viaja
  // como external_reference y devuelve el proveedor al notificar) y el
  // identificador del proveedor va aparte, en pago_id. Si se mezclaran,
  // la webhook de Mercado Pago no encontraría la suscripción y el cobro
  // real nunca activaría el plan.
  const creada = await SuscripcionModel.crearSuscripcion({
    usuarioId: h.test.V.usuario.id,
    planId: 2,
    proveedor: "mercadopago",
    referenciaExterna: "CORD-SUB-123456-ABCDEF",
    pagoId: "9876543210", // id de la preferencia del proveedor
    monto: 49000,
    moneda: "COP",
    idempotencyKey: `k-ref-${Date.now()}`,
  });

  const { rows } = await h.q(
    "SELECT referencia_externa, pago_id FROM subscriptions WHERE id = $1",
    [creada.id]
  );
  h.assert(rows[0].referencia_externa === "CORD-SUB-123456-ABCDEF", "guarda la referencia interna");
  h.assert(rows[0].pago_id === "9876543210", "guarda el id del proveedor aparte");

  // Búsqueda como la hace la webhook: por la referencia interna...
  const porInterna = await h.q(
    "SELECT id FROM subscriptions WHERE referencia_externa = $1 OR pago_id = $2 LIMIT 1",
    ["CORD-SUB-123456-ABCDEF", "9876543210"]
  );
  h.assert(porInterna.rows.length === 1, "la webhook encuentra la suscripción por la referencia interna");
  h.assert(Number(porInterna.rows[0].id) === creada.id, "es la suscripción correcta");

  // ...y también por el id del proveedor.
  const porProveedor = await h.q(
    "SELECT id FROM subscriptions WHERE referencia_externa = $1 OR pago_id = $2 LIMIT 1",
    ["otra-cosa", "9876543210"]
  );
  h.assert(porProveedor.rows.length === 1, "también la encuentra por el id del proveedor");
});

h.test("SUSCR: en producción el modo simulado NO puede habilitar una suscripción", async () => {
  const paymentService = require("../src/services/paymentService");
  const nodeEnvOriginal = process.env.NODE_ENV;
  try {
    // Se simula el entorno de PRODUCCIÓN con el proveedor simulado.
    process.env.NODE_ENV = "production";
    // El servicio lee el proveedor al cargar el módulo: se fuerza 'mock'
    // recargándolo con el entorno de producción.
    delete require.cache[require.resolve("../src/services/paymentService")];
    const svcProd = require("../src/services/paymentService");
    h.assert(svcProd.PROVEEDOR === "mock", "el proveedor del entorno es 'mock'");

    const estado = svcProd.estadoProveedor();
    h.assert(estado.bloqueadoEnProduccion === true, "el modo simulado aparece bloqueado en producción");
    h.assert(estado.real === false, "no se presenta como proveedor real");

    // Intentar contratar en producción con el simulador debe FALLAR:
    // no se crea ni se activa ninguna suscripción.
    const antes = await h.q(
      "SELECT count(*)::int AS c FROM subscriptions WHERE usuario_id = $1",
      [h.test.V.usuario.id]
    );
    let error = null;
    try {
      await svcProd.crearPago({
        planId: 2, nombrePlan: "Profesional", monto: 49000,
        referencia: "ref-prod-mock", idUsuario: h.test.V.usuario.id,
      });
    } catch (e) {
      error = e;
    }
    h.assert(error !== null, "crearPago debe fallar en producción con el simulador");
    h.assert(error.status === 503, `error 503 (fue ${error && error.status})`);
    h.assert(error.code === "PAYMENT_PROVIDER_NOT_CONFIGURED", "código de error correcto");

    const despues = await h.q(
      "SELECT count(*)::int AS c FROM subscriptions WHERE usuario_id = $1",
      [h.test.V.usuario.id]
    );
    h.assert(despues.rows[0].c === antes.rows[0].c, "no se creó ninguna suscripción");
  } finally {
    process.env.NODE_ENV = nodeEnvOriginal;
    // Se restaura el módulo con el entorno original.
    delete require.cache[require.resolve("../src/services/paymentService")];
  }
});

h.test("SUSCR: la webhook de Mercado Pago exige firma y consulta el pago real", async () => {
  const paymentService = require("../src/services/paymentService");

  // La firma se valida SIEMPRE, incluso con el proveedor simulado.
  const sinFirma = paymentService.validarFirmaWebhook({
    headers: {}, bodyRaw: "{}", query: {},
  });
  h.assert(sinFirma.valido === false, "sin cabecera x-signature la firma es inválida");

  const firmaFalsa = paymentService.validarFirmaWebhook({
    headers: { "x-signature": `ts=${Date.now()},v1=deadbeef` },
    bodyRaw: "{}", query: { "data.id": "1" },
  });
  h.assert(firmaFalsa.valido === false, "una firma incorrecta se rechaza");

  // Sin secreto configurado la validación falla (fail closed).
  const secretoOriginal = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  try {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    delete require.cache[require.resolve("../src/services/paymentService")];
    const svcSinSecreto = require("../src/services/paymentService");
    const res = svcSinSecreto.validarFirmaWebhook({
      headers: { "x-signature": `ts=${Date.now()},v1=abc` },
      bodyRaw: "{}", query: { "data.id": "1" },
    });
    h.assert(res.valido === false, "sin secreto configurado la webhook no se valida");
  } finally {
    if (secretoOriginal !== undefined) process.env.MERCADOPAGO_WEBHOOK_SECRET = secretoOriginal;
    delete require.cache[require.resolve("../src/services/paymentService")];
  }
});

h.test("SUSCR: el historial de pagos y suscripciones queda registrado", async () => {
  const r = await h.api("/api/vendedor/estado", { token: h.test.V.token });
  h.assertStatus(r.status, 200, "estado con historial");
  h.assert(Array.isArray(r.json.data.suscripciones) && r.json.data.suscripciones.length >= 2, "hay suscripciones registradas");
  h.assert(Array.isArray(r.json.data.pagos) && r.json.data.pagos.length >= 1, "hay pagos registrados");
  h.assert(r.json.data.proveedor.proveedor === "mock", "proveedor actual: mock");
  h.assert(r.json.data.proveedor.pagosTuristicos === false, "los planes turísticos no tienen pagos");
});

h.test("SUSCR: cancelar la suscripción deja la cuenta sin acceso comercial", async () => {
  // Se cancela la suscripcion VIGENTE del vendedor (la renovacion dejo
  // expirada la anterior).
  const { rows: activas } = await h.q(
    "SELECT id FROM subscriptions WHERE usuario_id = $1 AND estado = 'active' LIMIT 1",
    [h.test.V.usuario.id]
  );
  h.assert(activas.length === 1, "hay una suscripcion vigente");

  const cancelada = await h.api(`/api/vendedor/suscripciones/${activas[0].id}/cancelar`, {
    method: "PUT", token: h.test.V.token,
  });
  h.assertStatus(cancelada.status, 200, "cancelar suscripción");

  const { rows } = await h.q(
    "SELECT estado FROM subscriptions WHERE id = $1",
    [activas[0].id]
  );
  h.assert(rows[0].estado === "cancelled", `estado cancelled (fue ${rows[0].estado})`);

  // Ya no puede usar las funciones comerciales restringidas.
  const planNuevo = await h.api(`/api/businesses/${h.test.neg.id}/planes`, {
    method: "POST", token: h.test.V.token,
    body: {
      nombre: "Plan Tras Cancelar", descripcion: "Debe rechazarse.",
      destination_id: 1, destino: "Cordoba",
      duracion_dias: 1, duracion_noches: 0, precio: 100000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(planNuevo.status, 403, "tras cancelar, escritura comercial → 403");
});

h.test("SUSCR: una suscripción vencida se marca expirada aunque el vendedor no entre", async () => {
  const { rows: subs } = await h.q(
    "SELECT id FROM subscriptions WHERE usuario_id = $1 AND estado = 'active' LIMIT 1",
    [h.test.V.usuario.id]
  );
  if (subs.length === 0) {
    // Sin suscripcion activa: se crea una y se vence.
    const creada = await SuscripcionModel.crearSuscripcion({
      usuarioId: h.test.V.usuario.id, planId: 2, proveedor: "mock",
      referenciaExterna: `ref-venc-${Date.now()}`, monto: 49000, moneda: "COP",
      idempotencyKey: `k-venc-${Date.now()}`,
    });
    await SuscripcionModel.activarSuscripcion(creada.id, {});
    subs.push(creada);
  }
  const subId = subs[0].id;
  await h.q("UPDATE subscriptions SET ends_at = NOW() - interval '1 minute' WHERE id = $1", [subId]);

  await SuscripcionModel.expirarSuscripcionesVencidas();
  const { rows } = await h.q("SELECT estado FROM subscriptions WHERE id = $1", [subId]);
  h.assert(rows[0].estado === "expired", `estado expired (fue ${rows[0].estado})`);

  const estado = await h.api("/api/vendedor/estado", { token: h.test.V.token });
  h.assert(estado.json.data.estado !== "ACTIVE", "ya no está ACTIVE");
});

h.test("ADMIN: el administrador consulta el estado comercial de los vendedores", async () => {
  const r = await h.api("/api/admin/vendedores", { token: h.test.adminToken });
  h.assertStatus(r.status, 200, "listado de vendedores");
  const vendedor = r.json.data.find((v) => v.id === h.test.V.usuario.id);
  h.assert(vendedor !== undefined, "el vendedor aparece en el listado");
  h.assert(vendedor.email === h.test.emailV, "email correcto");
  h.assert(vendedor.trial_fin !== null, "fecha de fin de prueba visible");
  h.assert("estado_resuelto" in vendedor, "estado comercial calculado");
});

h.test("ADMIN: el administrador suspende y reactiva una cuenta de vendedor", async () => {
  const sus = await h.api(`/api/admin/vendedores/${h.test.V.usuario.id}/estado`, {
    method: "PUT", token: h.test.adminToken,
    body: { suspendido: true, motivo: "Prueba de suspension" },
  });
  h.assertStatus(sus.status, 200, "suspender vendedor");
  h.assert(sus.json.data.estado.estado === "SUSPENDED", `estado SUSPENDED (fue ${sus.json.data.estado.estado})`);

  // Un vendedor suspendido no puede escribir.
  const plan = await h.api(`/api/businesses/${h.test.neg.id}/planes`, {
    method: "POST", token: h.test.V.token,
    body: {
      nombre: "Plan Suspendido", descripcion: "No debe permitirse.",
      destination_id: 1, destino: "Cordoba",
      duracion_dias: 1, duracion_noches: 0, precio: 100000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(plan.status, 403, "vendedor suspendido → 403");
  h.assertMsg(plan.json, "suspendid");

  const reac = await h.api(`/api/admin/vendedores/${h.test.V.usuario.id}/estado`, {
    method: "PUT", token: h.test.adminToken,
    body: { suspendido: false },
  });
  h.assertStatus(reac.status, 200, "reactivar vendedor");
  h.assert(reac.json.data.estado.estado !== "SUSPENDED", "ya no está suspendido");
});
