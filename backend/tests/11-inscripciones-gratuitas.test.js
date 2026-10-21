// ============================================================
// 11-inscripciones-gratuitas.test.js — Inscripciones a planes
// turisticos SIN PAGO (Cordalia).
//
// REGLA DE NEGOCIO: los planes de viaje turisticos NO tienen pagos.
// El usuario se INSCRIBE (reserva cupo) sin pagar; el precio es
// solo informativo.
//
// Cubre:
//   * inscripcion gratuita exitosa (estado 'confirmada', sin cobros)
//   * ausencia de endpoints/registros de pago en el flujo turistico
//   * rechazo de inscripcion duplicada del mismo usuario
//   * rechazo cuando no quedan cupos
//   * concurrencia: el ultimo cupo no se sobre-reserva
//   * cancelacion del propio usuario y liberacion del cupo
//   * IDOR: el comprobante ajeno no es visible
// ============================================================
const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;

h.test("INSCR: setup (admin, owner, 2 turistas, negocio, plan y salida)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const pass = "Test1234x!";
  const emailO = h.repo("f21test.insc.owner");
  const emailT1 = h.repo("f21test.insc.turista1");
  const emailT2 = h.repo("f21test.insc.turista2");

  h.assertStatus((await h.createUser(admin.token, { nombre: "Owner Inscription", email: emailO, password: pass, rol_id: 2 })).status, 201, "crear owner");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Turista Insc 1", email: emailT1, password: pass, rol_id: 1 })).status, 201, "crear turista 1");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Turista Insc 2", email: emailT2, password: pass, rol_id: 1 })).status, 201, "crear turista 2");

  const O = await h.login(emailO, pass);
  const T1 = await h.login(emailT1, pass);
  const T2 = await h.login(emailT2, pass);
  h.assertStatus(O.status, 200, "login owner");
  h.assertStatus(T1.status, 200, "login turista 1");
  h.assertStatus(T2.status, 200, "login turista 2");

  const neg = await h.api("/api/businesses", {
    method: "POST", token: O.token,
    body: { nombre: "Agencia Inscripcion Test", category_id: 4, destination_id: 1, whatsapp: "3200000019", email_contacto: "insc@test.com", descripcion: "Tests de inscripcion gratuita" },
  });
  h.assertStatus(neg.status, 201, "crear negocio");
  h.assertStatus((await h.api(`/api/businesses/${neg.json.data.id}/estado`, {
    method: "PUT", token: admin.token, body: { estado: "approved" },
  })).status, 200, "aprobar negocio");

  const plan = await h.api(`/api/businesses/${neg.json.data.id}/planes`, {
    method: "POST", token: O.token,
    body: {
      nombre: "Plan Inscripcion Test", descripcion: "Inscripcion gratuita.",
      destination_id: 1, destino: "Cordoba",
      duracion_dias: 1, duracion_noches: 0, precio: 150000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(plan.status, 201, "crear plan");
  const pid = plan.json.data.id;

  const salida = await h.api(`/api/businesses/${neg.json.data.id}/planes/${pid}/salidas`, {
    method: "POST", token: O.token,
    body: { fecha: "2027-12-15", hora: "07:00", cupo_maximo: 10, fecha_limite: "2027-12-10", hora_limite: "23:59", lugar_encuentro: "Malecon" },
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

h.test("INSCR: la inscripción es gratuita (CONFIRMADA) y no genera ningún cobro", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;
  const sid = h.test.salida.id;

  const anon = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", body: { personas: 2 },
  });
  h.assertStatus(anon.status, 401, "sin sesión no se inscribe → 401");

  const insc = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T1.token,
    body: { personas: 2, mensaje: "Inscripcion gratuita" },
  });
  h.assertStatus(insc.status, 201, "turista 1 se inscribe");
  const data = insc.json.data;

  h.assert(data.estado === "confirmada", `estado inicial CONFIRMADA (fue "${data.estado}")`);
  // El precio se conserva como INFORMATIVO (snapshot), no como cobro.
  h.assert(Number(data.precio_total) === 300000, "snapshot informativo 2 x 150.000 = 300.000");
  h.assert(Number(data.user_id) === h.test.T1.usuario.id, "inscripción vinculada al turista");

  // Ningun dato de pago debe existir en una inscripción gratuita.
  h.assert(!data.fecha_limite_pago, "sin fecha_limite_pago (no hay pago que vencer)");
  h.assert(!data.fecha_pago, "sin fecha_pago");
  h.assert(!data.pago_proveedor, "sin pago_proveedor");
  h.assert(!data.pago_referencia, "sin pago_referencia");
  h.assert(!data.pago_metodo, "sin pago_metodo");

  h.test.inscripcion = data;
});

