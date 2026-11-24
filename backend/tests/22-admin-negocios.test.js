// ============================================================
// 22 - CRUD ADMINISTRATIVO DE NEGOCIOS
// ------------------------------------------------------------
// Cubre las 12 comprobaciones obligatorias:
//   1. login ADMIN y preparación de usuarios
//   2. crear sin vendedor
//   3. validación, duplicados y campos protegidos
//   4. editar y renombrar
//   5. aprobar/rechazar/publicar/ocultar (cualquier estado)
//   6. consultar, filtrar y ver detalle con relaciones
//   7. vendedor no elimina/renombra/crea en rutas admin
//   8. turista y anónimo sin acceso
//   9. petición HTTP manipulada
//  10. eliminar (archivado) y desaparecer de públicas
//  11. relaciones y datos financieros intactos
//  12. restaurar, proteger en BD yconservar funciones admin
// ============================================================
const h = require("./helpers");

const PASS = "Test1234x!";
const sufijo = Math.random().toString(36).slice(2, 8);
const NOMBRE = `Admin CRUD ${sufijo} Plaza`;
const CATEGORIA_SIN_PRECIO = 12; // "Otro"
const CATEGORIA_CON_PRECIO = 1; // "Restaurante"
const ESTADOS = ["draft", "pending", "approved", "rejected", "suspended", "inactive"];

function ctx() {
  if (!h.test.adminCrud) h.test.adminCrud = {};
  return h.test.adminCrud;
}

async function loginUsuario(email) {
  await h.clearSession(email);
  const res = await h.login(email, PASS);
  h.assertStatus(res.status, 200, `login ${email}`);
  return res;
}

h.test("ADMIN-CRUD 01: login ADMIN y preparación de usuarios", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, h.ADMIN_PASSWORD);
  h.assertStatus(admin.status, 200, "login admin");

  const adminRow = await h.q("SELECT id, rol_id FROM usuarios WHERE email = $1", [h.ADMIN_EMAIL]);
  h.assert(adminRow.rows[0]?.rol_id === 0, "el usuario de pruebas debe ser ADMIN");

  const vendorEmail = h.repo(`f21test.admincrud.v.${sufijo}`);
  const touristEmail = h.repo(`f21test.admincrud.t.${sufijo}`);
  const vendor = await h.createUser(admin.token, {
    nombre: "Vendedor AdminCRUD", email: vendorEmail, password: PASS, rol_id: 2,
  });
  h.assertStatus(vendor.status, 201, "crear vendedor");
  const tourist = await h.createUser(admin.token, {
    nombre: "Turista AdminCRUD", email: touristEmail, password: PASS, rol_id: 1,
  });
  h.assertStatus(tourist.status, 201, "crear turista");

  const vendorLogin = await loginUsuario(vendorEmail);
  const touristLogin = await loginUsuario(touristEmail);

  Object.assign(ctx(), {
    adminToken: admin.token,
    adminId: adminRow.rows[0].id,
    vendorId: vendor.json.data.id,
    vendorEmail,
    vendorToken: vendorLogin.token,
    touristId: tourist.json.data.id,
    touristEmail,
    touristToken: touristLogin.token,
  });
  h.assert(Boolean(ctx().adminToken && ctx().vendorToken && ctx().touristToken), "tokens obtenidos");
});

h.test("ADMIN-CRUD 02: ADMIN crea negocio sin vendedor propietario", async () => {
  const res = await h.api("/api/admin/negocios", {
    method: "POST",
    token: ctx().adminToken,
    body: {
      nombre: NOMBRE,
      descripcion: "Negocio registrado directamente por la plataforma.",
      category_id: CATEGORIA_SIN_PRECIO,
      direccion: "Calle 10 # 20-30",
      telefono: "3001234567",
      email_contacto: "contacto@admincrud.test.com",
      website: "https://admincrud.test.com",
      moneda: "COP",
    },
  });
  h.assertStatus(res.status, 201, "crear negocio ADMIN");
  const n = res.json.data;
  h.assert(n.owner_id === null, "owner_id debe ser NULL (propiedad de la plataforma)");
  h.assert(n.creado_por_admin === ctx().adminId, "creado_por_admin debe ser el ADMIN");
  h.assert(n.estado === "approved", "nace aprobado");
  h.assert(n.publicacion_estado === "visible", "nace visible");
  h.assert(Boolean(n.slug), "debe generar slug");
  ctx().negocioId = n.id;
  ctx().nombreOriginal = n.nombre;
});

