const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;

h.test("PRECIO: setup (admin, owner, turista y negocio aprobado)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const pass = "Test1234x!";
  const emailO = h.repo("f21fix.owner");
  const emailT = h.repo("f21fix.turista");

  h.assertStatus((await h.createUser(admin.token, { nombre: "Owner Precio", email: emailO, password: pass, rol_id: 2 })).status, 201, "crear owner");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Turista Precio", email: emailT, password: pass, rol_id: 1 })).status, 201, "crear turista");

  const O = await h.login(emailO, pass);
  const T = await h.login(emailT, pass);
  h.assertStatus(O.status, 200, "login owner");
  h.assertStatus(T.status, 200, "login turista");

  const neg = await h.api("/api/businesses", {
    method: "POST", token: O.token,
    body: { nombre: "Agencia Precio Test", category_id: 4, destination_id: 1, whatsapp: "3200000001", email_contacto: "precio@test.com", descripcion: "Tests de precio" },
  });
  h.assertStatus(neg.status, 201, "crear negocio");
  h.assertStatus((await h.api(`/api/businesses/${neg.json.data.id}/estado`, {
    method: "PUT", token: admin.token, body: { estado: "approved" },
  })).status, 200, "aprobar negocio");

  h.test.O = O;
  h.test.T = T;
  h.test.neg = neg.json.data;
});

