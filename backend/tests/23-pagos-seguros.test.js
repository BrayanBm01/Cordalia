// ============================================================
// 23-pagos-seguros.test.js — pagos comerciales: retorno, firma,
// Nequi bloqueado, estados del resultado y beneficios por plan.
//
// Estas pruebas son 100% LOCALES: usan PAYMENT_PROVIDER=mock y la
// verificación de firma con el SDK oficial. NO simulan cobros reales
// ni sustituyen la verificación en producción con credenciales.
// ============================================================
const h = require("./helpers");
const crypto = require("crypto");
const paymentService = require("../src/services/paymentService");
const SuscripcionModel = require("../src/models/suscripcionModel");

const pass = "Test1234x!";
const SECRETO = process.env.MERCADOPAGO_WEBHOOK_SECRET || "secreto-de-pruebas-local-cordalia";

function firmaPara(id, secreto = SECRETO) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const manifest = `id:${id};request-id:${id};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", secreto).update(manifest).digest("hex");
  return {
    "Content-Type": "application/json",
    "x-signature": `ts=${ts},v1=${v1}`,
    "x-request-id": id,
  };
}

async function webhook({ idQuery, idCuerpo, headers }) {
  const url = `${h.BASE}/api/suscripciones/webhook/mercadopago?data.id=${encodeURIComponent(idQuery)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers || firmaPara(idQuery),
    body: JSON.stringify({ type: "payment", data: { id: idCuerpo } }),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

h.test("PAGOS: el retorno usa la ruta ofuscada YA existente", async () => {
  const r = paymentService.rutaResultadoPago({ pago: "aprobado", referencia: "CORD-SUB-1" });
  h.assert(
    r === "/gJvs5ksh?pago=aprobado&referencia=CORD-SUB-1",
    `retorno inesperado: ${r}`
  );
  const anterior = process.env.PAYMENT_RESULT_PATH;
  process.env.PAYMENT_RESULT_PATH = "gJvs5ksh";
  try {
    h.assert(paymentService.rutaResultadoPago().startsWith("/gJvs5ksh"), "ruta relativa normalizada");
  } finally {
    if (anterior === undefined) delete process.env.PAYMENT_RESULT_PATH;
    else process.env.PAYMENT_RESULT_PATH = anterior;
  }
});

h.test("PAGOS: Nequi no se habilita con variables de entorno", async () => {
  const estado = paymentService.estadoProveedor();
  h.assert(estado.metodos.nequi.disponible === false, "Nequi no disponible");
  h.assert(typeof estado.metodos.nequi.motivo === "string", "Nequi explica por qué");
  h.assert(estado.pagosTuristicos === false, "los planes turísticos no cobran");

  leterror: {
    try {
      await paymentService.crearPago({
        planId: 2, nombrePlan: "Profesional", monto: 49900,
        referencia: "CORD-NEQUI-TEST", usuarioEmail: "x@test.com", idUsuario: 1,
        metodo: "nequi",
      });
      throw new Error("Nequi debería rechazarse");
    } catch (e) {
      h.assert(e.status === 501, `Nequi rechazado con 501 (fue ${e.status})`);
      h.assert(e.code === "NEQUI_NOT_ENABLED", "código NEQUI_NOT_ENABLED");
      break leterror;
    }
  }
  try {
    await paymentService.crearPago({
      planId: 2, nombrePlan: "Profesional", monto: 49900,
      referencia: "CORD-METODO-TEST", usuarioEmail: "x@test.com", idUsuario: 1,
      metodo: "otro",
    });
    throw new Error("Método inválido debería rechazarse");
  } catch (e) {
    h.assert(e.status === 400, `método inválido rechazado con 400 (fue ${e.status})`);
  }
});

h.test("PAGOS: la firma exige que el id del cuerpo sea el firmado", async () => {
  const id = "123456789";
  const headers = firmaPara(id);
  const valida = paymentService.validarFirmaWebhook({
    headers, query: { "data.id": id }, body: { data: { id } },
  });
  h.assert(valida.valido === true, `firma válida rechazada: ${valida.motivo}`);

  const distinto = paymentService.validarFirmaWebhook({
    headers, query: { "data.id": id }, body: { data: { id: "999999999" } },
  });
  h.assert(distinto.valido === false, "id del cuerpo distinto al firmado se rechaza");

  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  try {
    const sinSecreto = paymentService.validarFirmaWebhook({
      headers, query: { "data.id": id }, body: { data: { id } },
    });
    h.assert(sinSecreto.valido === false, "sin secreto la webhook falla cerrada");
  } finally {
    if (secreto !== undefined) process.env.MERCADOPAGO_WEBHOOK_SECRET = secreto;
  }
});

h.test("PAGOS: setup local (admin, vendedor y turista)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, h.ADMIN_PASSWORD);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminTok = admin.token;

  const emailV = h.repo("f21test.pagos.vendedor");
  const emailT = h.repo("f21test.pagos.turista");
  h.assertStatus(
    (await h.createUser(admin.token, { nombre: "Vendedor Pagos", email: emailV, password: pass, rol_id: 2 })).status,
    201, "crear vendedor"
  );
  h.assertStatus(
    (await h.createUser(admin.token, { nombre: "Turista Pagos", email: emailT, password: pass, rol_id: 1 })).status,
    201, "crear turista"
  );
  const V = await h.login(emailV, pass);
  const T = await h.login(emailT, pass);
  h.assertStatus(V.status, 200, "login vendedor");
  h.assertStatus(T.status, 200, "login turista");
  h.test.pagosV = V;
  h.test.pagosT = T;
  h.test.pagosUsuarioId = V.usuario.id;

  // Un negocio real del vendedor para comprobar los límites del plan.
  const neg = await h.api("/api/businesses", {
    method: "POST", token: V.token,
    body: {
      nombre: `Negocio Pagos ${Date.now()}`, category_id: 2,
      descripcion: "Negocio de prueba local", direccion: "Calle 1 #2-3",
      telefono: "3001234567", email_contacto: "contacto@pagos.test",
      moneda: "COP",
    },
  });
  h.assertStatus(neg.status, 201, "crear negocio del vendedor");
  h.test.pagosNegocioId = neg.json.data.id;
});

