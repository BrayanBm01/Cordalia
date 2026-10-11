// ============================================================
// 11-pagos.test.js — Inscripciones y pagos (Cordalia)
// Flujo: inscribirse -> PENDIENTE con fecha_limite_pago -> pagar
// (backend autoriza) -> PAGADA -> comprobante y perfil.
// Cubre: vencimiento (EXPIRADA libera cupo), IDOR y falsificación
// del pago por el cliente.
// ============================================================
const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;

h.test("PAGO: setup (admin, owner, 2 turistas, negocio, plan y salida)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const pass = "Test1234x!";
  const emailO = h.repo("f21test.pago.owner");
  const emailT1 = h.repo("f21test.pago.turista1");
  const emailT2 = h.repo("f21test.pago.turista2");

  h.assertStatus((await h.createUser(admin.token, { nombre: "Owner Pago", email: emailO, password: pass, rol_id: 2 })).status, 201, "crear owner");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Turista Pago 1", email: emailT1, password: pass, rol_id: 1 })).status, 201, "crear turista 1");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Turista Pago 2", email: emailT2, password: pass, rol_id: 1 })).status, 201, "crear turista 2");

  const O = await h.login(emailO, pass);
  const T1 = await h.login(emailT1, pass);
  const T2 = await h.login(emailT2, pass);
  h.assertStatus(O.status, 200, "login owner");
  h.assertStatus(T1.status, 200, "login turista 1");
  h.assertStatus(T2.status, 200, "login turista 2");

  const neg = await h.api("/api/businesses", {
    method: "POST", token: O.token,
    body: { nombre: "Agencia Pago Test", category_id: 4, destination_id: 1, whatsapp: "3200000009", email_contacto: "pago@test.com", descripcion: "Tests de pago" },
  });
  h.assertStatus(neg.status, 201, "crear negocio");
  h.assertStatus((await h.api(`/api/businesses/${neg.json.data.id}/estado`, {
    method: "PUT", token: admin.token, body: { estado: "approved" },
  })).status, 200, "aprobar negocio");

  const plan = await h.api(`/api/businesses/${neg.json.data.id}/planes`, {
    method: "POST", token: O.token,
    body: {
      nombre: "Plan Pago Test", descripcion: "Flujo de pagos.",
      destination_id: 1, destino: "Córdoba",
      duracion_dias: 1, duracion_noches: 0, precio: 150000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(plan.status, 201, "crear plan pago");
  const pid = plan.json.data.id;

  const salida = await h.api(`/api/businesses/${neg.json.data.id}/planes/${pid}/salidas`, {
    method: "POST", token: O.token,
    body: { fecha: "2026-12-15", hora: "07:00", cupo_maximo: 10, fecha_limite: "2026-12-10", hora_limite: "23:59", lugar_encuentro: "Malecón" },
  });
  h.assertStatus(salida.status, 201, "crear salida");
  h.assert(Number(salida.json.data.cupo_ocupado) === 0, "salida sin ocupar");

  h.test.O = O;
  h.test.T1 = T1;
  h.test.T2 = T2;
  h.test.neg = neg.json.data;
  h.test.plan = plan.json.data;
  h.test.salida = salida.json.data;
});

h.test("PAGO: inscribirse crea PENDIENTE con fecha_limite_pago y snapshot de precio", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;
  const sid = h.test.salida.id;

  const anon = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", body: { personas: 2 },
  });
  h.assertStatus(anon.status, 401, "sin sesión no se inscribe → 401");

  const insc = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T1.token,
    body: { personas: 2, mensaje: "Pago pendiente" },
  });
  h.assertStatus(insc.status, 201, "turista 1 se inscribe");
  const data = insc.json.data;
  h.assert(data.estado === "pendiente", `estado inicial PENDIENTE (fue "${data.estado}")`);
  h.assert(data.fecha_limite_pago && String(data.fecha_limite_pago).length > 0, "fecha_limite_pago asignada");
  h.assert(Number(data.precio_total) === 300000, "snapshot precio 2 × 150.000 = 300.000");
  h.assert(Number(data.user_id) === h.test.T1.usuario.id, "inscripción vinculada al turista");
  h.test.inscripcion = data;
});