h.test("PRECIO: $132.000 × 24% se calcula SIEMPRE sobre el precio normal (el cliente no puede fijar precio)", async () => {
  const id = h.test.neg.id;
  const creado = await h.api(`/api/businesses/${id}/planes`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Plan 132000", descripcion: "Caso reportado.",
      destination_id: 1, destino: "Prueba",
      duracion_dias: 1, duracion_noches: 0, precio: 132000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(creado.status, 201, "crear plan 132000");
  const pid = creado.json.data.id;
  // Contrato: el backend recibe/guarda enteros puros (COP), sin decimales.
  h.assert(Number(creado.json.data.precio) === 132000, "precio guardado 132000 (entero)");

  // Promo porcentual: el descuento se aplica sobre el precio normal
  // (132.000). El backend ignora cualquier intento del cliente de fijar
  // un precio distinto.
  const promo = await h.api(`/api/businesses/${id}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "24% vigente", plan_id: pid,
      tipo_descuento: "porcentaje", valor_descuento: 24,
      fecha_inicio: "2000-01-01", fecha_fin: "2099-12-31",
    },
  });
  h.assertStatus(promo.status, 201, "crear promoción 24%");
  h.assert(Number(promo.json.data.valor_descuento) === 24, "valor_descuento 24 (entero)");

  // 1 persona: 132000 - 24% = 100320 (no 100000).
  const uno = await h.api(`/api/planes/${pid}/precio?personas=1`);
  h.assertStatus(uno.status, 200, "precio 1 persona");
  h.assert(uno.json.data.tipo_descuento === "promocion", "tipo promocion");
  h.assert(Number(uno.json.data.precio_original_persona) === 132000, "original 132000");
  h.assert(Number(uno.json.data.descuento_porcentaje) === 24, "24% efectivo");
  h.assert(Number(uno.json.data.descuento_total) === 24, "descuento total 24%");
  h.assert(Number(uno.json.data.descuento_monto) === 31680, "descuento 31.680");
  h.assert(Number(uno.json.data.subtotal_original) === 132000, "subtotal 132.000");
  h.assert(Number(uno.json.data.total) === 100320, "total 100.320 (no 100.000)");
  h.assert(Number(uno.json.data.precio_base_persona) === 100320, "base por persona 100.320");
  h.assert(Number(uno.json.data.precio_persona) === 100320, "por persona 100.320");
  h.assert(Number(uno.json.data.ahorro_total) === 31680, "ahorro 31.680");

  // 2 personas: subtotal 264000, descuento 63360, total 200640, por persona 100320.
  const dos = await h.api(`/api/planes/${pid}/precio?personas=2`);
  h.assertStatus(dos.status, 200, "precio 2 personas");
  h.assert(Number(dos.json.data.subtotal_original) === 264000, "subtotal 264.000");
  h.assert(Number(dos.json.data.descuento_monto) === 63360, "descuento 63.360");
  h.assert(Number(dos.json.data.total) === 200640, "total 200.640");
  h.assert(Number(dos.json.data.precio_persona) === 100320, "por persona 100.320");
  h.assert(Number(dos.json.data.ahorro_total) === 63360, "ahorro 63.360");

  // 4 personas: precio efectivo por persona se mantiene en 100320.
  const cuatro = await h.api(`/api/planes/${pid}/precio?personas=4`);
  h.assertStatus(cuatro.status, 200, "precio 4 personas");
  h.assert(Number(cuatro.json.data.subtotal_original) === 528000, "subtotal 528.000");
  h.assert(Number(cuatro.json.data.descuento_monto) === 126720, "descuento 126.720");
  h.assert(Number(cuatro.json.data.total) === 401280, "total 401.280");
  h.assert(Number(cuatro.json.data.precio_persona) === 100320, "por persona 100.320");

  h.test.plan132 = pid;
  h.test.promo132 = promo.json.data;
});

h.test("PRECIO: tercer caso con centenas/miles — $243.000 × 12% (2 personas)", async () => {
  const id = h.test.neg.id;
  const creado = await h.api(`/api/businesses/${id}/planes`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "Plan 243000", descripcion: "Caso con centenas.",
      destination_id: 1, destino: "Prueba",
      duracion_dias: 1, duracion_noches: 0, precio: 243000,
      tipo_precio: "por_persona", tipo_plan: "plan",
      descuentos_rango: [{ min: 1, descuento: 0 }],
      incluye: [], itinerario: [],
    },
  });
  h.assertStatus(creado.status, 201, "crear plan 243000");

  const promo = await h.api(`/api/businesses/${id}/promociones`, {
    method: "POST", token: h.test.O.token,
    body: {
      nombre: "12% vigente", plan_id: creado.json.data.id,
      tipo_descuento: "porcentaje", valor_descuento: 12,
      fecha_inicio: "2000-01-01", fecha_fin: "2099-12-31",
    },
  });
  h.assertStatus(promo.status, 201, "crear promoción 12%");

  const dos = await h.api(`/api/planes/${creado.json.data.id}/precio?personas=2`);
  h.assertStatus(dos.status, 200, "precio 2 personas");
  h.assert(Number(dos.json.data.precio_original_persona) === 243000, "original 243000");
  h.assert(Number(dos.json.data.descuento_porcentaje) === 12, "12% efectivo");
  h.assert(Number(dos.json.data.subtotal_original) === 486000, "subtotal 486.000");
  h.assert(Number(dos.json.data.descuento_monto) === 58320, "descuento 58.320");
  h.assert(Number(dos.json.data.total) === 427680, "total 427.680");
  h.assert(Number(dos.json.data.precio_base_persona) === 213840, "base por persona 213.840");
  h.assert(Number(dos.json.data.precio_persona) === 213840, "por persona 213.840");
});

h.test("PRECIO: datos de ocupación para 0/20, 6%(1/16), 50%(10/20), 75%(15/20) y 100%(20/20)", async () => {
  const id = h.test.neg.id;
  const pid = h.test.plan132;

  // 16 cupos, 1 inscrito → la interfaz muestra 6% (1/16 = 6.25 → Math.round 6).
  const s16 = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2030-11-01", hora: "08:00", cupo_maximo: 16 },
  });
  h.assertStatus(s16.status, 201, "salida 16 cupos");
  h.assert(Number(s16.json.data.cupo_ocupado) === 0, "ocupado inicial 0");
  h.assert(Number(s16.json.data.cupo_disponible) === 16, "disponible inicial 16");

  await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${s16.json.data.id}/inscripciones`, {
    method: "POST", token: h.test.T.token, body: { personas: 1 },
  });
  const s16Tras = await h.api(`/api/planes/${pid}/salidas`);
  const s16Final = s16Tras.json.data.find((s) => String(s.id) === String(s16.json.data.id));
  h.assert(Number(s16Final.cupo_ocupado) === 1, "1 inscrito en 16 cupos → UI 6%");
  h.assert(Number(s16Final.cupo_disponible) === 15, "15 disponibles");

  // 20 cupos: 0 → 10 (50%) → 15 (75%) → 20 (100%, llena).
  const s20 = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, {
    method: "POST", token: h.test.O.token,
    body: { fecha: "2030-12-01", hora: "07:00", cupo_maximo: 20 },
  });
  h.assertStatus(s20.status, 201, "salida 20 cupos");
  const sid = s20.json.data.id;
  h.assert(Number(s20.json.data.cupo_ocupado) === 0, "ocupado 0 → UI 0%");

  async function listar() {
    const t = await h.api(`/api/businesses/${id}/planes/${pid}/salidas`, { token: h.test.O.token });
    return t.json.data.find((s) => String(s.id) === String(sid));
  }

  for (const [pax, ocu, dis] of [
    [10, 10, 10],
    [5, 15, 5],
    [5, 20, 0],
  ]) {
    const i = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
      method: "POST", token: h.test.T.token, body: { personas: pax },
    });
    h.assertStatus(i.status, 201, `inscribir ${pax}`);
    const s = await listar();
    h.assert(Number(s.cupo_ocupado) === ocu, `ocupado ${ocu}`);
    h.assert(Number(s.cupo_disponible) === dis, `disponible ${dis}`);
  }
  const llena = await listar();
  h.assert(Number(llena.cupo_disponible) === 0, "llena → disponible 0 → UI 100%");

  const exceso = await h.api(`/api/businesses/${id}/planes/${pid}/salidas/${sid}/inscripciones`, {
    method: "POST", token: h.test.T.token, body: { personas: 1 },
  });
  h.assertStatus(exceso.status, 400, "salida llena rechaza nuevas inscripciones");
});

h.test("PRECIO: limpieza administrada", async () => {
  h.assertStatus((await h.api("/api/businesses/" + h.test.neg.id, {
    method: "DELETE", token: h.test.adminToken,
  })).status, 200, "borrar negocio");
  for (const u of [h.test.O.usuario, h.test.T.usuario]) {
    const { rows } = await h.q("SELECT id FROM usuarios WHERE email = $1", [u.email]);
    h.assertStatus((await h.api("/api/usuarios/" + rows[0].id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar usuario ${u.email}`);
  }
});