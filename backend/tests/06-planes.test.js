const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;

// Las fechas de las promos se calculan RELATIVAS al dia de ejecucion.
// Antes estaban fijas (2026-09-01 / 2026-09-30) y la suite dejaba de
// ser valida al pasar esa ventana: las promos se veian vencidas.
const _hoy = new Date();
const _iso = (d) => d.toISOString().slice(0, 10);
const HOY = _iso(_hoy);
const INICIO = _iso(new Date(_hoy.getTime() - 5 * 24 * 60 * 60 * 1000));
const FIN = _iso(new Date(_hoy.getTime() + 20 * 24 * 60 * 60 * 1000));

h.test("PLN: setup (admin, negocios y turista)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const pass = "Test1234x!";
  const emailA = h.repo("f21test.plan.a");
  const emailB = h.repo("f21test.plan.b");
  const emailC = h.repo("f21test.plan.c");
  const emailT = h.repo("f21test.plan.t");

  for (const [n, e, r] of [
    ["Plan A", emailA, 2],
    ["Plan B", emailB, 2],
    ["Plan C", emailC, 2],
    ["Turista Plan", emailT, 1],
  ]) {
    h.assertStatus((await h.createUser(admin.token, { nombre: n, email: e, password: pass, rol_id: r })).status, 201, `crear ${e}`);
  }

  const A = await h.login(emailA, pass);
  const B = await h.login(emailB, pass);
  const C = await h.login(emailC, pass);
  const T = await h.login(emailT, pass);
  h.assertStatus(A.status, 200, "login A");
  h.assertStatus(B.status, 200, "login B");
  h.assertStatus(C.status, 200, "login C");
  h.assertStatus(T.status, 200, "login T");

  const crear = async (token, body) => h.api("/api/businesses", { method: "POST", token, body });

  const negA = await crear(A.token, { nombre: "Agencia Guatapé", category_id: 4, destination_id: 1, whatsapp: "3001234567", email_contacto: "ventas@guatape.test", descripcion: "Agencia" });
  h.assertStatus(negA.status, 201, "crear negocio A");
  const negB = await crear(B.token, { nombre: "Agencia Cartagena", category_id: 4, destination_id: 2, whatsapp: "3115556677", email_contacto: "ventas@cartagena.test" });
  h.assertStatus(negB.status, 201, "crear negocio B");
  const negC = await crear(C.token, { nombre: "Agencia Sin Publicar", category_id: 4 });
  h.assertStatus(negC.status, 201, "crear negocio C (pending)");

  for (const id of [negA.json.data.id, negB.json.data.id]) {
    const est = await h.api(`/api/businesses/${id}/estado`, {
      method: "PUT", token: admin.token, body: { estado: "approved" },
    });
    h.assertStatus(est.status, 200, `aprobar negocio ${id}`);
  }

  h.test.A = A;
  h.test.B = B;
  h.test.C = C;
  h.test.T = T;
  h.test.negA = negA.json.data;
  h.test.negB = negB.json.data;
  h.test.negC = negC.json.data;
});

h.test("PLN: BUSINESS crea plan con itinerario e incluidos", async () => {
  const id = h.test.negA.id;
  const creado = await h.api(`/api/businesses/${id}/planes`, {
    method: "POST",
    token: h.test.A.token,
    body: {
      nombre: "Guatapé Aventura",
      descripcion: "Experiencia completa de 3 días.",
      destination_id: 1,
      destino: "Guatapé, Antioquia",
      duracion_dias: 3,
      duracion_noches: 2,
      precio: 650000,
      tipo_precio: "por_persona",
      tipo_plan: "plan",
      incluye: ["Transporte", "Alojamiento", "Desayuno", "Almuerzo", "Guía"],
      itinerario: [
        { dia: 1, actividades: [{ hora: "08:00", descripcion: "Salida de Medellín" }, { hora: "12:30", descripcion: "Almuerzo" }] },
        { dia: 2, actividades: [{ hora: "09:00", descripcion: "Piedra del Peñol" }] },
        { dia: 3, actividades: [{ hora: "15:00", descripcion: "Regreso a Medellín" }] },
      ],
    },
  });
  h.assertStatus(creado.status, 201, "crear plan");
  const plan = creado.json.data;
  h.assert(plan.slug === "guatape-aventura", `slug = ${plan.slug}`);
  h.assert(plan.estado === "activo", "estado activo por defecto");
  h.assert(plan.business_id === id, "business_id asignado del URL");
  h.assert(plan.incluye.length === 5, "incluye 5");
  h.assert(plan.itinerario.length === 3, "itinerario 3 días");
  h.assert(plan.itinerario[0].actividades[0].hora === "08:00", "hora guardada");
  h.assert(plan.duracion_dias === 3 && plan.duracion_noches === 2, "duración");
  h.assert(Number(plan.precio) === 650000, "precio");
  h.assert(plan.precio_anterior === undefined, "no existe precio_anterior");
  h.assert(Array.isArray(plan.plan_imagenes), "plan_imagenes presente");
  h.test.planA = plan;
});

