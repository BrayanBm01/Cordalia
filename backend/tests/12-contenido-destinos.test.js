const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;

// Categorías de negocio (business_categories):
// con precio: 1 Restaurante, 2 Hotel, 3 Hostal, 4 Tour, 5 Agencia de viajes,
//             10 Experiencia turistica, 11 Atraccion turistica
// sin precio: 6 Transporte, 7 Bar, 8 Cafe, 9 Tienda, 12 Otro
const CAT_RESTAURANTE = 1;
const CAT_BAR = 7;
const CAT_TRANSPORTE = 6;

h.test("CONT: login admin y endpoints públicos de contenido", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const contenido = await h.api("/api/lugares/1/contenido");
  h.assertStatus(contenido.status, 200, "GET contenido público");
  h.assert(Array.isArray(contenido.json?.data?.actividades) && contenido.json.data.actividades.length > 0, "actividades del seed");
  h.assert(Array.isArray(contenido.json?.data?.puntosInteres) && contenido.json.data.puntosInteres.length > 0, "puntos de interés del seed");
  h.assert(contenido.json?.data?.infoViaje && contenido.json.data.infoViaje.lugar_id === 1, "info_viaje del seed");

  const presupuesto = await h.api("/api/lugares/1/presupuesto");
  h.assertStatus(presupuesto.status, 200, "GET presupuesto público");
  h.assert(presupuesto.json?.data?.info_viaje && presupuesto.json.data.info_viaje.lugar_id === 1, "info_viaje en presupuesto");
  h.assert(Array.isArray(presupuesto.json?.data?.planes), "planes array en presupuesto");

  const noExiste = await h.api("/api/lugares/999999/contenido");
  h.assertStatus(noExiste.status, 404, "contenido de lugar inexistente 404");
  h.assertMsg(noExiste.json, "Lugar no encontrado");

  const noPres = await h.api("/api/lugares/999999/presupuesto");
  h.assertStatus(noPres.status, 404, "presupuesto de lugar inexistente 404");

  // Rutas admin: sin token -> 401, rol no admin -> 403
  const sinToken = await h.api("/api/lugares/1/administrar");
  h.assertStatus(sinToken.status, 401, "asignaciones sin token 401");

  const sinTokenCatalogo = await h.api("/api/contenido/actividades");
  h.assertStatus(sinTokenCatalogo.status, 401, "catálogo actividades sin token 401");
});

h.test("CONT: RBAC sobre gestión (turista/business 403, admin ok)", async () => {
  const pass = "Test1234x!";
  const emailB = h.repo("f21test.cont.b");
  const emailT = h.repo("f21test.cont.t");

  h.assertStatus((await h.createUser(h.test.adminToken, { nombre: "Negocio CONT", email: emailB, password: pass, rol_id: 2 })).status, 201, "crear business CONT");
  h.assertStatus((await h.createUser(h.test.adminToken, { nombre: "Turista CONT", email: emailT, password: pass, rol_id: 1 })).status, 201, "crear turista CONT");

  const neg = await h.login(emailB, pass);
  h.assertStatus(neg.status, 200, "login business CONT");
  const tur = await h.login(emailT, pass);
  h.assertStatus(tur.status, 200, "login turista CONT");

  h.test.rbac = { neg: neg.token, tur: tur.token, uNeg: neg.usuario, uTur: tur.usuario };

  for (const token of [neg.token, tur.token]) {
    h.assertStatus((await h.api("/api/lugares/1/administrar", { token })).status, 403, "asignaciones no-admin 403");
    h.assertStatus((await h.api("/api/contenido/actividades", { token })).status, 403, "catálogo no-admin 403");
    h.assertStatus((await h.api("/api/contenido/puntos", { token })).status, 403, "puntos no-admin 403");
  }
});