h.test("ADMIN-CRUD 03: validación, duplicados y campos protegidos", async () => {
  const token = ctx().adminToken;
  const protegidos = await h.api("/api/admin/negocios", {
    method: "POST", token,
    body: {
      nombre: `Protegido ${sufijo}`, category_id: CATEGORIA_SIN_PRECIO, moneda: "COP",
      owner_id: ctx().vendorId, is_verified: true, estado_cuenta: "ACTIVE",
    },
  });
  h.assertStatus(protegidos.status, 400, "campos protegidos rechazados");
  h.assertMsg(protegidos.json, "Campos no permitidos");

  const duplicado = await h.api("/api/admin/negocios", {
    method: "POST", token,
    body: { nombre: `  ADMIN   CRUD ${sufijo.toUpperCase()}   PLAZA  `, category_id: CATEGORIA_SIN_PRECIO, moneda: "COP" },
  });
  h.assertStatus(duplicado.status, 409, "nombre duplicado (mayúsculas/espacios)");
  h.assert(duplicado.json.code === "NOMBRE_DUPLICADO", "código NOMBRE_DUPLICADO");

  const emailInvalido = await h.api("/api/admin/negocios", {
    method: "POST", token,
    body: { nombre: `Email invalido ${sufijo}`, category_id: CATEGORIA_SIN_PRECIO, moneda: "COP", email_contacto: "no-es-email" },
  });
  h.assertStatus(emailInvalido.status, 400, "email inválido rechazado");

  // El backend no admite precios en categorías que no los publican (Otro),
  // y valida la coherencia del rango cuando se envía. La obligatoriedad por
  // categoría la aplica el schema Zod compartido por ambos formularios.
  const precioNoAdmitido = await h.api("/api/admin/negocios", {
    method: "POST", token,
    body: {
      nombre: `Precio no admitido ${sufijo}`, category_id: CATEGORIA_SIN_PRECIO, moneda: "COP",
      precio_min: 1000, precio_max: 2000,
    },
  });
  h.assertStatus(precioNoAdmitido.status, 400, "categoría sin precio rechaza rango");

  const rangoInvalido = await h.api("/api/admin/negocios", {
    method: "POST", token,
    body: {
      nombre: `Rango invalido ${sufijo}`, category_id: CATEGORIA_CON_PRECIO, moneda: "COP",
      precio_min: 20000, precio_max: 10000,
    },
  });
  h.assertStatus(rangoInvalido.status, 400, "precio máximo menor que el mínimo");
});

h.test("ADMIN-CRUD 04: ADMIN edita y renombra conservando unicidad", async () => {
  const id = ctx().negocioId;
  const nombreEditado = `${NOMBRE} Editado`;
  const res = await h.api(`/api/admin/negocios/${id}`, {
    method: "PUT",
    token: ctx().adminToken,
    body: {
      nombre: nombreEditado,
      category_id: CATEGORIA_CON_PRECIO,
      descripcion: "Descripción actualizada por el ADMIN.",
      direccion: "Avenida 5 # 6-7",
      telefono: "3109876543",
      email_contacto: "nuevo@admincrud.test.com",
      website: "https://nuevo.admincrud.test.com",
      moneda: "COP",
      precio_min: 10000,
      precio_max: 90000,
      estado: "pending",
      publicacion_estado: "visible",
    },
  });
  h.assertStatus(res.status, 200, "editar negocio ADMIN");

  const detalle = await h.api(`/api/admin/negocios/${id}`, { token: ctx().adminToken });
  h.assertStatus(detalle.status, 200, "consultar detalle");
  h.assert(detalle.json.data.nombre === nombreEditado, "nombre renombrado");
  h.assert(detalle.json.data.slug !== res.json.data?.slug || Boolean(detalle.json.data.slug), "slug conservado/regenerado");
  h.assert(detalle.json.data.descripcion.includes("actualizada"), "descripción editada");
  h.assert(detalle.json.data.estado === "pending", "ADMIN puede fijar estado pendiente");
  h.assert(detalle.json.data.direccion === "Avenida 5 # 6-7", "dirección editada");
  ctx().nombreEditado = nombreEditado;
});

