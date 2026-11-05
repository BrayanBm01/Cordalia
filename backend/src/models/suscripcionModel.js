// ============================================================
// SuscripcionModel — estado comercial del VENDEDOR y sus
// suscripciones mensuales a planes comerciales.
//
// SEPARACION DE FLUJOS:
//   * `inscripciones` -> planes turisticos (GRATUITOS, sin pagos).
//   * `subscriptions`  -> planes COMERCIALES del vendedor (con pago).
//
// El estado comercial del vendedor vive en `usuarios`:
//   trial_inicio / trial_fin / estado_cuenta
//   (TRIALING | ACTIVE | EXPIRED | SUSPENDED | NULL = anterior).
// ============================================================
const pool = require("../config/db");
const { ownerEntitledSql } = require("../utils/publicacion");

// Duracion EXACTA de la prueba gratuita: 168 horas (7 dias de 24 horas).
//
// IMPORTANTE: `make_interval(hours => 168)` sobre TIMESTAMPTZ suma horas
// ABSOLUTAS. No se usa `interval '7 days'`: esa aritmetica es de
// calendario y, en zonas con horario de verano, siete "dias" pueden ser
// 167 o 169 horas. Tampoco se redondea a medianoche ni se confia en la
// hora del navegador: el vencimiento es un instante UTC calculado por
// PostgreSQL (NOW()).
const HORAS_PRUEBA = 168;
const DIAS_PRUEBA = 7;

// Estados comerciales.
const ESTADOS = {
  TRIALING: "TRIALING",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  SUSPENDED: "SUSPENDED",
};