h.test("CONT: CRUD catálogo de actividades y puntos (admin)", async () => {
  const act = await h.api("/api/contenido/actividades", {
    method: "POST",
    token: h.test.adminToken,
    body: { nombre: "F1test Actividad Rafting", descripcion: "Descenso por el río", categoria: "Aventura" },
  });
  h.assertStatus(act.status, 201, "crear actividad");
  h.assert(act.json?.data?.nombre === "F1test Actividad Rafting", "actividad creada");

  const dup = await h.api("/api/contenido/actividades", {
    method: "POST",
    token: h.test.adminToken,
    body: { nombre: "F1test Actividad Rafting" },
  });
  h.assertStatus(dup.status, 409, "actividad duplicada 409");

  const sinNombre = await h.api("/api/contenido/actividades", {
    method: "POST",
    token: h.test.adminToken,
    body: { nombre: "" },
  });
  h.assertStatus(sinNombre.status, 400, "actividad sin nombre 400");

  const upd = await h.api(`/api/contenido/actividades/${act.json.data.id}`, {
    method: "PUT",
    token: h.test.adminToken,
    body: { nombre: "F1test Actividad Rafting 2", categoria: "Aventura", activo: true },
  });
  h.assertStatus(upd.status, 200, "actualizar actividad");
  h.assert(upd.json?.data?.nombre === "F1test Actividad Rafting 2", "nombre actualizado");

  const del = await h.api(`/api/contenido/actividades/${act.json.data.id}`, { method: "DELETE", token: h.test.adminToken });
  h.assertStatus(del.status, 200, "desactivar actividad (borrado lógico)");
  h.assert(del.json?.data?.activo === false, "activo false tras borrado lógico");

  const pu = await h.api("/api/contenido/puntos", {
    method: "POST",
    token: h.test.adminToken,
    body: { nombre: "F1test Pueblo Colonial", descripcion: "Casco histórico", tipo: "Patrimonio" },
  });
  h.assertStatus(pu.status, 201, "crear punto de interés");
  h.assert(pu.json?.data?.tipo === "Patrimonio", "tipo del punto creado");

  const dupPu = await h.api("/api/contenido/puntos", {
    method: "POST",
    token: h.test.adminToken,
    body: { nombre: "F1test Pueblo Colonial" },
  });
  h.assertStatus(dupPu.status, 409, "punto duplicado 409");

  const sinNombrePu = await h.api("/api/contenido/puntos", {
    method: "POST",
    token: h.test.adminToken,
    body: { nombre: "  " },
  });
  h.assertStatus(sinNombrePu.status, 400, "punto sin nombre 400");

  h.test.actividad = act.json.data;
  h.test.actividadNuevoNombre = "F1test Actividad Rafting 2";
  h.test.punto = pu.json.data;
});

h.test("CONT: asignar/desasignar contenido a un destino y orden", async () => {
  const creado = await h.api("/api/lugares", {
    method: "POST",
    token: h.test.adminToken,
    body: { nombre: "F1test Destino Contenido", descripcion: "Destino de prueba", ubicacion: "Test" },
  });
  h.assertStatus(creado.status, 201, "crear destino de prueba");
  h.test.destino = creado.json.data;

  const sinId = await h.api(`/api/lugares/${h.test.destino.id}/administrar/contenido/actividades`, {
    method: "POST",
    token: h.test.adminToken,
    body: {},
  });
  h.assertStatus(sinId.status, 400, "asignar sin actividad_id 400");

  const noLugar = await h.api("/api/lugares/999999/administrar/contenido/actividades", {
    method: "POST",
    token: h.test.adminToken,
    body: { actividad_id: h.test.actividad.id },
  });
  h.assertStatus(noLugar.status, 404, "asignar a lugar inexistente 404");

  const asig = await h.api(`/api/lugares/${h.test.destino.id}/administrar/contenido/actividades`, {
    method: "POST",
    token: h.test.adminToken,
    body: { actividad_id: h.test.actividad.id, orden: 3 },
  });
  h.assertStatus(asig.status, 201, "asignar actividad");
  h.assert(asig.json?.data?.orden === 3, "orden 3 en asignación");

  const asigPunto = await h.api(`/api/lugares/${h.test.destino.id}/administrar/contenido/puntos`, {
    method: "POST",
    token: h.test.adminToken,
    body: { punto_interes_id: h.test.punto.id, orden: 1 },
  });
  h.assertStatus(asigPunto.status, 201, "asignar punto de interés");
  h.assert(asigPunto.json?.data?.orden === 1, "orden 1 en asignación de punto");

  const asignaciones = await h.api(`/api/lugares/${h.test.destino.id}/administrar`, { token: h.test.adminToken });
  h.assertStatus(asignaciones.status, 200, "ver asignaciones");
  h.assert(asignaciones.json?.data?.actividades_asignadas?.some((a) => a.id === h.test.actividad.id), "actividad en asignaciones");
  h.assert(asignaciones.json?.data?.puntos_asignados?.some((p) => p.id === h.test.punto.id), "punto en asignaciones");

  // El contenido público del destino refleja lo asignado.
  const contenido = await h.api(`/api/lugares/${h.test.destino.id}/contenido`);
  h.assertStatus(contenido.status, 200, "contenido público del destino de prueba");
  h.assert(contenido.json.data.actividades.some((a) => a.id === h.test.actividad.id && a.orden === 3), "actividad visible con orden");
  h.assert(contenido.json.data.puntosInteres.some((p) => p.id === h.test.punto.id && p.orden === 1), "punto visible con orden");

  // Reemplazo de orden (ON CONFLICT DO UPDATE).
  const reasig = await h.api(`/api/lugares/${h.test.destino.id}/administrar/contenido/actividades`, {
    method: "POST",
    token: h.test.adminToken,
    body: { actividad_id: h.test.actividad.id, orden: 9 },
  });
  h.assertStatus(reasig.status, 201, "reasignar actividad actualiza orden");
  h.assert(reasig.json?.data?.orden === 9, "nuevo orden 9");

  const desasig = await h.api(`/api/lugares/${h.test.destino.id}/administrar/contenido/actividades/${h.test.actividad.id}`, {
    method: "DELETE",
    token: h.test.adminToken,
  });
  h.assertStatus(desasig.status, 200, "desasignar actividad");

  const desasigNuevamente = await h.api(`/api/lugares/${h.test.destino.id}/administrar/contenido/actividades/${h.test.actividad.id}`, {
    method: "DELETE",
    token: h.test.adminToken,
  });
  h.assertStatus(desasigNuevamente.status, 404, "desasignar actividad ya desasignada 404");
});

