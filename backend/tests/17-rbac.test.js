// ============================================================
// 17-rbac.test.js — Autorizacion (RBAC) del backend.
// ------------------------------------------------------------
// Cubre:
//   * El ADMIN crea vendedores y les asigna el rol.
//   * Un VENDEDOR no puede gestionar usuarios, ver el panel admin ni
//     modificar su propio rol.
//   * Un VENDEDOR no puede modificar datos de otro vendedor.
//   * Rutas protegidas con token AUSENTE, INVALIDO o EXPIRADO.
//   * Los permisos se mantienen despues de cerrar sesion y volver a
//     entrar.
// ============================================================
const h = require("./helpers");
const jwt = require("jsonwebtoken");

const ADMIN_PASS = h.ADMIN_PASSWORD;
const pass = "Test1234x!";

h.test("RBAC: setup (admin, 2 vendedores y 1 turista)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const emailV1 = h.repo("f21test.rbac.vendedor1");
  const emailV2 = h.repo("f21test.rbac.vendedor2");
  const emailT = h.repo("f21test.rbac.turista");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Vendedor Uno", email: emailV1, password: pass, rol_id: 2 })).status, 201, "crear vendedor 1");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Vendedor Dos", email: emailV2, password: pass, rol_id: 2 })).status, 201, "crear vendedor 2");
  h.assertStatus((await h.createUser(admin.token, { nombre: "Turista RBAC", email: emailT, password: pass, rol_id: 1 })).status, 201, "crear turista");

  const V1 = await h.login(emailV1, pass);
  const V2 = await h.login(emailV2, pass);
  const T = await h.login(emailT, pass);
  h.assertStatus(V1.status, 200, "login vendedor 1");
  h.assertStatus(V2.status, 200, "login vendedor 2");
  h.assertStatus(T.status, 200, "login turista");
  h.test.V1 = V1;
  h.test.V1.email = emailV1;
  h.test.V2 = V2;
  h.test.V2.email = emailV2;
  h.test.T = T;
});

h.test("RBAC: el ADMIN crea un vendedor y le asigna el rol BUSINESS", async () => {
  const email = h.repo("f21test.rbac.creado");
  const creado = await h.api("/api/usuarios", {
    method: "POST", token: h.test.adminToken,
    body: { nombre: "Vendedor Creado", email, password: pass, rol_id: 2 },
  });
  h.assertStatus(creado.status, 201, "crear vendedor por el admin");
  h.assert(creado.json.data.rol_id === 2, "rol BUSINESS asignado");

  // La cuenta creada por el admin tiene prueba gratuita de 7 dias.
  const { rows } = await h.q(
    "SELECT trial_inicio, trial_fin, estado_cuenta FROM usuarios WHERE email = $1",
    [email]
  );
  h.assert(rows[0].trial_inicio !== null, "prueba gratuita asignada por el admin");
  h.assert(rows[0].estado_cuenta === "TRIALING", "estado TRIALING");
});

h.test("RBAC: un vendedor NO puede cambiar su propio rol", async () => {
  // Intento 1: por el endpoint de perfil propio.
  const porPerfil = await h.api("/api/auth/me", {
    method: "PUT", token: h.test.V1.token,
    body: { nombre: "Vendedor Uno", rol_id: 0, rol: "ADMIN" },
  });
  h.assertStatus(porPerfil.status, 200, "el perfil propio se puede actualizar");
  h.assert(porPerfil.json.data.rol === "BUSINESS", `el rol NO cambia (fue ${porPerfil.json.data.rol})`);

  // Intento 2: por el endpoint de gestión de usuarios.
  const porUsuarios = await h.api(`/api/usuarios/${h.test.V1.usuario.id}`, {
    method: "PUT", token: h.test.V1.token,
    body: { nombre: "Vendedor Uno", rol_id: 0 },
  });
  h.assertStatus(porUsuarios.status, 403, "el vendedor no gestiona usuarios → 403");

  // El rol en la BD sigue siendo BUSINESS.
  const { rows } = await h.q("SELECT rol_id FROM usuarios WHERE id = $1", [h.test.V1.usuario.id]);
  h.assert(Number(rows[0].rol_id) === 2, "el rol en la BD no se eleva");
});

h.test("RBAC: un vendedor NO puede cambiar el rol de otro vendedor", async () => {
  const r = await h.api(`/api/usuarios/${h.test.V2.usuario.id}`, {
    method: "PUT", token: h.test.V1.token,
    body: { nombre: "Vendedor Dos", rol_id: 0 },
  });
  h.assertStatus(r.status, 403, "cambiar el rol de otro → 403");
});

h.test("RBAC: un vendedor NO puede acceder al panel de administración", async () => {
  const rutas = [
    ["/api/usuarios", "GET"],
    ["/api/admin/stats", "GET"],
    ["/api/admin/vendedores", "GET"],
    ["/api/admin/login-history", "GET"],
  ];
  for (const [ruta, metodo] of rutas) {
    const r = await h.api(ruta, { method: metodo, token: h.test.V1.token });
    h.assertStatus(r.status, 403, `${ruta} con vendedor → 403`);
  }
});

