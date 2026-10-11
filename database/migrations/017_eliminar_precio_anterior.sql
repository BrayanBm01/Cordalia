-- ============================================================
-- Migracion 017: Eliminar "precio anterior" y "precio promocional"
-- Cordalia - Corrección del sistema de promociones temporales
-- ============================================================
-- El plan solo tiene PRECIO NORMAL (tour_plans.precio), permanente.
-- La promoción es un descuento temporal independiente que SIEMPRE se
-- calcula sobre ese precio normal (tipo_descuento 'porcentaje' | 'valor'
-- = monto fijo COP). Los campos precio_anterior / precio_promocional
-- nunca tuvieron datos reales (quedaron NULL en producción y seeds) y
-- duplicaban lógica; se eliminan para que no exista un "precio anterior"
-- persistente ni un precio fijo de promoción manipulable.
-- ============================================================

ALTER TABLE tour_plans DROP COLUMN IF EXISTS precio_anterior;

ALTER TABLE promotions DROP COLUMN IF EXISTS precio_anterior;
ALTER TABLE promotions DROP COLUMN IF EXISTS precio_promocional;

-- Índice de apoyo para el control de solapamiento de promociones activas
-- por plan (una sola promo activa vigente por plan).
CREATE INDEX IF NOT EXISTS idx_promotions_plan_estado_fechas
  ON promotions (plan_id, estado, fecha_inicio, fecha_fin);