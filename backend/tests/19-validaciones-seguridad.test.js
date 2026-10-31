// ============================================================
// 19-validaciones-seguridad.test.js
//
// Cubre los hallazgos de la auditoría que no estaban protegidos por
// las suites anteriores:
//   * Validación estricta de nombres, emails y contraseñas.
//   * Números finitos, acotados y con precisión decimal.
//   * Reseñas SOLO en negocios aprobados (backend, no UI).
//   * El dueño no puede reseñar su propio negocio.
//   * Puntuaciones enteras 1-5 y promedio calculado por el backend.
//   * Aprobación de negocios exclusiva del ADMIN (sin recrear datos).
//   * El email del propietario no se filtra en la ficha pública.
//   * Rate limiting con HTTP 429 y cabecera Retry-After.
// ============================================================
const h = require("./helpers");
const express = require("express");
const http = require("http");
const validators = require("../src/utils/validators");
const { crearLimitador } = require("../src/middlewares/rateLimit");

const ADMIN_PASS = h.ADMIN_PASSWORD;
const PASS = "Test1234x!";

function assert400(r, msg) {
  h.assertStatus(r.status, 400, msg);
  h.assert(r.json.success === false, `${msg}: success=false`);
}

// ------------------------------------------------------------------
// Utilidades del flujo
// ------------------------------------------------------------------
async function crearNegocio(token, body, etiqueta) {
  const r = await h.api("/api/businesses", { method: "POST", token, body });
  h.assertStatus(r.status, 201, `crear negocio: ${etiqueta}`);
  return r.json.data;
}

async function cambiarEstado(adminToken, id, estado) {
  return h.api(`/api/businesses/${id}/estado`, {
    method: "PUT",
    token: adminToken,
    body: { estado },
  });
}

// ------------------------------------------------------------------
// 1. Setup de usuarios
// ------------------------------------------------------------------
h.test("SEG: setup de usuarios para validaciones y reseñas", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");

  h.test.sec = {
    adminToken: admin.token,
    bizIds: [],
    userIds: [],
    seller1: null,
    seller2: null,
    tourist1: null,
    tourist2: null,
  };

  const definiciones = [
    ["seller1", "Vendedor Seguridad", "f21test.sec.seller1", 2],
    ["seller2", "Vendedora Seguridad", "f21test.sec.seller2", 2],
    ["tourist1", "Turista Seguridad", "f21test.sec.tourist1", 1],
    ["tourist2", "Turista Dos Seguridad", "f21test.sec.tourist2", 1],
  ];

  for (const [clave, nombre, prefijo, rol] of definiciones) {
    const email = h.repo(prefijo);
    const creado = await h.createUser(admin.token, {
      nombre,
      email,
      password: PASS,
      rol_id: rol,
    });
    h.assertStatus(creado.status, 201, `crear ${clave}`);
    h.test.sec.userIds.push(creado.json.data.id);

    const sesion = await h.login(email, PASS);
    h.assertStatus(sesion.status, 200, `login ${clave}`);
    h.test.sec[clave] = {
      token: sesion.token,
      usuario: sesion.usuario,
      email,
    };
  }
});

