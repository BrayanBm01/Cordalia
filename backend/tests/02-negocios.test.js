const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;

h.test("NEG: categorías disponibles (admin y business)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const cats = await h.api("/api/businesses/categories", { token: admin.token });
  h.assertStatus(cats.status, 200, "categorías admin");
  h.assert(Array.isArray(cats.json?.data) && cats.json.data.length >= 12, "al menos 12 categorías");
});

h.test("NEG: BUSINESS crea negocio con estado pending y slug único", async () => {
  const token = h.test.adminToken;
  const pass = "Test1234x!";
  const emailA = h.repo("f21test.neg.a");
  const emailB = h.repo("f21test.neg.b");
  const emailT = h.repo("f21test.turista2");

  const a = await h.createUser(token, { nombre: "Negociante A", email: emailA, password: pass, rol_id: 2 });
  h.assertStatus(a.status, 201, "crear business A");
  const b = await h.createUser(token, { nombre: "Negociante B", email: emailB, password: pass, rol_id: 2 });
  h.assertStatus(b.status, 201, "crear business B");
  const t = await h.createUser(token, { nombre: "Turista Vista", email: emailT, password: pass, rol_id: 1 });
  h.assertStatus(t.status, 201, "crear turista");

  const negA = await h.login(emailA, pass);
  h.assertStatus(negA.status, 200, "login A");
  const negB = await h.login(emailB, pass);
  h.assertStatus(negB.status, 200, "login B");
  const tur = await h.login(emailT, pass);
  h.assertStatus(tur.status, 200, "login turista");

  const creado = await h.api("/api/businesses", {
    method: "POST",
    token: negA.token,
    body: {
      nombre: "Hotel Los Andes", category_id: 2, descripcion: "Hotel de montaña",
      direccion: "Calle 1 #2-3", telefono: "3001234567", email_contacto: "contacto@andes.test",
      website: "https://hotelandes.test", precio_min: 200000, precio_max: 400000,
      moneda: "COP", portada_url: "https://ejemplo.test/portada.jpg",
    },
  });
  h.assertStatus(creado.status, 201, "crear negocio A");
  h.assert(creado.json?.data?.slug === "hotel-los-andes", `slug A = ${creado.json?.data?.slug}`);
  h.assert(creado.json?.data?.estado === "pending", "estado pending");
  h.assert(creado.json?.data?.owner_id === negA.usuario.id, "owner = sesión (no del body)");

  const segundo = await h.api("/api/businesses", {
    method: "POST",
    token: negB.token,
    body: { nombre: "Hotel Los Andes", category_id: 2 },
  });
  h.assertStatus(segundo.status, 201, "crear negocio B");
  h.assert(segundo.json?.data?.slug === "hotel-los-andes-2", `slug B = ${segundo.json?.data?.slug}`);

  const sinNombre = await h.api("/api/businesses", {
    method: "POST", token: negB.token, body: { category_id: 2 },
  });
  h.assertStatus(sinNombre.status, 400, "nombre obligatorio 400");

  const catsInv = await h.api("/api/businesses", {
    method: "POST", token: negB.token, body: { nombre: "X", category_id: 9999 },
  });
  h.assertStatus(catsInv.status, 400, "categoría inexistente 400");

  h.test.negA = { token: negA.token, usuario: negA.usuario };
  h.test.negB = { token: negB.token, usuario: negB.usuario };
  h.test.tur = { token: tur.token, usuario: tur.usuario };
  h.test.negocioA = creado.json.data;
  h.test.negocioB = segundo.json.data;
});

h.test("NEG: el business ve solo sus negocios; el turista no ve los pending", async () => {
  const listaA = await h.api("/api/businesses", { token: h.test.negA.token });
  h.assertStatus(listaA.status, 200, "lista A");
  h.assert(listaA.json.data.length === 1 && listaA.json.data[0].id === h.test.negocioA.id, "A solo su negocio");

  const vista = await h.api("/api/businesses", { token: h.test.tur.token });
  h.assertStatus(vista.status, 200, "lista turista");
  h.assert(vista.json.data.length === 0, "turista no ve negocios pending");

  const oculto = await h.api("/api/businesses/" + h.test.negocioA.id, { token: h.test.tur.token });
  h.assertStatus(oculto.status, 404, "turista no accede a pending (404)");
});

h.test("NEG: ownership: B no puede editar/borrar negocios de A; turista no puede crear", async () => {
  const edit = await h.api("/api/businesses/" + h.test.negocioA.id, {
    method: "PUT", token: h.test.negB.token, body: { nombre: "Intruso Hotel" },
  });
  h.assertStatus(edit.status, 403, "editar negocio ajeno 403");

  const del = await h.api("/api/businesses/" + h.test.negocioA.id, {
    method: "DELETE", token: h.test.negB.token,
  });
  h.assertStatus(del.status, 403, "borrar negocio ajeno 403");

  const crear = await h.api("/api/businesses", {
    method: "POST", token: h.test.tur.token, body: { nombre: "Intento Turista" },
  });
  h.assertStatus(crear.status, 403, "turista no crea negocios");

  const promocionar = await h.api("/api/businesses/" + h.test.negocioA.id + "/estado", {
    method: "PUT", token: h.test.negA.token, body: { estado: "approved" },
  });
  h.assertStatus(promocionar.status, 403, "business no cambia estado");

  const sinToken = await h.api("/api/businesses");
  h.assertStatus(sinToken.status, 401, "sin token 401");
});