h.test("PLN: validaciones de plan rechazadas", async () => {
  const id = h.test.negA.id;
  const base = {
    nombre: "Plan", duracion_dias: 1, duracion_noches: 0, precio: 100000,
    tipo_precio: "por_persona", tipo_plan: "plan", incluye: [], itinerario: [],
  };
  const casos = [
    [{ ...base, nombre: undefined }, "nombre obligatorio"],
    [{ ...base, precio: undefined }, "precio obligatorio"],
    [{ ...base, precio: -5 }, "precio negativo"],
    [{ ...base, duracion_dias: 0 }, "días inválidos"],
    [{ ...base, duracion_noches: -1 }, "noches inválidas"],
    [{ ...base, tipo_precio: "raro" }, "tipo precio inválido"],
    [{ ...base, tipo_plan: "raro" }, "tipo plan inválido"],
    [{ ...base, precio_anterior: 100000 }, "campo precio_anterior eliminado"],
    [{ ...base, itinerario: [{ dia: 1, actividades: [{ hora: "88:99", descripcion: "x" }] }] }, "hora inválida"],
    [{ ...base, itinerario: [{ dia: 1, actividades: [{ hora: "10:00", descripcion: "" }] }] }, "actividad vacía"],
    [{ ...base, incluye: [""] }, "incluido vacío"],
  ];
  for (const [body, label] of casos) {
    const r = await h.api(`/api/businesses/${id}/planes`, {
      method: "POST", token: h.test.A.token, body,
    });
    h.assertStatus(r.status, 400, `${label} → 400`);
  }
});

h.test("PLN: ownership (B no modifica planes de A; turista no crea)", async () => {
  const id = h.test.negA.id;
  const pid = h.test.planA.id;

  const edit = await h.api(`/api/businesses/${id}/planes/${pid}`, {
    method: "PUT", token: h.test.B.token, body: { precio: 1 },
  });
  h.assertStatus(edit.status, 403, "B edita plan ajeno → 403");

  const del = await h.api(`/api/businesses/${id}/planes/${pid}`, {
    method: "DELETE", token: h.test.B.token,
  });
  h.assertStatus(del.status, 403, "B elimina plan ajeno → 403");

  const cruce = await h.api(`/api/businesses/${h.test.negB.id}/planes/${pid}`, {
    token: h.test.A.token,
  });
  h.assertStatus(cruce.status, 404, "plan de otro negocio → 404");

  const crear = await h.api(`/api/businesses/${id}/planes`, {
    method: "POST", token: h.test.T.token,
    body: { nombre: "Intento", duracion_dias: 1, precio: 10 },
  });
  h.assertStatus(crear.status, 403, "turista no crea planes → 403");

  const sinToken = await h.api(`/api/businesses/${id}/planes`, {
    method: "POST",
    body: { nombre: "X", duracion_dias: 1, precio: 10 },
  });
  h.assertStatus(sinToken.status, 401, "sin token → 401");
});

h.test("PLN: dueño edita (precio, tipo, itinerario, slug se regenera)", async () => {
  const id = h.test.negA.id;
  const pid = h.test.planA.id;
  const upd = await h.api(`/api/businesses/${id}/planes/${pid}`, {
    method: "PUT",
    token: h.test.A.token,
    body: {
      nombre: "Guatapé Aventura Plus",
      precio: 700000,
      tipo_plan: "paquete",
      itinerario: [
        { dia: 1, actividades: [{ hora: "10:00", descripcion: "Recorrido" }] },
      ],
    },
  });
  h.assertStatus(upd.status, 200, "editar plan");
  h.assert(upd.json.data.slug === "guatape-aventura-plus", `slug editado = ${upd.json.data.slug}`);
  h.assert(Number(upd.json.data.precio) === 700000, "precio actualizado");
  h.assert(upd.json.data.tipo_plan === "paquete", "tipo plan actualizado");
  h.assert(upd.json.data.itinerario.length === 1, "itinerario reemplazado");
  h.test.planA = upd.json.data;
});