// ------------------------------------------------------------------
// 2. Validadores unitarios (casos límite)
// ------------------------------------------------------------------
h.test("SEG: validadores de nombres, emails, contraseñas y números", async () => {
  // Nombres de persona: letras Unicode, tildes, ñ, espacios, guiones y
  // apóstrofos. Nada de dígitos, controles ni cadenas vacías.
  for (const nombre of ["María José", "Núñez", "O'Connor", "Jean-Luc", "D'Angelo", "Ana"]) {
    h.assert(validators.isValidPersonName(nombre), `nombre válido: ${nombre}`);
  }
  for (const nombre of ["Ana123", "12345", "   ", "A", "a".repeat(101), "José\nPérez", "José--Pérez"]) {
    h.assert(!validators.isValidPersonName(nombre), `nombre inválido: ${JSON.stringify(nombre)}`);
  }
  // Los espacios internos sí se normalizan; los extremos no invalidan.
  h.assert(validators.isValidPersonName("  María   José  "), "nombre con espacios sobrantes se normaliza");

  // Nombres comerciales: los dígitos SÍ están permitidos.
  h.assert(validators.isValidBusinessName("Hotel 5 Estrellas"), "negocio con dígitos");
  h.assert(!validators.isValidBusinessName("   "), "negocio solo espacios inválido");
  h.assert(!validators.isValidBusinessName("!!!"), "negocio solo signos inválido");

  // Email.
  for (const email of ["persona@example.com", "A@B.CO", "nombre.apellido@sub.dominio.co"]) {
    h.assert(validators.isEmail(email), `email válido: ${email}`);
  }
  for (const email of ["sin-arroba", "a@b", "a@b.c", "a..b@test.com", ".a@test.com", "a b@test.com", "a".repeat(250) + "@test.com"]) {
    h.assert(!validators.isEmail(email), `email inválido: ${JSON.stringify(email)}`);
  }

  // Contraseña: mínimo 6 caracteres, máximo 72 BYTES de bcrypt y sin controles.
  h.assert(validators.validatePassword("12345") !== null, "contraseña corta rechazada");
  h.assert(validators.validatePassword("a".repeat(72)) === null, "72 bytes ASCII válidos");
  h.assert(validators.validatePassword("a".repeat(73)) !== null, "73 bytes ASCII rechazados");
  h.assert(validators.validatePassword("ñ".repeat(37)) !== null, "más de 72 bytes UTF-8 rechazados");
  h.assert(validators.validatePassword("Clave\u0001Segura") !== null, "caracter de control rechazado");
  h.assert(validators.validatePassword(123456) !== null, "contraseña no textual rechazada");

  // Enteros estrictos: sin booleanos, decimales, NaN ni texto no numérico.
  h.assert(validators.parseInteger(4, { min: 1, max: 5 }) === 4, "entero válido");
  h.assert(validators.parseInteger("4", { min: 1, max: 5 }) === 4, "entero en texto válido");
  for (const valor of [4.5, true, false, null, "4.5", "4.0", "abc", NaN, Infinity]) {
    h.assert(validators.parseInteger(valor, { min: 1, max: 5 }) === null, `entero inválido: ${String(valor)}`);
  }
  h.assert(validators.parseInteger(0, { min: 1, max: 5 }) === null, "entero fuera de rango");

  // Decimales finitos, acotados y con máximo 2 decimales.
  h.assert(validators.parseDecimal("10.50", { min: 0, max: 100 }) === 10.5, "decimal válido");
  h.assert(validators.parseDecimal(0, { min: 0, max: 100 }) === 0, "cero válido");
  for (const valor of ["10.555", -1, "abc", "1e2", true, [], {}, NaN, Infinity]) {
    h.assert(Number.isNaN(validators.parseDecimal(valor, { min: 0, max: 100 })), `decimal inválido: ${String(valor)}`);
  }
  h.assert(Number.isNaN(validators.parseDecimal(100000000, { min: 0, max: 99999999.99 })), "decimal fuera de rango");

  // Fechas reales (no desbordan al mes siguiente).
  h.assert(!validators.isValidDateOnly("2026-02-29"), "2026 no es bisiesto");
  h.assert(validators.isValidDateOnly("2028-02-29"), "2028 sí es bisiesto");
  h.assert(!validators.isValidDateOnly("2026-13-01"), "mes inválido");

  // Teléfonos y URLs.
  h.assert(validators.isValidPhone("+57 (300) 123-4567"), "teléfono válido");
  h.assert(!validators.isValidPhone("123"), "teléfono con pocos dígitos");
  h.assert(!validators.isValidPhone("abc1234567"), "teléfono con letras");
  h.assert(validators.isValidHttpUrl("https://example.com/ruta"), "URL https válida");
  for (const url of ["javascript:alert(1)", "data:text/html,hola", "ftp://example.com", "https://user:pass@example.com", "no-es-url"]) {
    h.assert(!validators.isValidHttpUrl(url), `URL inválida: ${url}`);
  }

  // Texto con controles no imprimibles.
  h.assert(Boolean(validators.validarTexto("ok\u0001mal", { multiline: true }).error), "control rechazado");
});

