const pool = require("../config/db");

const FavoritoModel = {
  // ---------- Destinos ----------
  async listDestinosByUser(userId) {
    const { rows } = await pool.query(
      `SELECT l.id, l.nombre, l.descripcion, l.ubicacion, l.imagen, l.slug,
              fd.created_at AS favorito_creado
       FROM favorite_destinos fd
       JOIN lugares l ON l.id = fd.destination_id
       WHERE fd.user_id = $1
       ORDER BY fd.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async existsDestino(userId, destinationId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM favorite_destinos WHERE user_id = $1 AND destination_id = $2 LIMIT 1`,
      [userId, destinationId]
    );
    return rows.length > 0;
  },

  async addDestino(userId, destinationId) {
    const { rowCount } = await pool.query(
      `INSERT INTO favorite_destinos (user_id, destination_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, destination_id) DO NOTHING`,
      [userId, destinationId]
    );
    return rowCount > 0;
  },

  async removeDestino(userId, destinationId) {
    const { rowCount } = await pool.query(
      `DELETE FROM favorite_destinos WHERE user_id = $1 AND destination_id = $2`,
      [userId, destinationId]
    );
    return rowCount > 0;
  },

  // ---------- Negocios ----------
  async listNegociosByUser(userId) {
    const { rows } = await pool.query(
      `SELECT b.id, b.owner_id, b.category_id, b.destination_id, b.nombre, b.slug,
              b.descripcion, b.direccion, b.telefono, b.email_contacto, b.portada_url,
              b.estado, b.precio_min, b.precio_max, b.moneda,
              c.nombre AS categoria, l.nombre AS destino,
              fn.created_at AS favorito_creado
       FROM favorite_negocios fn
       JOIN businesses b ON b.id = fn.business_id
       LEFT JOIN business_categories c ON c.id = b.category_id
       LEFT JOIN lugares l ON l.id = b.destination_id
       WHERE fn.user_id = $1 AND b.estado = 'approved'
       ORDER BY fn.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async existsNegocio(userId, businessId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM favorite_negocios WHERE user_id = $1 AND business_id = $2 LIMIT 1`,
      [userId, businessId]
    );
    return rows.length > 0;
  },

  async addNegocio(userId, businessId) {
    const { rowCount } = await pool.query(
      `INSERT INTO favorite_negocios (user_id, business_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, business_id) DO NOTHING`,
      [userId, businessId]
    );
    return rowCount > 0;
  },

  async removeNegocio(userId, businessId) {
    const { rowCount } = await pool.query(
      `DELETE FROM favorite_negocios WHERE user_id = $1 AND business_id = $2`,
      [userId, businessId]
    );
    return rowCount > 0;
  },
};

module.exports = FavoritoModel;