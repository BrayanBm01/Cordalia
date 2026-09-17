const pool = require("../config/db");

const ACTIVIDADES_SELECT = `id, nombre, descripcion, imagen, categoria, activo, created_at, updated_at`;
const PUNTOS_SELECT = `id, nombre, descripcion, imagen, tipo, activo, created_at, updated_at`;

const DestinoContenidoModel = {
  // ------------------------------------------------------------
  // Catálogo de actividades
  // ------------------------------------------------------------
  async listActividades({ activo = null } = {}) {
    let sql = `SELECT ${ACTIVIDADES_SELECT} FROM actividades`;
    const params = [];
    if (activo != null) {
      sql += ` WHERE activo = $1`;
      params.push(activo === "true" || activo === true);
    }
    sql += ` ORDER BY nombre ASC, id ASC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  },

  async findActividad(id) {
    const { rows } = await pool.query(
      `SELECT ${ACTIVIDADES_SELECT} FROM actividades WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findActividadByNombre(nombre, excludeId = null) {
    const { rows } = await pool.query(
      `SELECT id FROM actividades WHERE nombre = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1`,
      [nombre, excludeId]
    );
    return rows.length > 0;
  },

  async createActividad({ nombre, descripcion, imagen, categoria }) {
    const { rows } = await pool.query(
      `INSERT INTO actividades (nombre, descripcion, imagen, categoria)
       VALUES ($1, $2, $3, $4)
       RETURNING ${ACTIVIDADES_SELECT}`,
      [nombre, descripcion || null, imagen || null, categoria || null]
    );
    return rows[0];
  },

  async updateActividad(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const values = keys.map((k) => fields[k]);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE actividades SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id=$${values.length}
       RETURNING ${ACTIVIDADES_SELECT}`,
      values
    );
    return rows[0] || null;
  },

  async setActividadEstado(id, activo) {
    const { rows } = await pool.query(
      `UPDATE actividades SET activo = $1, updated_at = NOW() WHERE id = $2
       RETURNING ${ACTIVIDADES_SELECT}`,
      [activo, id]
    );
    return rows[0] || null;
  },

  // ------------------------------------------------------------
  // Catálogo de puntos de interés
  // ------------------------------------------------------------
  async listPuntosInteres({ activo = null } = {}) {
    let sql = `SELECT ${PUNTOS_SELECT} FROM puntos_interes`;
    const params = [];
    if (activo != null) {
      sql += ` WHERE activo = $1`;
      params.push(activo === "true" || activo === true);
    }
    sql += ` ORDER BY nombre ASC, id ASC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  },

  async findPuntoInteres(id) {
    const { rows } = await pool.query(
      `SELECT ${PUNTOS_SELECT} FROM puntos_interes WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findPuntoInteresByNombre(nombre, excludeId = null) {
    const { rows } = await pool.query(
      `SELECT id FROM puntos_interes WHERE nombre = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1`,
      [nombre, excludeId]
    );
    return rows.length > 0;
  },

  async createPuntoInteres({ nombre, descripcion, imagen, tipo }) {
    const { rows } = await pool.query(
      `INSERT INTO puntos_interes (nombre, descripcion, imagen, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PUNTOS_SELECT}`,
      [nombre, descripcion || null, imagen || null, tipo || null]
    );
    return rows[0];
  },

  async updatePuntoInteres(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`);
    const values = keys.map((k) => fields[k]);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE puntos_interes SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id=$${values.length}
       RETURNING ${PUNTOS_SELECT}`,
      values
    );
    return rows[0] || null;
  },

  async setPuntoInteresEstado(id, activo) {
    const { rows } = await pool.query(
      `UPDATE puntos_interes SET activo = $1, updated_at = NOW() WHERE id = $2
       RETURNING ${PUNTOS_SELECT}`,
      [activo, id]
    );
    return rows[0] || null;
  },

  // ------------------------------------------------------------
  // Asignación destino <-> contenido
  // ------------------------------------------------------------
  async listActividadesByLugar(lugarId) {
    const { rows } = await pool.query(
      `SELECT a.id, a.nombre, a.descripcion, a.imagen, a.categoria, a.activo,
              da.orden, da.id AS asignacion_id
       FROM destino_actividades da
       JOIN actividades a ON a.id = da.actividad_id
       WHERE da.lugar_id = $1
       ORDER BY da.orden ASC, a.nombre ASC`,
      [lugarId]
    );
    return rows;
  },

  async listPuntosInteresByLugar(lugarId) {
    const { rows } = await pool.query(
      `SELECT p.id, p.nombre, p.descripcion, p.imagen, p.tipo, p.activo,
              dp.orden, dp.id AS asignacion_id
       FROM destino_puntos_interes dp
       JOIN puntos_interes p ON p.id = dp.punto_interes_id
       WHERE dp.lugar_id = $1
       ORDER BY dp.orden ASC, p.nombre ASC`,
      [lugarId]
    );
    return rows;
  },

  async assignActividad(lugarId, actividadId, orden = 0) {
    const { rows } = await pool.query(
      `INSERT INTO destino_actividades (lugar_id, actividad_id, orden)
       VALUES ($1, $2, $3)
       ON CONFLICT (lugar_id, actividad_id) DO UPDATE SET orden = EXCLUDED.orden
       RETURNING id, lugar_id, actividad_id, orden`,
      [lugarId, actividadId, orden]
    );
    return rows[0];
  },

  async unassignActividad(lugarId, actividadId) {
    const { rowCount } = await pool.query(
      "DELETE FROM destino_actividades WHERE lugar_id = $1 AND actividad_id = $2",
      [lugarId, actividadId]
    );
    return rowCount > 0;
  },

  async assignPuntoInteres(lugarId, puntoInteresId, orden = 0) {
    const { rows } = await pool.query(
      `INSERT INTO destino_puntos_interes (lugar_id, punto_interes_id, orden)
       VALUES ($1, $2, $3)
       ON CONFLICT (lugar_id, punto_interes_id) DO UPDATE SET orden = EXCLUDED.orden
       RETURNING id, lugar_id, punto_interes_id, orden`,
      [lugarId, puntoInteresId, orden]
    );
    return rows[0];
  },

  async unassignPuntoInteres(lugarId, puntoInteresId) {
    const { rowCount } = await pool.query(
      "DELETE FROM destino_puntos_interes WHERE lugar_id = $1 AND punto_interes_id = $2",
      [lugarId, puntoInteresId]
    );
    return rowCount > 0;
  },

  // ------------------------------------------------------------
  // Información para tu viaje
  // ------------------------------------------------------------
  async findInfoViaje(lugarId) {
    const { rows } = await pool.query(
      `SELECT id, lugar_id, transporte, alimentacion, alojamiento, actividades,
              otros_gastos, recomendaciones, duracion_recomendada, mejor_epoca,
              como_llegar, moneda,
              costo_transporte, costo_alimentacion, costo_alojamiento,
              costo_actividades, costo_otros, updated_at, created_at
       FROM destino_info_viaje WHERE lugar_id = $1`,
      [lugarId]
    );
    return rows[0] || null;
  },

  async upsertInfoViaje(lugarId, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return this.findInfoViaje(lugarId);

    // Solo columnas permitidas
    const allowed = [
      "transporte", "alimentacion", "alojamiento", "actividades", "otros_gastos",
      "recomendaciones", "duracion_recomendada", "mejor_epoca", "como_llegar",
      "moneda", "costo_transporte", "costo_alimentacion", "costo_alojamiento",
      "costo_actividades", "costo_otros",
    ];
    const map = {};
    for (const k of keys) {
      if (allowed.includes(k)) map[k] = fields[k];
    }
    const safe = Object.keys(map);
    if (safe.length === 0) return this.findInfoViaje(lugarId);

    // En el conflicto se usan valores EXCLUDED (nunca posicionales: los
    // placeholders colisionarían con los del INSERT y guardarían el lugar_id).
    const setClauses = safe.map((k) => `${k}=EXCLUDED.${k}`);
    const values = safe.map((k) => map[k]);

    const { rows } = await pool.query(
      `INSERT INTO destino_info_viaje (lugar_id, ${safe.join(", ")})
       VALUES ($1, ${safe.map((_, i) => `$${i + 2}`).join(", ")})
       ON CONFLICT (lugar_id) DO UPDATE SET ${setClauses.join(", ")}, updated_at = NOW()
       RETURNING id, lugar_id, transporte, alimentacion, alojamiento, actividades,
                 otros_gastos, recomendaciones, duracion_recomendada, mejor_epoca,
                 como_llegar, moneda,
                 costo_transporte, costo_alimentacion, costo_alojamiento,
                 costo_actividades, costo_otros, updated_at, created_at`,
      [lugarId, ...values]
    );
    return rows[0];
  },

  // ------------------------------------------------------------
  // Contenido público completo de un destino (página del lugar)
  // ------------------------------------------------------------
  async getContenidoPublico(lugarId) {
    const [actividades, puntosInteres, infoViaje] = await Promise.all([
      this.listActividadesByLugar(lugarId),
      this.listPuntosInteresByLugar(lugarId),
      this.findInfoViaje(lugarId),
    ]);
    return {
      actividades,
      puntosInteres,
      infoViaje,
    };
  },
};

module.exports = DestinoContenidoModel;