// ------------------------------------------------------------------
// 3. Registro público: nombre/email/contraseña y normalización
// ------------------------------------------------------------------
h.test("SEG: registro público valida nombre, email y contraseña", async () => {
  const email = h.repo("f21test.sec.registro");
  const emailMayusculas = email.toUpperCase();

  const creado = await h.api("/api/auth/register", {
    method: "POST",
    body: {
      nombre: "  María   José Núñez  ",
      email: emailMayusculas,
      // Deliberadamente con espacios al inicio/final: NO deben recortarse.
      password: " ClaveSegura123 ",
      rol: "TOURIST",
    },
  });
  h.assertStatus(creado.status, 201, "registro con nombre válido");
  h.assert(creado.json.data.usuario.email === email, "email normalizado a minúsculas");
  h.assert(creado.json.data.usuario.nombre === "María José Núñez", "nombre normalizado");
  h.assert(!JSON.stringify(creado.json).includes("ClaveSegura123"), "no se devuelve la contraseña");
  h.test.sec.userIds.push(creado.json.data.usuario.id);

  // La contraseña se guarda tal cual (con espacios): el login con la
  // versión recortada no debe funcionar, y con la exacta sí.
  h.assertStatus((await h.api("/api/auth/logout", {
    method: "POST", token: creado.json.data.token,
  })).status, 200, "logout del registro");

  const recortada = await h.api("/api/auth/login", {
    method: "POST", body: { email, password: "ClaveSegura123" },
  });
  h.assertStatus(recortada.status, 401, "la contraseña no se recorta");

  const exacta = await h.api("/api/auth/login", {
    method: "POST", body: { email, password: " ClaveSegura123 " },
  });
  h.assertStatus(exacta.status, 200, "login con la contraseña exacta");
  h.assertStatus((await h.api("/api/auth/logout", {
    method: "POST", token: exacta.json.data.token,
  })).status, 200, "logout final");

  // Duplicado insensible a mayúsculas.
  const duplicado = await h.api("/api/auth/register", {
    method: "POST",
    body: { nombre: "María José Núñez", email: emailMayusculas, password: PASS, rol: "TOURIST" },
  });
  h.assertStatus(duplicado.status, 409, "email duplicado 409");
  h.assertMsg(duplicado.json, "ya está registrado");

  // Nombres inválidos representativos.
  for (const nombre of ["Ana123", "   ", "A"]) {
    const r = await h.api("/api/auth/register", {
      method: "POST",
      body: { nombre, email: h.repo("f21test.sec.nombre"), password: PASS, rol: "TOURIST" },
    });
    assert400(r, `nombre inválido en registro: ${JSON.stringify(nombre)}`);
  }

  // Emails inválidos representativos.
  for (const emailMalo of ["sin-arroba", "a@b"]) {
    const r = await h.api("/api/auth/register", {
      method: "POST",
      body: { nombre: "Registro Inválido", email: emailMalo, password: PASS, rol: "TOURIST" },
    });
    assert400(r, `email inválido en registro: ${emailMalo}`);
    h.assertMsg(r.json, "Email");
  }

  // Contraseñas inválidas: corta y por encima del límite de bcrypt.
  for (const password of ["12345", "a".repeat(73)]) {
    const r = await h.api("/api/auth/register", {
      method: "POST",
      body: { nombre: "Registro Inválido", email: h.repo("f21test.sec.password"), password, rol: "TOURIST" },
    });
    assert400(r, "contraseña inválida en registro");
    h.assertMsg(r.json, "contraseña");
  }
});

// ------------------------------------------------------------------
// 4. Creación administrativa de usuarios: mismas reglas, sin rate limit
// ------------------------------------------------------------------
h.test("SEG: la creación administrativa aplica las mismas validaciones", async () => {
  const token = h.test.sec.adminToken;
  const base = {
    nombre: "Usuario Válido",
    email: h.repo("f21test.sec.admin"),
    password: PASS,
    rol_id: 1,
  };

  assert400(await h.api("/api/usuarios", {
    method: "POST", token, body: { ...base, nombre: "Usuario123" },
  }), "admin: nombre con dígitos");

  assert400(await h.api("/api/usuarios", {
    method: "POST", token, body: { ...base, email: "correo-invalido" },
  }), "admin: email inválido");

  assert400(await h.api("/api/usuarios", {
    method: "POST", token, body: { ...base, password: "12345" },
  }), "admin: contraseña corta");

  assert400(await h.api("/api/usuarios", {
    method: "POST", token, body: { ...base, password: "a".repeat(73) },
  }), "admin: contraseña demasiado larga");

  assert400(await h.api("/api/usuarios", {
    method: "POST", token, body: { ...base, rol_id: 1.5 },
  }), "admin: rol decimal inválido");

  const duplicado = await h.api("/api/usuarios", {
    method: "POST",
    token,
    body: { ...base, email: h.test.sec.tourist1.email.toUpperCase() },
  });
  h.assertStatus(duplicado.status, 409, "admin: email duplicado insensible a mayúsculas");
});