h.test("PLN: imágenes del plan (agregar, principal, ajeno 403)", async () => {
  const id = h.test.negA.id;
  const pid = h.test.planA.id;

  const img1 = await h.api(`/api/businesses/${id}/planes/${pid}/imagenes`, {
    method: "POST", token: h.test.A.token,
    body: { url: "https://ejemplo.test/plan1.jpg", alt_text: "Guatapé", is_primary: true },
  });
  h.assertStatus(img1.status, 201, "agregar imagen 1");

  const ajeno = await h.api(`/api/businesses/${id}/planes/${pid}/imagenes`, {
    method: "POST", token: h.test.B.token, body: { url: "https://ejemplo.test/x.jpg" },
  });
  h.assertStatus(ajeno.status, 403, "B no agrega imagen → 403");

  const urlBad = await h.api(`/api/businesses/${id}/planes/${pid}/imagenes`, {
    method: "POST", token: h.test.A.token, body: { url: "no-es-url" },
  });
  h.assertStatus(urlBad.status, 400, "URL inválida → 400");

  const detalle = await h.api(`/api/businesses/${id}/planes/${pid}`, { token: h.test.A.token });
  h.assert(detalle.json.data.plan_imagenes.length === 1, "img embebida en detalle");
  h.assert(detalle.json.data.plan_imagenes[0].is_primary === true, "primera es principal");
  h.test.imgId = img1.json.data.id;
});

h.test("PLN: desactivar/activar y visibilidad para el turista", async () => {
  const id = h.test.negA.id;
  const pid = h.test.planA.id;

  const off = await h.api(`/api/businesses/${id}/planes/${pid}/estado`, {
    method: "PUT", token: h.test.A.token, body: { estado: "inactivo" },
  });
  h.assertStatus(off.status, 200, "desactivar plan");
  h.assert(off.json.data.estado === "inactivo", "estado inactivo");

  const publico = await h.api(`/api/planes/${pid}`);
  h.assertStatus(publico.status, 404, "turista no ve plan inactivo → 404");

  const dueño = await h.api(`/api/businesses/${id}/planes/${pid}`, { token: h.test.A.token });
  h.assertStatus(dueño.status, 200, "dueño sigue viendo su plan inactivo");
  h.assert(dueño.json.data.estado === "inactivo", "dueño ve estado");

  const listaOwner = await h.api(`/api/businesses/${id}/planes`, { token: h.test.A.token });
  h.assert(listaOwner.json.data.some((p) => String(p.id) === String(pid)), "owner ve inactivo en lista");

  const estadoInvalido = await h.api(`/api/businesses/${id}/planes/${pid}/estado`, {
    method: "PUT", token: h.test.A.token, body: { estado: "zzz" },
  });
  h.assertStatus(estadoInvalido.status, 400, "estado inválido → 400");

  const on = await h.api(`/api/businesses/${id}/planes/${pid}/estado`, {
    method: "PUT", token: h.test.A.token, body: { estado: "activo" },
  });
  h.assertStatus(on.status, 200, "reactivar plan");

  const visible = await h.api(`/api/planes/${pid}`);
  h.assertStatus(visible.status, 200, "turista vuelve a ver el plan");
});

h.test("PLN: negocio pending no publica planes", async () => {
  const negCId = h.test.negC.id;
  const creado = await h.api(`/api/businesses/${negCId}/planes`, {
    method: "POST", token: h.test.C.token,
    body: { nombre: "Plan Secreto", duracion_dias: 1, duracion_noches: 0, precio: 50000, tipo_precio: "por_persona", tipo_plan: "plan", incluye: [], itinerario: [] },
  });
  h.assertStatus(creado.status, 201, "C crea plan (dueño puede)");

  const listaTurista = await h.api("/api/planes", { token: h.test.T.token });
  h.assertStatus(listaTurista.status, 200, "lista pública");
  const pids = listaTurista.json.data.filter((p) => p.business_id === negCId);
  h.assert(pids.length === 0, "turista no ve planes de negocio pending");

  const detalle = await h.api(`/api/planes/${creado.json.data.id}`);
  h.assertStatus(detalle.status, 404, "detalle público → 404");

  const negocioOculto = await h.api(`/api/businesses/${negCId}/planes`, { token: h.test.T.token });
  h.assertStatus(negocioOculto.status, 404, "negocio no visible → 404");
  h.test.planC = creado.json.data;
});