h.test("PAGO: mis-inscripciones agrupa pendientes y cumple IDOR", async () => {
  const perfil1 = await h.api("/api/mis-inscripciones", { token: h.test.T1.token });
  h.assertStatus(perfil1.status, 200, "mis inscripciones turista 1");
  h.assert(perfil1.json.data.pendientes.length === 1, "1 pendiente para turista 1");
  h.assert(perfil1.json.data.pagadas.length === 0, "0 pagadas");
  h.assert(perfil1.json.data.pendientes[0].id === h.test.inscripcion.id, "es la inscripción recién creada");
  h.assert(perfil1.json.data.pendientes[0].plan_nombre === "Plan Pago Test", "plan embebido en perfil");
  h.assert(perfil1.json.data.pendientes[0].salida_fecha === "2026-12-15", "salida embebida");

  // IDOR: otro turista NO ve las inscripciones ajenas.
  const perfil2 = await h.api("/api/mis-inscripciones", { token: h.test.T2.token });
  h.assert(perfil2.json.data.pendientes.length === 0, "turista 2 no ve inscripciones ajenas");

  // Comprobante: dueño sí, ajeno no.
  const misinsId = h.test.inscripcion.id;
  const compDueno = await h.api(`/api/inscripciones/${misinsId}/comprobante`, { token: h.test.T1.token });
  h.assertStatus(compDueno.status, 200, "comprobante del dueño");
  h.assert(compDueno.json.data.estado === "pendiente", "comprobante pendiente antes de pagar");
  const compAjeno = await h.api(`/api/inscripciones/${misinsId}/comprobante`, { token: h.test.T2.token });
  h.assertStatus(compAjeno.status, 403, "comprobante de otro turista → 403");
  const compAnon = await h.api(`/api/inscripciones/${misinsId}/comprobante`);
  h.assertStatus(compAnon.status, 401, "comprobante sin sesión → 401");

  // IDOR en pago: otro turista no puede pagar.
  const idorPago = await h.api(`/api/inscripciones/${misinsId}/pagar`, {
    method: "POST", token: h.test.T2.token, body: { metodo_pago: "nequi" },
  });
  h.assertStatus(idorPago.status, 403, "pagar inscripción ajena → 403");
});

h.test("PAGO: pagar es autorizado por el backend (flags del cliente se ignoran)", async () => {
  const misinsId = h.test.inscripcion.id;

  // El cliente intenta "falsificar": manda paymentSuccess/monto propios.
  const pago = await h.api(`/api/inscripciones/${misinsId}/pagar`, {
    method: "POST", token: h.test.T1.token,
    body: { metodo_pago: "nequi", paymentSuccess: true, monto: 1, marca: "hack" },
  });
  h.assertStatus(pago.status, 200, "pago aprobado");
  const body = pago.json.data;
  h.assert(body.inscripcion.estado === "pagada", "inscripción quedó PAGADA");
  h.assert(body.inscripcion.pago_proveedor === "mock", "proveedor mock");
  h.assert(body.inscripcion.fecha_pago && String(body.inscripcion.fecha_pago).length > 0, "fecha de pago registrada");
  // El backend decide el monto desde el snapshot: 300.000, no el "monto:1" del cliente.
  h.assert(Number(body.pago.monto) === 300000, "el monto lo fija el backend (300.000)");
  h.assert(typeof body.pago.referencia === "string" && body.pago.referencia.length > 0, "referencia generada por el backend");

  // El cupo NO se libera al pagar (la reserva persiste).
  const salidas = await h.api(`/api/businesses/${h.test.neg.id}/planes/${h.test.plan.id}/salidas`, { token: h.test.O.token });
  const s = salidas.json.data.find((x) => String(x.id) === String(h.test.salida.id));
  h.assert(Number(s.cupo_ocupado) === 2, "cupo sigue ocupado tras pagar");

  // Doble pago → 400.
  const doble = await h.api(`/api/inscripciones/${misinsId}/pagar`, {
    method: "POST", token: h.test.T1.token, body: { metodo_pago: "nequi" },
  });
  h.assertStatus(doble.status, 400, "pagar dos veces → 400");
  h.assertMsg(doble.json, "ya está pagada");
});