h.test("INSCR: no existe ningún endpoint de pago en el flujo turístico", async () => {
  const misinsId = h.test.inscripcion.id;

  // El endpoint 'pagar' fue eliminado: no debe existir.
  const pagar = await h.api(`/api/inscripciones/${misinsId}/pagar`, {
    method: "POST", token: h.test.T1.token, body: { metodo_pago: "nequi" },
  });
  h.assertStatus(pagar.status, 404, "no existe endpoint de pago de inscripciones");

  // Tampoco el estado de pagos turistico ni la webhook del proveedor.
  const estado = await h.api("/api/pagos/estado");
  h.assertStatus(estado.status, 404, "no existe /api/pagos/estado");
  const webhook = await h.api("/api/pagos/webhook/mercadopago", { method: "POST", body: { type: "payment" } });
  h.assertStatus(webhook.status, 404, "no existe webhook de pagos turisticos");
});

h.test("INSCR: no se crean registros de pago ni de suscripción al inscribirse", async () => {
  const { rows: conPago } = await h.q(
    `SELECT count(*)::int AS c FROM inscripciones
      WHERE estado = 'confirmada' AND (pago_proveedor IS NOT NULL OR fecha_pago IS NOT NULL OR pago_referencia IS NOT NULL)`
  );
  h.assert(conPago[0].c === 0, "ninguna inscripción gratuita tiene datos de pago");

  // Inscribirse NO crea una suscripción comercial (son flujos separados).
  // Se comprueba SOLO para este usuario: el resto de vendedores del
  // entorno pueden tener sus propias suscripciones.
  const { rows: subs } = await h.q(
    "SELECT count(*)::int AS c FROM subscriptions WHERE usuario_id = $1",
    [h.test.T1.usuario.id]
  );
  h.assert(subs[0].c === 0, "inscribirse no crea suscripciones comerciales");

  // El estado de la inscripción sigue siendo gratuito tras releerla.
  const comp = await h.api(`/api/inscripciones/${h.test.inscripcion.id}/comprobante`, { token: h.test.T1.token });
  h.assertStatus(comp.status, 200, "comprobante del dueño");
  h.assert(comp.json.data.estado === "confirmada", "comprobante refleja CONFIRMADA");
  h.assert(!comp.json.data.pago_referencia, "comprobante sin referencia de pago");
  h.assert(comp.json.data.business_nombre === "Agencia Inscripcion Test", "negocio en comprobante");
});

h.test("INSCR: mis-inscripciones agrupa las confirmadas y cumple IDOR", async () => {
  const perfil1 = await h.api("/api/mis-inscripciones", { token: h.test.T1.token });
  h.assertStatus(perfil1.status, 200, "mis inscripciones turista 1");
  h.assert(perfil1.json.data.confirmadas.length === 1, "1 confirmada para turista 1");
  h.assert(perfil1.json.data.pendientes.length === 0, "0 pendientes de pago");
  h.assert(perfil1.json.data.pagadas.length === 0, "0 pagadas");
  h.assert(perfil1.json.data.confirmadas[0].id === h.test.inscripcion.id, "es la inscripción recién creada");
  h.assert(perfil1.json.data.confirmadas[0].plan_nombre === "Plan Inscripcion Test", "plan embebido en perfil");
  h.assert(perfil1.json.data.confirmadas[0].salida_fecha === "2027-12-15", "salida embebida");

  // IDOR: otro turista NO ve las inscripciones ajenas.
  const perfil2 = await h.api("/api/mis-inscripciones", { token: h.test.T2.token });
  h.assert(perfil2.json.data.confirmadas.length === 0, "turista 2 no ve inscripciones ajenas");

  const misinsId = h.test.inscripcion.id;
  const compAjeno = await h.api(`/api/inscripciones/${misinsId}/comprobante`, { token: h.test.T2.token });
  h.assertStatus(compAjeno.status, 403, "comprobante de otro turista → 403");
  const compAnon = await h.api(`/api/inscripciones/${misinsId}/comprobante`);
  h.assertStatus(compAnon.status, 401, "comprobante sin sesión → 401");
});

h.test("INSCR: el cupo queda reservado al inscribirse", async () => {
  const { id } = h.test.neg;
  const salidas = await h.api(`/api/businesses/${id}/planes/${h.test.plan.id}/salidas`, { token: h.test.O.token });
  const s = salidas.json.data.find((x) => String(x.id) === String(h.test.salida.id));
  h.assert(Number(s.cupo_ocupado) === 2, "cupo ocupado 2 tras la inscripción");
  h.assert(Number(s.cupo_disponible) === 8, "quedan 8 cupos disponibles");
});

h.test("INSCR: inscripción duplicada del mismo usuario a la misma salida → 409", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;
  const sid = h.test.salida.id;

  const dup = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T1.token, body: { personas: 1 },
  });
  h.assertStatus(dup.status, 409, "inscripción duplicada → 409");
  h.assertMsg(dup.json, "inscrito");

  // El cupo NO se duplicó al rechazar.
  const salidas = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
  const s = salidas.json.data.find((x) => String(x.id) === String(sid));
  h.assert(Number(s.cupo_ocupado) === 2, "cupo sigue en 2 (la duplicada no ocupó)");
});

