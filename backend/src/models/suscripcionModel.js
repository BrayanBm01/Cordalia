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

// Dias de prueba gratuita (7 dias consecutivos, no habiles).
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
  ESTADOS,

  // ------------------------------------------------------------
  // PRUEBA GRATUITA
  // ------------------------------------------------------------
  /**
   * Asigna la prueba gratuita de 7 dias a un vendedor recien creado.
   *
   * - Se calcula en el SERVIDOR: inicio = NOW(), fin = NOW() + 7 dias.
   * - Se asigna UNA SOLA VEZ por cuenta: si ya tiene prueba, no se
   *   reinicia (llamar de nuevo no cambia las fechas).
   * - Si el administrador crea la cuenta, aplica la misma regla.
   * - Los vendedores anteriores (sin trial) no se tocan: se les
   *   asigna la prueba solo si nunca la tuvieron.
   *
   * @param {object} [client] - Cliente de una transaccion en curso, para
   *   que la asignacion sea atomica con la creacion de la cuenta.
   */
  async asignarPruebaGratuita(usuarioId, client = pool) {
    const { rows } = await client.query(
      `UPDATE usuarios
          SET trial_inicio = NOW(),
              trial_fin = NOW() + ($2 || ' days')::interval,
              estado_cuenta = 'TRIALING',
              updated_at = NOW()
        WHERE id = $1
          AND trial_inicio IS NULL
          AND rol_id = 2
      RETURNING id, trial_inicio, trial_fin, estado_cuenta`,
      [usuarioId, String(DIAS_PRUEBA)]
    );
    if (rows.length > 0) return rows[0];
    // Ya tenia prueba (o no es vendedor): se devuelve el estado actual.
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
                ORDER BY s.ends_at DESC LIMIT 1) AS fin_suscripcion_activa
         FROM usuarios u
        WHERE u.id = $1`,
      [usuarioId]
    );
    const u = rows[0];
    if (!u) return null;

    const estado = this.resolverEstado(u);
    const diasRestantes = estado === "TRIALING" && u.trial_fin
      ? Math.max(0, Math.ceil((new Date(u.trial_fin) - new Date()) / 86400000))
      : 0;

    return {
      usuario_id: u.id,
      estado,
      trial_inicio: u.trial_inicio,
      trial_fin: u.trial_fin,
      dias_prueba: DIAS_PRUEBA,
      dias_restantes: diasRestantes,
      plan_activo_id: u.plan_activo_id || null,
      suscripcion_activa_id: u.suscripcion_activa_id || null,
      fin_suscripcion_activa: u.fin_suscripcion_activa || null,
      suspension_motivo: u.suspension_motivo || null,
      suspension_fecha: u.suspension_fecha || null,
      // Un vendedor anterior (sin poliza de prueba) NO se restringe.
      sin_polica: u.estado_cuenta === null && !u.trial_inicio,
    };
  },

  // Resuelve el estado a partir de la fila cruda (regla unica, usada
  // por estadoComercial y por las consultas de listado).
  resolverEstado(u) {
    if (u.estado_cuenta === "SUSPENDED") return "SUSPENDED";
    if (Number(u.suscripciones_activas || 0) > 0) return "ACTIVE";
    if (u.trial_fin && new Date(u.trial_fin) > new Date()) return "TRIALING";
    if (u.trial_inicio) return "EXPIRED";
    // Sin poliza aplicada (vendedor anterior): no se restringe.
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

      // La cuenta del vendedor queda ACTIVA.
      await client.query(
        `UPDATE usuarios
            SET estado_cuenta = 'ACTIVE', updated_at = NOW()
          WHERE id = $1`,
        [sub.usuario_id]
      );

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

  /** Cancela la suscripcion vigente del vendedor. */
  async cancelarSuscripcion(usuarioId) {
    const { rows } = await pool.query(
      `UPDATE subscriptions
          SET estado = 'cancelled', cancelada_at = NOW(), updated_at = NOW()
        WHERE usuario_id = $1 AND estado = 'active'
      RETURNING id, estado`,
      [usuarioId]
    );
    if (rows.length > 0) {
      await pool.query(
        `UPDATE usuarios SET estado_cuenta = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
        [usuarioId]
      );
    }
    return rows[0] || null;
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
                ORDER BY s.ends_at DESC LIMIT 1) AS fin_suscripcion
         FROM usuarios u
        WHERE u.rol_id = 2
        ORDER BY u.created_at DESC`
    );
    return rows.map((u) => ({
      ...u,
      estado_resuelto: this.resolverEstado(u),
      dias_restantes:
        u.trial_fin && new Date(u.trial_fin) > new Date()
          ? Math.max(0, Math.ceil((new Date(u.trial_fin) - new Date()) / 86400000))
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
      return rows[0] || null;
    }
    // Reactivar: vuelve a TRIALING si la prueba sigue vigente; si ya
    // vencio, a EXPIRED (debe contratar un plan para recuperar el acceso).
    const { rows } = await pool.query(
      `UPDATE usuarios
          SET estado_cuenta = CASE
                WHEN trial_fin IS NOT NULL AND trial_fin > NOW() THEN 'TRIALING'
                WHEN trial_inicio IS NOT NULL THEN 'EXPIRED'
                ELSE NULL
              END,
              suspension_motivo = NULL,
              suspension_fecha = NULL,
              updated_at = NOW()
        WHERE id = $1 AND rol_id = 2
        RETURNING id, estado_cuenta`,
      [usuarioId]
    );
    return rows[0] || null;
  },
};

module.exports = SuscripcionModel;