// ------------------------------------------------------------------
// 5. Negocios: números, URLs, teléfonos y nombres comerciales
// ------------------------------------------------------------------
h.test("SEG: los valores numéricos inválidos se rechazan al crear negocios", async () => {
  const token = h.test.sec.seller1.token;
  const base = { nombre: "Negocio Validación Numérica", category_id: 1 };

  const casos = [
    [{ precio_min: -1 }, "precio negativo"],
    [{ precio_min: "abc" }, "precio no numérico"],
    [{ precio_min: "10.555" }, "precio con 3 decimales"],
    [{ precio_min: 100000000 }, "precio fuera de DECIMAL(10,2)"],
    [{ precio_min: 10, precio_max: 5 }, "rango de precios invertido"],
    [{ lat: 91 }, "latitud fuera de rango"],
    [{ lng: -181 }, "longitud fuera de rango"],
    [{ telefono: "123" }, "teléfono con pocos dígitos"],
    [{ email_contacto: "no-es-email" }, "email de contacto inválido"],
    [{ website: "javascript:alert(1)" }, "URL no http/https"],
    [{ descripcion: "texto\u0001inválido" }, "carácter de control"],
    [{ nombre: "   " }, "nombre vacío"],
    [{ nombre: "a".repeat(201) }, "nombre demasiado largo"],
  ];

  for (const [extra, etiqueta] of casos) {
    const r = await h.api("/api/businesses", {
      method: "POST",
      token,
      body: { ...base, ...extra },
    });
    assert400(r, etiqueta);
  }

  // Los nombres comerciales con dígitos y los decimales válidos sí se aceptan.
  const valido = await crearNegocio(token, {
    nombre: "Hotel 5 Estrellas",
    category_id: 1,
    precio_min: "0",
    precio_max: "10.50",
  }, "nombre con dígitos y precio decimal válido");
  h.assert(valido.nombre === "Hotel 5 Estrellas", "nombre comercial conservado");
  h.assert(Number(valido.precio_max) === 10.5, "precio decimal conservado");
  h.test.sec.bizIds.push(valido.id);
});

// ------------------------------------------------------------------
// 6. Reseñas: aprobación, propiedad y puntuación
// ------------------------------------------------------------------
h.test("SEG: solo negocios aprobados reciben reseñas (backend)", async () => {
  const { adminToken, seller1, seller2, tourist1 } = h.test.sec;

  const negocio = await crearNegocio(seller1.token, {
    nombre: "Negocio Aprobación Reseñas",
    category_id: 1,
    descripcion: "Creado para probar la aprobación",
  }, "negocio para estados");
  h.test.sec.bizId = negocio.id;
  h.test.sec.bizIds.push(negocio.id);
  h.assert(negocio.estado === "pending", "nace en pending");

  // Un negocio pendiente no es visible públicamente.
  h.assertStatus((await h.api(`/api/businesses/${negocio.id}`)).status, 404, "detalle público de pendiente 404");
  h.assertStatus((await h.api(`/api/reviews/business/${negocio.id}`)).status, 404, "reseñas públicas de pendiente 404");

  // Solo el ADMIN cambia el estado: ni el dueño ni otro vendedor ni un turista.
  h.assertStatus((await cambiarEstado(seller1.token, negocio.id, "approved")).status, 403, "el dueño no aprueba su negocio");
  h.assertStatus((await cambiarEstado(seller2.token, negocio.id, "approved")).status, 403, "otro vendedor no aprueba");
  h.assertStatus((await cambiarEstado(tourist1.token, negocio.id, "approved")).status, 403, "un turista no aprueba");

  // Estados no aprobados: ninguna reseña nueva, ni siquiera de un turista.
  const pendiente = await h.api(`/api/reviews/business/${negocio.id}`, {
    method: "POST", token: tourist1.token, body: { rating: 5, comment: "No debería entrar" },
  });
  h.assertStatus(pendiente.status, 409, "reseña en pending rechazada");
  h.assertMsg(pendiente.json, "aprobado");
  h.assert(Array.isArray(h.test.sec.bizIds) && pendiente.json.success === false, "respuesta de error coherente");

  for (const estado of ["rejected", "suspended", "inactive"]) {
    h.assertStatus((await cambiarEstado(adminToken, negocio.id, estado)).status, 200, `admin cambia a ${estado}`);
    const r = await h.api(`/api/reviews/business/${negocio.id}`, {
      method: "POST", token: tourist1.token, body: { rating: 5, comment: `No en ${estado}` },
    });
    h.assertStatus(r.status, 409, `reseña en ${estado} rechazada`);
    h.assertMsg(r.json, "aprobado");
  }
});