h.test("ADMIN-CRUD 05: ADMIN aplica cualquier moderación y publica/oculta", async () => {
  const id = ctx().negocioId;
  const token = ctx().adminToken;
  for (const estado of ESTADOS) {
    const r = await h.api(`/api/admin/negocios/${id}/estado`, {
      method: "PUT", token, body: { estado },
    });
    h.assertStatus(r.status, 200, `fijar estado ${estado}`);
    const detalle = await h.api(`/api/businesses/${id}`);
    if (estado === "approved") {
      h.assertStatus(detalle.status, 200, "aprobado es visible");
    } else {
      h.assertStatus(detalle.status, 404, `${estado} no es público`);
    }
  }

  // Dejar el negocio aprobado para las siguientes comprobaciones.
  const aprobar = await h.api(`/api/admin/negocios/${id}/estado`, {
    method: "PUT", token, body: { estado: "approved", publicacion_estado: "visible" },
  });
  h.assertStatus(aprobar.status, 200, "aprobar y publicar");

  const ocultar = await h.api(`/api/admin/negocios/${id}/estado`, {
    method: "PUT", token, body: { publicacion_estado: "oculto_admin" },
  });
  h.assertStatus(ocultar.status, 200, "ocultar por ADMIN");
  const ocultoDetalle = await h.api(`/api/admin/negocios/${id}`, { token });
  h.assert(ocultoDetalle.json.data.estado === "approved", "ocultar NO cambia la moderación");
  h.assertStatus((await h.api(`/api/businesses/${id}`)).status, 404, "oculto no es público");

  const publicar = await h.api(`/api/admin/negocios/${id}/estado`, {
    method: "PUT", token, body: { publicacion_estado: "visible" },
  });
  h.assertStatus(publicar.status, 200, "publicar de nuevo");
  h.assertStatus((await h.api(`/api/businesses/${id}`)).status, 200, "visible otra vez");
});

h.test("ADMIN-CRUD 06: listar, filtrar y ver detalle con relaciones", async () => {
  const token = ctx().adminToken;
  const id = ctx().negocioId;
  const listado = await h.api("/api/admin/negocios", { token });
  h.assertStatus(listado.status, 200, "listado admin");
  h.assert(listado.json.data.some((n) => n.id === id), "el negocio está en el listado admin");

  const porTexto = await h.api(`/api/admin/negocios?search=${encodeURIComponent(ctx().nombreEditado)}`, { token });
  h.assert(porTexto.json.data.some((n) => n.id === id), "búsqueda por nombre");

  const porEstado = await h.api("/api/admin/negocios?estado=approved", { token });
  h.assert(porEstado.json.data.every((n) => n.estado === "approved"), "filtro por estado");

  const porPublicacion = await h.api("/api/admin/negocios?publicacion_estado=visible", { token });
  h.assert(porPublicacion.json.data.every((n) => n.publicacion_estado === "visible"), "filtro por publicación");

  // Relaciones reales: reseña, favorito, imagen, suscripción y pago.
  const { rows: planes } = await h.q("SELECT id FROM plans ORDER BY id LIMIT 1");
  const planId = planes[0].id;
  await h.q(
    `INSERT INTO reviews (user_id, business_id, rating, comment, estado)
     VALUES ($1, $2, 5, 'Reseña de prueba ADMIN-CRUD', 'active')
     ON CONFLICT (user_id, business_id) DO NOTHING`,
    [ctx().touristId, id]
  );
  await h.q(
    `INSERT INTO favorite_negocios (user_id, business_id) VALUES ($1, $2)
     ON CONFLICT (user_id, business_id) DO NOTHING`,
    [ctx().touristId, id]
  );
  await h.q(
    `INSERT INTO business_images (business_id, url, alt_text, is_primary, orden)
     VALUES ($1, $2, 'Foto de prueba', true, 0)`,
    [id, `https://admincrud.test.com/${sufijo}.jpg`]
  );
  const { rows: subs } = await h.q(
    `INSERT INTO subscriptions (business_id, plan_id, estado, starts_at, ends_at)
     VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '30 days') RETURNING id`,
    [id, planId]
  );
  await h.q(
    `INSERT INTO suscripcion_pagos
       (suscripcion_id, usuario_id, plan_id, proveedor, evento, estado, monto, moneda, idempotency_key)
     VALUES ($1, $2, $3, 'mock', 'payment.approved', 'approved', 25000, 'COP', $4)`,
    [subs[0].id, ctx().vendorId, planId, `admincrud-${sufijo}`]
  );

  const detalle = await h.api(`/api/admin/negocios/${id}`, { token });
  h.assertStatus(detalle.status, 200, "detalle con relaciones");
  const rel = detalle.json.data.relaciones;
  h.assert(rel && rel.resenas >= 1, "detalle informa reseñas");
  h.assert(rel.imagenes >= 1, "detalle informa fotografías");
  h.assert(rel.favoritos >= 1, "detalle informa favoritos");
  h.assert(rel.suscripciones >= 1 && rel.pagos >= 1, "detalle informa suscripción y pago");
});