h.test("RBAC: un vendedor NO puede modificar el negocio de otro vendedor", async () => {
  const neg1 = await h.api("/api/businesses", {
    method: "POST", token: h.test.V1.token,
    body: { nombre: "Negocio V1", category_id: 4, destination_id: 1, whatsapp: "3200000031", email_contacto: "v1@test.com" },
  });
  h.assertStatus(neg1.status, 201, "vendedor 1 crea su negocio");

  const neg2 = await h.api("/api/businesses", {
    method: "POST", token: h.test.V2.token,
    body: { nombre: "Negocio V2", category_id: 4, destination_id: 1, whatsapp: "3200000032", email_contacto: "v2@test.com" },
  });
  h.assertStatus(neg2.status, 201, "vendedor 2 crea su negocio");
  h.test.neg1 = neg1.json.data;
  h.test.neg2 = neg2.json.data;

  // El vendedor 2 no puede editar el negocio del vendedor 1.
  const editar = await h.api(`/api/businesses/${neg1.json.data.id}`, {
    method: "PUT", token: h.test.V2.token, body: { nombre: "Robado" },
  });
  h.assertStatus(editar.status, 403, "editar negocio ajeno → 403");

  // Ni borrarlo.
  const borrar = await h.api(`/api/businesses/${neg1.json.data.id}`, {
    method: "DELETE", token: h.test.V2.token,
  });
  h.assertStatus(borrar.status, 403, "borrar negocio ajeno → 403");

  // Ni crear planes en el negocio ajeno.
  const plan = await h.api(`/api/businesses/${neg1.json.data.id}/planes`, {
    method: "POST", token: h.test.V2.token,
    body: {
      nombre: "Plan Intruso", descripcion: "No debe permitirse.",
      destination_id: 1, destino: "Cordoba",
      duracion_dias: 1, duracion_noches: 0, precio: 100000,
      tipo_precio: "por_persona", tipo_plan: "paquete",
      descuentos_rango: [{ min: 1, descuento: 0 }], incluye: [], itinerario: [],
    },
  });
  h.assertStatus(plan.status, 403, "crear plan en negocio ajeno → 403");
});

h.test("RBAC: un turista NO puede crear negocios ni gestionar usuarios", async () => {
  const negocio = await h.api("/api/businesses", {
    method: "POST", token: h.test.T.token,
    body: { nombre: "Negocio Turista", category_id: 4, destination_id: 1 },
  });
  h.assert([401, 403].includes(negocio.status), `crear negocio como turista → ${negocio.status}`);

  const usuarios = await h.api("/api/usuarios", { token: h.test.T.token });
  h.assertStatus(usuarios.status, 403, "gestionar usuarios como turista → 403");
});

h.test("RBAC: rutas protegidas con token ausente, inválido o expirado", async () => {
  const sinToken = await h.api("/api/auth/me");
  h.assertStatus(sinToken.status, 401, "sin token → 401");

  const tokenFalso = await h.api("/api/auth/me", { token: "no-es-un-jwt" });
  h.assertStatus(tokenFalso.status, 401, "token inválido → 401");

  // Token con firma inválida (otro secreto).
  const otroSecreto = jwt.sign({ id: h.test.V1.usuario.id, rol: "BUSINESS" }, "secreto-inexistente", { expiresIn: "2h" });
  const firmaMala = await h.api("/api/auth/me", { token: otroSecreto });
  h.assertStatus(firmaMala.status, 401, "token con otra firma → 401");

  // Token EXPIRADO (firmado con el secreto real).
  const expirado = jwt.sign({ id: h.test.V1.usuario.id, rol: "BUSINESS" }, process.env.JWT_SECRET, { expiresIn: "-1s" });
  const r = await h.api("/api/auth/me", { token: expirado });
  h.assertStatus(r.status, 401, "token expirado → 401");
  h.assertMsg(r.json, "expirado");
});

h.test("RBAC: los permisos se mantienen al cerrar sesión y volver a entrar", async () => {
  const emailV1 = h.test.V1.email;
  // Al cerrar la sesión se revoca el token: deja de servir de inmediato.
  await h.clearSession(emailV1);
  const revocado = await h.api("/api/auth/me", { token: h.test.V1.token });
  h.assertStatus(revocado.status, 401, "token de sesión revocada → 401");

  // Al volver a entrar, el rol sigue siendo BUSINESS (no ADMIN).
  const nuevo = await h.login(emailV1, pass);
  h.assertStatus(nuevo.status, 200, "login de nuevo");
  h.assert(nuevo.usuario.rol === "BUSINESS", `el rol sigue siendo BUSINESS (fue ${nuevo.usuario.rol})`);

  // Y sigue sin poder acceder al panel admin.
  const admin = await h.api("/api/usuarios", { token: nuevo.token });
  h.assertStatus(admin.status, 403, "tras re-entrar sigue sin permisos de admin");
});