h.test("NEG: ADMIN cambia estado y el turista pasa a ver el negocio", async () => {
  for (const id of [h.test.negocioA.id, h.test.negocioB.id]) {
    const est = await h.api(`/api/businesses/${id}/estado`, {
      method: "PUT", token: h.test.adminToken, body: { estado: "approved" },
    });
    h.assertStatus(est.status, 200, `aprobar negocio ${id}`);
    h.assert(est.json?.data?.estado === "approved", "estado approved");
  }

  const inv = await h.api("/api/businesses/" + h.test.negocioA.id + "/estado", {
    method: "PUT", token: h.test.adminToken, body: { estado: "inexistente" },
  });
  h.assertStatus(inv.status, 400, "estado inválido 400");

  const vista = await h.api("/api/businesses", { token: h.test.tur.token });
  h.assertStatus(vista.status, 200, "lista turista");
  h.assert(vista.json.data.length === 2, "turista ve los 2 aprobados");

  const detalle = await h.api("/api/businesses/" + h.test.negocioA.id, { token: h.test.tur.token });
  h.assertStatus(detalle.status, 200, "turista ve detalle aprobado");
  h.assert(detalle.json?.data?.nombre === "Hotel Los Andes", "detalle correcto");
});

h.test("NEG: dueño edita su negocio y el slug se regenera", async () => {
  const edit = await h.api("/api/businesses/" + h.test.negocioA.id, {
    method: "PUT",
    token: h.test.negA.token,
    body: { nombre: "Hotel Los Andes Plaza", telefono: "3112223333" },
  });
  h.assertStatus(edit.status, 200, "editar propio");
  h.assert(edit.json?.data?.slug === "hotel-los-andes-plaza", `slug editado = ${edit.json?.data?.slug}`);
  h.assert(edit.json?.data?.telefono === "3112223333", "teléfono actualizado");

  const precios = await h.api("/api/businesses/" + h.test.negocioA.id, {
    method: "PUT", token: h.test.negA.token,
    body: { precio_min: 500000, precio_max: 300000 },
  });
  h.assertStatus(precios.status, 400, "precio máx < mín 400");
});

h.test("NEG: imágenes (agregar, listar, principal, ajeno 403)", async () => {
  const id = h.test.negocioA.id;
  const img = await h.api(`/api/businesses/${id}/imagenes`, {
    method: "POST", token: h.test.negA.token,
    body: { url: "https://ejemplo.test/foto1.jpg", alt_text: "Vista de montaña", is_primary: true },
  });
  h.assertStatus(img.status, 201, "agregar imagen");
  h.assert(img.json?.data?.is_primary === true, "primera imagen es principal");

  const img2 = await h.api(`/api/businesses/${id}/imagenes`, {
    method: "POST", token: h.test.negA.token,
    body: { url: "https://ejemplo.test/foto2.jpg", alt_text: "Habitación", is_primary: true },
  });
  h.assertStatus(img2.status, 201, "agregar imagen 2");
  h.assert(img2.json?.data?.is_primary === true, "nueva principal");

  const trasSegunda = await h.api(`/api/businesses/${id}/imagenes`, { token: h.test.negA.token });
  const principales = trasSegunda.json.data.filter((i) => i.is_primary);
  h.assert(principales.length === 1 && principales[0].id === img2.json.data.id, "una sola principal, la nueva");
  h.assert(trasSegunda.json.data.find((i) => i.id === img.json.data.id).is_primary === false, "anterior dejó de ser principal");

  const lista = await h.api(`/api/businesses/${id}/imagenes`, { token: h.test.tur.token });
  h.assertStatus(lista.status, 200, "turista lista imágenes de aprobado");
  h.assert(lista.json.data.length === 2, "2 imágenes");

  const ajeno = await h.api(`/api/businesses/${id}/imagenes`, {
    method: "POST", token: h.test.negB.token, body: { url: "https://ejemplo.test/x.jpg" },
  });
  h.assertStatus(ajeno.status, 403, "otro business no agrega imágenes");

  const urlInvalida = await h.api(`/api/businesses/${id}/imagenes`, {
    method: "POST", token: h.test.negA.token, body: { url: "no-es-url" },
  });
  h.assertStatus(urlInvalida.status, 400, "URL inválida 400");

  const del = await h.api(`/api/businesses/${id}/imagenes/${img.json.data.id}`, {
    method: "DELETE", token: h.test.negA.token,
  });
  h.assertStatus(del.status, 200, "borrar imagen");
  h.test.imagenId = img2.json.data.id;
});

