// ============================================================
// 13-promos-vigencia.test.js — Vigencia de promociones (Cordalia)
// ------------------------------------------------------------
// Reemplaza el modelo "precio anterior / precio promocional" por
// un descuento temporal calculado SIEMPRE sobre el precio normal:
//   plan.precio = precio normal permanente (aqui $100.000).
//   promo = porcentaje o valor fijo (COP) vigente entre fechas.
// Requisitos cubiertos (1-10):
//   1. Sin promo activa           -> $100.000
//   2. Promo activa 20%           -> $80.000
//   3. Promo vencida              -> $100.000
//   4. Antes de fecha_inicio      -> $100.000
//   5. Durante el rango           -> $80.000
//   6. Despues de fecha_fin       -> $100.000
//   7. Nueva promo 30%            -> $70.000 (y al vencer -> $100.000)
//   8. Pago DURANTE la promo      -> cobra $80.000
//   9. Pago DESPUES de vencer      -> cobra $100.000 (recalcula backend)
//  10. Cliente manipula el precio -> el backend lo ignora
// Las fechas se mueven con SQL relativo a CURRENT_DATE para que los
// rangos "antes / durante / despues" sean deterministas.
// ============================================================
const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;

h.test("VIG: setup (admin, owner, turista, negocio, plan $100.000 y salida)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const pass = "Test1234x!";
  const emailO = h.repo("f13vig.owner");
  const emailT = h.repo("f13vig.turista");

  h.assertStatus((await h.createUser(admin.token, { nombre: "Owner Vigencia", email: emailO, password: pass, rol_id: 2 })).status, 201, "crear owner");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Turista Vigencia", email: emailT, password: pass, rol_id: 1 })).status, 201, "crear turista");

  const O = await h.login(emailO, pass);
  const T = await h.login(emailT, pass);
  h.assertStatus(O.status, 200, "login owner");
  h.assertStatus(T.status, 200, "login turista");

  const neg = await h.api("/api/businesses", {
    method: "POST", token: O.token,
    body: { nombre: "Negocio Vigencia Test", category_id: 4, destination_id: 1, whatsapp: "3200000013", email_contacto: "vig@test.com", descripcion: "Tests de vigencia" },
  });
  h.assertStatus(neg.status, 201, "crear negocio");
  h.assertStatus((await h.api(`/api/businesses/${neg.json.data.id}/estado`, {
    method: "PUT", token: admin.token, body: { estado: "approved" },
  })).status, 200, "aprobar negocio");

  const plan = await h.api(`/api/businesses/${neg.json.data.id}/planes`, {
    method: "POST", token: O.token,
    body: {
      nombre: "Tour Vigencia", descripcion: "Precio normal $100.000.",
      destination_id: 1, destino: "Cordoba",
      duracion_dias: 1, duracion_noches: 0, precio: 100000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(plan.status, 201, "crear plan $100.000");
  const pid = plan.json.data.id;
  h.assert(Number(plan.json.data.precio) === 100000, "precio normal 100.000");

  const salida = await h.api(`/api/businesses/${neg.json.data.id}/planes/${pid}/salidas`, {
    method: "POST", token: O.token,
    body: { fecha: "2027-07-10", hora: "07:00", cupo_maximo: 20 },
  });
  h.assertStatus(salida.status, 201, "crear salida");

  h.test.O = O;
  h.test.T = T;
  h.test.neg = neg.json.data;
  h.test.plan = plan.json.data;
  h.test.salida = salida.json.data;
});

const precioPersona = async (pid) => {
  const r = await h.api(`/api/planes/${pid}/precio?personas=1`);
  h.assertStatus(r.status, 200, "precio 1 persona");
  return r.json.data;
};

async function moverFechas(id, inicio, fin) {
  await h.q(`UPDATE promotions SET fecha_inicio = (${inicio})::date, fecha_fin = (${fin})::date WHERE id = $1`, [id]);
}

const HOY_MENOS_1 = "CURRENT_DATE - 1";
const HOY_MAS_3 = "CURRENT_DATE + 3";
const HOY_MAS_2 = "CURRENT_DATE + 2";
const HOY_MAS_5 = "CURRENT_DATE + 5";
const HOY_MENOS_10 = "CURRENT_DATE - 10";
const HOY_MENOS_8 = "CURRENT_DATE - 8";

// --- Casos 1 a 6 con la MISMA promo 20% movida por SQL ---------
h.test("VIG 1-6: sin promo -> 100.000; activa 20% -> 80.000; vencida/antes/despues -> 100.000", async () => {
  const pid = h.test.plan.id;
  const idA = h.test.neg.id;

  // 1. Sin promo -> $100.000
  let p = await precioPersona(pid);
  h.assert(Number(p.precio_persona) === 100000, `1: sin promo -> 100.000 (fue ${p.precio_persona})`);
  h.assert(p.tipo_descuento === "ninguno", "1: sin descuento");

  // Promo 20% sobre el precio normal.
  const promo = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Vig 20%", plan_id: pid, tipo_descuento: "porcentaje", valor_descuento: 20, fecha_inicio: "2000-01-01", fecha_fin: "2099-12-31" },
  });
  h.assertStatus(promo.status, 201, "crear promo 20%");

  // 2. Activa y vigente hoy -> $80.000
  await moverFechas(promo.json.data.id, HOY_MENOS_1, HOY_MAS_3);
  p = await precioPersona(pid);
  h.assert(Number(p.precio_persona) === 80000, `2: activa 20% -> 80.000 (fue ${p.precio_persona})`);
  h.assert(p.tipo_descuento === "promocion", "2: descuento por promocion");
  h.assert(Number(p.descuento_porcentaje) === 20, "2: 20% efectivo");

  // 3. Vencida -> $100.000
  await moverFechas(promo.json.data.id, HOY_MENOS_10, HOY_MENOS_8);
  p = await precioPersona(pid);
  h.assert(Number(p.precio_persona) === 100000, `3: vencida -> 100.000 (fue ${p.precio_persona})`);

  // 4. Antes de fecha_inicio (futuro) -> $100.000
  await moverFechas(promo.json.data.id, HOY_MAS_2, HOY_MAS_5);
  p = await precioPersona(pid);
  h.assert(Number(p.precio_persona) === 100000, `4: antes de inicio -> 100.000 (fue ${p.precio_persona})`);

  // 5. Durante -> $80.000
  await moverFechas(promo.json.data.id, HOY_MENOS_1, HOY_MAS_3);
  p = await precioPersona(pid);
  h.assert(Number(p.precio_persona) === 80000, `5: durante -> 80.000 (fue ${p.precio_persona})`);

  // 6. Despues de fecha_fin -> $100.000
  await moverFechas(promo.json.data.id, HOY_MENOS_10, HOY_MENOS_8);
  p = await precioPersona(pid);
  h.assert(Number(p.precio_persona) === 100000, `6: despues de fin -> 100.000 (fue ${p.precio_persona})`);

  h.test.promoA = promo.json.data;
});

