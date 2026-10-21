const pool = require("../config/db");

// NOTA: los planes turisticos de Cordalia NO tienen pagos. Las inscripciones
// son gratuitas (estado 'confirmada') y el precio es solo informativo.
// El cobro comercial de los vendedores vive en `subscriptions` (flujo
// separado, ver services/subscriptionPaymentService.js).

const BASE_COLUMNS = `p.id, p.business_id, p.nombre, p.slug, p.descripcion, p.destination_id,
       p.destino, p.duracion_dias, p.duracion_noches, p.precio, p.tipo_precio,
       p.tipo_plan, p.incluye, p.itinerario, p.moneda,
       p.descuentos_rango, p.capacidad_referencial,
       p.estado, p.created_at, p.updated_at`;

// Misma lista sin el prefijo de alias, para cláusulas RETURNING (no hay alias p).
const RETURN_COLUMNS = `id, business_id, nombre, slug, descripcion, destination_id,
       destino, duracion_dias, duracion_noches, precio, tipo_precio,
       tipo_plan, incluye, itinerario, moneda,
       descuentos_rango, capacidad_referencial,
       estado, created_at, updated_at`;

const BelongsToQuery = `
  SELECT p.*,
         l.nombre AS destino_lugar, l.slug AS destino_slug,
         b.nombre AS negocio_nombre, b.slug AS negocio_slug, b.estado AS negocio_estado,
         b.whatsapp AS negocio_whatsapp, b.telefono AS negocio_telefono,
         b.email_contacto AS negocio_email, b.website AS negocio_website,
         b.portada_url AS negocio_portada, b.direccion AS negocio_direccion
  FROM tour_plans p
  LEFT JOIN lugares l ON l.id = p.destination_id
  LEFT JOIN businesses b ON b.id = p.business_id
`;

async function withImages(plan) {
  if (!plan) return plan;
  const { rows } = await pool.query(
    `SELECT id, plan_id, url, alt_text, is_primary, orden, created_at
     FROM tour_plan_images WHERE plan_id = $1
     ORDER BY is_primary DESC, orden ASC, id ASC`,
    [plan.id]
  );
  return { ...plan, plan_imagenes: rows };
}

