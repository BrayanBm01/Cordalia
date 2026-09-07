const pool = require("../config/db");

const ReviewModel = {
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT r.id, r.user_id, r.business_id, r.rating, r.comment, r.estado,
              r.created_at, r.updated_at, b.owner_id AS business_owner_id,
              u.nombre AS autor_nombre
       FROM reviews r
       JOIN businesses b ON b.id = r.business_id
       JOIN usuarios u ON u.id = r.user_id
       WHERE r.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findActiveByUserAndBusiness(userId, businessId) {
    const { rows } = await pool.query(
      `SELECT id FROM reviews
       WHERE user_id = $1 AND business_id = $2 AND estado = 'active'
       LIMIT 1`,
      [userId, businessId]
    );
    return rows[0] || null;
  },

  async statsByBusiness(businessId, soloActivas = true) {
    const cond = soloActivas ? " AND r.estado = 'active'" : "";
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS cantidad,
              COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) AS promedio
       FROM reviews r
       WHERE r.business_id = $1${cond}`,
      [businessId]
    );
    return { cantidad: rows[0].cantidad, promedio: Number(rows[0].promedio) };
  },

  async listByBusiness(businessId, userId = null) {
    const { rows } = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at,
              r.user_id AS autor_id, u.nombre AS autor_nombre
       FROM reviews r
       JOIN usuarios u ON u.id = r.user_id
       WHERE r.business_id = $1 AND r.estado = 'active'
       ORDER BY r.created_at DESC`,
      [businessId]
    );
    const reviews = rows.map((r) => ({
      ...r,
      puedo_editar: !!userId && r.autor_id === userId,
    }));
    if (reviews.length === 0) return reviews;

    const { rows: replies } = await pool.query(
      `SELECT rr.id, rr.review_id, rr.reply, rr.created_at, u.nombre AS autor_nombre
       FROM review_replies rr
       JOIN usuarios u ON u.id = rr.user_id
       WHERE rr.review_id = ANY($1::int[])
       ORDER BY rr.created_at ASC`,
      [reviews.map((r) => r.id)]
    );
    return reviews.map((r) => ({
      ...r,
      respuestas: replies.filter((rp) => rp.review_id === r.id),
    }));
  },

  async create(userId, businessId, rating, comment) {
    const { rows } = await pool.query(
      `INSERT INTO reviews (user_id, business_id, rating, comment, estado)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, user_id, business_id, rating, comment, estado, created_at`,
      [userId, businessId, rating, comment]
    );
    return rows[0];
  },

  async update(id, { rating, comment }) {
    const sets = [];
    const values = [id];
    let ph = 1;
    if (rating !== undefined) {
      ph += 1;
      sets.push(`rating = $${ph}`);
      values.push(rating);
    }
    if (comment !== undefined) {
      ph += 1;
      sets.push(`comment = $${ph}`);
      values.push(comment === "" ? null : comment);
    }
    if (sets.length === 0) {
      return await this.findById(id);
    }
    sets.push("updated_at = now()");
    const { rows } = await pool.query(
      `UPDATE reviews
       SET ${sets.join(", ")}
       WHERE id = $1
       RETURNING id, user_id, business_id, rating, comment, estado, updated_at`,
      values
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rowCount } = await pool.query(`DELETE FROM reviews WHERE id = $1`, [id]);
    return rowCount > 0;
  },

  async setEstado(id, estado) {
    const { rows } = await pool.query(
      `UPDATE reviews SET estado = $2, updated_at = now() WHERE id = $1
       RETURNING id, estado`,
      [id, estado]
    );
    return rows[0] || null;
  },

  async listRecent(limit = 100) {
    const { rows } = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.estado, r.created_at,
              r.user_id AS autor_id, u.nombre AS autor_nombre,
              r.business_id, b.nombre AS negocio_nombre, b.owner_id AS business_owner_id
       FROM reviews r
       JOIN usuarios u ON u.id = r.user_id
       JOIN businesses b ON b.id = r.business_id
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  },

  // ---------- Respuestas ----------
  async findReplyByReview(reviewId) {
    const { rows } = await pool.query(
      `SELECT rr.id, rr.review_id, rr.user_id, rr.reply, rr.created_at,
              u.nombre AS autor_nombre
       FROM review_replies rr
       JOIN usuarios u ON u.id = rr.user_id
       WHERE rr.review_id = $1`,
      [reviewId]
    );
    return rows[0] || null;
  },

  async addReply(reviewId, userId, reply) {
    const { rows } = await pool.query(
      `INSERT INTO review_replies (review_id, user_id, reply)
       VALUES ($1, $2, $3)
       RETURNING id, review_id, user_id, reply, created_at`,
      [reviewId, userId, reply]
    );
    return rows[0];
  },

  async removeReplyByReview(reviewId) {
    const { rowCount } = await pool.query(
      `DELETE FROM review_replies WHERE review_id = $1`,
      [reviewId]
    );
    return rowCount > 0;
  },
};

module.exports = ReviewModel;