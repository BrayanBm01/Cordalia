const pool = require("../config/db");

const COLUMNS = `pr.id, pr.business_id, pr.plan_id, pr.service_id, pr.nombre, pr.descripcion,
       pr.tipo_descuento, pr.valor_descuento, pr.precio_anterior, pr.precio_promocional,
       pr.imagen_url, pr.fecha_inicio, pr.fecha_fin, pr.estado, pr.created_at, pr.updated_at`;

// Sin prefijo para cláusulas RETURNING (no existe alias pr en INSERT/UPDATE).
const RETURN_COLUMNS = `id, business_id, plan_id, service_id, nombre, descripcion,
       tipo_descuento, valor_descuento, precio_anterior, precio_promocional,
       imagen_url, fecha_inicio, fecha_fin, estado, created_at, updated_at`;

async function withRelated(promo) {
  if (!promo) return promo;
  const out = { ...promo };
  if (promo.plan_id) {
    const { rows } = await pool.query(
      `SELECT id, business_id, nombre, precio, tipo_precio, tipo_plan,
              duracion_dias, duracion_noches, destino, estado, slug
       FROM tour_plans WHERE id = $1`,
      [promo.plan_id]
    );
    out.plan = rows[0] || null;
  }
  if (promo.service_id) {
    const { rows } = await pool.query(
      `SELECT id, business_id, nombre, descripcion
       FROM business_services WHERE id = $1`,
      [promo.service_id]
    );
    out.service = rows[0] || null;
  }
  return out;
}

const PromotionModel = {
  async list(businessId, visible = false) {
    let query = `
      SELECT ${COLUMNS}, p.nombre AS plan_nombre, s.nombre AS service_nombre
      FROM promotions pr
      LEFT JOIN tour_plans p ON p.id = pr.plan_id
      LEFT JOIN business_services s ON s.id = pr.service_id
      WHERE pr.business_id = $1
    `;
    if (visible) {
      query += ` AND pr.estado = 'activo' AND CURRENT_DATE BETWEEN pr.fecha_inicio AND pr.fecha_fin`;
    }
    query += ` ORDER BY pr.id DESC`;
    const { rows } = await pool.query(query, [businessId]);
    return Promise.all(rows.map(withRelated));
  },

  async listActiveByPlan(planId) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS}
       FROM promotions pr
       WHERE pr.plan_id = $1
         AND pr.estado = 'activo'
         AND CURRENT_DATE BETWEEN pr.fecha_inicio AND pr.fecha_fin
       ORDER BY pr.fecha_inicio ASC`,
      [planId]
    );
    return Promise.all(rows.map(withRelated));
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS}, p.nombre AS plan_nombre, s.nombre AS service_nombre
       FROM promotions pr
       LEFT JOIN tour_plans p ON p.id = pr.plan_id
       LEFT JOIN business_services s ON s.id = pr.service_id
       WHERE pr.id = $1`,
      [id]
    );
    return withRelated(rows[0] || null);
  },

  async findByBusinessAndId(businessId, promoId) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS}
       FROM promotions pr
       WHERE pr.id = $1 AND pr.business_id = $2`,
      [promoId, businessId]
    );
    return withRelated(rows[0] || null);
  },

  async create(data) {
    const { business_id, plan_id, service_id, nombre, descripcion, tipo_descuento,
            valor_descuento, precio_anterior, precio_promocional, imagen_url,
            fecha_inicio, fecha_fin } = data;
    const { rows } = await pool.query(
      `INSERT INTO promotions
        (business_id, plan_id, service_id, nombre, descripcion, tipo_descuento,
         valor_descuento, precio_anterior, precio_promocional, imagen_url,
         fecha_inicio, fecha_fin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING ${RETURN_COLUMNS}`,
      [business_id, plan_id || null, service_id || null, nombre, descripcion, tipo_descuento,
       valor_descuento, precio_anterior, precio_promocional, imagen_url, fecha_inicio, fecha_fin]
    );
    return withRelated(rows[0]);
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const val = keys.map((k) => fields[k]);
    val.push(id);
    const { rows } = await pool.query(
      `UPDATE promotions SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id=$${val.length}
       RETURNING ${RETURN_COLUMNS}`,
      val
    );
    return withRelated(rows[0] || null);
  },

  async setEstado(id, estado) {
    const { rows } = await pool.query(
      `UPDATE promotions SET estado = $1, updated_at = NOW() WHERE id = $2
       RETURNING ${RETURN_COLUMNS}`,
      [estado, id]
    );
    return withRelated(rows[0] || null);
  },

  async delete(id, businessId) {
    const { rowCount } = await pool.query(
      "DELETE FROM promotions WHERE id = $1 AND business_id = $2",
      [id, businessId]
    );
    return rowCount > 0;
  },
};

module.exports = PromotionModel;