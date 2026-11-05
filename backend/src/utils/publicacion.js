// ============================================================
// publicacion.js — regla UNICA de visibilidad publica de un negocio.
// ------------------------------------------------------------
// Un negocio es publico cuando:
//   1. La moderacion lo aprobo (`estado = 'approved'`). El estado de
//      moderacion NUNCA se toca al ocultar/restaurar por suscripcion.
//   2. Su publicacion comercial esta visible.
//   3. Su propietario tiene derecho comercial vigente:
//        - vendedor anterior sin politica (estado_cuenta y trial nulos), o
//        - prueba gratuita vigente (trial_fin > NOW()), o
//        - suscripcion activa vigente (ends_at > NOW()),
//      y no esta suspendido.
//
// La regla se expresa en SQL para que TODAS las consultas publicas la
// apliquen en la base de datos (no en el cliente). `publicacion_estado`
// es el espejo persistido que usa la renovacion para saber que negocios
// restaurar; la elegibilidad se vuelve a comprobar en vivo, de modo que
// un flag atrasado jamas expone a un vendedor vencido.
// ============================================================

function ownerEntitledSql(ownerAlias = "u") {
  const u = ownerAlias;
  return `(
    (${u}.estado_cuenta IS NULL AND ${u}.trial_inicio IS NULL)
    OR (
      ${u}.estado_cuenta IS DISTINCT FROM 'SUSPENDED'
      AND (
        EXISTS (
          SELECT 1 FROM subscriptions sub
          WHERE sub.usuario_id = ${u}.id
            AND sub.estado = 'active'
            AND sub.ends_at IS NOT NULL
            AND sub.ends_at > NOW()
        )
        OR (${u}.trial_fin IS NOT NULL AND ${u}.trial_fin > NOW())
      )
    )
  )`;
}

function publicBusinessSql(businessAlias = "b", ownerAlias = "u") {
  const b = businessAlias;
  return `(
    ${b}.estado = 'approved'
    AND ${b}.publicacion_estado = 'visible'
    AND ${ownerEntitledSql(ownerAlias)}
  )`;
}

// Version JavaScript de la misma regla, para respuestas ya cargadas
// (por ejemplo el middleware que valida una URL directa). Espera los
// campos del propietario que agrega `BusinessModel.findById`:
// owner_estado_cuenta, owner_trial_inicio, owner_trial_vigente,
// owner_suscripcion_activa. Cuando `owner_trial_vigente` viene de la
// consulta (NOW() de PostgreSQL) se usa ese valor; el respaldo con
// `new Date()` solo aplica a objetos construidos a mano en pruebas.
function esVisiblePublicamente(business) {
  if (!business) return false;
  if (typeof business.es_publico === "boolean") return business.es_publico;
  if (business.estado !== "approved") return false;
  if (business.publicacion_estado !== "visible") return false;
  if (business.owner_estado_cuenta === "SUSPENDED") return false;
  // Vendedor anterior sin politica (estado_cuenta y prueba nulos):
  // conserva su publicacion (compatibilidad de la migracion 023).
  if (business.owner_estado_cuenta == null && !business.owner_trial_inicio) return true;
  if (business.owner_suscripcion_activa === true) return true;
  if (typeof business.owner_trial_vigente === "boolean") {
    return business.owner_trial_vigente;
  }
  return Boolean(business.owner_trial_fin && new Date(business.owner_trial_fin) > new Date());
}

module.exports = {
  ownerEntitledSql,
  publicBusinessSql,
  esVisiblePublicamente,
};