h.test("CONT: upsert de información de viaje y validaciones", async () => {
  const body = {
    transporte: "Bus intermunicipal y taxis locales.",
    duracion_recomendada: "2 días",
    recomendaciones: "Llevar repelente.\nProbar el queso costeño.",
    moneda: "USD",
    costo_transporte: 150000,
    costo_alimentacion: 100000,
    costo_actividades: 80000,
  };
  const info = await h.api(`/api/lugares/${h.test.destino.id}/administrar/info-viaje`, {
    method: "POST",
    token: h.test.adminToken,
    body,
  });
  h.assertStatus(info.status, 200, "guardar info de viaje");
  h.assert(info.json?.data?.duracion_recomendada === "2 días", "duracion_recomendada almacenada como texto");
  h.assert(info.json?.data?.moneda === "USD", "moneda guardada");

  const contenido = await h.api(`/api/lugares/${h.test.destino.id}/contenido`);
  const iw = contenido.json.data.infoViaje;
  h.assert(iw && iw.duracion_recomendada === "2 días", "round-trip del texto duracion_recomendada");
  h.assert(iw.moneda === "USD", "round-trip moneda");
  h.assert(Number(iw.costo_transporte) === 150000, "round-trip costo transporte");

  const presupuesto = await h.api(`/api/lugares/${h.test.destino.id}/presupuesto`);
  h.assert(presupuesto.json?.data?.info_viaje?.moneda === "USD", "presupuesto expone info_viaje");

  const monedaInvalida = await h.api(`/api/lugares/${h.test.destino.id}/administrar/info-viaje`, {
    method: "POST",
    token: h.test.adminToken,
    body: { moneda: "BTC" },
  });
  h.assertStatus(monedaInvalida.status, 400, "moneda no permitida 400");
  h.assertMsg(monedaInvalida.json, "Moneda inválida");

  const costoInvalido = await h.api(`/api/lugares/${h.test.destino.id}/administrar/info-viaje`, {
    method: "POST",
    token: h.test.adminToken,
    body: { costo_transporte: "no-numero" },
  });
  h.assertStatus(costoInvalido.status, 400, "costo no numérico 400");

  const vacio = await h.api(`/api/lugares/${h.test.destino.id}/administrar/info-viaje`, {
    method: "POST",
    token: h.test.adminToken,
    body: {},
  });
  h.assertStatus(vacio.status, 400, "info de viaje sin datos 400");
  h.assertMsg(vacio.json, "No hay datos");
});