h.test("SEG: aprobación del ADMIN sin recrear datos y sin filtrar el email", async () => {
  const { adminToken, seller1, tourist1 } = h.test.sec;
  const id = h.test.sec.bizId;

  const aprobado = await cambiarEstado(adminToken, id, "approved");
  h.assertStatus(aprobado.status, 200, "el ADMIN aprueba");
  h.assert(Number(aprobado.json.data.id) === Number(id), "se conserva el mismo negocio");
  h.assert(aprobado.json.data.estado === "approved", "estado approved");

  // Ficha pública: sin email del propietario. Ficha admin: sí lo incluye.
  const publica = await h.api(`/api/businesses/${id}`);
  h.assertStatus(publica.status, 200, "ficha pública del aprobado");
  h.assert(Number(publica.json.data.owner_id) === Number(seller1.usuario.id), "se conserva el dueño");
  h.assert(!("owner_email" in publica.json.data), "la ficha pública no filtra owner_email");
  h.assert(!("owner_email" in (publica.json.data.owner || {})), "tampoco anidado");

  const adminVista = await h.api(`/api/businesses/${id}`, { token: adminToken });
  h.assertStatus(adminVista.status, 200, "ficha como ADMIN");
  h.assert(typeof adminVista.json.data.owner_email === "string", "el ADMIN sí ve el email del dueño");

  // El dueño no puede reseñar su propio negocio.
  const propia = await h.api(`/api/reviews/business/${id}`, {
    method: "POST", token: seller1.token, body: { rating: 5, comment: "Mi propio negocio" },
  });
  h.assertStatus(propia.status, 403, "el dueño no reseña su negocio");
  h.assertMsg(propia.json, "propio");

  // La siguiente prueba demuestra que el turista SÍ puede reseñar tras la
  // aprobación. Aquí basta comprobar que la aprobación no recreó el negocio.
  h.assert(tourist1.usuario.rol === "TOURIST", "el turista conserva su rol");
});

