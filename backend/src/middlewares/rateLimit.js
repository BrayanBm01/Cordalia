// ============================================================
// Limites de peticiones (rate limiting).
//
// Objetivos:
//   * Proteger autenticacion, registro, recuperacion de contrasena,
//     publicacion de negocios, resenas y busquedas.
//   * Limitar por identidad cuando hay sesion y por IP cuando no.
//   * Responder siempre 429 con `Retry-After` (segundos).
//   * Permitir ajustar los limites por variables de entorno sin tocar
//     el codigo.
//
// LIMITACION CONOCIDA: el almacen es en memoria. Funciona correctamente
// con una sola instancia del backend (el despliegue documentado usa una
// sola instancia en Render). Con varias instancias, cada una lleva su
// propia cuenta y el limite efectivo se multiplica; en ese caso habria
// que usar un store compartido (Redis/PostgreSQL).
// ============================================================

const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

function envInt(nombre, porDefecto) {
  const valor = Number.parseInt(process.env[nombre] ?? "", 10);
  return Number.isInteger(valor) && valor > 0 ? valor : porDefecto;
}

/**
 * Genera un limitador con la configuracion comun.
 *
 * @param {object} opciones
 * @param {number} opciones.windowMs - Ventana en milisegundos.
 * @param {number} opciones.max - Maximo de peticiones por ventana.
 * @param {string} opciones.message - Mensaje para el cliente.
 * @returns {import("express").RequestHandler}
 */
function crearLimitador({ windowMs, max, message }) {
  const limite = Number.isFinite(max) && max > 0 ? Math.floor(max) : 1;
  return rateLimit({
    windowMs,
    limit: limite,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Usuario autenticado -> su id. Sin sesion -> IP normalizada por la
    // libreria (maneja IPv6 de forma segura). No se confia en headers
    // aportados por el cliente mas alla de la configuracion trust proxy.
    keyGenerator: (req) =>
      req.usuario?.id !== undefined && req.usuario?.id !== null
        ? `usuario:${req.usuario.id}`
        : `ip:${ipKeyGenerator(req.ip)}`,
    handler: (_req, res, _next, options) => {
      const retryAfter = Math.max(1, Math.ceil(options.windowMs / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message: options.message || "Demasiadas solicitudes. Intenta de nuevo más tarde.",
      });
    },
    message,
  });
}

// Backstop general para toda la API: evita que un cliente abra miles de
// peticiones por minuto. Es deliberadamente holgado para no afectar el
// uso normal (incluidas las pruebas automatizadas).
const globalLimiter = crearLimitador({
  windowMs: 15 * 60 * 1000,
  max: envInt("GLOBAL_RATE_LIMIT_MAX", 5000),
  message: "Demasiadas solicitudes a la API. Intenta de nuevo más tarde.",
});

// Login: protege fuerza bruta. En despliegues con pruebas se puede subir
// con AUTH_RATE_LIMIT_MAX (el .env local ya lo hace).
const authLimiter = crearLimitador({
  windowMs: 15 * 60 * 1000,
  max: envInt("AUTH_RATE_LIMIT_MAX", 30),
  message: "Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.",
});

// Registro: ventana amplia y limite bajo. 8 registros en las pruebas
// actuales caben en el valor por defecto (20/hora).
const registerLimiter = crearLimitador({
  windowMs: 60 * 60 * 1000,
  max: envInt("REGISTER_RATE_LIMIT_MAX", 20),
  message: "Demasiados registros desde esta conexión. Intenta de nuevo más tarde.",
});

// Google: limita intentos de verificacion de credenciales.
const googleLimiter = crearLimitador({
  windowMs: 15 * 60 * 1000,
  max: envInt("GOOGLE_RATE_LIMIT_MAX", 20),
  message: "Demasiados intentos con Google. Intenta de nuevo en unos minutos.",
});

// Recuperacion/restablecimiento de contrasena: operacion sensible y con
// envio de correo (costosa). Limite estricto por IP.
const passwordResetLimiter = crearLimitador({
  windowMs: 60 * 60 * 1000,
  max: envInt("PASSWORD_RESET_RATE_LIMIT_MAX", 10),
  message: "Demasiadas solicitudes de recuperación de contraseña. Intenta de nuevo más tarde.",
});

// Escritura de negocios (crear/editar). Por usuario autenticado.
const businessWriteLimiter = crearLimitador({
  windowMs: 60 * 60 * 1000,
  max: envInt("BUSINESS_WRITE_RATE_LIMIT_MAX", 60),
  message: "Has realizado demasiadas cambios de negocio. Intenta de nuevo más tarde.",
});

// Resenas: por usuario autenticado.
const reviewLimiter = crearLimitador({
  windowMs: 60 * 60 * 1000,
  max: envInt("REVIEW_RATE_LIMIT_MAX", 20),
  message: "Has publicado demasiadas reseñas. Intenta de nuevo más tarde.",
});

// Busquedas/listados costosos (planes, destinos).
const searchLimiter = crearLimitador({
  windowMs: 60 * 1000,
  max: envInt("SEARCH_RATE_LIMIT_MAX", 120),
  message: "Demasiadas búsquedas. Espera un momento e intenta de nuevo.",
});

// Compatibilidad con importaciones antiguas.
const strictLimiter = reviewLimiter;

module.exports = {
  crearLimitador,
  globalLimiter,
  authLimiter,
  registerLimiter,
  googleLimiter,
  passwordResetLimiter,
  businessWriteLimiter,
  reviewLimiter,
  searchLimiter,
  strictLimiter,
};