h.test("PAGOS: el estado expone beneficios y el método Nequi bloqueado", async () => {
  const r = await h.api("/api/vendedor/estado", { token: h.test.pagosV.token });
  h.assertStatus(r.status, 200, "estado del vendedor");
  h.assert(r.json.data.beneficios !== undefined, "beneficios calculados en servidor");
  h.assert(r.json.data.proveedor.metodos.nequi.disponible === false, "Nequi bloqueado");
  h.assert(r.json.data.proveedor.metodos.mercadopago.disponible === true, "checkout local disponible");
});

h.test("PAGOS: la API rechaza Nequi con 501 y no crea suscripción", async () => {
  const antes = await h.api("/api/vendedor/estado", { token: h.test.pagosV.token });
  const r = await h.api("/api/vendedor/suscripciones", {
    method: "POST", token: h.test.pagosV.token, body: { plan_id: 2, metodo: "nequi" },
  });
  h.assertStatus(r.status, 501, "Nequi respondido con 501");
  h.assertMsg(r.json, "nequi");
  const despues = await h.api("/api/vendedor/estado", { token: h.test.pagosV.token });
  h.assert(
    despues.json.data.suscripciones.length === antes.json.data.suscripciones.length,
    "Nequi no creó ninguna suscripción"
  );
});

h.test("PAGOS: importe desde BD y resultado con 401/403/404", async () => {
  const contratar = await h.api("/api/vendedor/suscripciones", {
    method: "POST", token: h.test.pagosV.token,
    // El cliente intenta falsificar el importe: el servidor lo ignora.
    body: { plan_id: 2, metodo: "mercadopago", precio: 1, monto: 1 },
  });
  h.assertStatus(contratar.status, 201, "contratar con checkout local");
  h.assert(Number(contratar.json.data.suscripcion.monto) === 49900, "importe 49.900 desde BD");
  h.assert(contratar.json.data.suscripcion.moneda === "COP", "moneda COP");
  const referencia = contratar.json.data.suscripcion.referencia_externa;
  h.test.pagosRef = referencia;

  const propio = await h.api(`/api/vendedor/pagos/${referencia}/estado`, {
    token: h.test.pagosV.token,
  });
  h.assertStatus(propio.status, 200, "estado de la operación propia");
  h.assert(propio.json.data.referencia === referencia, "referencia correcta");
  h.assert(propio.json.data.estado === "approved", "estado final aprobado en simulación");

  const anon = await h.api(`/api/vendedor/pagos/${referencia}/estado`);
  h.assertStatus(anon.status, 401, "sin sesión → 401");
  const turista = await h.api(`/api/vendedor/pagos/${referencia}/estado`, {
    token: h.test.pagosT.token,
  });
  h.assertStatus(turista.status, 403, "turista → 403");
  const ajena = await h.api("/api/vendedor/pagos/CORD-INEXISTENTE/estado", {
    token: h.test.pagosV.token,
  });
  h.assertStatus(ajena.status, 404, "referencia ajena → 404");
});

h.test("PAGOS: webhook con id del cuerpo distinto se rechaza", async () => {
  const id = "777888999";
  const r = await webhook({
    idQuery: id,
    idCuerpo: "111222333",
    headers: firmaPara(id),
  });
  h.assertStatus(r.status, 401, "firma válida para otro id no activa nada");
});