h.test("PLN: listado público con filtros", async () => {
  const T = h.test.T.token;

  const creadaExpr = await h.api(`/api/businesses/${h.test.negB.id}/planes`, {
    method: "POST", token: h.test.B.token,
    body: {
      nombre: "Cartagena Express", duracion_dias: 1, duracion_noches: 0,
      precio: 180000, tipo_precio: "por_persona", tipo_plan: "plan",
      incluye: ["Transporte", "Desayuno"], itinerario: [{ dia: 1, actividades: [] }],
    },
  });
  h.assertStatus(creadaExpr.status, 201, "crear plan 1 día");
  h.test.planExpr = creadaExpr.json.data;

  const todos = await h.api("/api/planes", { token: T });
  h.assert(Array.isArray(todos.json.data) && todos.json.data.length >= 2, `listado público contiene al menos los planes creados (${todos.json.data.length})`);
  h.assert(todos.json.data.some((p) => String(p.id) === String(h.test.planExpr.id)), "plan público de 1 día aparece en el listado");

  const dias = await h.api("/api/planes?dias=1", { token: T });
  h.assert(dias.json.data.some((p) => String(p.id) === String(h.test.planExpr.id)), "filtro dias=1 incluye plan de 1 día");
  h.assert(!dias.json.data.some((p) => String(p.id) === String(h.test.planA.id)), "filtro dias=1 excluye plan de más días");

  const gold = await h.api("/api/planes?tipo=plan", { token: T });
  h.assert(gold.json.data.some((p) => String(p.id) === String(h.test.planExpr.id)), "filtro tipo=plan incluye plan de tipo plan");

  const paquete = await h.api("/api/planes?tipo=paquete", { token: T });
  h.assert(paquete.json.data.some((p) => String(p.id) === String(h.test.planA.id)), "filtro tipo=paquete incluye el paquete creado");

  const aleatorio = await h.api("/api/planes?tipo=experiencia", { token: T });
  h.assert(!aleatorio.json.data.some((p) => String(p.id) === String(h.test.planA.id) || String(p.id) === String(h.test.planExpr.id)), "filtro tipo=experiencia no incluye los planes creados");

  const incluye = await h.api("/api/planes?incluye=Alojamiento", { token: T });
  h.assert(incluye.json.data.some((p) => String(p.id) === String(h.test.planA.id)), "filtro incluye Alojamiento incluye el plan creado");

  const rango = await h.api("/api/planes?precio_min=650000&precio_max=720000", { token: T });
  h.assert(rango.json.data.some((p) => String(p.id) === String(h.test.planA.id)), "filtro rango precio incluye el plan creado");
});

h.test("PLN: promociones (crear, válidas, filtrar promos)", async () => {
  const idA = h.test.negA.id;
  const pid = h.test.planA.id;

  const sinRelacion = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.A.token,
    body: { nombre: "Sin plan", tipo_descuento: "porcentaje", valor_descuento: 10, fecha_inicio: INICIO, fecha_fin: FIN },
  });
  h.assertStatus(sinRelacion.status, 400, "promo sin plan → 400");

  const planAjeno = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.A.token,
    body: { nombre: "Plan ajeno", plan_id: h.test.planC.id, tipo_descuento: "porcentaje", valor_descuento: 10, fecha_inicio: INICIO, fecha_fin: FIN },
  });
  h.assertStatus(planAjeno.status, 400, "promo sobre plan de otro negocio → 400");

  const porcentajeMalo = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.A.token,
    body: { nombre: "Baja", plan_id: pid, tipo_descuento: "porcentaje", valor_descuento: 150, fecha_inicio: INICIO, fecha_fin: FIN },
  });
  h.assertStatus(porcentajeMalo.status, 400, "descuento >100 → 400");

  const fechasMalas = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.A.token,
    body: { nombre: "Tiempo", plan_id: pid, tipo_descuento: "valor", valor_descuento: 50000, fecha_inicio: FIN, fecha_fin: INICIO },
  });
  h.assertStatus(fechasMalas.status, 400, "fechas invertidas → 400");

  const fechaMala = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.A.token,
    body: { nombre: "Tiempo", plan_id: pid, tipo_descuento: "valor", valor_descuento: 50000, fecha_inicio: "01/09/2026", fecha_fin: FIN },
  });
  h.assertStatus(fechaMala.status, 400, "formato fecha inválido → 400");

  const creada = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.A.token,
    body: {
      nombre: "20% de descuento en Guatapé", plan_id: pid,
      descripcion: "Oferta de temporada", tipo_descuento: "porcentaje",
      valor_descuento: 20,
      fecha_inicio: INICIO, fecha_fin: FIN,
    },
  });
  h.assertStatus(creada.status, 201, "crear promoción");
  h.assert(creada.json.data.estado === "activo", "promo activa por defecto");
  h.test.promo = creada.json.data;

  const listaPublica = await h.api(`/api/businesses/${idA}/promociones`);
  h.assertStatus(listaPublica.status, 200, "pub lista promos de negocio visible");
  h.assert(listaPublica.json.data.length === 1, "1 promo visible para turista");

  const detallePlan = await h.api(`/api/planes/${pid}`);
  h.assert(detallePlan.json.data.promociones.length === 1, "plan público incluye promo activa");

  const soloPromos = await h.api("/api/planes?promos=1", { token: h.test.T.token });
  h.assert(soloPromos.json.data.some((p) => String(p.id) === String(pid)), "filtro promos=1 incluye el plan con promo activa");

  h.test.pidVigente = pid;
});

