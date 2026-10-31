-- ============================================================
-- Migracion 022: indices para consultas de lectura frecuentes
-- ------------------------------------------------------------
-- PROBLEMA
--   Las consultas publicas de negocios y resenas, y el historial de
--   accesos, filtraban por combinaciones de columnas para las que solo
--   existian indices de una sola columna. PostgreSQL podia recurrir a
--   un recorrido secuencial y a ordenaciones en memoria a medida que
--   crecian las tablas.
--
-- QUE HACE
--   * Resenas por negocio y estado, ordenadas por fecha: alimenta el
--     listado publico y el calculo de promedio (solo estado 'active').
--   * Negocios aprobados por id descendente: listado publico.
--   * Negocios de un propietario por id descendente: panel del vendedor.
--   * Negocios de un destino por estado e id: detalle de destino.
--   * Historial de accesos por usuario y fecha: panel de administracion.
--
-- GARANTIAS
--   * NO borra ni modifica datos ni columnas.
--   * Es IDEMPOTENTE: todos los indices usan IF NOT EXISTS.
--   * No usa CONCURRENTLY para poder ejecutarse dentro de una
--     transaccion en el flujo manual de despliegue. En tablas muy
--     grandes, aplicar en una ventana de mantenimiento.
-- ============================================================

BEGIN;

-- Resenas: listado publico (business_id + estado) y promedio.
CREATE INDEX IF NOT EXISTS idx_reviews_business_estado_fecha
  ON reviews (business_id, estado, created_at DESC);

-- Listado publico de negocios aprobados (ORDER BY id DESC).
CREATE INDEX IF NOT EXISTS idx_businesses_estado_id
  ON businesses (estado, id DESC);

-- Panel del vendedor: sus negocios (ORDER BY id DESC).
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id
  ON businesses (owner_id, id DESC);

-- Detalle de un destino: negocios aprobados o propios del vendedor.
CREATE INDEX IF NOT EXISTS idx_businesses_destination_estado_id
  ON businesses (destination_id, estado, id DESC);

-- Historial de accesos por usuario, mas reciente primero.
CREATE INDEX IF NOT EXISTS idx_login_usuario_fecha
  ON login (usuario_id, fecha DESC);

COMMIT;
