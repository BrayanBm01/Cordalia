const pool = require("../config/db");

const COLUMNS = `b.id, b.owner_id, b.category_id, b.destination_id, b.nombre, b.slug,
       b.descripcion, b.direccion, b.telefono, b.whatsapp, b.email_contacto,
       b.website, b.precio_min, b.precio_max, b.moneda, b.lat, b.lng,
       b.portada_url, b.estado, b.is_verified, b.is_featured, b.created_at, b.updated_at`;

const BusinessModel = {
  // ---------- Categorías ----------
  async listCategories() {
    const { rows } = await pool.query(
      `SELECT id, nombre, slug, descripcion, icono, activo
       FROM business_categories ORDER BY nombre ASC`
    );
    return rows;
  },

  async findCategoryById(id) {
    const { rows } = await pool.query(
      `SELECT id, nombre, slug, descripcion, icono, activo
       FROM business_categories WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  // ---------- Negocios ----------
  async listByRol(rol, userId) {
    let query = `
      SELECT ${COLUMNS}, c.nombre AS categoria, l.nombre AS destino
      FROM businesses b
      LEFT JOIN business_categories c ON c.id = b.category_id
      LEFT JOIN lugares l ON l.id = b.destination_id
    `;
    const params = [];
    if (rol === "ADMIN") {
      // todos los negocios
    } else if (rol === "BUSINESS") {
      query += " WHERE b.owner_id = $1";
      params.push(userId);
    } else {
      query += " WHERE b.estado = 'approved'";
    }
    query += " ORDER BY b.id DESC";
    const { rows } = await pool.query(query, params);
    return rows;
  },

  async listByDestination(destinoId, rol, userId) {
    let query = `
      SELECT ${COLUMNS}, c.nombre AS categoria
      FROM businesses b
      LEFT JOIN business_categories c ON c.id = b.category_id
      WHERE b.destination_id = $1
    `;
    const params = [destinoId];
    if (!rol || rol === "TOURIST") {
      query += " AND b.estado = 'approved'";
    } else if (rol === "BUSINESS") {
      query += " AND (b.estado = 'approved' OR b.owner_id = $2)";
      params.push(userId);
    }
    query += " ORDER BY b.id DESC";
    const { rows } = await pool.query(query, params);
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS}, c.nombre AS categoria,
              l.nombre AS destino, l.slug AS destino_slug,
              u.nombre AS owner_nombre, u.email AS owner_email
       FROM businesses b
       LEFT JOIN business_categories c ON c.id = b.category_id
       LEFT JOIN lugares l ON l.id = b.destination_id
       LEFT JOIN usuarios u ON u.id = b.owner_id
       WHERE b.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async existsBySlug(slug, excludeId = null) {
    const { rows } = await pool.query(
      "SELECT id FROM businesses WHERE slug = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1",
      [slug, excludeId]
    );
    return rows.length > 0;
  },

  async create(data) {
    const {
      owner_id, category_id, destination_id, nombre, slug, descripcion, direccion, telefono,
      whatsapp, email_contacto, website, precio_min, precio_max, moneda,
      lat, lng, portada_url, estado,
    } = data;
    const { rows } = await pool.query(
      `INSERT INTO businesses
        (owner_id, category_id, destination_id, nombre, slug, descripcion, direccion, telefono,
         whatsapp, email_contacto, website, precio_min, precio_max, moneda,
         lat, lng, portada_url, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id, owner_id, category_id, destination_id, nombre, slug, descripcion, direccion,
                 telefono, whatsapp, email_contacto, website, precio_min, precio_max,
                 moneda, lat, lng, portada_url, estado, created_at, updated_at`,
      [owner_id, category_id, destination_id, nombre, slug, descripcion, direccion, telefono,
       whatsapp, email_contacto, website, precio_min, precio_max, moneda,
       lat, lng, portada_url, estado]
    );
    return rows[0];
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;

    const allowed = [
      "category_id", "destination_id", "nombre", "slug", "descripcion", "direccion", "telefono",
      "whatsapp", "email_contacto", "website", "precio_min", "precio_max",
      "moneda", "lat", "lng", "portada_url", "estado",
    ];
    const safeKeys = keys.filter((k) => allowed.includes(k));
    if (safeKeys.length === 0) return null;

    safeKeys.push("updated_at");
    const setClauses = safeKeys.map((k, i) => {
      if (k === "updated_at") return `${k}=NOW()`;
      return `${k}=$${i + 1}`;
    });
    const values = safeKeys
      .filter((k) => k !== "updated_at")
      .map((k) => fields[k]);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE businesses SET ${setClauses.join(", ")} WHERE id=$${values.length}
       RETURNING id, owner_id, category_id, destination_id, nombre, slug, descripcion, direccion,
                 telefono, whatsapp, email_contacto, website, precio_min, precio_max,
                 moneda, lat, lng, portada_url, estado, created_at, updated_at`,
      values
    );
    return rows[0] || null;
  },

  async setEstado(id, estado) {
    const { rows } = await pool.query(
      `UPDATE businesses SET estado = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, estado, updated_at`,
      [estado, id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    const { rowCount } = await pool.query("DELETE FROM businesses WHERE id = $1", [id]);
    return rowCount > 0;
  },

  // ---------- Imágenes ----------
  async listImages(businessId) {
    const { rows } = await pool.query(
      `SELECT id, business_id, url, alt_text, is_primary, orden, created_at
       FROM business_images WHERE business_id = $1
       ORDER BY is_primary DESC, orden ASC, id ASC`,
      [businessId]
    );
    return rows;
  },

  async addImage(businessId, url, alt_text, isPrimary, orden = 0) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (isPrimary) {
        await client.query(
          "UPDATE business_images SET is_primary = false WHERE business_id = $1",
          [businessId]
        );
      } else {
        const { rows } = await client.query(
          "SELECT COUNT(*)::int AS c FROM business_images WHERE business_id = $1",
          [businessId]
        );
        if (rows[0].c === 0) isPrimary = true;
      }
      const { rows } = await client.query(
        `INSERT INTO business_images (business_id, url, alt_text, is_primary, orden)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, business_id, url, alt_text, is_primary, orden, created_at`,
        [businessId, url, alt_text, isPrimary, orden]
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

  async updateImage(id, businessId, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const values = keys.map((k) => fields[k]);
    values.push(id, businessId);
    const { rows } = await pool.query(
      `UPDATE business_images SET ${setClauses.join(", ")}
       WHERE id=$${values.length - 1} AND business_id=$${values.length}
       RETURNING id, business_id, url, alt_text, is_primary, orden, created_at`,
      values
    );
    return rows[0] || null;
  },

  async setPrimaryImage(id, businessId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE business_images SET is_primary = false WHERE business_id = $1",
        [businessId]
      );
      const { rowCount } = await client.query(
        "UPDATE business_images SET is_primary = true WHERE id = $1 AND business_id = $2",
        [id, businessId]
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

  async deleteImage(id, businessId) {
    const { rowCount } = await pool.query(
      "DELETE FROM business_images WHERE id = $1 AND business_id = $2",
      [id, businessId]
    );
    return rowCount > 0;
  },

  // ---------- Servicios ----------
  async listServices(businessId) {
    const { rows } = await pool.query(
      `SELECT id, business_id, nombre, descripcion, created_at
       FROM business_services WHERE business_id = $1 ORDER BY id ASC`,
      [businessId]
    );
    return rows;
  },

  async addService(businessId, nombre, descripcion) {
    const { rows } = await pool.query(
      `INSERT INTO business_services (business_id, nombre, descripcion)
       VALUES ($1, $2, $3)
       RETURNING id, business_id, nombre, descripcion, created_at`,
      [businessId, nombre, descripcion]
    );
    return rows[0];
  },

  async updateService(id, businessId, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const values = keys.map((k) => fields[k]);
    values.push(id, businessId);
    const { rows } = await pool.query(
      `UPDATE business_services SET ${setClauses.join(", ")}
       WHERE id=$${values.length - 1} AND business_id=$${values.length}
       RETURNING id, business_id, nombre, descripcion, created_at`,
      values
    );
    return rows[0] || null;
  },

  async deleteService(id, businessId) {
    const { rowCount } = await pool.query(
      "DELETE FROM business_services WHERE id = $1 AND business_id = $2",
      [id, businessId]
    );
    return rowCount > 0;
  },

  // ---------- Horarios ----------
  async listHours(businessId) {
    const { rows } = await pool.query(
      `SELECT id, business_id, day_of_week,
              to_char(open_time, 'HH24:MI')::text AS open_time,
              to_char(close_time, 'HH24:MI')::text AS close_time,
              is_closed, orden, created_at
       FROM business_hours WHERE business_id = $1
       ORDER BY day_of_week ASC, orden ASC, id ASC`,
      [businessId]
    );
    return rows;
  },

  async addHour(businessId, data) {
    const { day_of_week, open_time, close_time, is_closed, orden = 0 } = data;
    const { rows } = await pool.query(
      `INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed, orden)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, business_id, day_of_week,
                 to_char(open_time, 'HH24:MI')::text AS open_time,
                 to_char(close_time, 'HH24:MI')::text AS close_time,
                 is_closed, orden, created_at`,
      [businessId, day_of_week, open_time, close_time, is_closed, orden]
    );
    return rows[0];
  },

  async updateHour(id, businessId, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const values = keys.map((k) => fields[k]);
    values.push(id, businessId);
    const { rows } = await pool.query(
      `UPDATE business_hours SET ${setClauses.join(", ")}
       WHERE id=$${values.length - 1} AND business_id=$${values.length}
       RETURNING id, business_id, day_of_week,
                 to_char(open_time, 'HH24:MI')::text AS open_time,
                 to_char(close_time, 'HH24:MI')::text AS close_time,
                 is_closed, orden, created_at`,
      values
    );
    return rows[0] || null;
  },

  async deleteHour(id, businessId) {
    const { rowCount } = await pool.query(
      "DELETE FROM business_hours WHERE id = $1 AND business_id = $2",
      [id, businessId]
    );
    return rowCount > 0;
  },

  // ---------- Redes sociales ----------
  async listSocialLinks(businessId) {
    const { rows } = await pool.query(
      `SELECT id, business_id, plataforma, url, created_at
       FROM business_social_links WHERE business_id = $1 ORDER BY id ASC`,
      [businessId]
    );
    return rows;
  },

  async addSocialLink(businessId, plataforma, url) {
    const { rows } = await pool.query(
      `INSERT INTO business_social_links (business_id, plataforma, url)
       VALUES ($1, $2, $3)
       RETURNING id, business_id, plataforma, url, created_at`,
      [businessId, plataforma, url]
    );
    return rows[0];
  },

  async updateSocialLink(id, businessId, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const values = keys.map((k) => fields[k]);
    values.push(id, businessId);
    const { rows } = await pool.query(
      `UPDATE business_social_links SET ${setClauses.join(", ")}
       WHERE id=$${values.length - 1} AND business_id=$${values.length}
       RETURNING id, business_id, plataforma, url, created_at`,
      values
    );
    return rows[0] || null;
  },

  async deleteSocialLink(id, businessId) {
    const { rowCount } = await pool.query(
      "DELETE FROM business_social_links WHERE id = $1 AND business_id = $2",
      [id, businessId]
    );
    return rowCount > 0;
  },
};

module.exports = BusinessModel;