h.test("PAGOS: estado no aprobado no activa y su registro es idempotente", async () => {
  const usuarioId = h.test.pagosUsuarioId;
  const negocioId = h.test.pagosNegocioId;
  const pagoId = `pay-pend-${Date.now()}`;
  const referencia = `ref-pend-${Date.now()}`;
  const { rows: creadas } = await h.q(
    `INSERT INTO subscriptions
      (business_id, usuario_id, plan_id, proveedor, referencia_externa, pago_id,
       estado, monto, moneda, starts_at, ends_at)
     VALUES ($1, $2, 2, 'mock', $3, $4, 'pending', 49900, 'COP', NOW(), NOW() + interval '1 month')
     RETURNING id`,
    [negocioId, usuarioId, referencia, pagoId]
  );
  const suscripcionId = creadas[0].id;

  const r = await webhook({ idQuery: pagoId, idCuerpo: pagoId });
  h.assertStatus(r.status, 200, "webhook válida acusa recibo");
  h.assert(r.json.accepted === false, "pago no aprobado no se acepta");

  // Con Mercado Pago real el webhook consulta el proveedor y registra el
  // estado. En local (mock) no hay pagos reales que confirmar: se comprueba
  // la idempotencia del registro en el modelo, que es la misma clave que
  // usa el webhook para no duplicar eventos.
  const clave = `mp-estado:${pagoId}:pending`;
  const datosEvento = {
    suscripcionId, usuarioId, planId: 2, proveedor: "mercadopago",
    evento: "estado_proveedor", estado: "pending",
    referenciaExterna: referencia, pagoId, monto: 49900, moneda: "COP",
    idempotencyKey: clave,
  };
  const primero = await SuscripcionModel.registrarPago(datosEvento);
  h.assert(primero.duplicado === false, "primer evento pendiente registrado");
  const repetido = await SuscripcionModel.registrarPago(datosEvento);
  h.assert(repetido.duplicado === true, "evento repetido detectado como duplicado");

  if (paymentService.PROVEEDOR === "mercadopago") {
    const { rows: eventos } = await h.q(
      "SELECT id FROM suscripcion_pagos WHERE idempotency_key = $1", [clave]
    );
    h.assert(eventos.length === 1, "el webhook registró el estado una sola vez");
  }

  const { rows: sub } = await h.q(
    "SELECT estado FROM subscriptions WHERE id = $1", [suscripcionId]
  );
  h.assert(sub[0].estado === "pending", "un pago pendiente NO activa la suscripción");
});

h.test("PAGOS: beneficios por plan se aplican en el backend", async () => {
  const usuarioId = h.test.pagosUsuarioId;
  const negocioId = h.test.pagosNegocioId;
  // Plan GRATIS (máximo 5 imágenes, sin promociones). Se cancelan las
  // suscripciones previas de la suite para que no haya ambigüedad sobre
  // cuál es el beneficio vigente, y se inserta como suscripción activa.
  await h.q("UPDATE subscriptions SET estado = 'cancelled' WHERE usuario_id = $1", [usuarioId]);
  await h.q(
    `INSERT INTO subscriptions
      (business_id, usuario_id, plan_id, proveedor, referencia_externa,
       estado, monto, moneda, starts_at, ends_at)
     VALUES ($1, $2, 1, 'mock', $3, 'active', 0, 'COP', NOW(), NOW() + interval '1 month')`,
    [negocioId, usuarioId, `ref-gratis-${Date.now()}`]
  );

  const estado = await h.api("/api/vendedor/estado", { token: h.test.pagosV.token });
  h.assertStatus(estado.status, 200, "estado con plan Gratis vigente");
  const beneficios = estado.json.data.beneficios;
  h.assert(beneficios.plan_nombre === "Gratis", "beneficio del plan contratado");
  h.assert(beneficios.limites.imagenes === 5, "límite real de 5 imágenes");
  h.assert(beneficios.promociones === false, " plan Gratis no incluye promociones");

  for (let i = 1; i <= 5; i += 1) {
    const img = await h.api(`/api/businesses/${negocioId}/imagenes`, {
      method: "POST", token: h.test.pagosV.token,
      body: { url: `https://ejemplo.test/pago-${i}.jpg`, alt_text: `Foto ${i}` },
    });
    h.assertStatus(img.status, 201, `imagen ${i} permitida`);
  }
  const sexta = await h.api(`/api/businesses/${negocioId}/imagenes`, {
    method: "POST", token: h.test.pagosV.token,
    body: { url: "https://ejemplo.test/pago-6.jpg", alt_text: "Foto 6" },
  });
  h.assertStatus(sexta.status, 403, "la imagen 6 se bloquea en el backend");
  h.assert(sexta.json.code === "LIMITE_PLAN", "código LIMITE_PLAN");

  const promo = await h.api(`/api/businesses/${negocioId}/promociones`, {
    method: "POST", token: h.test.pagosV.token, body: {},
  });
  h.assertStatus(promo.status, 403, "promociones bloqueadas sin el beneficio");
  h.assert(promo.json.code === "BENEFICIO_NO_DISPONIBLE", "código BENEFICIO_NO_DISPONIBLE");
});
