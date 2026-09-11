const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;

h.test("DEST: login admin y consulta pública de destinos", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const publica = await h.api("/api/lugares");
  h.assertStatus(publica.status, 200, "GET /api/lugares sin token (público)");
  h.assert(Array.isArray(publica.json?.data) && publica.json.data.length >= 1, "lista pública de destinos");

  const inexistente = await h.api("/api/lugares/999999/negocios");
  h.assertStatus(inexistente.status, 404, "destino inexistente 404");

  // El listado de negocios es lectura pública (solo negocios aprobados).
  const sinToken = await h.api("/api/businesses");
  h.assertStatus(sinToken.status, 200, "lista pública de negocios sin token");
  h.assert(Array.isArray(sinToken.json?.data), "data array de negocios sin token");
});

h.test("DEST: crear negocio con/ sin destino y validaciones", async () => {
  const token = h.test.adminToken;
  const pass = "Test1234x!";
  const emailA = h.repo("f21test.dest.a");
  const emailB = h.repo("f21test.dest.b");
  const emailT = h.repo("f21test.dest.tur");

  const a = await h.createUser(token, { nombre: "Hotel Destino A", email: emailA, password: pass, rol_id: 2 });
  h.assertStatus(a.status, 201, "crear business A");
  const b = await h.createUser(token, { nombre: "Hotel Destino B", email: emailB, password: pass, rol_id: 2 });
  h.assertStatus(b.status, 201, "crear business B");
  const t = await h.createUser(token, { nombre: "Turista F4", email: emailT, password: pass, rol_id: 1 });
  h.assertStatus(t.status, 201, "crear turista F4");

  const negA = await h.login(emailA, pass);
  h.assertStatus(negA.status, 200, "login A");
  const negB = await h.login(emailB, pass);
  h.assertStatus(negB.status, 200, "login B");
  const tur = await h.login(emailT, pass);
  h.assertStatus(tur.status, 200, "login turista");

  const conDestino = await h.api("/api/businesses", {
    method: "POST", token: negA.token,
    body: { nombre: "Hotel Aconcagua", category_id: 2, destination_id: 1, descripcion: "Con destino" },
  });
  h.assertStatus(conDestino.status, 201, "crear con destino_id");
  h.assert(conDestino.json?.data?.destination_id === 1, `destination_id 1 (${conDestino.json?.data?.destination_id})`);

  const sinDestino = await h.api("/api/businesses", {
    method: "POST", token: negB.token,
    body: { nombre: "Hostal Boreal", category_id: 3 },
  });
  h.assertStatus(sinDestino.status, 201, "crear sin destino");
  h.assert(sinDestino.json?.data?.destination_id === null, "destination_id null sin destino");

  const invalid = await h.api("/api/businesses", {
    method: "POST", token: negA.token,
    body: { nombre: "Mal Destino", category_id: 2, destination_id: "abc" },
  });
  h.assertStatus(invalid.status, 400, "destination_id no numérico 400");
  h.assertMsg(invalid.json, "Destino inválido");

  const noExiste = await h.api("/api/businesses", {
    method: "POST", token: negA.token,
    body: { nombre: "Mal Destino 2", category_id: 2, destination_id: 999999 },
  });
  h.assertStatus(noExiste.status, 400, "destination_id inexistente 400");
  h.assertMsg(noExiste.json, "El destino seleccionado no existe");

  h.test.negA = { token: negA.token, usuario: negA.usuario };
  h.test.negB = { token: negB.token, usuario: negB.usuario };
  h.test.tur = { token: tur.token, usuario: tur.usuario };
  h.test.conDestino = conDestino.json.data;
  h.test.sinDestino = sinDestino.json.data;
});

h.test("DEST: consultar destinos del negocio (dueño y anónimo)", async () => {
  const d = await h.api("/api/businesses/" + h.test.conDestino.id + "/destinos", { token: h.test.negA.token });
  h.assertStatus(d.status, 200, "dueño consulta destinos");
  h.assert(d.json.data.length === 1 && d.json.data[0].id === 1, "destino asociado = 1");

  const sinDest = await h.api("/api/businesses/" + h.test.sinDestino.id + "/destinos", { token: h.test.negB.token });
  h.assertStatus(sinDest.status, 200, "destinos vacío cuando no hay");
  h.assert(sinDest.json.data.length === 0, "array vacío sin destino");

  const anonOculto = await h.api("/api/businesses/" + h.test.sinDestino.id + "/destinos");
  h.assertStatus(anonOculto.status, 404, "anónimo 404 sobre negocio pending (no visible)");
});

