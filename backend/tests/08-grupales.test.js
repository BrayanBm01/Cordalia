const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;
const PNG = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`;
const BIG_PNG = `data:image/png;base64,${"A".repeat(2 * 1024 * 1024)}`;

h.test("GPL: setup (admin, negocios aprobados y turista)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const pass = "Test1234x!";
  const emailO = h.repo("f21test.grup.owner");
  const emailO2 = h.repo("f21test.grup.owner2");
  const emailT = h.repo("f21test.grup.turista");

  for (const [n, e, r] of [
    ["Owner Grupal", emailO, 2],
    ["Owner Grupal 2", emailO2, 2],
    ["Turista Grupal", emailT, 1],
  ]) {
    h.assertStatus((await h.createUser(admin.token, { nombre: n, email: e, password: pass, rol_id: r })).status, 201, `crear ${e}`);
  }

  const O = await h.login(emailO, pass);
  const O2 = await h.login(emailO2, pass);
  const T = await h.login(emailT, pass);
  h.assertStatus(O.status, 200, "login owner");
  h.assertStatus(O2.status, 200, "login owner 2");
  h.assertStatus(T.status, 200, "login turista");

  const neg = await h.api("/api/businesses", {
    method: "POST", token: O.token,
    body: { nombre: "Agencia Grupal Test", category_id: 4, destination_id: 1, whatsapp: "3200000000", email_contacto: "grupal@test.com", descripcion: "Agencia grupal" },
  });
  h.assertStatus(neg.status, 201, "crear negocio");
  h.assertStatus((await h.api(`/api/businesses/${neg.json.data.id}/estado`, {
    method: "PUT", token: admin.token, body: { estado: "approved" },
  })).status, 200, "aprobar negocio");

  const neg2 = await h.api("/api/businesses", {
    method: "POST", token: O2.token,
    body: { nombre: "Agencia Grupal Ajena", category_id: 4 },
  });
  h.assertStatus(neg2.status, 201, "crear negocio 2");

  h.test.O = O;
  h.test.O2 = O2;
  h.test.T = T;
  h.test.neg = neg.json.data;
  h.test.neg2 = neg2.json.data;
});

h.test("GPL: crea plan con descuentos por rango y capacidad referencial", async () => {
  const id = h.test.neg.id;
  const creado = await h.api(`/api/businesses/${id}/planes`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Ruta Grupal Andes", descripcion: "Paquete para grupos.",
      destination_id: 1, destino: "Andes, Antioquia",
      duracion_dias: 2, duracion_noches: 1, precio: 100000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      capacidad_referencial: 20,
      descuentos_rango: [
        { min: 1, max: 4, descuento: 0 },
        { min: 5, max: 9, descuento: 10 },
        { min: 10, descuento: 20 },
      ],
      incluye: ["Transporte", "Alojamiento"], itinerario: [],
    },
  });
  h.assertStatus(creado.status, 201, "crear plan grupal");
  const plan = creado.json.data;
  h.assert(Number(plan.capacidad_referencial) === 20, "capacidad referencial guardada");
  h.assert(Array.isArray(plan.descuentos_rango) && plan.descuentos_rango.length === 3, "3 rangos guardados");
  h.assert(Number(plan.descuentos_rango[2].descuento) === 20, "descuento 20% en rango abierto");
  h.test.plan = plan;
});

h.test("GPL: precio por persona aplica el rango escalonado", async () => {
  const pid = h.test.plan.id;

  const tres = await h.api(`/api/planes/${pid}/precio?personas=3`);
  h.assertStatus(tres.status, 200, "precio 3 personas");
  h.assert(Number(tres.json.data.descuento_porcentaje) === 0, "0% en 1-4");
  h.assert(Number(tres.json.data.precio_persona) === 100000, "precio por persona 100000");
  h.assert(Number(tres.json.data.total) === 300000, "total 3 personas");

  const siete = await h.api(`/api/planes/${pid}/precio?personas=7`);
  h.assertStatus(siete.status, 200, "precio 7 personas");
  h.assert(Number(siete.json.data.descuento_porcentaje) === 10, "10% en 5-9");
  h.assert(Number(siete.json.data.total) === 630000, "total 7 personas con 10%");
  h.assert(Number(siete.json.data.rango_aplicado.min) === 5, "rango 5 aplicado");

  const doce = await h.api(`/api/planes/${pid}/precio?personas=12`);
  h.assertStatus(doce.status, 200, "precio 12 personas");
  h.assert(Number(doce.json.data.descuento_porcentaje) === 20, "20% en 10+");
  h.assert(Number(doce.json.data.total) === 960000, "total 12 personas con 20%");

  const inv = await h.api(`/api/planes/${pid}/precio?personas=0`);
  h.assertStatus(inv.status, 400, "personas 0 → 400");
  const invMas = await h.api(`/api/planes/${pid}/precio?personas=9999`);
  h.assertStatus(invMas.status, 400, "personas 9999 → 400");
  const noExiste = await h.api(`/api/planes/999999999/precio?personas=3`);
  h.assertStatus(noExiste.status, 404, "plan inexistente → 404");
});

h.test("GPL: validaciones de rangos y capacidad rechazadas", async () => {
  const id = h.test.neg.id;
  const base = {
    nombre: "Plan X", duracion_dias: 1, duracion_noches: 0, precio: 100000,
    tipo_precio: "por_persona", tipo_plan: "plan", incluye: [], itinerario: [],
  };
  const casos = [
    [{ ...base, descuentos_rango: "no" }, "rangos no arreglo"],
    [{ ...base, descuentos_rango: [{ min: 1, max: 5, descuento: 150 }] }, "descuento >100"],
    [{ ...base, descuentos_rango: [{ min: 10, max: 5, descuento: 10 }] }, "máximo menor al mínimo"],
    [{ ...base, descuentos_rango: [{ min: 0, descuento: 10 }] }, "mínimo 0 inválido"],
    [{ ...base, descuentos_rango: Array.from({ length: 21 }, (_, i) => ({ min: i + 1, descuento: 0 })) }, "más de 20 rangos"],
    [{ ...base, capacidad_referencial: 0 }, "capacidad 0 inválida"],
    [{ ...base, capacidad_referencial: 500 }, "capacidad >200 inválida"],
  ];
  for (const [body, label] of casos) {
    const r = await h.api(`/api/businesses/${id}/planes`, {
      method: "POST", token: h.test.O.token, body,
    });
    h.assertStatus(r.status, 400, `${label} → 400`);
  }
});

h.test("GPL: imágenes base64 desde dispositivo (negocio, plan y promoción)", async () => {
  const id = h.test.neg.id;
  const pid = h.test.plan.id;

  const portada = await h.api(`/api/businesses/${id}`, {
    method: "PUT", token: h.test.O.token, body: { portada_url: PNG },
  });
  h.assertStatus(portada.status, 200, "portada base64");

  const imgBad = await h.api(`/api/businesses/${id}/planes/${pid}/imagenes`, {
    method: "POST", token: h.test.O.token, body: { url: "no-es-url" },
  });
  h.assertStatus(imgBad.status, 400, "imagen URL inválida → 400");

  const imgText = await h.api(`/api/businesses/${id}/planes/${pid}/imagenes`, {
    method: "POST", token: h.test.O.token, body: { url: "data:text/plain;base64,AAAA" },
  });
  h.assertStatus(imgText.status, 400, "data URL no-imagen → 400");

  const imgBig = await h.api(`/api/businesses/${id}/planes/${pid}/imagenes`, {
    method: "POST", token: h.test.O.token, body: { url: BIG_PNG },
  });
  h.assertStatus(imgBig.status, 400, "imagen >1.5MB → 400");

  const imgOk = await h.api(`/api/businesses/${id}/planes/${pid}/imagenes`, {
    method: "POST", token: h.test.O.token, body: { url: PNG, alt_text: "Ruta", is_primary: true },
  });
  h.assertStatus(imgOk.status, 201, "imagen plan base64 aceptada");

  const promo = await h.api(`/api/businesses/${id}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Para grupos", plan_id: pid, tipo_descuento: "porcentaje",
      valor_descuento: 10, imagen_url: PNG, fecha_inicio: "2026-09-01", fecha_fin: "2026-12-31",
    },
  });
  h.assertStatus(promo.status, 201, "promoción con imagen base64");
  h.assert(promo.json.data.imagen_url && promo.json.data.imagen_url.startsWith("data:image/"), "imagen base64 persistida");

  const promoBad = await h.api(`/api/businesses/${id}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Mala", plan_id: pid, tipo_descuento: "porcentaje",
      valor_descuento: 10, imagen_url: "no-es-url", fecha_inicio: "2026-09-01", fecha_fin: "2026-12-31",
    },
  });
  h.assertStatus(promoBad.status, 400, "promo imagen inválida → 400");

  const promoBig = await h.api(`/api/businesses/${id}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Grande", plan_id: pid, tipo_descuento: "porcentaje",
      valor_descuento: 10, imagen_url: BIG_PNG, fecha_inicio: "2026-09-01", fecha_fin: "2026-12-31",
    },
  });
  h.assertStatus(promoBig.status, 400, "promo imagen >1.5MB → 400");
  h.test.promo = promo.json.data;
});