// --- Caso 7: nueva promo 30% -> $70.000, al vencer -> $100.000 ---
h.test("VIG 7: nueva promo 30% -> 70.000 y al vencer -> 100.000", async () => {
  const pid = h.test.plan.id;
  const idA = h.test.neg.id;

  // La promo A queda inactiva para no solaparse con la nueva.
  const off = await h.api(`/api/businesses/${idA}/promociones/${h.test.promoA.id}/estado`, {
    method: "PUT", token: h.test.O.token, body: { estado: "inactivo" },
  });
  h.assertStatus(off.status, 200, "desactivar promo 20%");

  const B = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Vig 30%", plan_id: pid, tipo_descuento: "porcentaje", valor_descuento: 30, fecha_inicio: "2000-01-01", fecha_fin: "2099-12-31" },
  });
  h.assertStatus(B.status, 201, "crear promo 30%");

  await moverFechas(B.json.data.id, HOY_MENOS_1, HOY_MAS_3);
  let p = await precioPersona(pid);
  h.assert(Number(p.precio_persona) === 70000, `7: nueva 30% -> 70.000 (fue ${p.precio_persona})`);

  await moverFechas(B.json.data.id, HOY_MENOS_10, HOY_MENOS_8);
  p = await precioPersona(pid);
  h.assert(Number(p.precio_persona) === 100000, `7: 30% vencida -> 100.000 (fue ${p.precio_persona})`);

  h.test.promoB = B.json.data;
});
// --- Caso 8: pago DURANTE la promo -> snapshot $80.000 ----------
h.test("VIG 8: pago durante la promo cobra $80.000", async () => {
  const pid = h.test.plan.id;
  const idA = h.test.neg.id;
  const sid = h.test.salida.id;

  const off = await h.api(`/api/businesses/${idA}/promociones/${h.test.promoB.id}/estado`, {
    method: "PUT", token: h.test.O.token, body: { estado: "inactivo" },
  });
  h.assertStatus(off.status, 200, "desactivar promo 30%");

  const C = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Vig pago durante", plan_id: pid, tipo_descuento: "porcentaje", valor_descuento: 20, fecha_inicio: "2000-01-01", fecha_fin: "2099-12-31" },
  });
  h.assertStatus(C.status, 201, "crear promo 20% vigente");
  await moverFechas(C.json.data.id, HOY_MENOS_1, HOY_MAS_3);

  const insc = await h.api(`/api/businesses/${idA}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T.token, body: { personas: 1 },
  });
  h.assertStatus(insc.status, 201, "inscribirse durante la promo");
  h.assert(Number(insc.json.data.precio_total) === 80000, `8: snapshot 80.000 (fue ${insc.json.data.precio_total})`);

  const pago = await h.api(`/api/inscripciones/${insc.json.data.id}/pagar`, {
    method: "POST", token: h.test.T.token, body: { metodo_pago: "nequi", monto: 1 },
  });
  h.assertStatus(pago.status, 200, "pagar durante la promo");
  h.assert(Number(pago.json.data.pago.monto) === 80000, `8: cobra 80.000 (fue ${pago.json.data.pago.monto})`);
  h.assert(pago.json.data.inscripcion.tipo_descuento === "promocion", "8: descuento de promocion registrado");

  h.test.promoC = C.json.data;
  const offC = await h.api(`/api/businesses/${idA}/promociones/${h.test.promoC.id}/estado`, {
    method: "PUT", token: h.test.O.token, body: { estado: "inactivo" },
  });
  h.assertStatus(offC.status, 200, "desactivar promo pago-durante");
});

// --- Caso 9: pago DESPUES de vencer -> cobra $100.000 -----------
h.test("VIG 9: pago despues de que la promo vencio cobra $100.000", async () => {
  const pid = h.test.plan.id;
  const idA = h.test.neg.id;
  const sid = h.test.salida.id;

  const D = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Vig pago despues", plan_id: pid, tipo_descuento: "porcentaje", valor_descuento: 20, fecha_inicio: "2000-01-01", fecha_fin: "2099-12-31" },
  });
  h.assertStatus(D.status, 201, "crear promo que vence antes del pago");
  await moverFechas(D.json.data.id, HOY_MENOS_1, HOY_MAS_3);

  const insc = await h.api(`/api/businesses/${idA}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T.token, body: { personas: 2 },
  });
  h.assertStatus(insc.status, 201, "inscribirse con promo vigente");
  h.assert(Number(insc.json.data.precio_total) === 160000, `9: snapshot 160.000 (fue ${insc.json.data.precio_total})`);

  // La promo vence entre la inscripcion y el pago.
  await moverFechas(D.json.data.id, HOY_MENOS_10, HOY_MENOS_8);

  const pago = await h.api(`/api/inscripciones/${insc.json.data.id}/pagar`, {
    method: "POST", token: h.test.T.token, body: { metodo_pago: "nequi", monto: 1 },
  });
  h.assertStatus(pago.status, 200, "pagar tras vencer la promo");
  h.assert(Number(pago.json.data.pago.monto) === 200000, `9: cobra 200.000 (2x100.000, fue ${pago.json.data.pago.monto})`);
  h.assert(pago.json.data.inscripcion.tipo_descuento === "ninguno", "9: sin descuento efectivo al pagar");

  const comp = await h.api(`/api/inscripciones/${insc.json.data.id}/comprobante`, { token: h.test.T.token });
  h.assert(Number(comp.json.data.precio_total) === 200000, "9: comprobante con precio normal");

  h.test.promoD = D.json.data;
  const offD = await h.api(`/api/businesses/${idA}/promociones/${h.test.promoD.id}/estado`, {
    method: "PUT", token: h.test.O.token, body: { estado: "inactivo" },
  });
  h.assertStatus(offD.status, 200, "desactivar promo pago-despues");
});