h.test("DEST: asociar/ retirar destino con validaciones y ownership", async () => {
  const id = h.test.conDestino.id;

  const invalid = await h.api(`/api/businesses/${id}/destino`, {
    method: "PUT", token: h.test.negA.token, body: { destination_id: "xx" },
  });
  h.assertStatus(invalid.status, 400, "destino inválido 400");

  const noExiste = await h.api(`/api/businesses/${id}/destino`, {
    method: "PUT", token: h.test.negA.token, body: { destination_id: 999999 },
  });
  h.assertStatus(noExiste.status, 400, "destino inexistente 400");
  h.assertMsg(noExiste.json, "no existe");

  const reasignar = await h.api(`/api/businesses/${id}/destino`, {
    method: "PUT", token: h.test.negA.token, body: { destination_id: 2 },
  });
  h.assertStatus(reasignar.status, 200, "reasignar a 2 (1:N reemplaza)");
  h.assert(reasignar.json?.data?.destination_id === 2, "destination_id ahora 2");

  const tras = await h.api(`/api/businesses/${id}/destinos`, { token: h.test.negA.token });
  h.assert(tras.json.data.length === 1 && tras.json.data[0].id === 2, "solo 1 destino, el 2");

  const retirar = await h.api(`/api/businesses/${id}/destino`, {
    method: "PUT", token: h.test.negA.token, body: { destination_id: null },
  });
  h.assertStatus(retirar.status, 200, "retirar destino");
  h.assert(retirar.json?.data?.destination_id === null, "destination_id null tras retirar");

  const trasRetiro = await h.api(`/api/businesses/${id}/destinos`, { token: h.test.negA.token });
  h.assert(trasRetiro.json.data.length === 0, "sin destinos tras retirar");

  const ajeno = await h.api(`/api/businesses/${id}/destino`, {
    method: "PUT", token: h.test.negB.token, body: { destination_id: 1 },
  });
  h.assertStatus(ajeno.status, 403, "B no asocia destino de A");

  const turista = await h.api(`/api/businesses/${id}/destino`, {
    method: "PUT", token: h.test.tur.token, body: { destination_id: 1 },
  });
  h.assertStatus(turista.status, 403, "turista no asocia destino");

  const adminAsocia = await h.api(`/api/businesses/${id}/destino`, {
    method: "PUT", token: h.test.adminToken, body: { destination_id: 1 },
  });
  h.assertStatus(adminAsocia.status, 200, "admin puede asociar");
  h.assert(adminAsocia.json?.data?.destination_id === 1, "admin asignó destino 1");

  const sinToken = await h.api(`/api/businesses/${id}/destino`, {
    method: "PUT", body: { destination_id: 1 },
  });
  h.assertStatus(sinToken.status, 401, "asociar sin token 401");

  h.test.pendiente = await h.api("/api/businesses", {
    method: "POST", token: h.test.negB.token,
    body: { nombre: "Posada Aura", category_id: 4, destination_id: 1 },
  });
  h.assertStatus(h.test.pendiente.status, 201, "B crea negocio pending destino 1");
  h.test.posada = h.test.pendiente.json.data;
});

h.test("DEST: visibilidad por rol en /lugares/:id/negocios", async () => {
  const anon = await h.api("/api/lugares/1/negocios");
  h.assertStatus(anon.status, 200, "anónimo consulta negocios de destino");
  h.assert(Array.isArray(anon.json.data), "respuesta lista");
  h.assert(!anon.json.data.some((x) => x.id === h.test.conDestino.id), "anónimo aún no ve pending");
  h.assert(!anon.json.data.some((x) => x.id === h.test.posada.id), "anónimo aún no ve pending 2");

  const admin = await h.api("/api/lugares/1/negocios", { token: h.test.adminToken });
  h.assert(admin.json.data.some((x) => x.id === h.test.posada.id), "admin ve negocio pending asociado");

  const tur = await h.api("/api/lugares/1/negocios", { token: h.test.tur.token });
  h.assert(!tur.json.data.some((x) => x.id === h.test.posada.id), "turista no ve pending");
  h.assert(!tur.json.data.some((x) => x.id === h.test.conDestino.id), "turista no ve unapproved (aún pending)");

  const propia = await h.api("/api/lugares/1/negocios", { token: h.test.negB.token });
  h.assert(propia.json.data.some((x) => x.id === h.test.posada.id), "business ve su propio pending en el destino");
});