const PlanModel = {
  /**
   * Listado de planes.
   * - Con businessId: planes de un negocio. Si `visible=true` filtra
   *   negocio aprobado + estado del plan activo (visión turista).
   * - Sin businessId: listado global público de planes activos de negocios aprobados.
   * Acepta filtros: search, destination_id, dias, incluye[], precio_min, precio_max,
   * tipo_plan, promos (solo planes con promoción activa en rango de fechas).
   */
  async list(opts = {}) {
    const {
      businessId = null,
      visible = false,
      search,
      destinationId,
      dias,
      diasMin,
      diasMax,
      incluye = [],
      precioMin,
      precioMax,
      tipoPlan,
      promos = false,
      limit = 100,
    } = opts;

    let where = [];
    let params = [];
    let v = 1;

    if (businessId) {
      where.push(`p.business_id = $${v++}`);
      params.push(businessId);
    }
    if (visible) {
      where.push(`p.estado = 'activo'`);
      where.push(`b.estado = 'approved'`);
    } else if (businessId) {
      where.push(`(p.estado = 'activo' OR p.estado = 'inactivo')`);
    }

    if (search) {
      where.push(`(p.nombre ILIKE $${v++} OR COALESCE(p.descripcion,'') ILIKE $${v++} OR COALESCE(p.destino,'') ILIKE $${v++})`);
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (destinationId) {
      where.push(`p.destination_id = $${v++}`);
      params.push(destinationId);
    }
    if (dias != null) {
      where.push(`p.duracion_dias = $${v++}`);
      params.push(dias);
    }
    if (diasMin != null) {
      where.push(`p.duracion_dias >= $${v++}`);
      params.push(diasMin);
    }
    if (diasMax != null) {
      where.push(`p.duracion_dias <= $${v++}`);
      params.push(diasMax);
    }
    for (const inc of incluye) {
      where.push(`EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.incluye) e WHERE e ILIKE $${v++})`);
      params.push(`%${inc}%`);
    }
    if (precioMin != null) {
      where.push(`p.precio >= $${v++}`);
      params.push(precioMin);
    }
    if (precioMax != null) {
      where.push(`p.precio <= $${v++}`);
      params.push(precioMax);
    }
    if (tipoPlan) {
      where.push(`p.tipo_plan = $${v++}`);
      params.push(tipoPlan);
    }
    if (promos) {
      where.push(`EXISTS (
        SELECT 1 FROM promotions pr
        WHERE pr.plan_id = p.id
          AND pr.estado = 'activo'
          AND CURRENT_DATE BETWEEN pr.fecha_inicio AND pr.fecha_fin
      )`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT ${BASE_COLUMNS}, l.nombre AS destino_lugar,
              b.nombre AS negocio_nombre, b.slug AS negocio_slug, b.estado AS negocio_estado
       FROM tour_plans p
       LEFT JOIN lugares l ON l.id = p.destination_id
       LEFT JOIN businesses b ON b.id = p.business_id
       ${whereSql}
       ORDER BY p.id DESC
       LIMIT $${v++}`,
      [...params, limit]
    );
    return rows;
  },

  async listWithImages(opts = {}) {
    const plans = await this.list(opts);
    const plansWithImages = await Promise.all(plans.map(withImages));
    return this.attachActivePromotions(plansWithImages);
  },

  // Adjunta las promociones activas (en rango de fechas) a cada plan del listado.
  async attachActivePromotions(plans) {
    if (!plans || plans.length === 0) return plans;
    const ids = plans.map((p) => p.id);
    const { rows } = await pool.query(
      `SELECT id, business_id, plan_id, service_id, nombre, descripcion,
              tipo_descuento, valor_descuento,
              imagen_url, fecha_inicio, fecha_fin, estado, created_at, updated_at
       FROM promotions
       WHERE plan_id = ANY($1)
         AND estado = 'activo'
         AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin
       ORDER BY fecha_inicio ASC`,
      [ids]
    );
    const byPlan = {};
    for (const r of rows) {
      (byPlan[r.plan_id] = byPlan[r.plan_id] || []).push(r);
    }
    return plans.map((p) => ({ ...p, promociones: byPlan[p.id] || [] }));
  },

  /**
   * Detalle. Si `visible=true` exige plan activo + negocio aprobado.
   */
  async findById(id, visible = false) {
    let query = `${BelongsToQuery} WHERE p.id = $1`;
    const params = [id];
    if (visible) {
      query += ` AND p.estado = 'activo' AND b.estado = 'approved'`;
    }
    const { rows } = await pool.query(query, params);
    return withImages(rows[0] || null);
  },

  async findByBusinessAndId(businessId, planId) {
    const { rows } = await pool.query(
      `${BelongsToQuery} WHERE p.id = $1 AND p.business_id = $2`,
      [planId, businessId]
    );
    return withImages(rows[0] || null);
  },

  async existsInOtherBusiness(planId, businessId) {
    const { rows } = await pool.query(
      "SELECT id FROM tour_plans WHERE id = $1 AND business_id <> $2 LIMIT 1",
      [planId, businessId]
    );
    return rows.length > 0;
  },

  async existsBySlug(slug, excludeId = null) {
    const { rows } = await pool.query(
      "SELECT id FROM tour_plans WHERE slug = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1",
      [slug, excludeId]
    );
    return rows.length > 0;
  },

  async create(data) {
    const { business_id, nombre, slug, descripcion, destination_id, destino, duracion_dias,
            duracion_noches, precio, tipo_precio, tipo_plan, incluye,
            itinerario, moneda, descuentos_rango, capacidad_referencial } = data;
    const { rows } = await pool.query(
      `INSERT INTO tour_plans
        (business_id, nombre, slug, descripcion, destination_id, destino, duracion_dias,
         duracion_noches, precio, tipo_precio, tipo_plan, incluye,
         itinerario, moneda, descuentos_rango, capacidad_referencial)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING ${RETURN_COLUMNS}`,
      [business_id, nombre, slug, descripcion, destination_id, destino, duracion_dias,
       duracion_noches, precio, tipo_precio, tipo_plan, JSON.stringify(incluye),
       JSON.stringify(itinerario), moneda, JSON.stringify(descuentos_rango || []),
       capacidad_referencial ?? null]
    );
    return withImages(rows[0]);
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const val = keys.map((k) => {
      if (k === "incluye" || k === "itinerario" || k === "descuentos_rango") return JSON.stringify(fields[k]);
      return fields[k];
    });
    val.push(id);
    const { rows } = await pool.query(
      `UPDATE tour_plans SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id=$${val.length}
       RETURNING ${RETURN_COLUMNS}`,
      val
    );
    return withImages(rows[0] || null);
  },

  async setEstado(id, estado) {
    const { rows } = await pool.query(
      `UPDATE tour_plans SET estado = $1, updated_at = NOW() WHERE id = $2
       RETURNING ${RETURN_COLUMNS}`,
      [estado, id]
    );
    return withImages(rows[0] || null);
  },

  async delete(id, businessId) {
    const { rowCount } = await pool.query(
      "DELETE FROM tour_plans WHERE id = $1 AND business_id = $2",
      [id, businessId]
    );
    return rowCount > 0;
  },

  // ---------- Precio por personas (un solo descuento efectivo) ----------
  /**
   * Calcula el precio para N personas aplicando UN solo descuento efectivo
   * sobre el SUBTOTAL ORIGINAL (nunca sobre un precio ya descontado):
   *
   *   1) Si existe promoción ACTIVA (estado='activo' y dentro de
   *      fecha_inicio/fecha_fin) se aplica SOLO la promoción.
   *   2) Si no hay promoción, se aplica el descuento por rango de personas.
   *   3) Nunca se combinan ambos descuentos.
   *
   *   subtotal_original = precio_original_persona * personas
   *   descuento         = subtotal_original * %/100
   *   total_original    = subtotal_original
   *   total             = subtotal_original - descuento
   *   precio_persona    = redondeo(total / personas)
   *
   * Devuelve la información diferenciada:
   *   - tipo_descuento       : 'promocion' | 'rango' | 'ninguno'
   *   - descuento_porcentaje : % efectivo aplicado (igual a descuento_total)
   *   - precio_original_persona / precio_persona / subtotal_original / total
   */
   async calcularPrecio(planId, personas, visible = false) {
     let plan = await this.findById(planId, visible);
     if (!plan) return null;
     const planes = await this.attachActivePromotions([plan]);
     plan = planes[0];

     const n = Math.max(1, Number(personas) || 1);
     const rangos = Array.isArray(plan.descuentos_rango) ? plan.descuentos_rango : [];
     const precioOriginalPersona = Math.round(Number(plan.precio) || 0);
     const promo = plan.promociones && plan.promociones[0] ? plan.promociones[0] : null;

     const clampPct = (v) => Math.max(0, Math.min(Number(v) || 0, 100));

     // ---- 1) Determinar el ÚNICO descuento que se aplica ----
     let tipoDescuento = "ninguno";
     let descuentoPorcentaje = 0; // % efectivo de referencia (display/snapshot)
     let precioPorPersona = precioOriginalPersona;
     let rangoAplicado = null;
     let pctPromo = 0;

     if (promo) {
       // La promoción activa tiene prioridad sobre el rango por personas.
       tipoDescuento = "promocion";
       const valor = Number(promo.valor_descuento) || 0;
if (promo.tipo_descuento === "porcentaje") {
          // Promo porcentual: el porcentaje configura el precio sobre el
          // precio normal del plan. Nunca se parte de otro precio.
          pctPromo = clampPct(valor);
          precioPorPersona = Math.round(precioOriginalPersona * (1 - pctPromo / 100));
        } else if (valor > 0) {
          // Promo de valor fijo: resta el monto COP al precio normal.
          precioPorPersona = Math.max(0, precioOriginalPersona - Math.round(valor));
        }
     } else {
       const ordenados = [...rangos].sort((a, b) => (Number(a.min) || 0) - (Number(b.min) || 0));
       for (const r of ordenados) {
         const min = Number(r.min) || 0;
         const max = Number(r.max) || Infinity;
         if (n >= min && (max === Infinity || n <= max)) {
           rangoAplicado = r;
           break;
         }
       }
       if (rangoAplicado) {
         const pctRango = clampPct(rangoAplicado.descuento);
         if (pctRango > 0) tipoDescuento = "rango";
         descuentoPorcentaje = pctRango;
         precioPorPersona = Math.round(precioOriginalPersona * (1 - pctRango / 100));
       }
     }

     // % efectivo para mostrar (en promo de precio fijo se calcula vs el original).
     if (promo && tipoDescuento === "promocion") {
       descuentoPorcentaje = pctPromo > 0
         ? pctPromo
         : precioOriginalPersona > 0
           ? Math.round((1 - precioPorPersona / precioOriginalPersona) * 100)
           : 0;
     }

     const subtotalOriginal = precioOriginalPersona * n;
     const descuentoMonto = Math.round((subtotalOriginal * descuentoPorcentaje) / 100);
     const total = Math.max(0, precioPorPersona * n);
     const precioPersona = Math.round(total / n);

     return {
       plan_id: plan.id,
       tipo_plan: plan.tipo_plan,
       tipo_precio: plan.tipo_precio,
       personas: n,
       moneda: plan.moneda || "COP",
       tipo_descuento: tipoDescuento,
       precio_original_persona: precioOriginalPersona,
       precio_base_persona: precioPorPersona,
       precio_persona: precioPersona,
       descuento_promocion: promo && pctPromo > 0 ? pctPromo : null,
       descuento_porcentaje: descuentoPorcentaje,
       descuento_total: descuentoPorcentaje,
       subtotal_original: subtotalOriginal,
       descuento_monto: descuentoMonto,
       rango_aplicado: rangoAplicado,
       total,
       total_original: precioOriginalPersona * n,
       ahorro_total: descuentoMonto,
       promocion: promo || null,
     };
   },

  // ---------- Sugerencia de transporte según personas ----------
  async sugerirTransporte(planId, personas) {
    const plan = await this.findById(planId);
    if (!plan) return null;
    const n = Number(personas) || 1;

    const { rows: vehiculos } = await pool.query(
      `SELECT id, business_id, nombre, tipo, placa, capacidad, descripcion
       FROM vehiculos v
       WHERE EXISTS (SELECT 1 FROM businesses b WHERE b.id = v.business_id AND b.id = $1)
         AND COALESCE(v.estado, 'disponible') = 'disponible'
       ORDER BY capacidad DESC, id ASC`,
      [plan.business_id]
    );

    const transportes = await this.listTransportes(planId);

    // Asigna vehículos por capacidad para cubrir a las personas.
    const asignados = [];
    let restante = n;
    for (const v of vehiculos) {
      if (restante <= 0) break;
      const cap = Number(v.capacidad) || 0;
      if (cap <= 0) continue;
      const usados = Math.min(Math.ceil(restante / cap), 1);
      asignados.push({ vehiculo: v, cantidad: usados });
      restante -= usados * cap;
    }
    const unidades = asignados.reduce((s, a) => s + a.cantidad, 0);

    // Sugerencia preferente basada en transportes configurados.
    if (transportes.length > 0) {
      const preferidos = transportes.slice(0, unidades > 0 ? unidades : 1).map((t) => ({
        transporte_id: t.id,
        vehiculo: {
          id: t.vehiculo_id,
          nombre: t.vehiculo_nombre,
          tipo: t.vehiculo_tipo,
          placa: t.vehiculo_placa,
          capacidad: t.vehiculo_capacidad,
        },
        conductor: t.conductor_id
          ? { id: t.conductor_id, nombre: t.conductor_nombre, telefono: t.conductor_telefono }
          : null,
        notas: t.notas,
      }));
      return {
        personas: n,
        total_vehiculos: Math.max(unidades, preferidos.length),
        sugeridos: preferidos,
      };
    }

    return {
      personas: n,
      total_vehiculos: unidades,
      sugeridos: asignados.map((a) => ({
        vehiculo: a.vehiculo,
        cantidad: a.cantidad,
      })),
    };
  },

  // ---------- Salidas (fechas con cupo) ----------
  async listSalidas(planId, visible = false) {
    let where = "s.plan_id = $1";
    const params = [planId];
    if (visible) {
      where += ` AND s.estado = 'activa' AND s.fecha >= CURRENT_DATE`;
    }
    const { rows } = await pool.query(
      `SELECT s.id, s.plan_id, to_char(s.fecha, 'YYYY-MM-DD')::text AS fecha,
              to_char(s.hora, 'HH24:MI')::text AS hora,
              s.cupo_maximo, s.cupo_ocupado,
              to_char(s.fecha_limite, 'YYYY-MM-DD')::text AS fecha_limite,
              to_char(s.hora_limite, 'HH24:MI')::text AS hora_limite,
              s.lugar_encuentro, s.estado, s.created_at, s.updated_at,
              (s.cupo_maximo - s.cupo_ocupado) AS cupo_disponible
       FROM tour_plan_salidas s
       WHERE ${where}
       ORDER BY s.fecha ASC, s.id ASC`,
      params
    );
    return rows;
  },

  async findSalidaById(planId, salidaId) {
    const { rows } = await pool.query(
      `SELECT s.id, s.plan_id, to_char(s.fecha, 'YYYY-MM-DD')::text AS fecha,
              to_char(s.hora, 'HH24:MI')::text AS hora,
              s.cupo_maximo, s.cupo_ocupado,
              to_char(s.fecha_limite, 'YYYY-MM-DD')::text AS fecha_limite,
              to_char(s.hora_limite, 'HH24:MI')::text AS hora_limite,
              s.lugar_encuentro, s.estado, s.created_at, s.updated_at,
              (s.cupo_maximo - s.cupo_ocupado) AS cupo_disponible
       FROM tour_plan_salidas s
       WHERE s.plan_id = $1 AND s.id = $2
       LIMIT 1`,
      [planId, salidaId]
    );
    return rows[0] || null;
  },

  async createSalida(planId, data) {
    const { rows } = await pool.query(
      `INSERT INTO tour_plan_salidas (plan_id, fecha, hora, cupo_maximo, fecha_limite, hora_limite, lugar_encuentro)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, plan_id, to_char(fecha, 'YYYY-MM-DD')::text AS fecha,
                 to_char(hora, 'HH24:MI')::text AS hora,
                 cupo_maximo, cupo_ocupado,
                 to_char(fecha_limite, 'YYYY-MM-DD')::text AS fecha_limite,
                 to_char(hora_limite, 'HH24:MI')::text AS hora_limite,
                 lugar_encuentro, estado, created_at, updated_at,
                 (cupo_maximo - cupo_ocupado) AS cupo_disponible`,
      [planId, data.fecha, data.hora || null, data.cupo_maximo, data.fecha_limite || null,
       data.hora_limite || null, data.lugar_encuentro || null]
    );
    return rows[0];
  },

  async updateSalida(salidaId, planId, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const values = keys.map((k) => fields[k]);
    values.push(planId, salidaId);
    const { rows } = await pool.query(
      `UPDATE tour_plan_salidas SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE plan_id=$${values.length - 1} AND id=$${values.length}
       RETURNING id, plan_id, to_char(fecha, 'YYYY-MM-DD')::text AS fecha,
                 to_char(hora, 'HH24:MI')::text AS hora,
                 cupo_maximo, cupo_ocupado,
                 to_char(fecha_limite, 'YYYY-MM-DD')::text AS fecha_limite,
                 to_char(hora_limite, 'HH24:MI')::text AS hora_limite,
                 lugar_encuentro, estado, created_at, updated_at,
                 (cupo_maximo - cupo_ocupado) AS cupo_disponible`,
      values
    );
    return rows[0] || null;
  },

  async deleteSalida(salidaId, planId) {
    const { rowCount } = await pool.query(
      "DELETE FROM tour_plan_salidas WHERE id = $1 AND plan_id = $2",
      [salidaId, planId]
    );
    return rowCount > 0;
  },

  // ---------- Inscripciones ----------
  async listInscripciones(salidaId, planId) {
    const { rows } = await pool.query(
      `SELECT i.id, i.salida_id, i.user_id, i.nombre, i.email, i.personas, i.mensaje,
              i.precio_original_persona, i.precio_persona, i.descuento_porcentaje,
              i.precio_total, i.tipo_descuento, i.estado, i.created_at, i.updated_at,
              to_char(i.fecha_limite_pago, 'YYYY-MM-DD"T"HH24:MI:SS')::text AS fecha_limite_pago,
              to_char(i.fecha_pago, 'YYYY-MM-DD"T"HH24:MI:SS')::text AS fecha_pago,
              i.pago_proveedor, i.pago_referencia, i.pago_metodo
       FROM inscripciones i
       JOIN tour_plan_salidas s ON s.id = i.salida_id
       WHERE i.salida_id = $1 AND s.plan_id = $2
       ORDER BY i.created_at ASC`,
      [salidaId, planId]
    );
    return rows;
  },

  // Resumen logístico de una salida: inscritos = CONFIRMADA (inscripcion
  // gratuita activa) + PENDIENTE + PAGADA (historicos). Las confirmadas,
  // canceladas y expiradas liberan cupo.
  async resumenInscripciones(salidaId, planId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN i.estado IN ('confirmada', 'pendiente', 'pagada') THEN i.personas ELSE 0 END), 0)::int AS inscritos,
              COALESCE(SUM(CASE WHEN i.estado IN ('confirmada', 'pendiente', 'pagada') THEN i.precio_total ELSE 0 END), 0)::bigint AS valor_total,
              COUNT(*)::int AS total_solicitudes,
              COALESCE(SUM(CASE WHEN i.estado = 'confirmada' THEN i.personas ELSE 0 END), 0)::int AS confirmadas,
              COALESCE(SUM(CASE WHEN i.estado = 'pendiente' THEN i.personas ELSE 0 END), 0)::int AS pendientes,
              COALESCE(SUM(CASE WHEN i.estado = 'pendiente' THEN i.precio_total ELSE 0 END), 0)::bigint AS valor_pendiente,
              COALESCE(SUM(CASE WHEN i.estado = 'pagada' THEN i.personas ELSE 0 END), 0)::int AS pagados,
              COALESCE(SUM(CASE WHEN i.estado = 'pagada' THEN i.precio_total ELSE 0 END), 0)::bigint AS valor_pagado,
              COALESCE(SUM(CASE WHEN i.estado = 'fallida' THEN i.personas ELSE 0 END), 0)::int AS fallidas,
              COALESCE(SUM(CASE WHEN i.estado IN ('cancelada', 'expirada') THEN i.personas ELSE 0 END), 0)::int AS retirados
       FROM inscripciones i
       JOIN tour_plan_salidas s ON s.id = i.salida_id
       WHERE i.salida_id = $1 AND s.plan_id = $2`,
      [salidaId, planId]
    );
    return rows[0];
  },

  async findInscripcionById(inscripcionId, salidaId, planId) {
    const { rows } = await pool.query(
      `SELECT i.id, i.salida_id, i.user_id, i.nombre, i.email, i.personas, i.mensaje,
              i.precio_original_persona, i.precio_persona, i.descuento_porcentaje,
              i.precio_total, i.tipo_descuento, i.estado, i.created_at, i.updated_at,
              to_char(i.fecha_limite_pago, 'YYYY-MM-DD"T"HH24:MI:SS')::text AS fecha_limite_pago,
              to_char(i.fecha_pago, 'YYYY-MM-DD"T"HH24:MI:SS')::text AS fecha_pago,
              i.pago_proveedor, i.pago_referencia, i.pago_metodo
       FROM inscripciones i
       JOIN tour_plan_salidas s ON s.id = i.salida_id
       WHERE i.id = $1 AND i.salida_id = $2 AND s.plan_id = $3
       LIMIT 1`,
      [inscripcionId, salidaId, planId]
    );
    return rows[0] || null;
  },

  async createInscripcion(salidaId, planId, data) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Bloquear salida y validar cupo disponible.
      const { rows: salidas } = await client.query(
        `SELECT * FROM tour_plan_salidas
         WHERE id = $1 AND plan_id = $2
         FOR UPDATE`,
        [salidaId, planId]
      );
      const salida = salidas[0];
      if (!salida) throw { status: 404, message: "Salida no encontrada" };
      if (salida.estado !== "activa") throw { status: 400, message: "La salida no está activa" };
      const hoy = new Date();
      const hoyLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
      const fmtFecha = (d) => {
        if (d instanceof Date) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
        return String(d || "").slice(0, 10);
      };
      if (fmtFecha(salida.fecha) < hoyLocal) {
        throw { status: 400, message: "La salida ya ocurrió: inscripciones cerradas" };
      }
      if (salida.fecha_limite) {
        const horaLim = salida.hora_limite ? String(salida.hora_limite).slice(0, 5) : "23:59";
        const cutoff = new Date(`${fmtFecha(salida.fecha_limite)}T${horaLim}:00`);
        if (cutoff < hoy) throw { status: 400, message: "Inscripciones cerradas (fecha límite superada)" };
      }
      const cupoDisponible = salida.cupo_maximo - salida.cupo_ocupado;
      if (data.personas > cupoDisponible) {
        throw { status: 400, message: `Cupo insuficiente: quedan ${cupoDisponible} de ${salida.cupo_maximo}` };
      }

      // ------------------------------------------------------------
      // Inscripcion GRATUITA: los planes turisticos de Cordalia NO
      // tienen pagos. El precio es solo informativo y se guarda como
      // snapshot; no se genera ningun registro de pago.
      // ------------------------------------------------------------
      // Evita inscripciones duplicadas del mismo usuario a la misma salida
      // (mismo viaje). Un mismo plan con varias fechas si admite inscripciones
      // a fechas distintas.
      // La fila de la salida esta bloqueada (FOR UPDATE) durante toda la
      // transaccion, por lo que dos peticiones concurrentes del mismo
      // usuario se serializan aqui. Ademas el indice unico parcial
      // uq_inscripciones_usuario_salida_activa actúa como red de
      // seguridad (se traduce a 409 mas abajo).
      if (data.user_id) {
        const { rows: dup } = await client.query(
          `SELECT id FROM inscripciones
           WHERE user_id = $1 AND salida_id = $2 AND estado = 'confirmada'
           LIMIT 1`,
          [data.user_id, salidaId]
        );
        if (dup.length > 0) {
          throw { status: 409, message: "Ya estás inscrito en esta fecha" };
        }
      }

      // Snapshot del precio calculado EN ESTE MOMENTO (la promoción puede
      // cambiar después sin afectar inscripciones pasadas).
      // El precio es INFORMATIVO: no genera cobro ni transacción.
      let precio = null;
      try {
        precio = await this.calcularPrecio(planId, data.personas, false);
      } catch (_) {
        precio = null;
      }

      let inserted;
      try {
        const { rows } = await client.query(
          `INSERT INTO inscripciones (salida_id, plan_id, user_id, nombre, email, personas, mensaje,
                  precio_original_persona, precio_persona, descuento_porcentaje, precio_total, tipo_descuento,
                  estado, fecha_limite_pago)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'confirmada', NULL)
           RETURNING id, salida_id, plan_id, user_id, nombre, email, personas, mensaje,
                    precio_original_persona, precio_persona, descuento_porcentaje,
                    precio_total, tipo_descuento, estado, created_at, updated_at`,
          [salidaId, planId, data.user_id || null, data.nombre || null, data.email || null,
           data.personas, data.mensaje || null,
           precio?.precio_original_persona ?? null,
           precio?.precio_persona ?? null,
           precio?.descuento_porcentaje ?? (precio?.descuento_total ?? 0),
           precio?.total ?? null,
           precio?.tipo_descuento ?? null]
        );
        inserted = rows[0];
      } catch (error) {
        // Violacion del indice unico parcial: inscripcion duplicada
        // creada entre tanto (concurso real). Se traduce a 409.
        if (error && error.code === "23505") {
          throw { status: 409, message: "Ya estás inscrito en esta fecha" };
        }
        throw error;
      }

      await client.query(
        `UPDATE tour_plan_salidas SET cupo_ocupado = cupo_ocupado + $1, updated_at = NOW()
         WHERE id = $2`,
        [data.personas, salidaId]
      );
      await client.query("COMMIT");
      return inserted;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async cancelarInscripcion(inscripcionId, salidaId, planId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: inscs } = await client.query(
        `SELECT id, personas, estado FROM inscripciones
         WHERE id = $1 AND salida_id = $2
         FOR UPDATE`,
        [inscripcionId, salidaId]
      );
      const insc = inscs[0];
      // Verificar que la inscripción pertenece a un plan.
      if (insc) {
        const { rows: joins } = await client.query(
          `SELECT 1 FROM tour_plan_salidas s
           WHERE s.id = $1 AND s.plan_id = $2 LIMIT 1`,
          [salidaId, planId]
        );
        if (joins.length === 0) throw { status: 404, message: "Inscripción no encontrada" };
        // Una inscripcion gratuita ('confirmada') SIEMPRE se puede cancelar
        // y libera su cupo (no hay pago que devolver). Los estados de pago
        // ('pendiente'/'fallida') tambien liberan cupo. 'cancelada'/'expirada'
        // ya no reservan cupo y 'pagada' (historico) no se cancela sin devolucion.
        if (insc.estado === "cancelada" || insc.estado === "expirada") {
          throw { status: 400, message: "La inscripción ya está cancelada o vencida" };
        }
        if (insc.estado === "vencida") {
          throw { status: 400, message: "No se puede cancelar una inscripción vencida" };
        }
        if (insc.estado === "pagada") {
          throw { status: 400, message: "No se puede cancelar una inscripción ya pagada" };
        }
        await client.query(
          `UPDATE inscripciones SET estado = 'cancelada', updated_at = NOW() WHERE id = $1`,
          [inscripcionId]
        );
        await client.query(
          `UPDATE tour_plan_salidas SET cupo_ocupado = GREATEST(cupo_ocupado - $1, 0), updated_at = NOW()
           WHERE id = $2`,
          [insc.personas, salidaId]
        );
      }
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Cancela una inscripcion PROPIA del usuario y libera su cupo.
  // Solo aplica a inscripciones gratuitas ('confirmada'): no hay pago que
  // devolver. El cupo se libera en la misma transaccion (atomicidad).
  async cancelarInscripcionPropia(inscripcionId, userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: inscs } = await client.query(
        `SELECT i.id, i.salida_id, i.personas, i.estado
           FROM inscripciones i
          WHERE i.id = $1 AND i.user_id = $2
          FOR UPDATE`,
        [inscripcionId, userId]
      );
      const insc = inscs[0];
      if (!insc) {
        throw { status: 404, message: "Inscripción no encontrada" };
      }
      if (insc.estado !== "confirmada") {
        throw {
          status: 400,
          message: `Solo puedes cancelar una inscripción activa (estado actual: ${insc.estado})`,
        };
      }
      await client.query(
        `UPDATE inscripciones SET estado = 'cancelada', updated_at = NOW() WHERE id = $1`,
        [inscripcionId]
      );
      await client.query(
        `UPDATE tour_plan_salidas
            SET cupo_ocupado = GREATEST(cupo_ocupado - $1, 0), updated_at = NOW()
          WHERE id = $2`,
        [insc.personas, insc.salida_id]
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // ---------- Transporte por plan ----------
  async listTransportes(planId) {
    const { rows } = await pool.query(
      `SELECT t.id, t.plan_id, t.salida_id, t.vehiculo_id, t.conductor_id, t.orden, t.notas,
              v.nombre AS vehiculo_nombre, v.tipo AS vehiculo_tipo,
              v.placa AS vehiculo_placa, v.capacidad AS vehiculo_capacidad,
              c.nombre AS conductor_nombre, c.telefono AS conductor_telefono
       FROM transportes t
       JOIN vehiculos v ON v.id = t.vehiculo_id
       LEFT JOIN conductores c ON c.id = t.conductor_id
       WHERE t.plan_id = $1
       ORDER BY t.orden ASC, t.id ASC`,
      [planId]
    );
    return rows;
  },

  // Asignaciones de transporte a una salida concreta.
  async listTransportesSalida(salidaId, planId) {
    const { rows } = await pool.query(
      `SELECT t.id, t.plan_id, t.salida_id, t.vehiculo_id, t.conductor_id, t.orden, t.notas,
              v.nombre AS vehiculo_nombre, v.tipo AS vehiculo_tipo,
              v.placa AS vehiculo_placa, v.capacidad AS vehiculo_capacidad,
              c.nombre AS conductor_nombre, c.telefono AS conductor_telefono
       FROM transportes t
       JOIN vehiculos v ON v.id = t.vehiculo_id
       LEFT JOIN conductores c ON c.id = t.conductor_id
       WHERE t.salida_id = $1 AND t.plan_id = $2
       ORDER BY t.orden ASC, t.id ASC`,
      [salidaId, planId]
    );
    return rows;
  },

  async addTransporte(planId, vehiculoId, conductorId, orden = 0, notas = null, salidaId = null) {
    const { rows } = await pool.query(
      `INSERT INTO transportes (plan_id, salida_id, vehiculo_id, conductor_id, orden, notas)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, plan_id, salida_id, vehiculo_id, conductor_id, orden, notas, created_at, updated_at`,
      [planId, salidaId || null, vehiculoId, conductorId || null, orden, notas]
    );
    return rows[0];
  },

  async deleteTransporteSalida(transporteId, planId, salidaId) {
    const { rowCount } = await pool.query(
      "DELETE FROM transportes WHERE id = $1 AND plan_id = $2 AND salida_id = $3",
      [transporteId, planId, salidaId]
    );
    return rowCount > 0;
  },

  // ---------- Recomendación de transporte para una salida ----------
  // Usa el TOTAL de personas inscritas en la salida, elige el vehículo
  // disponible con la capacidad mínima suficiente y un conductor libre.
  // No asigna un vehículo/conductor ya ocupado en otra salida del mismo día.
  async recomendarTransporteSalida(salidaId, planId, personas = null) {
    const salida = await this.findSalidaById(planId, salidaId);
    if (!salida) return null;
    const plan = await this.findById(planId);
    if (!plan) return null;

    const n = personas != null ? Math.max(1, Number(personas) || 1) : (Number(salida.cupo_ocupado) || 0);
    const businessId = plan.business_id;
    const fecha = String(salida.fecha).slice(0, 10);

    const { rows: vehiculos } = await pool.query(
      `SELECT v.id, v.nombre, v.tipo, v.placa, v.capacidad, v.marca, v.modelo, v.anio,
              v.estado, v.conductor_id
       FROM vehiculos v
       WHERE v.business_id = $1 AND COALESCE(v.estado, 'disponible') = 'disponible'
       ORDER BY v.capacidad ASC, v.id ASC`,
      [businessId]
    );

    // Vehículos/conductores ya usados en otra salida del mismo negocio
    // programada para el mismo día (solapamiento de horario).
    const { rows: usados } = await pool.query(
      `SELECT DISTINCT t.vehiculo_id, t.conductor_id
       FROM transportes t
       JOIN tour_plan_salidas s ON s.id = t.salida_id
       WHERE t.salida_id IS NOT NULL AND t.salida_id <> $1
         AND s.fecha = $2
         AND s.plan_id IN (SELECT p.id FROM tour_plans p WHERE p.business_id = $3)`,
      [salidaId, fecha, businessId]
    );
    const vehiculosUsados = new Set(usados.map((u) => Number(u.vehiculo_id)));
    const conductoresUsados = new Set(usados.filter((u) => u.conductor_id != null).map((u) => Number(u.conductor_id)));

    const { rows: conductores } = await pool.query(
      `SELECT id, nombre, telefono, licencia_categoria
       FROM conductores
       WHERE business_id = $1 AND disponible = true
       ORDER BY nombre ASC, id ASC`,
      [businessId]
    );

    let vehiculo = vehiculos.find((v) => Number(v.capacidad) >= n && !vehiculosUsados.has(Number(v.id))) || null;
    let conductor = null;
    if (vehiculo) {
      if (vehiculo.conductor_id && !conductoresUsados.has(Number(vehiculo.conductor_id))) {
        conductor = conductores.find((c) => Number(c.id) === Number(vehiculo.conductor_id)) || null;
      }
      if (!conductor) conductor = conductores.find((c) => !conductoresUsados.has(Number(c.id))) || null;
    }

    let mensaje = null;
    if (!vehiculo) {
      const hayVehiculos = vehiculos.some((v) => !vehiculosUsados.has(Number(v.id)));
      mensaje = hayVehiculos
        ? `No hay un vehículo disponible con capacidad para ${n} persona(s).`
        : `No hay vehículos disponibles: la flota está en uso para otra salida ese día.`;
    } else if (!conductor) {
      mensaje = "Vehículo suficiente, pero sin conductor disponible.";
    }

    const asignados = await this.listTransportesSalida(salidaId, planId);
    return {
      salida_id: salidaId,
      plan_id: planId,
      fecha,
      lugar_encuentro: salida.lugar_encuentro || null,
      personas: n,
      cupo_ocupado: Number(salida.cupo_ocupado) || 0,
      cupo_maximo: Number(salida.cupo_maximo) || 0,
      vehiculo: vehiculo
        ? { id: vehiculo.id, nombre: vehiculo.nombre, tipo: vehiculo.tipo, placa: vehiculo.placa, capacidad: vehiculo.capacidad }
        : null,
      conductor: conductor
        ? { id: conductor.id, nombre: conductor.nombre, telefono: conductor.telefono, licencia_categoria: conductor.licencia_categoria }
        : null,
      mensaje,
      asignados,
    };
  },

  async deleteTransporte(transporteId, planId) {
    const { rowCount } = await pool.query(
      "DELETE FROM transportes WHERE id = $1 AND plan_id = $2",
      [transporteId, planId]
    );
    return rowCount > 0;
  },

  // ---------- Imágenes ----------
  async listImages(planId) {
    const { rows } = await pool.query(
      `SELECT id, plan_id, url, alt_text, is_primary, orden, created_at
       FROM tour_plan_images WHERE plan_id = $1
       ORDER BY is_primary DESC, orden ASC, id ASC`,
      [planId]
    );
    return rows;
  },

  async addImage(planId, url, altText, isPrimary, orden = 0) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (isPrimary) {
        await client.query(
          "UPDATE tour_plan_images SET is_primary = false WHERE plan_id = $1",
          [planId]
        );
      } else {
        const { rows } = await client.query(
          "SELECT COUNT(*)::int AS c FROM tour_plan_images WHERE plan_id = $1",
          [planId]
        );
        if (rows[0].c === 0) isPrimary = true;
      }
      const { rows } = await client.query(
        `INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, plan_id, url, alt_text, is_primary, orden, created_at`,
        [planId, url, altText, isPrimary, orden]
      );
      await client.query("COMMIT");
      return rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async setPrimaryImage(imageId, planId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE tour_plan_images SET is_primary = false WHERE plan_id = $1",
        [planId]
      );
      const { rowCount } = await client.query(
        "UPDATE tour_plan_images SET is_primary = true WHERE id = $1 AND plan_id = $2",
        [imageId, planId]
      );
      await client.query("COMMIT");
      return rowCount > 0;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteImage(imageId, planId) {
    const { rowCount } = await pool.query(
      "DELETE FROM tour_plan_images WHERE id = $1 AND plan_id = $2",
      [imageId, planId]
    );
    return rowCount > 0;
  },
};

module.exports = PlanModel;