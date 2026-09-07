const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;

h.test("FAV: autenticación obligatoria", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  h.assertStatus((await h.api("/api/favoritos/destinos")).status, 401, "lista destinos sin token 401");
  h.assertStatus((await h.api("/api/favoritos/negocios")).status, 401, "lista negocios sin token 401");
  h.assertStatus((await h.api("/api/favoritos/destinos/1", { method: "POST" })).status, 401, "agregar sin token 401");
  h.assertStatus((await h.api("/api/favoritos/negocios/1", { method: "DELETE" })).status, 401, "eliminar sin token 401");
});

h.test("FAV: setup usuarios y negocio aprobado", async () => {
  const token = h.test.adminToken;
  const pass = "Test1234x!";
  const emailNeg = h.repo("f21test.fav.neg");
  const emailT1 = h.repo("f21test.fav.t1");
  const emailT2 = h.repo("f21test.fav.t2");
  const emailT3 = h.repo("f21test.fav.t3");

  for (const [n, e, r] of [
    ["Fav Negociante", emailNeg, 2],
    ["Fav Turista 1", emailT1, 1],
    ["Fav Turista 2", emailT2, 1],
    ["Fav Turista 3", emailT3, 1],
  ]) {
    h.assertStatus((await h.createUser(token, { nombre: n, email: e, password: pass, rol_id: r })).status, 201, `crear ${e}`);
  }

  const neg = await h.login(emailNeg, pass);
  h.assertStatus(neg.status, 200, "login negociante");
  const t1 = await h.login(emailT1, pass);
  h.assertStatus(t1.status, 200, "login t1");
  const t2 = await h.login(emailT2, pass);
  h.assertStatus(t2.status, 200, "login t2");
  const t3 = await h.login(emailT3, pass);
  h.assertStatus(t3.status, 200, "login t3");

  const creado = await h.api("/api/businesses", {
    method: "POST", token: neg.token,
    body: { nombre: "Hotel Favorito Test", category_id: 2, destination_id: 1, descripcion: "Negocio aprobado" },
  });
  h.assertStatus(creado.status, 201, "crear negocio favoritable");
  const aprobado = await h.api(`/api/businesses/${creado.json.data.id}/estado`, {
    method: "PUT", token, body: { estado: "approved" },
  });
  h.assertStatus(aprobado.status, 200, "aprobar negocio");

  const pendiente = await h.api("/api/businesses", {
    method: "POST", token: neg.token,
    body: { nombre: "Hotel Pendiente Favorito", category_id: 2 },
  });
  h.assertStatus(pendiente.status, 201, "crear negocio pending");

  h.test.negToken = neg.token;
  h.test.usuarios = { neg, t1, t2, t3 };
  h.test.negocioAprobado = creado.json.data;
  h.test.negocioPendiente = pendiente.json.data;
});

h.test("FAV: destinos favoritos (agregar, duplicado 409, listar, eliminar)", async () => {
  const t1 = h.test.usuarios.t1.token;

  h.assertStatus((await h.api("/api/favoritos/destinos/1", { method: "POST", token: t1 })).status, 201, "agregar destino 1");
  const dupDest = await h.api("/api/favoritos/destinos/1", { method: "POST", token: t1 });
  h.assertStatus(dupDest.status, 409, "destino duplicado 409");

  h.assertStatus((await h.api("/api/favoritos/destinos/4", { method: "POST", token: t1 })).status, 201, "agregar destino 4");

  const lista = await h.api("/api/favoritos/destinos", { token: t1 });
  h.assertStatus(lista.status, 200, "listar destinos favoritos");
  h.assert(lista.json.data.length === 2, "2 destinos favoritos");
  h.assert(lista.json.data.some((d) => d.id === 1) && lista.json.data.some((d) => d.id === 4), "destinos 1 y 4");

  const noExiste = await h.api("/api/favoritos/destinos/999999", { method: "POST", token: t1 });
  h.assertStatus(noExiste.status, 404, "destino inexistente 404");

  const invalido = await h.api("/api/favoritos/destinos/abc", { method: "POST", token: t1 });
  h.assertStatus(invalido.status, 400, "id inválido 400");

  h.assertStatus((await h.api("/api/favoritos/destinos/4", { method: "DELETE", token: t1 })).status, 200, "eliminar destino 4");
  h.assertStatus((await h.api("/api/favoritos/destinos/4", { method: "DELETE", token: t1 })).status, 404, "eliminar de nuevo 404");
});

