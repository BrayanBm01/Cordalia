-- ============================================================
-- Migracion 016: Estado 'vencida' para viajes pagados ya ocurridos
-- CORDALIA - Plataforma turistica de Cordoba
--
-- Aporta el estado 'vencida' a `inscripciones`: identifica las
-- inscripciones PAGADAS cuya salida (tour_plan_salidas.fecha) ya
-- ocurrio. A diferencia de 'expirada' (no se pago antes de
-- fecha_limite_pago), 'vencida' NO libera cupo ni permite pagos:
-- el viaje ya se realizo y la reserva queda como historial del
-- turista. El backend marca el estado de forma perezosa y por el
-- cron (expirarVencidas).
--
-- Idempotente y no destructiva. No modifica migraciones historicas.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Ampliar el CHECK de estados (idempotente)
-- ------------------------------------------------------------
ALTER TABLE inscripciones DROP CONSTRAINT IF EXISTS chk_inscripciones_estado;

ALTER TABLE inscripciones
  ADD CONSTRAINT chk_inscripciones_estado
  CHECK (estado IN ('pendiente', 'pagada', 'fallida', 'cancelada', 'expirada', 'vencida'));

-- ------------------------------------------------------------
-- 2) Indices para deteccion rapida de viajes ya ocurridos
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado_salida
  ON inscripciones (estado, salida_id);

CREATE INDEX IF NOT EXISTS idx_salidas_fecha
  ON tour_plan_salidas (fecha);

-- ============================================================
-- Fin de migracion 016
-- ============================================================