h.test("GPL: promoción activa reduce el precio real (descuento ÚNICO, sin rango)", async () => {
  const pid = h.test.plan.id;

  const tres = await h.api(`/api/planes/${pid}/precio?personas=3`);
  h.assertStatus(tres.status, 200, "precio con promoción");
  h.assert(tres.json.data.tipo_descuento === "promocion", "3 personas: tipo_descuento 'promocion'");
  h.assert(Number(tres.json.data.descuento_promocion) === 10, "promoción 10% aplicada");
  h.assert(Number(tres.json.data.descuento_porcentaje) === 10, "% efectivo 10%");
  h.assert(tres.json.data.rango_aplicado === null, "rango NO aplica cuando hay promo activa");
  h.assert(Number(tres.json.data.precio_original_persona) === 100000, "original por persona 100000");
  h.assert(Number(tres.json.data.precio_base_persona) === 90000, "base post-promoción 90000");
  h.assert(Number(tres.json.data.precio_persona) === 90000, "por persona con promo");
  h.assert(Number(tres.json.data.subtotal_original) === 300000, "subtotal original 300000");
  h.assert(Number(tres.json.data.total) === 270000, "3 personas → 270000 (no 300000)");
  h.assert(Number(tres.json.data.ahorro_total) === 30000, "ahorro 30000");

  const siete = await h.api(`/api/planes/${pid}/precio?personas=7`);
  h.assertStatus(siete.status, 200, "precio 7 con promo activa");
  h.assert(siete.json.data.tipo_descuento === "promocion", "7 personas: tipo_descuento 'promocion'");
  h.assert(Number(siete.json.data.descuento_porcentaje) === 10, "SOLO 10% (promo) en 7 personas");
  h.assert(siete.json.data.rango_aplicado === null, "rango 10% NO se suma a la promo");
  h.assert(Number(siete.json.data.precio_persona) === 90000, "por persona 90000 (no 81000)");
  h.assert(Number(siete.json.data.subtotal_original) === 700000, "subtotal original 700000");
  h.assert(Number(siete.json.data.descuento_monto) === 70000, "descuento 70.000");
  h.assert(Number(siete.json.data.total) === 630000, "7 personas → 630000 (no 567000)");
  h.assert(Number(siete.json.data.ahorro_total) === 70000, "ahorro 70000");

  // Sin promo activa (la eliminamos) el rango vuelve a mandar.
  h.assertStatus((await h.api(`/api/businesses/${h.test.neg.id}/promociones/${h.test.promo.id}`, {
    method: "DELETE", token: h.test.O.token,
  })).status, 200, "eliminar promoción de prueba");

  const rango = await h.api(`/api/planes/${pid}/precio?personas=7`);
  h.assertStatus(rango.status, 200, "precio sin promo");
  h.assert(rango.json.data.tipo_descuento === "rango", "sin promo → tipo_descuento 'rango'");
  h.assert(Number(rango.json.data.descuento_porcentaje) === 10, "rango 10% en 5-9");
  h.assert(Number(rango.json.data.precio_persona) === 90000, "por persona con rango 90000");
  h.assert(Number(rango.json.data.total) === 630000, "total 630000");
  h.assert(Number(rango.json.data.rango_aplicado.min) === 5, "rango 5 aplicado");

  const detalle = await h.api(`/api/planes/${pid}`);
  h.assertStatus(detalle.status, 200, "detalle público");
  h.assert(!(Array.isArray(detalle.json.data.promociones) && detalle.json.data.promociones.length >= 1), "sin promociones tras eliminar");
});

