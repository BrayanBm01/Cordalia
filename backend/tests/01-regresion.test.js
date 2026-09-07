const h = require("./helpers");

h.test("REGR: el ADMIN puede iniciar sesión y acceder al panel", async () => {
  h.assert(h.ADMIN_PASSWORD, "Define ADMIN_TEST_PASSWORD (credencial del ADMIN real)");
  await h.clearSession(h.ADMIN_EMAIL);
  const r = await h.login(h.ADMIN_EMAIL, h.ADMIN_PASSWORD);
  h.assertStatus(r.status, 200, "login admin");
  h.assert(r.usuario?.rol === "ADMIN", "rol debe ser ADMIN");
  h.test.adminToken = r.token;

  const stats = await h.api("/api/admin/stats", { token: r.token });
  h.assertStatus(stats.status, 200, "stats admin");
  h.assert(typeof stats.json?.data?.totalUsuarios === "number", "totalUsuarios numérico");
  h.assert(typeof stats.json?.data?.totalDestinos === "number", "totalDestinos numérico");
  h.assert(typeof stats.json?.data?.totalNegocios === "number", "totalNegocios numérico");
  h.assert(Array.isArray(stats.json?.data?.negociosPorEstado), "negociosPorEstado array");
  h.assert(Array.isArray(stats.json?.data?.usuariosPorRol), "usuariosPorRol array");
  h.assert(Array.isArray(stats.json?.data?.resenasPorValoracion), "resenasPorValoracion array");
  h.assert(Array.isArray(stats.json?.data?.negociosPorCategoria), "negociosPorCategoria array");

  const usuarios = await h.api("/api/usuarios", { token: r.token });
  h.assertStatus(usuarios.status, 200, "listar usuarios admin");
  h.assert(Array.isArray(usuarios.json?.data), "data debe ser array");
});

h.test("REGR: sin token -> 401 y con token inválido -> 401", async () => {
  const sin = await h.api("/api/usuarios");
  h.assertStatus(sin.status, 401, "sin token");
  h.assertMsg(sin.json, "Token requerido");

  const invalido = await h.api("/api/usuarios", { token: "token.invalido.xyz" });
  h.assertStatus(invalido.status, 401, "token inválido");
  h.assertMsg(invalido.json, "Token inválido");
});

h.test("REGR: TOURIST/BUSINESS no pueden gestionar usuarios ni ver el panel admin", async () => {
  const token = h.test.adminToken;
  const pass = "Test1234x!";
  const emailTourist = h.repo("f21test.turista");
  const emailBusiness = h.repo("f21test.negocio");

  const createdTourist = await h.createUser(token, {
    nombre: "Test Turista", email: emailTourist, password: pass, rol_id: 1,
  });
  h.assertStatus(createdTourist.status, 201, "crear turista");
  const createdBusiness = await h.createUser(token, {
    nombre: "Test Negocio", email: emailBusiness, password: pass, rol_id: 2,
  });
  h.assertStatus(createdBusiness.status, 201, "crear negocio");

  const turista = await h.login(emailTourist, pass);
  h.assertStatus(turista.status, 200, "login turista");
  h.assert(turista.usuario?.rol === "TOURIST", "rol turista");

  const negocio = await h.login(emailBusiness, pass);
  h.assertStatus(negocio.status, 200, "login negocio");
  h.assert(negocio.usuario?.rol === "BUSINESS", "rol business");

  for (const t of [turista, negocio]) {
    const del = await h.api("/api/usuarios/" + createdTourist.json.data.id, {
      method: "DELETE", token: t.token,
    });
    h.assertStatus(del.status, 403, "borrar usuario con rol no admin");
    const admin = await h.api("/api/admin/stats", { token: t.token });
    h.assertStatus(admin.status, 403, "stats admin con rol no admin");
    const usuarios = await h.api("/api/usuarios", { token: t.token });
    h.assertStatus(usuarios.status, 403, "listar usuarios con rol no admin");
  }

  h.test.touristId = createdTourist.json.data.id;
  h.test.businessId = createdBusiness.json.data.id;
  h.test.touristToken = turista.token;
  h.test.businessToken = negocio.token;
});

h.test("REGR: ADMIN no puede eliminarse a sí mismo por API (403)", async () => {
  const token = h.test.adminToken;
  const pass = "Test1234x!";
  const email = h.repo("f21test.admin");
  const created = await h.createUser(token, {
    nombre: "Admin Temporal", email, password: pass, rol_id: 0,
  });
  h.assertStatus(created.status, 201, "crear admin temporal");

  const adminTemp = await h.login(email, pass);
  h.assertStatus(adminTemp.status, 200, "login admin temporal");
  h.assert(adminTemp.usuario?.rol === "ADMIN", "rol admin temporal");

  const selfDel = await h.api("/api/usuarios/" + created.json.data.id, {
    method: "DELETE", token: adminTemp.token,
  });
  h.assertStatus(selfDel.status, 403, "auto-eliminación");
  h.assertMsg(selfDel.json, "Un administrador no puede eliminarse a sí mismo");

  // Limpiar el admin temporal (deben existir 2 admins, se permite)
  const clean = await h.api("/api/usuarios/" + created.json.data.id, {
    method: "DELETE", token,
  });
  h.assertStatus(clean.status, 200, "limpiar admin temporal");
});

h.test("REGR: eliminar turista y negocio por el ADMIN es permitido", async () => {
  const token = h.test.adminToken;
  const a = await h.api("/api/usuarios/" + h.test.touristId, { method: "DELETE", token });
  h.assertStatus(a.status, 200, "eliminar turista");
  const b = await h.api("/api/usuarios/" + h.test.businessId, { method: "DELETE", token });
  h.assertStatus(b.status, 200, "eliminar negocio");

  const gone = await h.api("/api/usuarios/" + h.test.touristId, { token });
  h.assertStatus(gone.status, 404, "el turista ya no existe");
});

h.test("REGR: revocar sesión funciona para ADMIN y falla para el propio admin revocado", async () => {
  const token = h.test.adminToken;
  const pass = "Test1234x!";
  const email = h.repo("f21test.revoc");
  const created = await h.createUser(token, {
    nombre: "Test Revocación", email, password: pass, rol_id: 1,
  });
  h.assertStatus(created.status, 201, "crear usuario revocación");

  const u = await h.login(email, pass);
  h.assertStatus(u.status, 200, "login");
  const me = await h.api("/api/auth/me", { token: u.token });
  h.assertStatus(me.status, 200, "/auth/me");

  const rev = await h.api(`/api/usuarios/${created.json.data.id}/revoke-session`, {
    method: "POST", token,
  });
  h.assertStatus(rev.status, 200, "revocar sesión admin");

  const after = await h.api("/api/auth/me", { token: u.token });
  h.assertStatus(after.status, 401, "token revocado 401");

  const clean = await h.api("/api/usuarios/" + created.json.data.id, { method: "DELETE", token });
  h.assertStatus(clean.status, 200, "limpiar usuario revocación");
});

h.test("REGR: el sistema conserva al menos 1 ADMIN al finalizar", async () => {
  const admins = await h.countAdmins();
  h.assert(admins >= 1, `se esperaba al menos 1 administrador, hay ${admins}`);
});