h.test("ADMIN-CRUD 07: vendedor no elimina, renombra ni usa rutas admin", async () => {
  const { adminToken, vendorToken, vendorEmail } = ctx();
  const propia = await h.api("/api/businesses", {
    method: "POST",
    token: vendorToken,
    body: { nombre: `Vendedor AdminCRUD ${sufijo}`, category_id: CATEGORIA_SIN_PRECIO, moneda: "COP" },
  });
  h.assertStatus(propia.status, 201, "el vendedor sí puede crear en su propia ruta");
  const id = propia.json.data.id;
  ctx().negocioVendedorId = id;

  const renombrar = await h.api(`/api/businesses/${id}`, {
    method: "PUT", token: vendorToken, body: { nombre: `Vendedor Renombrado ${sufijo}` },
  });
  h.assertStatus(renombrar.status, 403, "vendedor no renombra");
  h.assert(renombrar.json.code === "RENOMBRAR_NO_PERMITIDO", "código RENOMBRAR_NO_PERMITIDO");

  const eliminar = await h.api(`/api/businesses/${id}`, { method: "DELETE", token: vendorToken });
  h.assertStatus(eliminar.status, 403, "vendedor no elimina");
  h.assert(eliminar.json.code === "ELIMINAR_NO_PERMITIDO", "código ELIMINAR_NO_PERMITIDO");

  for (const ruta of ["/api/admin/negocios", `/api/admin/negocios/${id}`, `/api/admin/negocios/${id}/estado`]) {
    h.assertStatus((await h.api(ruta, { token: vendorToken })).status, 403, `vendedor sin acceso a ${ruta}`);
  }
  h.assertStatus(
    (await h.api("/api/admin/negocios", {
      method: "POST", token: vendorToken,
      body: { nombre: `Escalado ${sufijo}`, category_id: CATEGORIA_SIN_PRECIO, moneda: "COP" },
    })).status,
    403,
    "vendedor no crea por ruta admin"
  );
  h.assertStatus(
    (await h.api(`/api/admin/negocios/${id}`, { method: "DELETE", token: vendorToken })).status,
    403,
    "vendedor no elimina por ruta admin"
  );
  h.assert(Boolean(vendorEmail), "usuario vendedor preparado");
  h.assert(Boolean(adminToken), "token admin disponible");
});

