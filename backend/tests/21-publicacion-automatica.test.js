// ============================================================
// Suite 21: publicacion automatica SOLO con prueba vigente,
// unicidad de nombres, restricciones de renombrar/eliminar para
// vendedores, override del ADMIN y auditoria de identidad.
// ============================================================
const h = require("./helpers");

const PASS = "Test1234x!";
const suf = Math.random().toString(36).slice(2, 8);
const NOMBRE = `Negocio Auto ${suf}`;

async function crearVendedor(adminToken, prefijo, nombre) {
  const email = h.repo(prefijo);
  const r = await h.createUser(adminToken, { nombre, email, password: PASS, rol_id: 2 });
  h.assertStatus(r.status, 201, `crear vendedor ${prefijo}`);
  const sesion = await h.login(email, PASS);
  h.assertStatus(sesion.status, 200, `login ${prefijo}`);
  return { id: r.json.data.id, email, token: sesion.token, usuario: sesion.usuario };
}

function crearNegocio(token, nombre, extra = {}) {
  return h.api("/api/businesses", {
    method: "POST", token,
    body: { nombre, category_id: 1, descripcion: "Suite 21", ...extra },
  });
}

h.test("AUTO: setup (admin y vendedores con distintos estados)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, h.ADMIN_PASSWORD);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.autoAdmin = admin.token;

  // Con prueba vigente (createUser asigna la prueba de 168 h).
  h.test.autoTrial = await crearVendedor(admin.token, "f21test.auto.trial", "Vendedor Auto Trial");

  // Legado: sin politica comercial.
  h.test.autoLegacy = await crearVendedor(admin.token, "f21test.auto.legacy", "Vendedor Auto Legado");
  await h.sinPruebaVigente(h.test.autoLegacy.id);

  // Pagada activa: NO debe auto-publicar (solo la prueba gratuita lo hace).
  // Se crea una suscripcion comercial vigente real (no solo el flag).
  h.test.autoPaid = await crearVendedor(admin.token, "f21test.auto.paid", "Vendedor Auto Pagado");
  await h.sinPruebaVigente(h.test.autoPaid.id);
  const { rows: planes } = await h.q("SELECT id FROM plans ORDER BY id LIMIT 1");
  await h.q(
    `INSERT INTO subscriptions (usuario_id, plan_id, estado, starts_at, ends_at, proveedor, monto, moneda)
     VALUES ($1, $2, 'active', NOW(), NOW() + interval '30 days', 'mock', 0, 'COP')`,
    [h.test.autoPaid.id, planes[0].id]
  );
  await h.q("UPDATE usuarios SET estado_cuenta = 'ACTIVE' WHERE id = $1", [h.test.autoPaid.id]);

  // Vencido y suspendido: el backend bloquea la escritura comercial.
  h.test.autoExpired = await crearVendedor(admin.token, "f21test.auto.expired", "Vendedor Auto Vencido");
  await h.q(
    "UPDATE usuarios SET estado_cuenta = 'EXPIRED', trial_fin = NOW() - interval '1 hour' WHERE id = $1",
    [h.test.autoExpired.id]
  );
  h.test.autoSuspended = await crearVendedor(admin.token, "f21test.auto.susp", "Vendedor Auto Suspendido");
  await h.q("UPDATE usuarios SET estado_cuenta = 'SUSPENDED' WHERE id = $1", [h.test.autoSuspended.id]);
});

h.test("AUTO: solo la prueba vigente publica automaticamente", async () => {
  const trial = await crearNegocio(h.test.autoTrial.token, NOMBRE);
  h.assertStatus(trial.status, 201, "crear con prueba vigente");
  h.assert(trial.json.data.estado === "approved", "prueba vigente -> approved");
  h.test.autoNegocio = trial.json.data;

  const legacy = await crearNegocio(h.test.autoLegacy.token, `${NOMBRE} Legado`);
  h.assertStatus(legacy.status, 201, "crear legado");
  h.assert(legacy.json.data.estado === "pending", "legado -> pending (aprobacion manual)");
  h.test.autoNegocioLegacy = legacy.json.data;

  const paid = await crearNegocio(h.test.autoPaid.token, `${NOMBRE} Pagado`);
  h.assertStatus(paid.status, 201, "crear pagado activo");
  h.assert(paid.json.data.estado === "pending", "suscripcion pagada -> pending (no auto)");
  h.test.autoNegocioPaid = paid.json.data;

  const expired = await crearNegocio(h.test.autoExpired.token, `${NOMBRE} Vencido`);
  h.assertStatus(expired.status, 403, "prueba vencida no puede crear (403)");

  const suspended = await crearNegocio(h.test.autoSuspended.token, `${NOMBRE} Suspendido`);
  h.assertStatus(suspended.status, 403, "cuenta suspendida no puede crear (403)");
});

h.test("AUTO: el negocio auto-publicado es visible al publico", async () => {
  const pub = await h.api(`/api/businesses/${h.test.autoNegocio.id}`);
  h.assertStatus(pub.status, 200, "detalle publico del auto-publicado");
  const lista = await h.api("/api/businesses");
  h.assert(lista.json.data.some((b) => b.id === h.test.autoNegocio.id), "aparece en el listado publico");
});

