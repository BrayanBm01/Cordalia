const { registrarError, MENSAJE_MIGRACIONES } = require("../utils/serverError");
const { esErrorDeEsquema } = require("../utils/sqlErrors");

function errorHandler(err, req, res, _next) {
  // Registro tecnico (codigo/mensaje/stack fuera de produccion). No se
  // registran cabeceras, tokens, contraseñas ni la cadena de conexion.
  registrarError("unhandled", err);

  if (esErrorDeEsquema(err)) {
    return res.status(503).json({
      success: false,
      code: "ESQUEMA_INCOMPLETO",
      message: MENSAJE_MIGRACIONES,
    });
  }

  // Respuesta segura: no exponemos stack traces al cliente. Cuando el
  // error trae un codigo HTTP explicito (413 de express.json, validacion
  // de body-parser), lo respetamos; el resto es 500 generico.
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({
    success: false,
    message:
      status >= 500
        ? "Error interno del servidor"
        : err?.message || "Solicitud inválida",
  });
}

module.exports = errorHandler;
