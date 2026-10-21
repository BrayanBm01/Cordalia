// ============================================================
// InscripcionModel — inscripciones y pagos para el turista
// Ruta por usuario autenticado (IDOR): solo sus propias
// inscripciones. Los negocios llegan por el router de planes.
// ============================================================
const pool = require("../config/db");

// Query base: inscripcion + salida + plan + negocio (para el perfil
// del turista, comprobantes y panel de pago del detalle del plan).
const SELECT_CUENTA = `
  SELECT i.id, i.salida_id, i.user_id, i.nombre, i.email, i.personas, i.mensaje,
         i.estado, i.created_at, i.updated_at,
         to_char(i.fecha_limite_pago, 'YYYY-MM-DD"T"HH24:MI:SS')::text AS fecha_limite_pago,
         to_char(i.fecha_pago, 'YYYY-MM-DD"T"HH24:MI:SS')::text AS fecha_pago,
         i.pago_proveedor, i.pago_referencia, i.pago_metodo, i.pago_payload,
         i.precio_original_persona, i.precio_persona, i.descuento_porcentaje,
         i.precio_total, i.tipo_descuento,
         to_char(s.fecha, 'YYYY-MM-DD')::text AS salida_fecha,
         to_char(s.hora, 'HH24:MI')::text AS salida_hora,
         s.lugar_encuentro AS salida_lugar_encuentro, s.cupo_maximo, s.cupo_ocupado,
         p.id AS plan_id, p.nombre AS plan_nombre, p.slug AS plan_slug,
         p.destino AS plan_destino, p.duracion_dias, p.tipo_plan,
         b.id AS business_id, b.nombre AS business_nombre, b.slug AS business_slug,
         b.telefono AS business_telefono, b.whatsapp AS business_whatsapp
  FROM inscripciones i
  JOIN tour_plan_salidas s ON s.id = i.salida_id
  JOIN tour_plans p ON p.id = s.plan_id
  JOIN businesses b ON b.id = p.business_id
`;

// Los snapshots del proveedor (pago_payload) pueden contener datos
// operativos; no se exponen crudos al frontend.
function publica(inscripcion) {
  if (!inscripcion) return inscripcion;
  const { pago_payload, ...rest } = inscripcion;
  return rest;
}

