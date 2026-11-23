// Normalizacion canonica del nombre de un negocio.
// Debe coincidir EXACTAMENTE con la expression SQL de la migracion 024.
// La base de datos es la autoridad (columna GENERATED + UNIQUE); esta
// funcion solo se usa para mensajes, auditoria y comprobaciones previas.
const TRANSLACION =
  "áàäâãåéèëêíìïîóòöôõúùüûñçýÿÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇÝŸ";
const REEMPLAZO =
  "aaaaaaeeeeiiiiooooouuuuncyyAAAAAAEEEEIIIIOOOOOUUUUNCYY";

function normalizarNombreNegocio(nombre) {
  if (typeof nombre !== "string") return null;
  let out = "";
  for (let i = 0; i < nombre.length; i++) {
    const idx = TRANSLACION.indexOf(nombre[i]);
    out += idx >= 0 ? REEMPLAZO[idx] : nombre[i];
  }
  const normalizado = out
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return normalizado || null;
}

module.exports = { normalizarNombreNegocio };