h.test("ADMIN-CRUD 08: turista y petición anónima sin acceso", async () => {
  const { touristToken, negocioId } = ctx();
  const rutas = [
    ["GET", "/api/admin/negocios"],
    ["POST", "/api/admin/negocios"],
    ["GET", `/api/admin/negocios/${negocioId}`],
    ["PUT", `/api/admin/negocios/${negocioId}`],
    ["PUT", `/api/admin/negocios/${negocioId}/estado`],
    ["DELETE", `/api/admin/negocios/${negocioId}`],
  ];
  for (const [method, ruta] of rutas) {
    h.assertStatus(
      (await h.api(ruta, { method, token: touristToken, body: method === "PUT" ? { estado: "approved" } : undefined })).status,
      403,
      `turista sin acceso: ${method} ${ruta}`
    );
    h.assertStatus((await h.api(ruta, { method })).status, 401, `anónimo sin acceso: ${method} ${ruta}`);
  }
});

h.test("ADMIN-CRUD 09: petición HTTP manipulada no escala permisos", async () => {
  const { adminToken, negocioId, vendorToken, vendorId } = ctx();
  const partes = adminToken.split(".");
  h.assert(partes.length === 3, "JWT con tres segmentos");
  partes[2] = (partes[2][0] === "A" ? "B" : "A") + partes[2].slice(1);
  const manipulado = partes.join(".");
  h.assertStatus((await h.api("/api/admin/negocios", { token: manipulado })).status, 401, "JWT manipulado -> 401");

  // Escalado por cuerpo: el vendedor intenta otorgarse rol y propiedad.
  const escalado = await h.api(`/api/businesses/${ctx().negocioVendedorId}`, {
    method: "PUT",
    token: vendorToken,
    body: { descripcion: "intento", owner_id: vendorId, rol_id: 0, is_verified: true },
  });
  h.assertStatus(escalado.status, 400, "campos de escalada rechazados");
  h.assertMsg(escalado.json, "Campos no permitidos");

  // Un ADMIN no puede inyectar un propietario ajeno ni offsets de BD.
  const inyeccion = await h.api(`/api/admin/negocios/${negocioId}`, {
    method: "PUT",
    token: adminToken,
    body: { owner_id: vendorId, owner_email: "x@test.com", created_at: "2000-01-01" },
  });
  h.assertStatus(inyeccion.status, 400, "ADMIN no puede inyectar propietario");

  const estadoInvalido = await h.api(`/api/admin/negocios/${negocioId}/estado`, {
    method: "PUT", token: adminToken, body: { estado: "super-admin" },
  });
  h.assertStatus(estadoInvalido.status, 400, "estado arbitrario rechazado");
});

h.test("ADMIN-CRUD 10: eliminar archiva y desaparece de consultas públicas", async () => {
  const { adminToken, negocioId } = ctx();
  const conteo = async () => (await h.q(
    `SELECT
       (SELECT COUNT(*)::int FROM reviews WHERE business_id = $1) AS resenas,
       (SELECT COUNT(*)::int FROM business_images WHERE business_id = $1) AS imagenes,
       (SELECT COUNT(*)::int FROM favorite_negocios WHERE business_id = $1) AS favoritos,
       (SELECT COUNT(*)::int FROM subscriptions WHERE business_id = $1) AS suscripciones,
       (SELECT COUNT(*)::int FROM suscripcion_pagos sp
          JOIN subscriptions s ON s.id = sp.suscripcion_id WHERE s.business_id = $1) AS pagos`,
    [negocioId]
  )).rows[0];
  ctx().conteosAntes = await conteo();

  const res = await h.api(`/api/admin/negocios/${negocioId}`, {
    method: "DELETE", token: adminToken, body: { motivo: "Prueba automatizada de archivado" },
  });
  h.assertStatus(res.status, 200, "eliminar negocio ADMIN");
  h.assert(Boolean(res.json.data?.eliminado_at), "respuesta informa eliminado_at");

  const detalle = await h.api(`/api/admin/negocios/${negocioId}`, { token: adminToken });
  h.assert(Boolean(detalle.json.data.eliminado_at), "queda registrado eliminado_at");
  h.assert(detalle.json.data.eliminado_por === ctx().adminId, "eliminado_por es el ADMIN");

  h.assertStatus((await h.api(`/api/businesses/${negocioId}`)).status, 404, "detalle público -> 404");
  const publicas = await h.api("/api/businesses");
  h.assert(!publicas.json.data.some((n) => n.id === negocioId), "no aparece en el listado público");
  const porDestino = await h.api("/api/lugares");
  h.assertStatus(porDestino.status, 200, "catálogo público sigue respondiendo");

  const archivados = await h.api("/api/admin/negocios?archivados=solo", { token: adminToken });
  h.assert(archivados.json.data.some((n) => n.id === negocioId), "aparece en filtro de archivados");
  const vigentes = await h.api("/api/admin/negocios?archivados=no", { token: adminToken });
  h.assert(!vigentes.json.data.some((n) => n.id === negocioId), "no aparece entre vigentes");
});