h.test("GPL: cierre de inscripción y permisos entre vendedores", async () => {
  const id = h.test.neg.id;
  const pid = h.test.plan.id;

  const cerrada = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2026-12-20", cupo_maximo: 8, fecha_limite: "2020-01-01" },
  });
  h.assertStatus(cerrada.status, 201, "crear salida con cierre en el pasado");

  const intento = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${cerrada.json.data.id}/inscripciones`, {
    method: "POST", token: h.test.T.token, body: { personas: 2 },
  });
  h.assertStatus(intento.status, 400, "cierre de inscripción respetado → 400");

  const listaAjeno = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${cerrada.json.data.id}/inscripciones`, {
    token: h.test.O2.token,
  });
  h.assertStatus(listaAjeno.status, 403, "vendedor B no ve inscripciones de vendedor A → 403");

  h.assertStatus((await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${cerrada.json.data.id}`, {
    method: "DELETE", token: h.test.O.token,
  })).status, 200, "limpiar salida de prueba");
});

h.test("GPL: salidas con cupo (crear, listar, expiradas ocultas, ajeno 403)", async () => {
  const id = h.test.neg.id;
  const pid = h.test.plan.id;

  const creada = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2026-11-15", hora: "07:30", cupo_maximo: 12, fecha_limite: "2026-11-10" },
  });
  h.assertStatus(creada.status, 201, "crear salida");
  h.assert(Number(creada.json.data.cupo_maximo) === 12, "cupo maximo 12");
  h.assert(Number(creada.json.data.cupo_disponible) === 12, "cupo disponible inicial");
  h.assert(String(creada.json.data.fecha_limite).match(/^\d{4}-\d{2}-\d{2}$/), "fecha_limite formato YYYY-MM-DD");
  h.test.salida = creada.json.data;

  const pasada = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2020-01-01", cupo_maximo: 5 },
  });
  h.assertStatus(pasada.status, 201, "salida pasada (owner puede)");

  const publicas = await h.api(`/api/planes/${pid}/salidas`);
  h.assertStatus(publicas.status, 200, "salidas públicas");
  h.assert(publicas.json.data.some((s) => String(s.id) === String(h.test.salida.id)), "salida futura visible");
  h.assert(!publicas.json.data.some((s) => s.fecha === "2020-01-01"), "salida pasada oculta al turista");

  const ownerList = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
  h.assert(ownerList.json.data.some((s) => s.fecha === "2020-01-01"), "owner ve salidas pasadas");

  const ajeno = await h.api(`/api/businesses/${h.test.neg.id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O2.token, body: { fecha: "2026-12-01", cupo_maximo: 5 },
  });
  h.assertStatus(ajeno.status, 403, "otro dueño no programa salida → 403");

  const campoMal = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token, body: { fecha: "01/11/2026", cupo_maximo: 5 },
  });
  h.assertStatus(campoMal.status, 400, "fecha inválida → 400");

  const sinCupo = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token, body: { fecha: "2026-12-01", cupo_maximo: 0 },
  });
  h.assertStatus(sinCupo.status, 400, "cupo 0 → 400");
});

