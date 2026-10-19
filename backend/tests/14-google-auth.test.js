/**
 * Pruebas del flujo POST /api/auth/google (backend).
 *
 * Consola: `node tests/14-google-auth.test.js`
 *
 * Usa un doble del cliente OAuth (no llama a Google) y dobles de los modelos
 * para verificar la logica completa del controlador, incluyendo los escenarios
 * obligatorios:
 *   - token ausente (400), token invalido/caducado (401)
 *   - GOOGLE_CLIENT_ID sin configurar (503)
 *   - usuario nuevo de Google (crea con el rol publico permitido)
 *   - usuario existente con google_id (reutiliza, no duplica)
 *   - usuario existente local por email (vincula conservando rol y datos)
 *   - politica de sesion activa (403) y usuario sin rol (401)
 *   - error inesperado (500) y formato de respuesta exitosa
 *
 * No toca la base de datos ni modifica usuarios reales.
 */
const path = require("path");

// Carga el entorno del backend antes de importar los servicios (el modulo
// googleAuth lee GOOGLE_CLIENT_ID al cargarse, igual que en produccion).
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

if (!process.env.GOOGLE_CLIENT_ID) {
  process.env.GOOGLE_CLIENT_ID = "cid-de-prueba.apps.googleusercontent.com";
}

const googleAuth = require("../src/services/googleAuth");
const authController = require("../src/controllers/authController");
const UsuarioModel = require("../src/models/usuarioModel");
const LoginModel = require("../src/models/loginModel");
const jwtUtils = require("../src/utils/jwt");

// ---------- utilidades de prueba ----------
let pass = 0;
let fail = 0;