h.test("CONT: validaciones de negocios (moneda y precios por categoría)", async () => {
  const pass = "Test1234x!";
  const emailNeg = h.repo("f21test.cont.neg");

  h.assertStatus((await h.createUser(h.test.adminToken, { nombre: "Negocio Precios", email: emailNeg, password: pass, rol_id: 2 })).status, 201, "crear negocio precios");
  const neg = await h.login(emailNeg, pass);
  h.assertStatus(neg.status, 200, "login negocio precios");
  h.test.negPrecios = neg.token;
  h.test.uNegPrecios = neg.usuario;

  // Moneda fuera de la whitelist.
  const moneda = await h.api("/api/businesses", {
    method: "POST",
    token: neg.token,
    body: { nombre: "F1test Bar Moneda", category_id: CAT_BAR, moneda: "BTC" },
  });
  h.assertStatus(moneda.status, 400, "moneda inválida 400");
  h.assertMsg(moneda.json, "Moneda inválida");

  // Categoría sin rango de precios + precios -> rechazo.
  const barConPrecio = await h.api("/api/businesses", {
    method: "POST",
    token: neg.token,
    body: { nombre: "F1test Bar Precio", category_id: CAT_BAR, moneda: "COP", precio_min: 10, precio_max: 20 },
  });
  h.assertStatus(barConPrecio.status, 400, "bar con precio 400");
  h.assertMsg(barConPrecio.json, "no maneja rango de precios");

  // Categoría con precio sin precios en creación: se tolera (negocios legacy
  // aprobados del seed no tienen rango); no se rechaza la creación.
  const restauranteSinPrecio = await h.api("/api/businesses", {
    method: "POST",
    token: neg.token,
    body: { nombre: "F1test Restaurante Sin Precio", category_id: CAT_RESTAURANTE, moneda: "COP" },
  });
  h.assertStatus(restauranteSinPrecio.status, 201, "restaurante sin precio 201 (precio opcional)");

  // Creación válida con precios y moneda permitida.
  const restaurante = await h.api("/api/businesses", {
    method: "POST",
    token: neg.token,
    body: {
      nombre: "F1test Restaurante Valido",
      category_id: CAT_RESTAURANTE,
      moneda: "USD",
      precio_min: 20,
      precio_max: 50,
    },
  });
  h.assertStatus(restaurante.status, 201, "restaurante con precio y moneda USD 201");
  h.assert(restaurante.json?.data?.moneda === "USD", "moneda USD guardada");
  h.assert(Number(restaurante.json?.data?.precio_min) === 20, "precio_min guardado");
  h.test.restaurante = restaurante.json.data;

  // Actualización (no creación): editar restaurante sin precios es válido.
  const editSinPrecio = await h.api(`/api/businesses/${restaurante.json.data.id}`, {
    method: "PUT",
    token: neg.token,
    body: { nombre: "F1test Restaurante Valido Edit" },
  });
  h.assertStatus(editSinPrecio.status, 200, "editar restaurante sin precios en update 200");

  // Update que intenta meter precio en categoría sin precio -> rechazo.
  const transporte = await h.api("/api/businesses", {
    method: "POST",
    token: neg.token,
    body: { nombre: "F1test Transporte Test", category_id: CAT_TRANSPORTE },
  });
  h.assertStatus(transporte.status, 201, "crear transporte sin precio 201");
  const transporteConPrecio = await h.api(`/api/businesses/${transporte.json.data.id}`, {
    method: "PUT",
    token: neg.token,
    body: { moneda: "COP", precio_min: 5 },
  });
  h.assertStatus(transporteConPrecio.status, 400, "transporte con precio en update 400");
  h.assertMsg(transporteConPrecio.json, "no maneja rango de precios");

  h.test.transporte = transporte.json.data;
  h.test.restauranteSinPrecio = restauranteSinPrecio.json.data;
});

h.test("CONT: limpieza administrada", async () => {
  // Negocios de prueba.
  for (const n of [h.test.restaurante, h.test.transporte, h.test.restauranteSinPrecio]) {
    if (!n) continue;
    h.assertStatus((await h.api("/api/businesses/" + n.id, { method: "DELETE", token: h.test.adminToken })).status, 200, `borrar negocio ${n.id}`);
  }

  // Destino + contenido asociado.
  if (h.test.destino) {
    h.assertStatus((await h.api("/api/lugares/" + h.test.destino.id, { method: "DELETE", token: h.test.adminToken })).status, 200, `borrar destino ${h.test.destino.id}`);
    await h.q("DELETE FROM destino_info_viaje WHERE lugar_id = $1", [h.test.destino.id]);
    await h.q(
      `DELETE FROM destino_actividades WHERE lugar_id = $1`,
      [h.test.destino.id]
    );
    await h.q(
      `DELETE FROM destino_puntos_interes WHERE lugar_id = $1`,
      [h.test.destino.id]
    );
  }

  // Catálogos creados por la suite.
  await h.q("DELETE FROM actividades WHERE nombre LIKE 'F1test %'");
  await h.q("DELETE FROM puntos_interes WHERE nombre LIKE 'F1test %'");

  // Usuarios creados (patrón f21test.*) via cleanupTestData al final.
  for (const u of [h.test.rbac?.uNeg, h.test.rbac?.uTur, h.test.uNegPrecios]) {
    if (!u) continue;
    const { rows } = await h.q("SELECT id FROM usuarios WHERE email = $1", [u.email]);
    if (rows[0]) {
      h.assertStatus((await h.api("/api/usuarios/" + rows[0].id, { method: "DELETE", token: h.test.adminToken })).status, 200, `borrar usuario ${u.email}`);
    }
  }

  const sobraAct = await h.q("SELECT COUNT(*)::int AS c FROM actividades WHERE nombre LIKE 'F1test %'");
  h.assert(sobraAct.rows[0].c === 0, "sin actividades de prueba");
  const sobraPuntos = await h.q("SELECT COUNT(*)::int AS c FROM puntos_interes WHERE nombre LIKE 'F1test %'");
  h.assert(sobraPuntos.rows[0].c === 0, "sin puntos de prueba");
});