h.test("SEG: rating estricto 1-5, comentario acotado y promedio correcto", async () => {
  const { tourist1, tourist2 } = h.test.sec;
  const id = h.test.sec.bizId;

  // Puntuaciones inválidas: fuera de rango, decimales, texto, booleanos,
  // null y ausencia total del campo. Todas deben ser 400, nunca 500.
  for (const rating of [0, 6, 4.5, "4.5", true, null]) {
    const r = await h.api(`/api/reviews/business/${id}`, {
      method: "POST", token: tourist1.token, body: { rating, comment: "inválida" },
    });
    assert400(r, `rating inválido: ${String(rating)}`);
    h.assertMsg(r.json, "entero entre 1 y 5");
  }
  assert400(await h.api(`/api/reviews/business/${id}`, {
    method: "POST", token: tourist1.token, body: { comment: "sin rating" },
  }), "rating ausente");

  // Comentario por encima del límite: se rechaza, no se trunca.
  const largo = "x".repeat(2001);
  const comentario = await h.api(`/api/reviews/business/${id}`, {
    method: "POST", token: tourist1.token, body: { rating: 5, comment: largo },
  });
  assert400(comentario, "comentario mayor a 2000");
  h.assertMsg(comentario.json, "2000");

  // Reseña válida y promedio calculado por el backend.
  const primera = await h.api(`/api/reviews/business/${id}`, {
    method: "POST", token: tourist1.token, body: { rating: 4, comment: "Muy buena experiencia" },
  });
  h.assertStatus(primera.status, 201, "primera reseña válida");
  h.assert(primera.json.data.review.rating === 4, "rating 4 guardado");
  h.test.sec.review1 = primera.json.data.review;

  const dup = await h.api(`/api/reviews/business/${id}`, {
    method: "POST", token: tourist1.token, body: { rating: 5, comment: "Duplicada" },
  });
  h.assertStatus(dup.status, 409, "duplicado 409");

  const segunda = await h.api(`/api/reviews/business/${id}`, {
    method: "POST", token: tourist2.token, body: { rating: 5, comment: "Excelente" },
  });
  h.assertStatus(segunda.status, 201, "segunda reseña válida");
  h.test.sec.review2 = segunda.json.data.review;

  const lista = await h.api(`/api/reviews/business/${id}`);
  h.assertStatus(lista.status, 200, "listar reseñas");
  h.assert(lista.json.data.cantidad === 2, "cantidad 2");
  h.assert(Number(lista.json.data.promedio) === 4.5, `promedio 4.5 (fue ${lista.json.data.promedio})`);
  h.assert(lista.json.data.resenas.length === 2, "2 reseñas visibles");

  // Edición: también valida el rating y recalcula el promedio.
  const edicionMala = await h.api(`/api/reviews/${h.test.sec.review1.id}`, {
    method: "PUT", token: tourist1.token, body: { rating: 0 },
  });
  assert400(edicionMala, "rating inválido en edición");

  const edicion = await h.api(`/api/reviews/${h.test.sec.review1.id}`, {
    method: "PUT", token: tourist1.token, body: { rating: 5, comment: "Actualizada" },
  });
  h.assertStatus(edicion.status, 200, "edición válida");
  h.assert(edicion.json.data.review.rating === 5, "rating actualizado");
  h.assert(Number(edicion.json.data.promedio) === 5, "promedio recalculado a 5");

  // Un usuario sin sesión no puede crear reseñas.
  h.assertStatus((await h.api(`/api/reviews/business/${id}`, {
    method: "POST", body: { rating: 5 },
  })).status, 401, "crear reseña sin sesión 401");
});

// ------------------------------------------------------------------
// 7. Rate limiting: 429 + Retry-After
// ------------------------------------------------------------------
h.test("SEG: el limitador responde 429 con Retry-After", async () => {
  const app = express();
  app.get(
    "/limitado",
    crearLimitador({
      windowMs: 60 * 1000,
      max: 2,
      message: "Demasiadas solicitudes de prueba.",
    }),
    (_req, res) => res.json({ ok: true })
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    const respuestas = [];
    for (let i = 0; i < 3; i++) {
      const r = await fetch(`http://127.0.0.1:${port}/limitado`);
      respuestas.push({
        status: r.status,
        retryAfter: r.headers.get("retry-after"),
        body: await r.json(),
      });
    }

    h.assert(respuestas[0].status === 200 && respuestas[1].status === 200, "las 2 primeras pasan");
    const bloqueada = respuestas[2];
    h.assert(bloqueada.status === 429, `la tercera es 429 (fue ${bloqueada.status})`);
    h.assert(
      typeof bloqueada.retryAfter === "string" && Number(bloqueada.retryAfter) >= 1,
      `Retry-After presente y positivo (fue ${bloqueada.retryAfter})`
    );
    h.assert(bloqueada.body.success === false, "cuerpo de error");
    h.assert(bloqueada.body.code === "RATE_LIMITED", "código RATE_LIMITED");
    h.assertMsg(bloqueada.body, "Demasiadas solicitudes");
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    });
  }
});

// ------------------------------------------------------------------
// 8. Limpieza
// ------------------------------------------------------------------
h.test("SEG: limpieza de datos de la suite", async () => {
  const { adminToken, bizIds, userIds } = h.test.sec;
  for (const id of bizIds) {
    const r = await h.api(`/api/businesses/${id}`, { method: "DELETE", token: adminToken });
    h.assert(r.status === 200 || r.status === 404, `borrar negocio ${id} (status ${r.status})`);
  }
  for (const id of userIds) {
    const r = await h.api(`/api/usuarios/${id}`, { method: "DELETE", token: adminToken });
    h.assert(r.status === 200 || r.status === 404, `borrar usuario ${id} (status ${r.status})`);
  }
  h.assert((await h.countAdmins()) >= 1, "sigue habiendo al menos un admin");
});