h.test("GPL: inscripciones descuentan cupo y devuelven al cancelar", async () => {
  const id = h.test.neg.id;
  const pid = h.test.plan.id;
  const sid = h.test.salida.id;

  const anon = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", body: { personas: 2 },
  });
  h.assertStatus(anon.status, 401, "sin sesión no se inscribe → 401");

  const cero = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T.token, body: { personas: 0 },
  });
  h.assertStatus(cero.status, 400, "personas 0 → 400");

  const insc = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T.token,
    body: { personas: 3, mensaje: "Grupo familiar" },
  });
  h.assertStatus(insc.status, 201, "turista se inscribe");
  h.assert(insc.json.data.nombre === "Turista Grupal", "nombre desde cuenta turista");
  h.assert(insc.json.data.email === h.test.T.usuario.email, "email desde cuenta turista");
  h.assert(Number(insc.json.data.personas) === 3, "personas 3");
  h.test.insc = insc.json.data;

  const despues = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
  const salidaTras = despues.json.data.find((s) => String(s.id) === String(sid));
  h.assert(Number(salidaTras.cupo_ocupado) === 3, "cupo ocupado 3");
  h.assert(Number(salidaTras.cupo_disponible) === 9, "cupo disponible 9");

  const exceso = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T.token, body: { personas: 12 },
  });
  h.assertStatus(exceso.status, 400, "supera cupo → 400");
  h.assertMsg(exceso.json, "Cupo insuficiente");

  const listaTurista = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, { token: h.test.T.token });
  h.assertStatus(listaTurista.status, 403, "turista no lista inscripciones → 403");

  const listaOwner = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, { token: h.test.O.token });
  h.assertStatus(listaOwner.status, 200, "owner lista inscripciones");
  h.assert(listaOwner.json.data.length === 1, "1 inscripción");
  h.assert(listaOwner.json.data[0].nombre === "Turista Grupal", "nombre visible al owner");

  const canc = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones/${h.test.insc.id}/cancelar`, {
    method: "PUT", token: h.test.O.token,
  });
  h.assertStatus(canc.status, 200, "owner cancela inscripción");

  const trasCancelar = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, { token: h.test.O.token });
  h.assert(trasCancelar.json.data.length === 1, "inscripción sigue listada (histórico)");
  h.assert(trasCancelar.json.data[0].estado === "cancelada", "estado cancelada");

  const salidaFinal = await h.api(`/api/planes/${pid}/salidas`);
  const sFinal = salidaFinal.json.data.find((s) => String(s.id) === String(sid));
  h.assert(Number(sFinal.cupo_ocupado) === 0, "cupo devuelto tras cancelar");
  h.assert(Number(sFinal.cupo_disponible) === 12, "disponible vuelve a 12");
});

h.test("GPL: flota y sugerencia de transporte por cantidad de personas", async () => {
  const id = h.test.neg.id;
  const pid = h.test.plan.id;

  const van = await h.api(`/api/businesses/${id}/vehiculos`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Van H1", tipo: "van", placa: "GHJ-001", capacidad: 11 },
  });
  h.assertStatus(van.status, 201, "crear vehículo");
  const buseta = await h.api(`/api/businesses/${id}/vehiculos`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Buseta 20", tipo: "buseta", placa: "GHJ-002", capacidad: 20 },
  });
  h.assertStatus(buseta.status, 201, "crear buseta");

  const con = await h.api(`/api/businesses/${id}/conductores`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Julia Pérez", telefono: "3105556677", licencia: "LC-88", disponible: true },
  });
  h.assertStatus(con.status, 201, "crear conductor");

  const asignado = await h.api(`/api/businesses/${id}/planes/${pid}/transporte`, {
    method: "POST", token: h.test.O.token,
    body: { vehiculo_id: van.json.data.id, conductor_id: con.json.data.id },
  });
  h.assertStatus(asignado.status, 201, "asignar transporte al plan");

  const lista = await h.api(`/api/businesses/${id}/planes/${pid}/transporte`, { token: h.test.O.token });
  h.assert(lista.json.data.length === 1, "1 transporte asignado");
  h.assert(lista.json.data[0].conductor_nombre === "Julia Pérez", "conductor embebido");

  const sug = await h.api(`/api/planes/${pid}/transporte/sugerir?personas=10`);
  h.assertStatus(sug.status, 200, "sugerir transporte");
  h.assert(Number(sug.json.data.personas) === 10, "personas en sugerencia");
  h.assert(sug.json.data.sugeridos.length >= 1, "al menos 1 vehículo sugerido");
  h.assert(sug.json.data.sugeridos[0].vehiculo.nombre === "Van H1", "prioriza el asignado");

  const flota = await h.api(`/api/planes/${h.test.plan.id === pid ? pid : pid}/transporte/sugerir?personas=25`);
  h.assert(Number(flota.json.data.total_vehiculos) >= 2, "25 personas requieren 2+ vehículos");

  const quitar = await h.api(`/api/businesses/${id}/planes/${pid}/transporte/${asignado.json.data.id}`, {
    method: "DELETE", token: h.test.O.token,
  });
  h.assertStatus(quitar.status, 200, "quitar transporte");

  const vehAjeno = await h.api(`/api/businesses/${id}/vehiculos`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Prueba", tipo: "auto", capacidad: 5 },
  });
  await h.api(`/api/businesses/${id}/vehiculos/${vehAjeno.json.data.id}`, {
    method: "DELETE", token: h.test.O.token,
  });
});

h.test("GPL-E: precio $590.000 con promoción 12% (1, 2, 4 y 5 personas)", async () => {
  const id = h.test.neg.id;
  const creado = await h.api(`/api/businesses/${id}/planes`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Excursion Parque X", descripcion: "Plan base $590.000.",
      destination_id: 1, destino: "Parque X",
      duracion_dias: 1, duracion_noches: 0, precio: 590000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(creado.status, 201, "crear plan 590000");
  h.test.plan12 = creado.json.data;

  const promo = await h.api(`/api/businesses/${id}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Descuento 12%", plan_id: creado.json.data.id,
      tipo_descuento: "porcentaje", valor_descuento: 12,
      fecha_inicio: "2000-01-01", fecha_fin: "2099-12-31",
    },
  });
  h.assertStatus(promo.status, 201, "crear promoción 12%");
  h.test.p12 = promo.json.data;

  const casos = [
    [1, 590000, 70800, 519200],
    [2, 1180000, 141600, 1038400],
    [4, 2360000, 283200, 2076800],
    [5, 2950000, 354000, 2596000],
  ];
  for (const [n, sub, desc, total] of casos) {
    const r = await h.api(`/api/planes/${h.test.plan12.id}/precio?personas=${n}`);
    h.assertStatus(r.status, 200, `precio ${n} persona(s)`);
    h.assert(Number(r.json.data.precio_original_persona) === 590000, `${n}: original por persona 590000`);
    h.assert(Number(r.json.data.subtotal_original) === sub, `${n}: subtotal original ${sub}`);
    h.assert(Number(r.json.data.descuento_total) === 12, `${n}: descuento total 12%`);
    h.assert(Number(r.json.data.descuento_monto) === desc, `${n}: descuento ${desc}`);
    h.assert(Number(r.json.data.total) === total, `${n}: total ${total}`);
    h.assert(Number(r.json.data.precio_persona) === Math.round(total / n), `${n}: por persona ${total / n}`);
  }
});