const SuscripcionModel = {
  DIAS_PRUEBA,
  HORAS_PRUEBA,
  ESTADOS,

  // ------------------------------------------------------------
  // PRUEBA GRATUITA
  // ------------------------------------------------------------
  /**
   * Asigna la prueba gratuita de 7 dias a un vendedor recien creado.
   *
   * - Se calcula en el SERVIDOR: inicio = NOW(), fin = NOW() + 168 horas.
   * - Se asigna UNA SOLA VEZ por cuenta: si ya tiene prueba, no se
   *   reinicia (llamar de nuevo no cambia las fechas).
   * - Si el administrador crea la cuenta, aplica la misma regla.
   * - Los vendedores anteriores (sin trial) no se tocan: conservan su
   *   publicacion (politica de compatibilidad; ver migracion 023).
   *
   * @param {object} [client] - Cliente de una transaccion en curso, para
   *   que la asignacion sea atomica con la creacion de la cuenta.
   */
  async asignarPruebaGratuita(usuarioId, client = pool) {
    const { rows } = await client.query(
      `UPDATE usuarios
          SET trial_inicio = NOW(),
              trial_fin = NOW() + make_interval(hours => $2),
              estado_cuenta = 'TRIALING',
              updated_at = NOW()
        WHERE id = $1
          AND trial_inicio IS NULL
          AND rol_id = 2
      RETURNING id, trial_inicio, trial_fin, estado_cuenta`,
      [usuarioId, HORAS_PRUEBA]
    );
    if (rows.length > 0) return rows[0];
    // Ya tenia prueba (o no es vendedor): se devuelve el estado actual.
    // Este camino es el que impide que repetir la solicitud reinicie la
    // prueba: la condicion `trial_inicio IS NULL` es atomica en SQL.
    const { rows: actual } = await client.query(
      `SELECT id, trial_inicio, trial_fin, estado_cuenta FROM usuarios WHERE id = $1`,
      [usuarioId]
    );
    return actual[0] || null;
  },

  /**
   * Marca la prueba como VENCIDA en la base de datos cuando ya paso su
   * fecha de fin. Es una operacion perezosa e idempotente: el estado se
   * detecta en el servidor aunque el vendedor no vuelva a iniciar sesion
   * (los permisos ya se calculan al vuelo; esto mantiene la BD y los
   * listados del administrador coherentes).
   *
   * @returns {Promise<boolean>} true si se actualizó el estado.
   */
  async marcarPruebaVencida(usuarioId) {
    const { rowCount } = await pool.query(
      `UPDATE usuarios
          SET estado_cuenta = 'EXPIRED', updated_at = NOW()
        WHERE id = $1
          AND estado_cuenta = 'TRIALING'
          AND trial_fin IS NOT NULL
          AND trial_fin <= NOW()`,
      [usuarioId]
    );
    // La publicacion comercial se sincroniza en el mismo instante en que
    // la prueba vence (ocultar/restaurar segun el derecho VIGENTE). Las
    // consultas publicas comprueban el derecho en vivo, asi que esto es
    // coherencia de datos, no la unica proteccion.
    if (rowCount > 0) {
      await this.ocultarNegociosDeUsuario(usuarioId);
    }
    return rowCount > 0;
  },

  /**
   * Estado comercial vigente de un vendedor.
   *
   * Prioridad (la mas restrictiva manda):
   *   1. SUSPENDED  -> suspension administrativa.
   *   2. ACTIVE     -> suscripcion pagada y vigente (ends_at > NOW()).
   *   3. TRIALING   -> prueba gratuita en curso (trial_fin > NOW()).
   *   4. EXPIRED    -> prueba o suscripcion finalizada.
   *   NULL (sin poliza) -> vendedor anterior: NO se restringe.
   *
   * El calculo se hace en el servidor (NOW() de PostgreSQL), no en el
   * cliente: asi el estado es correcto aunque el usuario no vuelva a
   * iniciar sesion.
   */
  async estadoComercial(usuarioId) {
    // Si la prueba ya vencio, se refleja en la BD (perezoso, idempotente).
    await this.marcarPruebaVencida(usuarioId);

    const { rows } = await pool.query(
      `SELECT u.id, u.rol_id, u.estado_cuenta, u.trial_inicio, u.trial_fin,
              u.suspension_motivo, u.suspension_fecha,
              (u.trial_fin IS NOT NULL AND u.trial_fin > NOW()) AS trial_vigente,
              GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (u.trial_fin - NOW()))))::bigint AS segundos_restantes,
              (SELECT COUNT(*)::int FROM subscriptions s
                WHERE s.usuario_id = u.id AND s.estado = 'active'
                  AND s.ends_at IS NOT NULL AND s.ends_at > NOW()) AS suscripciones_activas,
              (SELECT s.id FROM subscriptions s
                WHERE s.usuario_id = u.id AND s.estado = 'active'
                  AND s.ends_at IS NOT NULL AND s.ends_at > NOW()
                ORDER BY s.ends_at DESC LIMIT 1) AS suscripcion_activa_id,
              (SELECT s.plan_id FROM subscriptions s
                WHERE s.usuario_id = u.id AND s.estado = 'active'
                  AND s.ends_at IS NOT NULL AND s.ends_at > NOW()
                ORDER BY s.ends_at DESC LIMIT 1) AS plan_activo_id,
              (SELECT s.ends_at FROM subscriptions s
                WHERE s.usuario_id = u.id AND s.estado = 'active'
                  AND s.ends_at IS NOT NULL AND s.ends_at > NOW()
                ORDER BY s.ends_at DESC LIMIT 1) AS fin_suscripcion_activa,
              (SELECT COUNT(*)::int FROM businesses b
                WHERE b.owner_id = u.id) AS negocios_total,
              (SELECT COUNT(*)::int FROM businesses b
                WHERE b.owner_id = u.id
                  AND b.publicacion_estado = 'oculto_suscripcion') AS negocios_ocultos
         FROM usuarios u
        WHERE u.id = $1`,
      [usuarioId]
    );
    const u = rows[0];
    if (!u) return null;

    const estado = this.resolverEstado(u);
    // Tiempo restante INFORMATIVO calculado por PostgreSQL (no por el
    // navegador). La autorizacion real es `estado`, que viene de la
    // misma consulta con NOW() de la base.
    const segundosRestantes = estado === "TRIALING" ? Number(u.segundos_restantes || 0) : 0;
    const diasRestantes = estado === "TRIALING" ? Math.max(0, Math.ceil(segundosRestantes / 86400)) : 0;

    return {
      usuario_id: u.id,
      estado,
      trial_inicio: u.trial_inicio,
      trial_fin: u.trial_fin,
      trial_vigente: Boolean(u.trial_vigente),
      dias_prueba: DIAS_PRUEBA,
      horas_prueba: HORAS_PRUEBA,
      dias_restantes: diasRestantes,
      segundos_restantes: segundosRestantes,
      plan_activo_id: u.plan_activo_id || null,
      suscripcion_activa_id: u.suscripcion_activa_id || null,
      fin_suscripcion_activa: u.fin_suscripcion_activa || null,
      suspension_motivo: u.suspension_motivo || null,
      suspension_fecha: u.suspension_fecha || null,
      // Publicacion comercial: cuantos negocios tiene y cuantos quedaron
      // ocultos por falta de derecho. El panel del vendedor lo usa para
      // avisar con claridad sin exponer datos internos.
      negocios_total: Number(u.negocios_total || 0),
      negocios_ocultos: Number(u.negocios_ocultos || 0),
      publicacion_oculta: Number(u.negocios_ocultos || 0) > 0,
      // Un vendedor anterior (sin poliza de prueba) NO se restringe.
      sin_polica: u.estado_cuenta === null && !u.trial_inicio,
    };
  },

  // Resuelve el estado a partir de la fila cruda (regla unica, usada
  // por estadoComercial y por las consultas de listado).
  //
  // Si la consulta trae `trial_vigente` (calculado con NOW() de
  // PostgreSQL) se usa ese valor: el vencimiento lo decide el reloj del
  // servidor de base de datos, nunca el del navegador. El fallback con
  // `new Date()` solo aplica a filas construidas a mano (pruebas).
  resolverEstado(u) {
    if (u.estado_cuenta === "SUSPENDED") return "SUSPENDED";
    if (Number(u.suscripciones_activas || 0) > 0) return "ACTIVE";
    const trialVigente =
      typeof u.trial_vigente === "boolean"
        ? u.trial_vigente
        : Boolean(u.trial_fin && new Date(u.trial_fin) > new Date());
    if (trialVigente) return "TRIALING";
    if (u.trial_inicio) return "EXPIRED";
    // Cuenta que alguna vez tuvo estado comercial (por ejemplo una
    // suscripcion sin prueba registrada) y ya no tiene derecho vigente:
    // se considera vencida. Solo el vendedor anterior REAL (sin estado y
    // sin prueba) queda fuera de la politica y no se restringe.
    if (u.estado_cuenta) return "EXPIRED";
    return null;
  },

  /**
   * ¿El vendedor puede usar las functionalities comerciales restringidas?
   * (crear/editar planes, promociones, salidas, etc.)
   */
  async tieneAccesoComercial(usuarioId) {
    const est = await this.estadoComercial(usuarioId);
    if (!est) return false;
    if (est.estado === "SUSPENDED") return false;
    if (est.estado === "EXPIRED") return false;
    // TRIALING, ACTIVE o vendedor sin poliza (anterior) -> acceso.
    return true;
  },

  // ------------------------------------------------------------
  // PLANES COMERCIALES
  // ------------------------------------------------------------
  async listPlanesComerciales({ soloActivos = true } = {}) {
    const { rows } = await pool.query(
      `SELECT id, nombre, slug, descripcion, precio, moneda, duracion_dias, meses,
              categoria, features, activo, orden
         FROM plans
        ${soloActivos ? "WHERE activo = true" : ""}
        ORDER BY orden ASC, id ASC`
    );
    return rows;
  },

  async findPlanComercial(planId) {
    const { rows } = await pool.query(
      `SELECT id, nombre, slug, descripcion, precio, moneda, duracion_dias, meses,
              categoria, features, activo
         FROM plans WHERE id = $1`,
      [planId]
    );
    return rows[0] || null;
  },

  // ------------------------------------------------------------
  // SUSCRIPCIONES
  // ------------------------------------------------------------
  /**
   * Crea una suscripcion en estado 'pending' (pago iniciado, NO activa).
   * La activacion solo ocurre con un evento de pago verificado.
   *
   * `referenciaExterna` es SIEMPRE la referencia interna que nosotros
   * controlamos (la que viaja como external_reference y la que devuelve
   * el proveedor al notificar). El identificador del proveedor (por
   * ejemplo el id de la preferencia de Mercado Pago) va en `pagoId`.
   * Mezclarlos haria que la webhook no encontraba la suscripcion.
   */
  async crearSuscripcion({ usuarioId, planId, proveedor, referenciaExterna, pagoId, monto, moneda, idempotencyKey, payload }) {
    const { rows } = await pool.query(
      `INSERT INTO subscriptions
         (usuario_id, plan_id, estado, proveedor, referencia_externa, pago_id, monto, moneda,
          idempotency_key, datos_pago, starts_at)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, usuario_id, plan_id, estado, proveedor, referencia_externa,
                 pago_id, monto, moneda, starts_at, ends_at, created_at`,
      [
        usuarioId,
        planId,
        proveedor || "mock",
        referenciaExterna || null,
        pagoId || null,
        monto ?? null,
        moneda || "COP",
        idempotencyKey || null,
        payload ? JSON.stringify(payload) : null,
      ]
    );
    return rows[0];
  },

  async findSuscripcion(suscripcionId) {
    const { rows } = await pool.query(
      `SELECT s.id, s.usuario_id, s.plan_id, s.business_id, s.estado, s.proveedor,
              s.referencia_externa, s.pago_id, s.monto, s.moneda, s.idempotency_key,
              s.starts_at, s.ends_at, s.cancelada_at, s.created_at, s.updated_at,
              p.nombre AS plan_nombre, p.slug AS plan_slug, p.precio AS plan_precio,
              p.meses AS plan_meses
         FROM subscriptions s
         LEFT JOIN plans p ON p.id = s.plan_id
        WHERE s.id = $1`,
      [suscripcionId]
    );
    return rows[0] || null;
  },

  async listSuscripciones(usuarioId) {
    const { rows } = await pool.query(
      `SELECT s.id, s.usuario_id, s.plan_id, s.estado, s.proveedor, s.referencia_externa,
              s.pago_id, s.monto, s.moneda, s.starts_at, s.ends_at, s.cancelada_at,
              s.created_at,
              p.nombre AS plan_nombre, p.slug AS plan_slug
         FROM subscriptions s
         LEFT JOIN plans p ON p.id = s.plan_id
        WHERE s.usuario_id = $1
        ORDER BY s.created_at DESC`,
      [usuarioId]
    );
    return rows;
  },

  /**
   * Activa (o renueva) una suscripcion tras un evento de pago VERIFICADO.
   *
   * - Idempotente: si ya esta activa, no se vuelve a activar ni a extender.
   * - Renueva: la suscripcion vigente anterior pasa a 'expired' y la nueva
   *   toma el relevo. La duracion se calcula con regla de CALENDARIO
   *   (starts_at + N meses), no con 30 dias fijos.
   * - Transaccion: el estado de la cuenta y la suscripcion se actualizan
   *   juntos.
   */
  async activarSuscripcion(suscripcionId, { pagoId, idempotencyKey, payload } = {}) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: current } = await client.query(
        `SELECT id, usuario_id, plan_id, estado, starts_at, ends_at
           FROM subscriptions WHERE id = $1 FOR UPDATE`,
        [suscripcionId]
      );
      const sub = current[0];
      if (!sub) throw { status: 404, message: "Suscripción no encontrada" };

      // Idempotencia: ya activa -> no se toca nada.
      if (sub.estado === "active") {
        await client.query("COMMIT");
        return { suscripcion: await this.findSuscripcion(suscripcionId), yaActiva: true };
      }
      if (sub.estado === "cancelled") {
        throw { status: 400, message: "La suscripción está cancelada" };
      }

      // Meses del plan (regla de calendario). Default 1 mes.
      const { rows: planRows } = await client.query(
        `SELECT COALESCE(meses, 1) AS meses FROM plans WHERE id = $1`,
        [sub.plan_id]
      );
      const meses = planRows[0] ? Math.max(1, Number(planRows[0].meses) || 1) : 1;

      // La renovacion reemplaza a la suscripcion vigente anterior.
      await client.query(
        `UPDATE subscriptions
            SET estado = 'expired', updated_at = NOW()
          WHERE usuario_id = $1 AND id <> $2 AND estado = 'active'`,
        [sub.usuario_id, sub.id]
      );

      const { rows: updated } = await client.query(
        `UPDATE subscriptions
            SET estado = 'active',
                pago_id = COALESCE($2, pago_id),
                idempotency_key = COALESCE($3, idempotency_key),
                datos_pago = COALESCE($4::jsonb, datos_pago),
                starts_at = NOW(),
                ends_at = NOW() + ($5 || ' months')::interval,
                updated_at = NOW()
          WHERE id = $1
        RETURNING id, usuario_id, plan_id, estado, starts_at, ends_at`,
        [
          sub.id,
          pagoId || null,
          idempotencyKey || null,
          payload ? JSON.stringify(payload) : null,
          String(meses),
        ]
      );

      // La cuenta del vendedor queda ACTIVA, salvo que exista una
      // suspension administrativa: la suspension solo la levanta un
      // administrador y un pago no debe borrarla.
      await client.query(
        `UPDATE usuarios
            SET estado_cuenta = CASE
                  WHEN estado_cuenta = 'SUSPENDED' THEN 'SUSPENDED'
                  ELSE 'ACTIVE'
                END,
                updated_at = NOW()
          WHERE id = $1`,
        [sub.usuario_id]
      );

      // Restablecer la PUBLICACION de los negocios que estaban ocultos
      // EXCLUSIVAMENTE por falta de prueba/suscripcion. La restauracion
      // usa la MISMA regla en vivo que las consultas publicas
      // (ownerEntitledSql), asi que un vendedor suspendido no recupera
      // publicacion con un pago. No se toca `estado` (moderacion): un
      // negocio pendiente sigue pendiente y uno suspendido por
      // moderacion sigue suspendido.
      await this.restaurarNegociosDeUsuario(sub.usuario_id, client);

      await client.query("COMMIT");
      return { suscripcion: await this.findSuscripcion(sub.id), yaActiva: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  /** Marca la suscripcion como rechazada (pago no aprobado). */
  async rechazarSuscripcion(suscripcionId, { motivo, payload } = {}) {
    const { rows } = await pool.query(
      `UPDATE subscriptions
          SET estado = 'rejected', datos_pago = COALESCE($2::jsonb, datos_pago), updated_at = NOW()
        WHERE id = $1 AND estado IN ('pending', 'rejected')
      RETURNING id, estado`,
      [suscripcionId, payload ? JSON.stringify(payload) : null]
    );
    return rows[0] || null;
  },

  /** Vence las suscripciones cuya vigencia ya termino. */
  async expirarSuscripcionesVencidas() {
    const { rowCount } = await pool.query(
      `UPDATE subscriptions
          SET estado = 'expired', updated_at = NOW()
        WHERE estado = 'active' AND ends_at IS NOT NULL AND ends_at <= NOW()`
    );
    return rowCount;
  },

  /** Vence en bloque las pruebas gratuitas cuya fecha de fin ya paso. */
  async marcarPruebasVencidas() {
    const { rowCount } = await pool.query(
      `UPDATE usuarios
          SET estado_cuenta = 'EXPIRED', updated_at = NOW()
        WHERE estado_cuenta = 'TRIALING'
          AND trial_fin IS NOT NULL
          AND trial_fin <= NOW()`
    );
    return rowCount;
  },

  /**
   * Oculta (bandera `publicacion_estado`) los negocios cuyo propietario
   * YA NO tiene prueba vigente ni suscripcion activa. No toca
   * `estado` (aprobacion/moderacion). La consulta publica comprueba el
   * derecho EN VIVO igualmente, por lo que esta bandera es el espejo
   * persistido que permite restaurar despues, no la unica proteccion.
   */
  async ocultarNegociosSinDerecho() {
    const { rowCount } = await pool.query(
      `UPDATE businesses b
          SET publicacion_estado = 'oculto_suscripcion',
              updated_at = NOW()
         FROM usuarios u
        WHERE u.id = b.owner_id
          AND b.publicacion_estado = 'visible'
          AND NOT ${ownerEntitledSql("u")}`
    );
    return rowCount;
  },

  /**
   * Restaura la bandera de publicacion de los negocios cuyo propietario
   * SI tiene derecho comercial (prueba vigente o suscripcion activa).
   * Solo mueve la bandera comercial: la aprobacion (`estado`) no se
   * cambia, asi que un negocio pendiente o suspendido por moderacion
   * jamas se vuelve publico por si solo.
   */
  async restaurarNegociosConDerecho() {
    const { rowCount } = await pool.query(
      `UPDATE businesses b
          SET publicacion_estado = 'visible',
              updated_at = NOW()
         FROM usuarios u
        WHERE u.id = b.owner_id
          AND b.publicacion_estado = 'oculto_suscripcion'
          AND ${ownerEntitledSql("u")}`
    );
    return rowCount;
  },

  /**
   * Version por usuario de `ocultarNegociosSinDerecho`: oculta SOLO los
   * negocios de un vendedor que perdio su derecho comercial. Se usa en
   * vencimientos perezosos, suspension y cancelacion. Acepta un cliente
   * de transaccion para que el cambio sea atomico con el flujo que lo
   * provoca (renovacion/cancelacion).
   */
  async ocultarNegociosDeUsuario(usuarioId, client = pool) {
    const { rowCount } = await client.query(
      `UPDATE businesses b
          SET publicacion_estado = 'oculto_suscripcion',
              updated_at = NOW()
         FROM usuarios u
        WHERE u.id = b.owner_id
          AND u.id = $1
          AND b.publicacion_estado = 'visible'
          AND NOT ${ownerEntitledSql("u")}`,
      [usuarioId]
    );
    return rowCount;
  },

  /**
   * Version por usuario de `restaurarNegociosConDerecho`: vuelve a
   * 'visible' los negocios de un vendedor que recupero su derecho
   * comercial. Solo toca la bandera de publicacion; `estado`
   * (moderacion) nunca cambia. Si el vendedor sigue suspendido o sin
   * derecho, no restaura nada.
   */
  async restaurarNegociosDeUsuario(usuarioId, client = pool) {
    const { rowCount } = await client.query(
      `UPDATE businesses b
          SET publicacion_estado = 'visible',
              updated_at = NOW()
         FROM usuarios u
        WHERE u.id = b.owner_id
          AND u.id = $1
          AND b.publicacion_estado = 'oculto_suscripcion'
          AND ${ownerEntitledSql("u")}`,
      [usuarioId]
    );
    return rowCount;
  },

  /**
   * Sincronizacion completa de vencimientos (perezosa o programada):
   *   1. suscripciones vencidas -> 'expired'
   *   2. pruebas vencidas       -> estado_cuenta 'EXPIRED'
   *   3. negocios sin derecho   -> 'oculto_suscripcion'
   *   4. negocios con derecho   -> 'visible' (auto-reparacion)
   *
   * Es idempotente y no borra datos. Todas las operaciones publicas
   * VUELVEN a comprobar el derecho en vivo, de modo que un retraso del
   * cron nunca deja un negocio vencido visible.
   */
  async sincronizarVencimientosComerciales() {
    const suscripcionesVencidas = await this.expirarSuscripcionesVencidas();
    const pruebasVencidas = await this.marcarPruebasVencidas();
    const ocultos = await this.ocultarNegociosSinDerecho();
    const restaurados = await this.restaurarNegociosConDerecho();
    return { suscripcionesVencidas, pruebasVencidas, ocultos, restaurados };
  },

  // Alias retrocompatible.
  async sincronizarVencimientos() {
    return this.sincronizarVencimientosComerciales();
  },

  /**
   * Cancela la suscripcion vigente del vendedor.
   *
   * - La cuenta pasa a EXPIRED, salvo que este SUSPENDED (la suspension
   *   solo la levanta el administrador).
   * - La publicacion se sincroniza: si no queda prueba vigente, los
   *   negocios quedan ocultos; si la prueba sigue viva, no se oculta
   *   nada porque el derecho comercial continua.
   * - Transaccion: suscripcion, cuenta y publicacion cambian juntas.
   */
  async cancelarSuscripcion(usuarioId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `UPDATE subscriptions
            SET estado = 'cancelled', cancelada_at = NOW(), updated_at = NOW()
          WHERE usuario_id = $1 AND estado = 'active'
        RETURNING id, estado`,
        [usuarioId]
      );
      if (rows.length > 0) {
        await client.query(
          `UPDATE usuarios
              SET estado_cuenta = CASE
                    WHEN estado_cuenta = 'SUSPENDED' THEN 'SUSPENDED'
                    ELSE 'EXPIRED'
                  END,
                  updated_at = NOW()
            WHERE id = $1`,
          [usuarioId]
        );
        // Sin derecho vigente -> ocultos; con prueba aun vigente ->
        // restauracion (no-op si ya estaban visibles).
        await this.ocultarNegociosDeUsuario(usuarioId, client);
        await this.restaurarNegociosDeUsuario(usuarioId, client);
      }
      await client.query("COMMIT");
      return rows[0] || null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // ------------------------------------------------------------
  // BITACORA DE PAGOS (idempotencia)
  // ------------------------------------------------------------
  /**
   * Registra un evento de pago. Devuelve { duplicado: true } si la clave
   * de idempotencia ya se habia procesado (evento repetido).
   */
  async registrarPago({
    suscripcionId, usuarioId, planId, proveedor, evento, estado,
    referenciaExterna, pagoId, monto, moneda, idempotencyKey, payload,
  }) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO suscripcion_pagos
           (suscripcion_id, usuario_id, plan_id, proveedor, evento, estado,
            referencia_externa, pago_id, monto, moneda, idempotency_key, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, created_at`,
        [
          suscripcionId || null, usuarioId || null, planId || null,
          proveedor || "mock", evento, estado,
          referenciaExterna || null, pagoId || null,
          monto ?? null, moneda || "COP",
          idempotencyKey || null,
          payload ? JSON.stringify(payload) : null,
        ]
      );
      return { duplicado: false, registro: rows[0] };
    } catch (error) {
      if (error && error.code === "23505") {
        // Evento repetido: no se procesa de nuevo.
        return { duplicado: true, registro: null };
      }
      throw error;
    }
  },

  async listPagos(usuarioId) {
    const { rows } = await pool.query(
      `SELECT id, suscripcion_id, proveedor, evento, estado, referencia_externa,
              pago_id, monto, moneda, created_at
         FROM suscripcion_pagos
        WHERE usuario_id = $1
        ORDER BY created_at DESC`,
      [usuarioId]
    );
    return rows;
  },

  // ------------------------------------------------------------
  // ADMINISTRACION
  // ------------------------------------------------------------
  /** Listado de vendedores con su estado comercial (para el panel admin). */
  async listVendedoresConEstado() {
    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol_id, u.estado_cuenta,
              u.trial_inicio, u.trial_fin, u.suspension_motivo, u.suspension_fecha,
              u.created_at,
              (u.trial_fin IS NOT NULL AND u.trial_fin > NOW()) AS trial_vigente,
              GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (u.trial_fin - NOW()))))::bigint AS segundos_restantes,
              (SELECT COUNT(*)::int FROM subscriptions s
                WHERE s.usuario_id = u.id AND s.estado = 'active'
                  AND s.ends_at IS NOT NULL AND s.ends_at > NOW()) AS suscripciones_activas,
              (SELECT p.nombre FROM subscriptions s JOIN plans p ON p.id = s.plan_id
                WHERE s.usuario_id = u.id AND s.estado = 'active'
                  AND s.ends_at IS NOT NULL AND s.ends_at > NOW()
                ORDER BY s.ends_at DESC LIMIT 1) AS plan_nombre,
              (SELECT s.ends_at FROM subscriptions s
                WHERE s.usuario_id = u.id AND s.estado = 'active'
                  AND s.ends_at IS NOT NULL AND s.ends_at > NOW()
                ORDER BY s.ends_at DESC LIMIT 1) AS fin_suscripcion,
              (SELECT COUNT(*)::int FROM businesses b
                WHERE b.owner_id = u.id
                  AND b.publicacion_estado = 'oculto_suscripcion') AS negocios_ocultos
         FROM usuarios u
        WHERE u.rol_id = 2
        ORDER BY u.created_at DESC`
    );
    return rows.map((u) => ({
      ...u,
      estado_resuelto: this.resolverEstado(u),
      // Dias restantes calculados con el reloj de PostgreSQL (misma
      // regla que la autorizacion); nunca con el reloj del navegador.
      dias_restantes: u.trial_vigente
        ? Math.max(0, Math.ceil(Number(u.segundos_restantes || 0) / 86400))
        : 0,
    }));
  },

  /** Suspende o reactiva una cuenta de vendedor (administracion). */
  async setSuspencion(usuarioId, { suspendido, motivo }) {
    if (suspendido) {
      const { rows } = await pool.query(
        `UPDATE usuarios
            SET estado_cuenta = 'SUSPENDED',
                suspension_motivo = $2,
                suspension_fecha = NOW(),
                updated_at = NOW()
          WHERE id = $1 AND rol_id = 2
        RETURNING id, estado_cuenta, suspension_motivo, suspension_fecha`,
        [usuarioId, motivo || null]
      );
      // Un vendedor suspendido deja de ser publico de inmediato.
      if (rows[0]) await this.ocultarNegociosDeUsuario(usuarioId);
      return rows[0] || null;
    }
    // Reactivar: recupera el estado que corresponda al derecho VIGENTE.
    // Prioridad: suscripcion activa -> ACTIVE; prueba vigente -> TRIALING;
    // prueba vencida -> EXPIRED; vendedor anterior -> NULL (sin politica).
    const { rows } = await pool.query(
      `UPDATE usuarios u
          SET estado_cuenta = CASE
                WHEN EXISTS (
                  SELECT 1 FROM subscriptions s
                   WHERE s.usuario_id = u.id
                     AND s.estado = 'active'
                     AND s.ends_at IS NOT NULL
                     AND s.ends_at > NOW()
                ) THEN 'ACTIVE'
                WHEN u.trial_fin IS NOT NULL AND u.trial_fin > NOW() THEN 'TRIALING'
                WHEN u.trial_inicio IS NOT NULL THEN 'EXPIRED'
                ELSE NULL
              END,
              suspension_motivo = NULL,
              suspension_fecha = NULL,
              updated_at = NOW()
        WHERE u.id = $1 AND u.rol_id = 2
        RETURNING u.id, u.estado_cuenta`,
      [usuarioId]
    );
    // Al reactivar se recalcula la publicacion con el derecho vigente:
    // si la prueba sigue activa (o hay suscripcion) vuelve a ser
    // visible; si ya vencio, permanece oculto.
    if (rows[0]) {
      await this.ocultarNegociosDeUsuario(usuarioId);
      await this.restaurarNegociosDeUsuario(usuarioId);
    }
    return rows[0] || null;
  },
};

module.exports = SuscripcionModel;
