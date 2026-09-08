const pool = require("../config/db");

const BASE_COLUMNS = `p.id, p.business_id, p.nombre, p.slug, p.descripcion, p.destination_id,
       p.destino, p.duracion_dias, p.duracion_noches, p.precio, p.tipo_precio,
       p.precio_anterior, p.tipo_plan, p.incluye, p.itinerario, p.moneda,
       p.estado, p.created_at, p.updated_at`;

// Misma lista sin el prefijo de alias, para cláusulas RETURNING (no hay alias p).
const RETURN_COLUMNS = `id, business_id, nombre, slug, descripcion, destination_id,
       destino, duracion_dias, duracion_noches, precio, tipo_precio,
       precio_anterior, tipo_plan, incluye, itinerario, moneda,
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
              tipo_descuento, valor_descuento, precio_anterior, precio_promocional,
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
            duracion_noches, precio, tipo_precio, precio_anterior, tipo_plan, incluye, itinerario, moneda } = data;
    const { rows } = await pool.query(
      `INSERT INTO tour_plans
        (business_id, nombre, slug, descripcion, destination_id, destino, duracion_dias,
         duracion_noches, precio, tipo_precio, precio_anterior, tipo_plan, incluye, itinerario, moneda)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING ${RETURN_COLUMNS}`,
      [business_id, nombre, slug, descripcion, destination_id, destino, duracion_dias,
       duracion_noches, precio, tipo_precio, precio_anterior, tipo_plan, JSON.stringify(incluye),
       JSON.stringify(itinerario), moneda]
    );
    return withImages(rows[0]);
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const val = keys.map((k) => {
      if (k === "incluye" || k === "itinerario") return JSON.stringify(fields[k]);
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