h.test("NEG: servicios", async () => {
  const id = h.test.negocioA.id;
  const s = await h.api(`/api/businesses/${id}/servicios`, {
    method: "POST", token: h.test.negA.token,
    body: { nombre: "Desayuno incluido", descripcion: "Buffet 6am-10am" },
  });
  h.assertStatus(s.status, 201, "crear servicio");

  const lista = await h.api(`/api/businesses/${id}/servicios`, { token: h.test.tur.token });
  h.assertStatus(lista.status, 200, "lista servicios turista");
  h.assert(lista.json.data.length === 1, "1 servicio");

  const ajeno = await h.api(`/api/businesses/${id}/servicios`, {
    method: "POST", token: h.test.negB.token, body: { nombre: "Privado" },
  });
  h.assertStatus(ajeno.status, 403, "otro business no agrega servicios");

  const upd = await h.api(`/api/businesses/${id}/servicios/${s.json.data.id}`, {
    method: "PUT", token: h.test.negA.token, body: { nombre: "Desayuno buffet" },
  });
  h.assertStatus(upd.status, 200, "editar servicio");
  h.test.servicioId = s.json.data.id;
});

h.test("NEG: horarios", async () => {
  const id = h.test.negocioA.id;
  const cerrado = await h.api(`/api/businesses/${id}/horarios`, {
    method: "POST", token: h.test.negA.token,
    body: { day_of_week: 0, is_closed: true },
  });
  h.assertStatus(cerrado.status, 201, "horario cerrado domingo");

  const abierto = await h.api(`/api/businesses/${id}/horarios`, {
    method: "POST", token: h.test.negA.token,
    body: { day_of_week: 1, open_time: "09:00", close_time: "18:00", is_closed: false },
  });
  h.assertStatus(abierto.status, 201, "horario abierto lunes");

  const diaInvalido = await h.api(`/api/businesses/${id}/horarios`, {
    method: "POST", token: h.test.negA.token, body: { day_of_week: 7, is_closed: true },
  });
  h.assertStatus(diaInvalido.status, 400, "día inválido 400");

  const horasInvertidas = await h.api(`/api/businesses/${id}/horarios`, {
    method: "POST", token: h.test.negA.token,
    body: { day_of_week: 2, open_time: "18:00", close_time: "09:00" },
  });
  h.assertStatus(horasInvertidas.status, 400, "apertura < cierre 400");

  const lista = await h.api(`/api/businesses/${id}/horarios`, { token: h.test.tur.token });
  h.assertStatus(lista.status, 200, "lista horarios turista");
  h.assert(lista.json.data.length === 2, "2 horarios");
  h.assert(lista.json.data[1].open_time === "09:00", "open_time formateado");

  const upd = await h.api(`/api/businesses/${id}/horarios/${abierto.json.data.id}`, {
    method: "PUT", token: h.test.negA.token, body: { close_time: "19:00" },
  });
  h.assertStatus(upd.status, 200, "editar horario");
  h.assert(upd.json?.data?.close_time === "19:00", "close_time actualizado");
});

h.test("NEG: redes sociales (única por plataforma)", async () => {
  const id = h.test.negocioA.id;
  const r1 = await h.api(`/api/businesses/${id}/redes`, {
    method: "POST", token: h.test.negA.token,
    body: { plataforma: "instagram", url: "https://instagram.com/hotellosandes" },
  });
  h.assertStatus(r1.status, 201, "agregar instagram");

  const duplicada = await h.api(`/api/businesses/${id}/redes`, {
    method: "POST", token: h.test.negA.token,
    body: { plataforma: "Instagram", url: "https://instagram.com/otra" },
  });
  h.assertStatus(duplicada.status, 409, "plataforma duplicada 409");

  const urlBad = await h.api(`/api/businesses/${id}/redes`, {
    method: "POST", token: h.test.negA.token,
    body: { plataforma: "facebook", url: "nope" },
  });
  h.assertStatus(urlBad.status, 400, "URL inválida 400");

  const lista = await h.api(`/api/businesses/${id}/redes`, { token: h.test.tur.token });
  h.assertStatus(lista.status, 200, "lista redes turista");
  h.assert(lista.json.data.length === 1 && lista.json.data[0].plataforma === "instagram", "1 red normalizada");
});

h.test("NEG: limpieza administrada (ADMIN borra negocios y usuarios de prueba)", async () => {
  for (const n of [h.test.negocioA, h.test.negocioB]) {
    const del = await h.api("/api/businesses/" + n.id, {
      method: "DELETE", token: h.test.adminToken,
    });
    h.assertStatus(del.status, 200, `borrar negocio ${n.id}`);
  }
  for (const email of [h.test.negA.usuario.email, h.test.negB.usuario.email, h.test.tur.usuario.email]) {
    const { rows } = await h.q("SELECT id FROM usuarios WHERE email = $1", [email]);
    await h.api("/api/usuarios/" + rows[0].id, { method: "DELETE", token: h.test.adminToken });
  }
  const admins = await h.countAdmins();
  h.assert(admins >= 1, `sigue habiendo al menos 1 admin (${admins})`);
});