h.test("PAGO: comprobante y perfil reflejan PAGADA", async () => {
  const misinsId = h.test.inscripcion.id;

  const perfil = await h.api("/api/mis-inscripciones", { token: h.test.T1.token });
  h.assert(perfil.json.data.pagadas.length === 1, "1 pagada en perfil");
  h.assert(perfil.json.data.pendientes.length === 0, "0 pendientes");
  h.assert(perfil.json.data.pagadas[0].pago_referencia, "referencia visible en perfil");
  h.assert(perfil.json.data.pagadas[0].pago_metodo === "nequi", "método de pago visible");

  const comp = await h.api(`/api/inscripciones/${misinsId}/comprobante`, { token: h.test.T1.token });
  h.assert(comp.json.data.estado === "pagada", "comprobante PAGADA");
  h.assert(Number(comp.json.data.precio_total) === 300000, "monto en comprobante");
  h.assert(comp.json.data.business_nombre === "Agencia Pago Test", "negocio en comprobante");

  // El negocio también puede ver el comprobante de su inscripción.
  const compOwner = await h.api(`/api/inscripciones/${misinsId}/comprobante`, { token: h.test.O.token });
  h.assertStatus(compOwner.status, 200, "comprobante del negocio dueño");
});

h.test("PAGO: inscripción expirada pasa a historial y libera cupo; no se puede pagar", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;
  const sid = h.test.salida.id;

  const insc = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T1.token, body: { personas: 3 },
  });
  h.assertStatus(insc.status, 201, "crear inscripción para vencimiento");
  const oid = insc.json.data.id;

  // Forzar vencimiento (fecha límite en el pasado).
  await h.q("UPDATE inscripciones SET fecha_limite_pago = NOW() - interval '1 minute' WHERE id = $1", [oid]);

  // La expiración perezosa corre al consultar el perfil.
  const perfil = await h.api("/api/mis-inscripciones", { token: h.test.T1.token });
  const hist = perfil.json.data.historial.find((x) => x.id === oid);
  h.assert(hist && hist.estado === "expirada", "expirada en historial");

  const pagarVencida = await h.api(`/api/inscripciones/${oid}/pagar`, {
    method: "POST", token: h.test.T1.token, body: { metodo_pago: "nequi" },
  });
  h.assertStatus(pagarVencida.status, 400, "no se puede pagar una vencida");

  const salidas = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
  const s = salidas.json.data.find((x) => String(x.id) === String(sid));
  h.assert(Number(s.cupo_ocupado) === 2, "cupo liberado: vuelve a solo la pagada (2 personas)");
});

h.test("PAGO: cancelar una inscripción PENDIENTE la libera; una PAGADA no se cancela", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;
  const sid = h.test.salida.id;

  const aCancelar = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T2.token, body: { personas: 1 },
  });
  h.assertStatus(aCancelar.status, 201, "inscripción de turista 2");
  const cId = aCancelar.json.data.id;

  const canc = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones/${cId}/cancelar`, {
    method: "PUT", token: h.test.O.token,
  });
  h.assertStatus(canc.status, 200, "owner cancela PENDIENTE");

  // No se puede cancelar la ya pagada (sin devolución en esta fase).
  const cancPagada = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones/${h.test.inscripcion.id}/cancelar`, {
    method: "PUT", token: h.test.O.token,
  });
  h.assertStatus(cancPagada.status, 400, "cancelar PAGADA → 400");
  h.assertMsg(cancPagada.json, "pagada");
});