h.test("PLN: campos caducados rechazados; no hay promos activas solapadas; desactivar promo la oculta", async () => {
  const idA = h.test.negA.id;
  const pid = h.test.planA.id;

  const legado = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.A.token,
    body: { nombre: "Legada", plan_id: pid, tipo_descuento: "valor", valor_descuento: 100000, precio_anterior: 800000, precio_promocional: 650000, fecha_inicio: INICIO, fecha_fin: FIN },
  });
  h.assertStatus(legado.status, 400, "campo precio_anterior/precio_promocional rechazado → 400");

  // La promo creada antes (h.test.promo) está ACTIVA y vigente en INICIO→FIN.
  const solape = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.A.token,
    body: { nombre: "Solape", plan_id: pid, tipo_descuento: "porcentaje", valor_descuento: 10, fecha_inicio: INICIO, fecha_fin: FIN },
  });
  h.assertStatus(solape.status, 400, "promo activa solapada con otra activa del mismo plan → 400");

  // Desactivar la promo permite crear una nueva activa (no solapada con ninguna activa).
  const off = await h.api(`/api/businesses/${idA}/promociones/${h.test.promo.id}/estado`, {
    method: "PUT", token: h.test.A.token, body: { estado: "inactivo" },
  });
  h.assertStatus(off.status, 200, "desactivar promo");

  const detallePlan = await h.api(`/api/planes/${pid}`);
  h.assert(detallePlan.json.data.promociones.length === 0, "promo inactiva no se muestra");

  const sucesiva = await h.api(`/api/businesses/${idA}/promociones`, {
    method: "POST", token: h.test.A.token,
    body: { nombre: "Sucesiva", plan_id: pid, tipo_descuento: "porcentaje", valor_descuento: 15, fecha_inicio: INICIO, fecha_fin: FIN },
  });
  h.assertStatus(sucesiva.status, 201, "tras desactivarla, nueva promo activa es válida");
  await h.api(`/api/businesses/${idA}/promociones/${sucesiva.json.data.id}`, {
    method: "DELETE", token: h.test.A.token,
  });

  const Bmb = await h.api(`/api/businesses/${idA}/promociones/${h.test.promo.id}/estado`, {
    method: "PUT", token: h.test.B.token, body: { estado: "activo" },
  });
  h.assertStatus(Bmb.status, 403, "B no activa promo ajena → 403");

  const on = await h.api(`/api/businesses/${idA}/promociones/${h.test.promo.id}/estado`, {
    method: "PUT", token: h.test.A.token, body: { estado: "activo" },
  });
  h.assertStatus(on.status, 200, "reactivar promo");
});

h.test("PLN: el detalle público expone información de contacto del negocio", async () => {
  const detalle = await h.api(`/api/planes/${h.test.planA.id}`);
  h.assertStatus(detalle.status, 200, "detalle público");
  h.assert(detalle.json.data.negocio_nombre === "Agencia Guatapé", "nombre del negocio expuesto");
  h.assert(detalle.json.data.negocio_whatsapp === "3001234567", "whatsapp para contacto");
  h.assert(detalle.json.data.negocio_email === "ventas@guatape.test", "email de contacto");
  h.assert(detalle.json.data.destino_lugar, "destino lugar presente");
});

h.test("PLN: limpieza administrada", async () => {
  for (const n of [h.test.negA, h.test.negB, h.test.negC]) {
    h.assertStatus((await h.api("/api/businesses/" + n.id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar negocio ${n.id}`);
  }
  for (const u of [h.test.A.usuario, h.test.B.usuario, h.test.C.usuario, h.test.T.usuario]) {
    const { rows } = await h.q("SELECT id FROM usuarios WHERE email = $1", [u.email]);
    h.assertStatus((await h.api("/api/usuarios/" + rows[0].id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar usuario ${u.email}`);
  }
  const admins = await h.countAdmins();
  h.assert(admins >= 1, `sigue habiendo al menos 1 admin (${admins})`);
});