h.test("DEST: aprobación vuelve visible el negocio y el destino viaja al detalle", async () => {
  for (const n of [h.test.conDestino, h.test.posada]) {
    const est = await h.api(`/api/businesses/${n.id}/estado`, {
      method: "PUT", token: h.test.adminToken, body: { estado: "approved" },
    });
    h.assertStatus(est.status, 200, `aprobar ${n.id}`);
  }

  const anon = await h.api("/api/lugares/1/negocios");
  h.assert(anon.json.data.some((x) => x.id === h.test.conDestino.id), "anónimo ve aprobado");
  h.assert(anon.json.data.some((x) => x.id === h.test.posada.id), "anónimo ve aprobado 2");

  const detalle = await h.api("/api/businesses/" + h.test.conDestino.id, { token: h.test.tur.token });
  h.assertStatus(detalle.status, 200, "detalle aprobado turista");
  h.assert(detalle.json?.data?.destino === undefined || detalle.json.data.destino, "detalle expone destino");
  h.assert(Number(detalle.json?.data?.destination_id) === 1, "destination_id en detalle");

  const destAnon = await h.api("/api/businesses/" + h.test.conDestino.id + "/destinos");
  h.assertStatus(destAnon.status, 200, "anónimo consulta destinos de aprobado");
  h.assert(destAnon.json.data.length === 1 && destAnon.json.data[0].id === 1, "anónimo ve el destino");

  const move = await h.api("/api/businesses/" + h.test.conDestino.id, {
    method: "PUT", token: h.test.negA.token, body: { destination_id: 3 },
  });
  h.assertStatus(move.status, 200, "editar negocio cambia destination_id");
  h.assert(move.json?.data?.destination_id === 3, "destination_id 3 tras edición");
});

h.test("DEST: ON DELETE SET NULL al borrar un destino", async () => {
  const before = await h.api("/api/lugares");
  const countBefore = before.json.data.length;

  const creado = await h.api("/api/lugares", {
    method: "POST", token: h.test.adminToken,
    body: { nombre: "Zona F4test 0df9a", descripcion: "Destino de prueba", ubicacion: "Test" },
  });
  h.assertStatus(creado.status, 201, "crear destino de prueba");
  const testDest = creado.json.data;

  const asocia = await h.api(`/api/businesses/${h.test.conDestino.id}/destino`, {
    method: "PUT", token: h.test.negA.token, body: { destination_id: testDest.id },
  });
  h.assertStatus(asocia.status, 200, "asociar negocio al destino de prueba");
  h.assert(asocia.json?.data?.destination_id === testDest.id, "asociado a destino de prueba");

  const del = await h.api("/api/lugares/" + testDest.id, { method: "DELETE", token: h.test.adminToken });
  h.assertStatus(del.status, 200, "borrar destino de prueba");

  const tras = await h.api(`/api/businesses/${h.test.conDestino.id}/destinos`, { token: h.test.negA.token });
  h.assert(tras.json.data.length === 0, "destino retirado tras borrarlo (SET NULL)");

  const detalle = await h.api("/api/businesses/" + h.test.conDestino.id, { token: h.test.negA.token });
  h.assert(detalle.json?.data?.destination_id === null, "destination_id NULL en BD (FK ON DELETE SET NULL)");

  const after = await h.api("/api/lugares");
  h.assert(after.json.data.length === countBefore, "no quedan lugares de prueba (integridad)");
});

h.test("DEST: limpieza administrada", async () => {
  for (const n of [h.test.conDestino, h.test.sinDestino, h.test.posada]) {
    h.assertStatus((await h.api("/api/businesses/" + n.id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar negocio ${n.id}`);
  }
  for (const u of [h.test.negA.usuario, h.test.negB.usuario, h.test.tur.usuario]) {
    const { rows } = await h.q("SELECT id FROM usuarios WHERE email = $1", [u.email]);
    h.assertStatus((await h.api("/api/usuarios/" + rows[0].id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar usuario ${u.email}`);
  }
  const admins = await h.countAdmins();
  h.assert(admins >= 1, `sigue habiendo al menos 1 admin (${admins})`);
});