async function check(nombre, fn) {
  try {
    await fn();
    console.log(`  ✓ ${nombre}`);
    pass++;
  } catch (e) {
    console.error(`  ✗ ${nombre}\n      ${e.message}`);
    fail++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEqual(a, b, msg) {
  assert(a === b, `${msg} (recibido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)})`);
}

function mockResponse() {
  const res = { statusCode: 200 };
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (obj) {
    res.body = obj;
    return res;
  };
  return res;
}

function mockRequest(body) {
  return {
    body,
    headers: { "user-agent": "pruebas-cordalia", "x-forwarded-for": "127.0.0.1" },
    socket: { remoteAddress: "127.0.0.1" },
  };
}

function payloadValido(overrides = {}) {
  return {
    sub: "google-sub-123",
    email: "viajero@pruebas.test",
    email_verified: true,
    name: "Viajero Prueba",
    picture: "https://ejemplo.test/foto.png",
    aud: "cid-de-prueba.apps.googleusercontent.com",
    ...overrides,
  };
}

/**
 * Simula la verificacion exitosa de Google inyectando un cliente OAuth falso
 * (evita llamar a Google y no toca la libreria real).
 */
function googleResponde(payload) {
  googleAuth.__setOAuthClientParaPruebas({
    verifyIdToken: async () => ({ getPayload: () => payload }),
  });
}

function googleFalla(mensaje) {
  googleAuth.__setOAuthClientParaPruebas({
    verifyIdToken: async () => {
      throw new Error(mensaje);
    },
  });
}

/** Deja el servicio en el estado "GOOGLE_CLIENT_ID no configurado". */
function googleSinConfigurar() {
  googleAuth.__setOAuthClientParaPruebas(null);
}

// ---------- dobles de modelos ----------
  const originales = {
  findByGoogleId: UsuarioModel.findByGoogleId,
  findByEmail: UsuarioModel.findByEmail,
  findById: UsuarioModel.findById,
  create: UsuarioModel.create,
  update: UsuarioModel.update,
  setToken: UsuarioModel.setToken,
  clearToken: UsuarioModel.clearToken,
  loginRegistrar: LoginModel.registrar,
};
const originalJwt = jwtUtils.generarToken;

let llamadas = {};

function instalarDobles(opciones = {}) {
  llamadas = { create: [], update: [], setToken: [], clearToken: [], login: [], generarToken: [] };

  // Estado por defecto: Google no tiene credencial valida (nunca se llama a la red).
  googleFalla("no configurado en la prueba");

  UsuarioModel.findByGoogleId = async (googleId) => opciones.porGoogleId || null;
  UsuarioModel.findByEmail = async (email) => {
    if (opciones.porEmail === undefined) return null;
    return opciones.porEmail;
  };
  UsuarioModel.findById = async (id) => opciones.porId || null;
  UsuarioModel.create = async (nombre, email, hashed, rol_id, opt) => {
    llamadas.create.push({ nombre, email, hashed, rol_id, opt });
    const creado = {
      id: 999,
      nombre,
      email,
      rol_id,
      avatar_url: opt?.avatar_url || null,
      proveedor: opt?.proveedor || "local",
      google_id: opt?.google_id || null,
      token_activo: null,
    };
    return creado;
  };
  UsuarioModel.update = async (id, fields) => {
    llamadas.update.push({ id, fields });
    return { id, ...fields };
  };
  UsuarioModel.setToken = async (id, token) => {
    llamadas.setToken.push({ id, token: Boolean(token) });
  };
  UsuarioModel.clearToken = async (id) => {
    llamadas.clearToken.push({ id });
  };
  LoginModel.registrar = async (usuarioId, exito) => {
    llamadas.login.push({ usuarioId, exito });
    return {};
  };
  jwtUtils.generarToken = (id, rol) => {
    llamadas.generarToken.push({ id, rol });
    return "jwt.de.prueba";
  };
}

function restaurarDobles() {
  UsuarioModel.findByGoogleId = originales.findByGoogleId;
  UsuarioModel.findByEmail = originales.findByEmail;
  UsuarioModel.findById = originales.findById;
  UsuarioModel.create = originales.create;
  UsuarioModel.update = originales.update;
  UsuarioModel.setToken = originales.setToken;
  UsuarioModel.clearToken = originales.clearToken;
  LoginModel.registrar = originales.loginRegistrar;
  jwtUtils.generarToken = originalJwt;
}

// ---------- pruebas ----------
async function main() {
  console.log("\n=== Pruebas de POST /api/auth/google (backend) ===\n");

  await check("token ausente -> 400", async () => {
    instalarDobles();
    const res = mockResponse();
    await authController.google(mockRequest({}), res);
    assertEqual(res.statusCode, 400, "status");
    assert(/Token de Google requerido/.test(res.body.message), "mensaje");
    restaurarDobles();
  });

  await check("token no-string (objeto) -> 400 sin verificar", async () => {
    instalarDobles();
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: { evil: true } }), res);
    assertEqual(res.statusCode, 400, "status");
    restaurarDobles();
  });

  await check("token invalido/caducado -> 401 y se audita el fallo", async () => {
    instalarDobles();
    googleFalla("Token used too late, exp=123 < now=456");
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "token.invalido" }), res);
    assertEqual(res.statusCode, 401, "status");
    assert(/inválida o expirada/.test(res.body.message), "mensaje");
    assertEqual(llamadas.login.length, 1, "se registra el intento fallido");
    assertEqual(llamadas.login[0].exito, false, "exito=false");
    restaurarDobles();
  });

  await check("GOOGLE_CLIENT_ID sin configurar -> 503", async () => {
    instalarDobles();
    googleSinConfigurar();
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "x" }), res);
    assertEqual(res.statusCode, 503, "status");
    assert(/no configurado/.test(res.body.message), "mensaje");
    restaurarDobles();
  });

  await check("payload sin google_id/email -> error de identidad incompleta", async () => {
    googleResponde(payloadValido({ sub: null }));
    const error = await googleAuth
      .verifyGoogleIdToken("token")
      .then(() => null)
      .catch((e) => e);
    assert(error && error.motivo === "identidad_incompleta", "motivo identidad_incompleta");
    assertEqual(error.status, 401, "status del error");
  });

  await check("email no verificado -> rechazado (401)", async () => {
    googleResponde(payloadValido({ email_verified: false }));
    const error = await googleAuth
      .verifyGoogleIdToken("token")
      .then(() => null)
      .catch((e) => e);
    assert(error && error.motivo === "email_no_verificado", "motivo email_no_verificado");
  });

  await check("usuario NUEVO: crea cuenta con rol publico y devuelve sesion", async () => {
    instalarDobles({ porGoogleId: null, porEmail: null });
    googleResponde(payloadValido());
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "ok", rol: "TOURIST" }), res);

    assertEqual(res.statusCode, 200, "status");
    assertEqual(res.body.success, true, "success");
    assert(res.body.data && res.body.data.token, "debe devolver token");
    assert(res.body.data.usuario, "debe devolver usuario");
    assertEqual(res.body.data.usuario.email, "viajero@pruebas.test", "email del usuario");
    assertEqual(llamadas.create.length, 1, "crea exactamente un usuario");
    assertEqual(llamadas.create[0].opt.proveedor, "google", "proveedor google");
    assertEqual(llamadas.create[0].opt.google_id, "google-sub-123", "google_id persistido");
    assertEqual(llamadas.create[0].hashed, null, "sin password");
    assertEqual(llamadas.setToken.length, 1, "guarda token_activo");
    assertEqual(llamadas.login[0].exito, true, "audita login exitoso");
    restaurarDobles();
  });

  await check("usuario NUEVO pidiendo ADMIN/BUSINESS: nunca se concede ADMIN", async () => {
    instalarDobles({ porGoogleId: null, porEmail: null });
    googleResponde(payloadValido());
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "ok", rol: "ADMIN" }), res);
    assertEqual(res.statusCode, 200, "status");
    assertEqual(llamadas.create[0].rol_id, 1, "rol forzado a TOURIST");

    instalarDobles({ porGoogleId: null, porEmail: null });
    googleResponde(payloadValido());
    const res2 = mockResponse();
    await authController.google(mockRequest({ idToken: "ok", rol: "BUSINESS" }), res2);
    assertEqual(llamadas.create[0].rol_id, 2, "BUSINESS permitido en cuenta nueva");
    restaurarDobles();
  });

  await check("usuario EXISTENTE con google_id: reutiliza y NO duplica", async () => {
    const existente = {
      id: 7,
      nombre: "Ya Registrado",
      email: "viajero@pruebas.test",
      rol_id: 2,
      avatar_url: "https://ejemplo.test/vieja.png",
      proveedor: "google",
      google_id: "google-sub-123",
      token_activo: null,
    };
    instalarDobles({ porGoogleId: existente, porEmail: existente });
    googleResponde(payloadValido());
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "ok", rol: "TOURIST" }), res);

    assertEqual(res.statusCode, 200, "status");
    assertEqual(llamadas.create.length, 0, "no crea usuario");
    assertEqual(llamadas.update.length, 0, "no modifica datos de la cuenta existente");
    assertEqual(res.body.data.usuario.rol, "BUSINESS", "conserva el rol existente");
    restaurarDobles();
  });

  await check("usuario EXISTENTE local por email: vincula google_id conservando rol", async () => {
    const local = {
      id: 12,
      nombre: "Cuenta Local",
      email: "viajero@pruebas.test",
      rol_id: 1,
      avatar_url: null,
      proveedor: "local",
      google_id: null,
      token_activo: null,
    };
    instalarDobles({ porGoogleId: null, porEmail: local });
    googleResponde(payloadValido());
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "ok", rol: "BUSINESS" }), res);

    assertEqual(res.statusCode, 200, "status");
    assertEqual(llamadas.create.length, 0, "no crea una cuenta duplicada");
    assertEqual(llamadas.update.length, 1, "vincula la cuenta existente");
    assertEqual(llamadas.update[0].fields.google_id, "google-sub-123", "google_id vinculado");
    assertEqual(llamadas.update[0].fields.rol_id, undefined, "NO cambia el rol");
    assertEqual(res.body.data.usuario.rol, "TOURIST", "conserva TOURIST pese a pedir BUSINESS");
    restaurarDobles();
  });

  await check("sesion activa VIGENTE -> 403 (politica de sesion unica)", async () => {
    const jwt = require("jsonwebtoken");
    const vigente = jwt.sign({ id: 8, rol: "TOURIST" }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });
    const conSesion = {
      id: 8,
      nombre: "Con Sesion",
      email: "viajero@pruebas.test",
      rol_id: 1,
      proveedor: "google",
      google_id: "google-sub-123",
      token_activo: vigente,
    };
    instalarDobles({ porGoogleId: conSesion });
    googleResponde(payloadValido());
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "ok" }), res);
    assertEqual(res.statusCode, 403, "status");
    assert(/sesión activa/.test(res.body.message), "mensaje");
    assertEqual(llamadas.setToken.length, 0, "no reemplaza la sesion activa");
    assertEqual(llamadas.clearToken.length, 0, "no limpia una sesion vigente");
    restaurarDobles();
  });

  await check("sesion activa CADUCADA: no bloquea y se limpia (evita bloqueo permanente)", async () => {
    const jwt = require("jsonwebtoken");
    const expirado = jwt.sign({ id: 8, rol: "TOURIST" }, process.env.JWT_SECRET, {
      expiresIn: "-1h",
    });
    const conSesionMuerta = {
      id: 8,
      nombre: "Sesion Expirada",
      email: "viajero@pruebas.test",
      rol_id: 1,
      proveedor: "google",
      google_id: "google-sub-123",
      token_activo: expirado,
    };
    instalarDobles({ porGoogleId: conSesionMuerta });
    googleResponde(payloadValido());
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "ok" }), res);
    assertEqual(res.statusCode, 200, "debe permitir entrar");
    assertEqual(llamadas.clearToken.length, 1, "limpia el token caducado");
    assertEqual(llamadas.setToken.length, 1, "emite una sesion nueva");
    restaurarDobles();
  });

  await check("sesion activa caducada en login por password: tampoco bloquea", async () => {
    const jwt = require("jsonwebtoken");
    const { hashPassword } = require("../src/utils/password");
    const expirado = jwt.sign({ id: 5, rol: "TOURIST" }, process.env.JWT_SECRET, {
      expiresIn: "-1h",
    });
    const local = {
      id: 5,
      nombre: "Local",
      email: "local@pruebas.test",
      password: await hashPassword("clave-correcta"),
      rol_id: 1,
      proveedor: "local",
      google_id: null,
      token_activo: expirado,
    };
    instalarDobles({ porEmail: local });

    const res = mockResponse();
    await authController.login(
      mockRequest({ email: "local@pruebas.test", password: "clave-correcta" }),
      res
    );
    assertEqual(res.statusCode, 200, "debe permitir entrar");
    assertEqual(llamadas.clearToken.length, 1, "limpia el token caducado");
    assertEqual(llamadas.setToken.length, 1, "emite una sesion nueva");
    restaurarDobles();
  });

  await check("login por password con sesion VIGENTE -> 403", async () => {
    const jwt = require("jsonwebtoken");
    const { hashPassword } = require("../src/utils/password");
    const vigente = jwt.sign({ id: 6, rol: "TOURIST" }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });
    const local = {
      id: 6,
      nombre: "Local 2",
      email: "local2@pruebas.test",
      password: await hashPassword("clave-correcta"),
      rol_id: 1,
      proveedor: "local",
      google_id: null,
      token_activo: vigente,
    };
    instalarDobles({ porEmail: local });
    const res = mockResponse();
    await authController.login(
      mockRequest({ email: "local2@pruebas.test", password: "clave-correcta" }),
      res
    );
    assertEqual(res.statusCode, 403, "status");
    assertEqual(llamadas.clearToken.length, 0, "no limpia una sesion vigente");
    restaurarDobles();
  });

  await check("usuario sin rol -> 401", async () => {
    const sinRol = {
      id: 9,
      nombre: "Sin Rol",
      email: "viajero@pruebas.test",
      rol_id: null,
      proveedor: "google",
      google_id: "google-sub-123",
      token_activo: null,
    };
    instalarDobles({ porGoogleId: sinRol });
    googleResponde(payloadValido());
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "ok" }), res);
    assertEqual(res.statusCode, 401, "status");
    assert(/sin rol/.test(res.body.message), "mensaje");
    restaurarDobles();
  });

  await check("error inesperado -> 500 con mensaje generico", async () => {
    instalarDobles({ porGoogleId: null, porEmail: null });
    googleResponde(payloadValido());
    UsuarioModel.create = async () => {
      throw new Error("DB caida");
    };
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "ok" }), res);
    assertEqual(res.statusCode, 500, "status");
    assertEqual(res.body.message, "Error al iniciar sesión con Google", "mensaje generico");
    assert(!/DB caida/.test(JSON.stringify(res.body)), "no filtra detalles internos");
    restaurarDobles();
  });

  await check("formato de respuesta exitosa compatible con AuthContext", async () => {
    instalarDobles({ porGoogleId: null, porEmail: null });
    googleResponde(payloadValido());
    const res = mockResponse();
    await authController.google(mockRequest({ idToken: "ok", rol: "TOURIST" }), res);
    const { data } = res.body;
    assert(typeof data.token === "string", "data.token string");
    assert(typeof data.usuario === "object", "data.usuario objeto");
    assert("rol" in data.usuario, "data.usuario.rol presente");
    assert("email" in data.usuario, "data.usuario.email presente");
    assert("password" in data.usuario === false, "nunca devuelve password");
    restaurarDobles();
  });

  console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("Fallo inesperado en la suite:", e);
  process.exit(1);
});