h.test("PAGO: promoción vencida al pagar → el backend recalcula y cobra precio normal", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;

  const promo = await h.api(`/api/businesses/${id}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Promo a vencer", plan_id: pid,
      tipo_descuento: "porcentaje", valor_descuento: 50,
      fecha_inicio: "2000-01-01", fecha_fin: "2099-12-31",
    },
  });
  h.assertStatus(promo.status, 201, "crear promo 50%");

  const salida = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2027-03-10", hora: "08:00", cupo_maximo: 10 },
  });
  h.assertStatus(salida.status, 201, "salida para recálculo");
  const sid = salida.json.data.id;

  const insc = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T1.token, body: { personas: 2 },
  });
  h.assertStatus(insc.status, 201, "inscribirse con promo activa");
  h.assert(Number(insc.json.data.precio_total) === 150000, "snapshot con promo 50% = 150.000");

  // La promoción vence entre la inscripción y el pago.
  await h.q("UPDATE promotions SET fecha_fin = CURRENT_DATE - 1 WHERE id = $1", [promo.json.data.id]);

  const pago = await h.api(`/api/inscripciones/${insc.json.data.id}/pagar`, {
    method: "POST", token: h.test.T1.token, body: { metodo_pago: "nequi", monto: 1, paymentSuccess: true },
  });
  h.assertStatus(pago.status, 200, "pago exitoso tras recálculo");
  h.assert(Number(pago.json.data.pago.monto) === 300000, "monto recalculado sin promo: 300.000");
  h.assert(pago.json.data.inscripcion.tipo_descuento === "ninguno", "sin descuento efectivo al pagar");

  const comp = await h.api(`/api/inscripciones/${insc.json.data.id}/comprobante`, { token: h.test.T1.token });
  h.assert(Number(comp.json.data.precio_total) === 300000, "comprobante con precio normal 300.000");
});

h.test("PAGO: viaje pagado ya ocurrido → VENCIDA en perfil, no se paga ni libera cupo", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;

  const salida = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2027-06-15", hora: "09:00", cupo_maximo: 10 },
  });
  h.assertStatus(salida.status, 201, "salida futura para viaje vencido");
  const sid = salida.json.data.id;

  const insc = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T2.token, body: { personas: 2 },
  });
  h.assertStatus(insc.status, 201, "inscribirse turista 2");
  const iid = insc.json.data.id;

  const pago = await h.api(`/api/inscripciones/${iid}/pagar`, {
    method: "POST", token: h.test.T2.token, body: { metodo_pago: "nequi" },
  });
  h.assertStatus(pago.status, 200, "pagar viaje");
  h.assert(pago.json.data.inscripcion.estado === "pagada", "inicialmente PAGADA");

  // El viaje ya ocurrió: mover la fecha de la salida al pasado.
  await h.q("UPDATE tour_plan_salidas SET fecha = '2020-01-05' WHERE id = $1", [sid]);

  const perfil = await h.api("/api/mis-inscripciones", { token: h.test.T2.token });
  const vencidas = perfil.json.data.vencidas || [];
  h.assert(vencidas.length === 1, "1 inscripción agrupada en vencidas");
  h.assert(vencidas[0].id === iid, "es la inscripción pagada del viaje pasado");
  h.assert(vencidas[0].estado === "vencida", "estado VENCIDA");
  h.assert(!perfil.json.data.pagadas.some((x) => x.id === iid), "ya no aparece en pagadas");

  const salidas = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
  h.assert(Number(salidas.json.data.find((s) => String(s.id) === String(sid)).cupo_ocupado) === 2, "cupo sigue ocupado (no se libera)");

  const reintento = await h.api(`/api/inscripciones/${iid}/pagar`, {
    method: "POST", token: h.test.T2.token, body: { metodo_pago: "nequi" },
  });
  h.assertStatus(reintento.status, 400, "no se puede pagar un viaje vencido");
  h.assertMsg(reintento.json, "vencida");

  const comp = await h.api(`/api/inscripciones/${iid}/comprobante`, { token: h.test.T2.token });
  h.assert(comp.json.data.estado === "vencida", "comprobante refleja VENCIDA");
});

h.test("PAGO: webhook del proveedor es inofensivo en modo mock y expone estado", async () => {
  const webhook = await h.api("/api/pagos/webhook/mercadopago", { method: "POST", body: { type: "payment" } });
  h.assertStatus(webhook.status, 200, "webhook acusa recibo");
  h.assert(webhook.json.accepted === false, "en mock no acepta pagos");

  const estado = await h.api("/api/pagos/estado");
  h.assertStatus(estado.status, 200, "estado de pagos");
  h.assert(estado.json.data.proveedor === "mock", "proveedor mock");
});