const InscripcionModel = {
  // Devuelve las inscripciones del usuario (todas sus suscripciones) con
  // información de plan/salida/negocio para el perfil y comprobantes.
  async listMisInscripciones(userId) {
    const { rows } = await pool.query(
      `${SELECT_CUENTA}
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
      [userId]
    );
    return rows.map(publica);
  },

  // Inscripcion por id, con relaciones completas (comprobante).
  async findById(inscripcionId) {
    const { rows } = await pool.query(
      `${SELECT_CUENTA}
       WHERE i.id = $1
       LIMIT 1`,
      [inscripcionId]
    );
    return publica(rows[0] || null);
  },

  // ¿La inscripcion pertenece al negocio del usuario (BUSINESS)?
  async perteneceABusiness(inscripcionId, businessId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM inscripciones i
       JOIN tour_plan_salidas s ON s.id = i.salida_id
       JOIN tour_plans p ON p.id = s.plan_id
       WHERE i.id = $1 AND p.business_id = $2
       LIMIT 1`,
      [inscripcionId, businessId]
    );
    return rows.length > 0;
  },

  // Actualiza el snapshot de precios al cobrar (el backend recalcula
  // el precio vigente en el momento del pago; nunca lo informa el
  // frontend). Solo afecta a inscripciones aún no pagadas.
  async actualizarSnapshotPrecio(inscripcionId, precio) {
    if (!precio) return false;
    const { rowCount } = await pool.query(
      `UPDATE inscripciones SET
         precio_original_persona = $2,
         precio_persona = $3,
         descuento_porcentaje = $4,
         precio_total = $5,
         tipo_descuento = $6,
         updated_at = NOW()
       WHERE id = $1 AND estado IN ('pendiente', 'fallida')`,
      [
        inscripcionId,
        precio.precio_original_persona ?? null,
        precio.precio_persona ?? null,
        precio.descuento_porcentaje ?? (precio.descuento_total ?? 0),
        precio.total ?? null,
        precio.tipo_descuento ?? null,
      ]
    );
    return rowCount > 0;
  },

  // ------------------------------------------------------------
  // Expiración: PENDIENTE/FALLIDA vencida -> EXPIRADA (libera cupo)
  // y PAGADA cuyo viaje ya ocurrió -> VENCIDA (historial, sin
  // liberar cupo). Se llama de forma perezosa (pagar,
  // mis-inscripciones) y por el cron del servidor. Cada llamada es
  // atómica (cupo y estado juntos).
  // ------------------------------------------------------------
  async expirarVencidas() {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `UPDATE inscripciones SET estado = 'expirada', updated_at = NOW()
         WHERE estado IN ('pendiente', 'fallida') AND fecha_limite_pago < NOW()
         RETURNING id, salida_id, personas`,
        []
      );
      if (rows.length > 0) {
        const porSalida = {};
        for (const r of rows) {
          porSalida[r.salida_id] = (porSalida[r.salida_id] || 0) + Number(r.personas);
        }
        for (const [salidaId, personas] of Object.entries(porSalida)) {
          await client.query(
            `UPDATE tour_plan_salidas
             SET cupo_ocupado = GREATEST(cupo_ocupado - $1, 0), updated_at = NOW()
             WHERE id = $2`,
            [personas, salidaId]
          );
        }
      }
      // Viajes ya realizados: las inscripciones (gratuitas 'confirmada' o
      // historicas 'pagada') pasan a 'vencida' y quedan en el historial.
      // No liberan cupo y no se borra ningun registro.
      await client.query(
        `UPDATE inscripciones AS i
         SET estado = 'vencida', updated_at = NOW()
         FROM tour_plan_salidas AS s
         WHERE s.id = i.salida_id
           AND i.estado IN ('confirmada', 'pagada')
           AND s.fecha::date < CURRENT_DATE`,
        []
      );
      await client.query("COMMIT");
      return rows.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // ------------------------------------------------------------
  // Pago autorizado por el backend (nunca por el frontend).
  // ------------------------------------------------------------
  async marcarPagada(inscripcionId, { proveedor, referencia, metodo, payload }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: current } = await client.query(
        `SELECT id, estado FROM inscripciones WHERE id = $1 FOR UPDATE`,
        [inscripcionId]
      );
      const insc = current[0];
      if (!insc) throw { status: 404, message: "Inscripción no encontrada" };
      if (!["pendiente", "fallida"].includes(insc.estado)) {
        throw { status: 400, message: `La inscripción no admite pago en estado "${insc.estado}"` };
      }
      const { rows } = await client.query(
        `UPDATE inscripciones
         SET estado = 'pagada', fecha_pago = NOW(), updated_at = NOW(),
             pago_proveedor = $2, pago_referencia = $3, pago_metodo = $4, pago_payload = $5
         WHERE id = $1
         RETURNING id`,
        [inscripcionId, proveedor, referencia, metodo || null, payload ? JSON.stringify(payload) : null]
      );
      await client.query("COMMIT");
      return rows[0] ? this.findById(rows[0].id) : null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Pago rechazado por el proveedor -> FALLIDA (el usuario puede reintentar
  // mientras no venza fecha_limite_pago; el cupo sigue reservado).
  async marcarFallida(inscripcionId, { proveedor, referencia, metodo, payload }) {
    const { rows } = await pool.query(
      `UPDATE inscripciones
       SET estado = 'fallida', updated_at = NOW(),
           pago_proveedor = $2, pago_referencia = $3, pago_metodo = $4, pago_payload = $5
       WHERE id = $1 RETURNING id`,
      [inscripcionId, proveedor, referencia, metodo || null, payload ? JSON.stringify(payload) : null]
    );
    return rows.length > 0 ? this.findById(rows[0].id) : null;
  },
};

module.exports = InscripcionModel;