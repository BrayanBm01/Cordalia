// ============================================================
// serverError — respuesta segura y coherente ante fallos del servidor.
// ------------------------------------------------------------
// * Registra el error tecnico en el log (codigo y mensaje de PostgreSQL;
//   nunca la cadena de conexion ni datos sensibles del request).
// * Distingue "faltan migraciones" (SQLSTATE 42703/42P01/3F000) de un
//   fallo interno normal: el primero responde 503 ESQUEMA_INCOMPLETO,
//   comprensible para el operador, en lugar de un 500 opaco.
// * Nunca convierte un error en una respuesta exitosa con lista vacia.
// ============================================================

const { esErrorDeEsquema } = require("./sqlErrors");

const MENSAJE_MIGRACIONES =
  "La base de datos no tiene aplicadas las migraciones requeridas. " +
  "Aplica las migraciones 018, 019, 020 y 023 y vuelve a intentarlo.";

function registrarError(context, error) {
  const tecnico = {
    contexto: context,
    code: error?.code || null,
    message: error?.message || String(error),
  };
  console.error("[api]", tecnico);
  // Stack solo fuera de produccion: ayuda a depurar sin ensuciar logs
  // ni exponer detalles internos en el entorno desplegado.
  if (process.env.NODE_ENV !== "production" && error?.stack) {
    console.error(error.stack);
  }
}

/**
 * Responde a un error de controlador. Devuelve la respuesta para que el
 * llamador pueda hacer `return responderErrorServidor(...)`.
 *
 * @param {import("express").Response} res
 * @param {any} error
 * @param {string} context - etiqueta del endpoint/consulta
 */
function responderErrorServidor(res, error, context) {
  registrarError(context, error);
  if (esErrorDeEsquema(error)) {
    return res.status(503).json({
      success: false,
      code: "ESQUEMA_INCOMPLETO",
      message: MENSAJE_MIGRACIONES,
    });
  }
  return res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
}

module.exports = { responderErrorServidor, registrarError, MENSAJE_MIGRACIONES };