h.test("FAV: negocios favoritos (solo visibles, duplicado, listar, eliminar)", async () => {
  const t1 = h.test.usuarios.t1.token;
  const t2 = h.test.usuarios.t2.token;

  h.assertStatus((await h.api(`/api/favoritos/negocios/${h.test.negocioAprobado.id}`, { method: "POST", token: t1 })).status, 201, "agregar negocio aprobado");
  const dup = await h.api(`/api/favoritos/negocios/${h.test.negocioAprobado.id}`, { method: "POST", token: t1 });
  h.assertStatus(dup.status, 409, "negocio duplicado 409");

  const pendiente = await h.api(`/api/favoritos/negocios/${h.test.negocioPendiente.id}`, { method: "POST", token: t2 });
  h.assertStatus(pendiente.status, 404, "no se puede favoritar negocio no visible");

  const lista = await h.api("/api/favoritos/negocios", { token: t1 });
  h.assertStatus(lista.status, 200, "listar negocios favoritos");
  h.assert(lista.json.data.length === 1 && lista.json.data[0].id === h.test.negocioAprobado.id, "1 negocio favorito");
  h.assert(lista.json.data[0].nombre === "Hotel Favorito Test", "datos del negocio en el listado");

  h.assertStatus((await h.api(`/api/favoritos/negocios/${h.test.negocioAprobado.id}`, { method: "DELETE", token: t1 })).status, 200, "eliminar negocio favorito");
  h.assertStatus((await h.api(`/api/favoritos/negocios/${h.test.negocioAprobado.id}`, { method: "DELETE", token: t1 })).status, 404, "eliminar de nuevo 404");
});

h.test("FAV: aislación entre usuarios (IDOR)", async () => {
  const t1 = h.test.usuarios.t1.token;
  const t2 = h.test.usuarios.t2.token;

  await h.api("/api/favoritos/destinos/2", { method: "POST", token: t1 });
  await h.api("/api/favoritos/negocios/" + h.test.negocioAprobado.id, { method: "POST", token: t1 });

  const listaT2 = await h.api("/api/favoritos/destinos", { token: t2 });
  h.assert(listaT2.json.data.length === 0, "t2 no ve favoritos de t1 (destinos)");
  const listaT2Neg = await h.api("/api/favoritos/negocios", { token: t2 });
  h.assert(listaT2Neg.json.data.length === 0, "t2 no ve favoritos de t1 (negocios)");

  h.assertStatus((await h.api("/api/favoritos/destinos/2", { method: "DELETE", token: t2 })).status, 404, "t2 no puede quitar favorito de t1");
  h.assertStatus((await h.api(`/api/favoritos/negocios/${h.test.negocioAprobado.id}`, { method: "DELETE", token: t2 })).status, 404, "t2 no puede quitar favorito negocio de t1");
});

h.test("FAV: limpieza administrada", async () => {
  for (const n of [h.test.negocioAprobado, h.test.negocioPendiente]) {
    h.assertStatus((await h.api("/api/businesses/" + n.id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar negocio ${n.id}`);
  }
  for (const u of [h.test.usuarios.neg.usuario, h.test.usuarios.t1.usuario, h.test.usuarios.t2.usuario, h.test.usuarios.t3.usuario]) {
    const { rows } = await h.q("SELECT id FROM usuarios WHERE email = $1", [u.email]);
    h.assertStatus((await h.api("/api/usuarios/" + rows[0].id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar usuario ${u.email}`);
  }
  const admins = await h.countAdmins();
  h.assert(admins >= 1, `sigue habiendo al menos 1 admin (${admins})`);
});