// --- Caso 10: el cliente no puede manipular el precio -----------
h.test("VIG 10: el cliente manipula precio y el backend lo ignora", async () => {
  const pid = h.test.plan.id;
  const idA = h.test.neg.id;
  const sid = h.test.salida.id;

  const E = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Vig anti-falsificacion", plan_id: pid, tipo_descuento: "porcentaje", valor_descuento: 20, fecha_inicio: "2000-01-01", fecha_fin: "2099-12-31" },
  });
  h.assertStatus(E.status, 201, "crear promo vigente");
  await moverFechas(E.json.data.id, HOY_MENOS_1, HOY_MAS_3);

  // El turista envia precios a medida al inscribirse: el backend los ignora.
  const insc = await h.api(`/api/businesses/${idA}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T.token, body: { personas: 1, precio: 1, precio_total: 1, precio_persona: 1 },
  });
  h.assertStatus(insc.status, 201, "inscribirse con precios hackeados");
  h.assert(Number(insc.json.data.precio_total) === 80000, `10: snapshot ignora precio enviado (fue ${insc.json.data.precio_total})`);

  // Al pagar tambien envia monto/pago falso -> el backend cobra 80.000.
  const pago = await h.api(`/api/inscripciones/${insc.json.data.id}/pagar`, {
    method: "POST", token: h.test.T.token, body: { metodo_pago: "nequi", monto: 1, paymentSuccess: true, marca: "hack" },
  });
  h.assertStatus(pago.status, 200, "pagar con flags falsos");
  h.assert(Number(pago.json.data.pago.monto) === 80000, `10: cobra 80.000 (fue ${pago.json.data.pago.monto})`);
});