h.test("GPL-E: $590.000 × 10 con 20% por rango", async () => {
  const id = h.test.neg.id;
  const creado = await h.api(`/api/businesses/${id}/planes`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Grupo Grande", descripcion: "Rango 20% desde 10 pax.",
      destination_id: 1, destino: "Centro",
      duracion_dias: 1, duracion_noches: 0, precio: 590000,
      tipo_precio: "por_persona", tipo_plan: "plan",
      descuentos_rango: [
        { min: 1, max: 9, descuento: 0 },
        { min: 10, descuento: 20 },
      ],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(creado.status, 201, "crear plan rango 20%");

  const r = await h.api(`/api/planes/${creado.json.data.id}/precio?personas=10`);
  h.assertStatus(r.status, 200, "precio 10 personas");
  h.assert(Number(r.json.data.descuento_total) === 20, "20% aplicado");
  h.assert(Number(r.json.data.subtotal_original) === 5900000, "subtotal original 5.900.000");
  h.assert(Number(r.json.data.descuento_monto) === 1180000, "descuento 1.180.000");
  h.assert(Number(r.json.data.total) === 4720000, "total 4.720.000");
  h.assert(Number(r.json.data.precio_persona) === 472000, "por persona 472.000");
});

h.test("GPL-E: inscripciones con snapshot y valor total 3.634.400", async () => {
  const id = h.test.neg.id;
  const pid = h.test.plan12.id;

  const pass2 = "Test1234x!";
  const emailT2 = h.repo("f21ext.grup.turista2");
  h.assertStatus((await h.createUser(h.test.adminToken, {
    nombre: "Turista Grupal B", email: emailT2, password: pass2, rol_id: 1,
  })).status, 201, "crear segundo turista");
  const T2 = await h.login(emailT2, pass2);
  h.assertStatus(T2.status, 200, "login turista B");
  h.test.T2 = T2;

  const sinHora = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2030-01-15", cupo_maximo: 20, hora_limite: "18:00" },
  });
  h.assertStatus(sinHora.status, 400, "hora_limite sin fecha_limite → 400");

  const salida = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: {
      fecha: "2030-01-15", hora: "05:30", cupo_maximo: 20,
      fecha_limite: "2030-01-10", hora_limite: "18:00",
      lugar_encuentro: "Parque principal",
    },
  });
  h.assertStatus(salida.status, 201, "crear salida 20 cupos");
  const salidaCreada = salida.json.data;
  h.assert(salidaCreada.hora_limite === "18:00", "hora de cierre guardada");
  h.assert(salidaCreada.lugar_encuentro === "Parque principal", "lugar de encuentro guardado");
  h.test.salida123 = salidaCreada;

  const inscA = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${salidaCreada.id}/inscripciones`, {
    method: "POST", token: h.test.T.token, body: { personas: 4 },
  });
  h.assertStatus(inscA.status, 201, "turista A inscribe 4");
  h.assert(Number(inscA.json.data.precio_original_persona) === 590000, "snapshot original 590000");
  h.assert(Number(inscA.json.data.precio_persona) === 519200, "snapshot por persona 519200");
  h.assert(Number(inscA.json.data.descuento_porcentaje) === 12, "snapshot descuento 12%");
  h.assert(Number(inscA.json.data.precio_total) === 2076800, "snapshot total 2.076.800");
  h.assert(inscA.json.data.tipo_descuento === "promocion", "snapshot tipo_descuento 'promocion'");

  const inscB = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${salidaCreada.id}/inscripciones`, {
    method: "POST", token: T2.token, body: { personas: 3 },
  });
  h.assertStatus(inscB.status, 201, "turista B inscribe 3");
  h.assert(Number(inscB.json.data.precio_total) === 1557600, "snapshot total 1.557.600");

  const tras = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
  const sTras = tras.json.data.find((s) => String(s.id) === String(salidaCreada.id));
  h.assert(Number(sTras.cupo_ocupado) === 7, "7 inscritos");
  h.assert(Number(sTras.cupo_disponible) === 13, "13 disponibles");

  const resumen = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${salidaCreada.id}/inscripciones/resumen`, { token: h.test.O.token });
  h.assertStatus(resumen.status, 200, "resumen inscripciones");
  h.assert(Number(resumen.json.data.inscritos) === 7, "resumen 7 inscritos");
  h.assert(Number(resumen.json.data.valor_total) === 3634400, "valor total 3.634.400");
  h.assert(Number(resumen.json.data.total_solicitudes) === 2, "2 solicitudes");

  const exceso = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${salidaCreada.id}/inscripciones`, {
    method: "POST", token: h.test.T.token, body: { personas: 14 },
  });
  h.assertStatus(exceso.status, 400, "14 personas sobre 13 libres → 400");
  h.assertMsg(exceso.json, "Cupo insuficiente");

  // La promoción cambia después: la inscripción NO debe cambiar retroactivamente.
  h.assertStatus((await h.api(`/api/businesses/${id}/promociones/${h.test.p12.id}/estado`, {
    method: "PUT", token: h.test.O.token, body: { estado: "inactivo" },
  })).status, 200, "desactivar promoción");

  const listaOwner = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${salidaCreada.id}/inscripciones`, { token: h.test.O.token });
  h.assert(listaOwner.json.data.length === 2, "2 inscripciones históricas");
  h.assert(
    listaOwner.json.data.every((i) => Number(i.precio_total) === (Number(i.personas) === 4 ? 2076800 : 1557600)),
    "snapshot inmutable tras desactivar promoción"
  );
  h.assert(
    listaOwner.json.data.every((i) => i.tipo_descuento === "promocion"),
    "tipo_descuento de la promoción guardado en el snapshot"
  );
});

h.test("GPL-E: concurrencia — último cupo no se sobre-reserva", async () => {
  const id = h.test.neg.id;
  const pid = h.test.plan12.id;

  const salida = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2030-02-01", cupo_maximo: 2, fecha_limite: "2030-01-25", hora_limite: "12:00" },
  });
  h.assertStatus(salida.status, 201, "salida de 2 cupos");

  const sid = salida.json.data.id;
  const [r1, r2] = await Promise.all([
    h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
      method: "POST", token: h.test.T.token, body: { personas: 2 },
    }),
    h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
      method: "POST", token: h.test.T2.token, body: { personas: 2 },
    }),
  ]);

  const estado201 = r1.status === 201 ? r1 : r2;
  const estado400 = r1.status === 201 ? r2 : r1;
  h.assert(estado400.status === 400, `1 éxito + 1 rechazo (${r1.status},${r2.status})`);
  h.assertMsg(estado400.json, "Cupo insuficiente");
  const salidaTras = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
  const sConc = salidaTras.json.data.find((s) => String(s.id) === String(sid));
  h.assert(Number(sConc.cupo_ocupado) === 2, "cupo ocupado final 2 (sin sobre-reserva)");
  h.assert(estado201.json.data.precio_total === 1180000, "2 personas sin promo activa → 1.180.000");
});

h.test("GPL-E: transporte por salida según inscritos reales", async () => {
  const id = h.test.neg.id;
  const creado = await h.api(`/api/businesses/${id}/planes`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Plan Transporte Test", descripcion: "Flota y salidas.",
      destination_id: 1, destino: "Rural",
      duracion_dias: 1, duracion_noches: 0, precio: 300000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(creado.status, 201, "crear plan transporte");
  const pid = creado.json.data.id;

  const conductorA = await h.api(`/api/businesses/${id}/conductores`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Carlos Rodríguez", telefono: "3111111111", disponible: true },
  });
  const conductorB = await h.api(`/api/businesses/${id}/conductores`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Ana Torres", telefono: "3222222222", disponible: true },
  });
  const conductorC = await h.api(`/api/businesses/${id}/conductores`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Luis Mora", telefono: "3333333333", disponible: true },
  });
  h.assertStatus(conductorA.status, 201, "conductor A");
  h.assertStatus(conductorB.status, 201, "conductor B");
  h.assertStatus(conductorC.status, 201, "conductor C");

  const camioneta = await h.api(`/api/businesses/${id}/vehiculos`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Camioneta R", tipo: "camioneta", marca: "Toyota", placa: "CAM-009", capacidad: 9, conductor_id: conductorA.json.data.id },
  });
  const minivan = await h.api(`/api/businesses/${id}/vehiculos`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Minivan M", tipo: "minivan", placa: "MIN-013", capacidad: 13, conductor_id: conductorB.json.data.id },
  });
  const bus = await h.api(`/api/businesses/${id}/vehiculos`, {
    method: "POST", token: h.test.O.token,
    body: { nombre: "Bus G", tipo: "bus", placa: "BUS-022", capacidad: 22, conductor_id: conductorC.json.data.id },
  });
  h.assertStatus(camioneta.status, 201, "camioneta 9");
  h.assertStatus(minivan.status, 201, "minivan 13");
  h.assertStatus(bus.status, 201, "bus 22");

  const salida = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2030-01-20", hora: "06:00", cupo_maximo: 30, fecha_limite: "2030-01-15", hora_limite: "10:00", lugar_encuentro: "Terminal" },
  });
  h.assertStatus(salida.status, 201, "salida transporte");
  const sid = salida.json.data.id;

  // Cada inscripción corresponde a un TURISTA DISTINTO: las inscripciones
  // a planes turísticos son gratuitas y una persona no puede duplicar su
  // reserva para la misma salida (regla de negocio). Por eso el crecimiento
  // del cupo se simula con varios turistas.
  const passT = "Test1234x!";
  const tokens = [h.test.T.token];
  for (let i = 0; i < 3; i++) {
    const emailExtra = h.repo("f21ext.grup.turistaExtra");
    h.assertStatus((await h.createUser(h.test.adminToken, {
      nombre: `Turista Grupal Extra ${i + 1}`, email: emailExtra, password: passT, rol_id: 1,
    })).status, 201, `crear turista extra ${i + 1}`);
    const loginExtra = await h.login(emailExtra, passT);
    h.assertStatus(loginExtra.status, 200, `login turista extra ${i + 1}`);
    tokens.push(loginExtra.token);
  }

  let turno = 0;
  async function inscribir(n) {
    const token = tokens[turno % tokens.length];
    turno++;
    return h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
      method: "POST", token, body: { personas: n },
    });
  }
  async function recomendado() {
    const r = await h.api(`/api/planes/${pid}/salidas/${sid}/transporte`);
    h.assertStatus(r.status, 200, "transporte público salida");
    return r.json.data;
  }

  h.assertStatus((await inscribir(9)).status, 201, "9 inscritos");
  let rec = await recomendado();
  h.assert(rec.vehiculo && Number(rec.vehiculo.capacidad) === 9, "9 pax → camioneta de 9");
  h.assert(rec.conductor && rec.conductor.nombre === "Carlos Rodríguez", "conductor asignado a la camioneta");

  h.assertStatus((await inscribir(3)).status, 201, "+3 → 12 inscritos");
  rec = await recomendado();
  h.assert(rec.vehiculo && Number(rec.vehiculo.capacidad) === 13, "12 pax → minivan de 13");

  // Asignación manual de transporte a la salida.
  const asignar = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/transporte`, {
    method: "POST", token: h.test.O.token,
    body: { vehiculo_id: minivan.json.data.id, conductor_id: conductorB.json.data.id },
  });
  h.assertStatus(asignar.status, 201, "asignar minivan a la salida");
  const asignados = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/transporte/asignados`, { token: h.test.O.token });
  h.assert(asignados.json.data.length === 1, "1 transporte asignado");
  h.assert(asignados.json.data[0].conductor_nombre === "Ana Torres", "conductor embebido en asignación");
  h.assertStatus((await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/transporte/${asignados.json.data[0].id}`, {
    method: "DELETE", token: h.test.O.token,
  })).status, 200, "desasignar transporte");

  h.assertStatus((await inscribir(9)).status, 201, "+9 → 21 inscritos");
  rec = await recomendado();
  h.assert(rec.vehiculo && Number(rec.vehiculo.capacidad) === 22, "21 pax → bus de 22");

  h.assertStatus((await inscribir(3)).status, 201, "+3 → 24 inscritos");
  rec = await recomendado();
  h.assert(rec.vehiculo === null, "24 pax y sin bus → sin vehículo");
  h.assertMsg({ message: rec.mensaje }, "No hay un vehículo disponible con capacidad");
});

h.test("GPL: limpieza administrada", async () => {
  for (const n of [h.test.neg, h.test.neg2]) {
    h.assertStatus((await h.api("/api/businesses/" + n.id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar negocio ${n.id}`);
  }
  for (const u of [h.test.O.usuario, h.test.O2.usuario, h.test.T.usuario]) {
    const { rows } = await h.q("SELECT id FROM usuarios WHERE email = $1", [u.email]);
    h.assertStatus((await h.api("/api/usuarios/" + rows[0].id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar usuario ${u.email}`);
  }
});