h.test("AUTO: nombres duplicados normalizados se rechazan (409)", async () => {
  const variante = await crearNegocio(h.test.autoLegacy.token, `  ${NOMBRE.toUpperCase()}  `);
  h.assertStatus(variante.status, 409, "variante mayusculas/espacios -> 409");
  h.assert(variante.json.code === "NOMBRE_DUPLICADO", "codigo NOMBRE_DUPLICADO");

  const acentos = await crearNegocio(h.test.autoLegacy.token, NOMBRE.replace("Negocio", "Négócio"));
  h.assertStatus(acentos.status, 409, "variante con acentos -> 409");
});

h.test("AUTO: el vendedor no puede renombrar ni eliminar; el ADMIN si", async () => {
  const id = h.test.autoNegocio.id;

  const rename = await h.api(`/api/businesses/${id}`, {
    method: "PUT", token: h.test.autoTrial.token, body: { nombre: `${NOMBRE} Renombrado` },
  });
  h.assertStatus(rename.status, 403, "vendedor no renombra");
  h.assert(rename.json.code === "RENOMBRAR_NO_PERMITIDO", "codigo RENOMBRAR_NO_PERMITIDO");

  const del = await h.api(`/api/businesses/${id}`, { method: "DELETE", token: h.test.autoTrial.token });
  h.assertStatus(del.status, 403, "vendedor no elimina");
  h.assert(del.json.code === "ELIMINAR_NO_PERMITIDO", "codigo ELIMINAR_NO_PERMITIDO");

  // El nombre intacto enviado por el formulario NO cuenta como renombre.
  const mismoNombre = await h.api(`/api/businesses/${id}`, {
    method: "PUT", token: h.test.autoTrial.token, body: { nombre: NOMBRE, descripcion: "Editado" },
  });
  h.assertStatus(mismoNombre.status, 200, "nombre intacto + otros campos -> 200");
  h.assert(mismoNombre.json.data.nombre === NOMBRE, "nombre conservado");

  // ADMIN renombra (override) y el slug se regenera.
  const adminRename = await h.api(`/api/businesses/${id}`, {
    method: "PUT", token: h.test.autoAdmin, body: { nombre: `${NOMBRE} Admin` },
  });
  h.assertStatus(adminRename.status, 200, "ADMIN renombra");
  h.test.autoNegocio = adminRename.json.data;
});

h.test("AUTO: ADMIN puede autorizar un nombre duplicado (excepcion)", async () => {
  // El legado intenta crear un nombre que ya existe; el ADMIN lo renombra
  // a ese mismo nombre autorizando la excepcion explicita.
  const id = h.test.autoNegocioLegacy.id;
  const dup = await h.api(`/api/businesses/${id}`, {
    method: "PUT", token: h.test.autoAdmin, body: { nombre: `${NOMBRE} Admin` },
  });
  h.assertStatus(dup.status, 200, "ADMIN autoriza duplicado");
  h.assert(dup.json.data.permite_nombre_duplicado === true, "flag de excepcion activo");
  h.assert(dup.json.data.duplicado_autorizado_por != null, "queda el admin que autorizo");
  h.test.autoNegocioLegacy = dup.json.data;
});

h.test("AUTO: la auditoria de identidad registra los eventos", async () => {
  const { rows } = await h.q(
    "SELECT accion, permitido FROM business_identity_audit WHERE business_id = ANY($1::int[]) OR nombre_normalizado = $2",
    [[h.test.autoNegocio.id, h.test.autoNegocioLegacy.id], require("../src/utils/nombreNegocio").normalizarNombreNegocio(NOMBRE)]
  );
  const acciones = rows.map((r) => r.accion);
  h.assert(acciones.includes("crear"), "auditoria: crear");
  h.assert(acciones.includes("intento_renombrar_rechazado"), "auditoria: intento renombre rechazado");
  h.assert(acciones.includes("intento_eliminar_rechazado"), "auditoria: intento eliminar rechazado");
  h.assert(acciones.includes("renombrar"), "auditoria: renombre ADMIN");
  h.assert(acciones.includes("duplicado_autorizado"), "auditoria: duplicado autorizado");
  h.assert(rows.some((r) => r.accion === "crear" && r.permitido === true), "crear con prueba vigente marcado permitido");

  const dup = await h.q(
    "SELECT 1 FROM business_identity_audit WHERE accion = 'duplicado_detectado' AND nombre_normalizado = $1",
    [require("../src/utils/nombreNegocio").normalizarNombreNegocio(NOMBRE)]
  );
  h.assert(dup.rows.length >= 1, "auditoria: duplicado detectado");
});

h.test("AUTO: limpieza administrada", async () => {
  for (const n of [h.test.autoNegocio, h.test.autoNegocioLegacy, h.test.autoNegocioPaid]) {
    if (!n) continue;
    h.assertStatus(
      (await h.api(`/api/businesses/${n.id}`, { method: "DELETE", token: h.test.autoAdmin })).status,
      200, `ADMIN borra negocio ${n.id}`
    );
  }
  for (const v of [h.test.autoTrial, h.test.autoLegacy, h.test.autoPaid, h.test.autoExpired, h.test.autoSuspended]) {
    await h.api(`/api/usuarios/${v.id}`, { method: "DELETE", token: h.test.autoAdmin });
  }
});
