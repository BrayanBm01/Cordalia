function errorHandler(err, req, res, _next) {
  console.error("Unhandled error:", err?.stack || err);

  // Respuesta segura: no exponemos stack traces al cliente.
  // Cuando el error trae un codigo HTTP explicito (p. ej. 413 PayloadTooLarge
  // de express.json, o errores de validacion de body-parser), lo respetamos;
  // en caso contrario respondemos 500 como error interno generico.
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