h.test("ADMIN-CRUD 11: relaciones y pagos intactos tras el archivado", async () => {
  const { negocioId } = ctx();
  const conteo = (await h.q(
    `SELECT
       (SELECT COUNT(*)::int FROM reviews WHERE business_id = $1) AS resenas,
       (SELECT COUNT(*)::int FROM business_images WHERE business_id = $1) AS imagenes,
       (SELECT COUNT(*)::int FROM favorite_negocios WHERE business_id = $1) AS favoritos,
       (SELECT COUNT(*)::int FROM subscriptions WHERE business_id = $1) AS suscripciones,
       (SELECT COUNT(*)::int FROM suscripcion_pagos sp
          JOIN subscriptions s ON s.id = sp.suscripcion_id WHERE s.business_id = $1) AS pagos`,
    [negocioId]
  )).rows[0];
  for (const clave of Object.keys(conteo)) {
    h.assert(conteo[clave] === ctx().conteosAntes[clave], `${clave} conservado tras archivar`);
    h.assert(conteo[clave] >= 1, `${clave} tenía datos antes de archivar`);
  }
  const fila = await h.q("SELECT id, eliminado_at FROM businesses WHERE id = $1", [negocioId]);
  h.assert(fila.rows.length === 1, "la fila del negocio NO se borró físicamente");

  const detalle = await h.api(`/api/admin/negocios/${negocioId}`, { token: ctx().adminToken });
  h.assert(detalle.json.data.relaciones.pagos >= 1, "el detalle ADMIN sigue mostrando pagos");
});

h.test("ADMIN-CRUD 12: restaurar, proteger en BD y conservar funciones admin", async () => {
  const { adminToken, negocioId, vendorId } = ctx();
  const restaurar = await h.api(`/api/admin/negocios/${negocioId}/restaurar`, {
    method: "POST", token: adminToken,
  });
  h.assertStatus(restaurar.status, 200, "restaurar negocio");
  const detalle = await h.api(`/api/admin/negocios/${negocioId}`, { token: adminToken });
  h.assert(detalle.json.data.eliminado_at === null, "eliminado_at limpio tras restaurar");
  h.assertStatus((await h.api(`/api/businesses/${negocioId}`)).status, 200, "volvio a ser público");

  // Protección en base de datos: ni un SQL directo ni una función llamada
  // con un rol distinto de ADMIN pueden tocar el archivado.
  let errorDirecto = null;
  try {
    await h.q(
      "UPDATE businesses SET eliminado_at = NOW(), eliminado_por = $2 WHERE id = $1",
      [negocioId, ctx().adminId]
    );
  } catch (error) {
    errorDirecto = error;
  }
  h.assert(errorDirecto?.code === "42501", "trigger BD bloquea UPDATE directo de archivado");

  let errorFuncion = null;
  try {
    await h.q("SELECT fn_archivar_negocio_admin($1, $2, NULL)", [negocioId, vendorId]);
  } catch (error) {
    errorFuncion = error;
  }
  h.assert(errorFuncion?.code === "42501", "función BD exige rol ADMIN");

  // Las funciones administrativas preexistentes siguen operativas.
  h.assertStatus((await h.api("/api/admin/stats", { token: adminToken })).status, 200, "stats admin");
  h.assertStatus((await h.api("/api/admin/vendedores", { token: adminToken })).status, 200, "vendedores admin");
  h.assertStatus((await h.api("/api/admin/login-history", { token: adminToken })).status, 200, "historial admin");
});