h.test("INSCR: otro usuario sí puede inscribirse a la misma salida", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;
  const sid = h.test.salida.id;

  const insc = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T2.token, body: { personas: 1 },
  });
  h.assertStatus(insc.status, 201, "turista 2 se inscribe a la misma salida");
  h.assert(insc.json.data.estado === "confirmada", "estado CONFIRMADA");
  h.test.inscripcionT2 = insc.json.data;

  const salidas = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
  const s = salidas.json.data.find((x) => String(x.id) === String(sid));
  h.assert(Number(s.cupo_ocupado) === 3, "cupo ocupado 3 (2 + 1)");
});

h.test("INSCR: sin cupos suficientes → 400 con mensaje claro", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;
  const sid = h.test.salida.id;

  const excede = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T1.token, body: { personas: 50 },
  });
  h.assertStatus(excede.status, 400, "inscripción sin cupo → 400");
  h.assertMsg(excede.json, "Cupo insuficiente");

  // Sale de una salida con cupo 1 y se intenta tomar: mensaje de cupos agotados.
  const salida1 = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2027-11-20", hora: "08:00", cupo_maximo: 1 },
  });
  h.assertStatus(salida1.status, 201, "crear salida de 1 cupo");
  const sid1 = salida1.json.data.id;

  const t1 = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid1}/inscripciones`, {
    method: "POST", token: h.test.T1.token, body: { personas: 1 },
  });
  h.assertStatus(t1.status, 201, "ocupa el único cupo");

  const t2 = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid1}/inscripciones`, {
    method: "POST", token: h.test.T2.token, body: { personas: 1 },
  });
  h.assertStatus(t2.status, 400, "segunda inscripción sin cupo → 400");
  h.assertMsg(t2.json, "Cupo insuficiente");
});

h.test("INSCR: concurrencia — el último cupo no se sobre-reserva", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;

  const salida = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2028-02-01", cupo_maximo: 2, fecha_limite: "2028-01-25", hora_limite: "12:00" },
  });
  h.assertStatus(salida.status, 201, "salida de 2 cupos");
  const sid = salida.json.data.id;

  const [r1, r2] = await Promise.all([
    h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
      method: "POST", token: h.test.T1.token, body: { personas: 2 },
    }),
    h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
      method: "POST", token: h.test.T2.token, body: { personas: 2 },
    }),
  ]);

  const ok = r1.status === 201 ? r1 : r2;
  const rechazado = r1.status === 201 ? r2 : r1;
  h.assert(rechazado.status === 400, `1 éxito + 1 rechazo (${r1.status},${r2.status})`);
  h.assertMsg(rechazado.json, "Cupo insuficiente");

  const salidaTras = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
  const sConc = salidaTras.json.data.find((s) => String(s.id) === String(sid));
  h.assert(Number(sConc.cupo_ocupado) === 2, "cupo ocupado final 2 (sin sobre-reserva)");
  h.assert(Number(sConc.cupo_ocupado) <= Number(sConc.cupo_maximo), "ocupado nunca supera el máximo");
});

h.test("INSCR: el turista cancela su inscripción y se libera el cupo", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;
  const sid = h.test.salida.id;
  const iid = h.test.inscripcionT2.id;

  // Cancelar la inscripción de otro → 404 (no existe para ese usuario).
  const ajena = await h.api(`/api/inscripciones/${iid}/cancelar`, { method: "PUT", token: h.test.T1.token });
  h.assertStatus(ajena.status, 404, "cancelar inscripción ajena → 404");

  // Cancelar la propia → 200 y libera el cupo.
  const propia = await h.api(`/api/inscripciones/${iid}/cancelar`, { method: "PUT", token: h.test.T2.token });
  h.assertStatus(propia.status, 200, "turista cancela su inscripción");

  const salidas = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
  const s = salidas.json.data.find((x) => String(x.id) === String(sid));
  h.assert(Number(s.cupo_ocupado) === 2, "cupo liberado (vuelve a 2)");

  // No se puede cancelar dos veces.
  const repetida = await h.api(`/api/inscripciones/${iid}/cancelar`, { method: "PUT", token: h.test.T2.token });
  h.assertStatus(repetida.status, 400, "cancelar dos veces → 400");
});

h.test("INSCR: el negocio ve el resumen con las confirmadas y su cupo", async () => {
  const { id } = h.test.neg;
  const pid = h.test.plan.id;
  const sid = h.test.salida.id;

  const resumen = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones/resumen`, { token: h.test.O.token });
  h.assertStatus(resumen.status, 200, "resumen de inscripciones");
  h.assert(Number(resumen.json.data.confirmadas) === 2, "2 personas confirmadas");
  h.assert(Number(resumen.json.data.inscritos) === 2, "2 inscritos");
  h.assert(Number(resumen.json.data.pendientes) === 0, "0 pendientes de pago");
  h.assert(Number(resumen.json.data.pagados) === 0, "0 pagados");
});
