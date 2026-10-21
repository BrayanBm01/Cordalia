// ============================================================
// sqlErrors — clasificacion de errores de PostgreSQL.
// ------------------------------------------------------------
// Permite distinguir "la base de datos no tiene el esquema que el
// codigo necesita" (migraciones pendientes) de un fallo cualquiera,
// para responder con un mensaje comprensible en lugar de un 500 opaco.
//
// SQLSTATE de PostgreSQL:
//   42703 -> la columna no existe
//   42P01 -> la relacion (tabla) no existe
//   3F000 -> el esquema no existe
// ============================================================

const CODIGOS_ESQUEMA_INCOMPLETO = ["42703", "42P01", "3F000"];

/**
 * ¿El error indica que falta aplicar migraciones?
 * @param {any} error - Error de PostgreSQL (con `code`).
 * @returns {boolean}
 */
function esErrorDeEsquema(error) {
  if (!error || !error.code) return false;
  return CODIGOS_ESQUEMA_INCOMPLETO.includes(String(error.code));
}

module.exports = { esErrorDeEsquema, CODIGOS_ESQUEMA_INCOMPLETO };
