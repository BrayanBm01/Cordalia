-- ============================================================
-- Migracion 014: Sistema de estados de pago en inscripciones
-- CORDALIA - Plataforma turistica de Cordoba
--
-- Evoluciona la tabla `inscripciones` de un simple "interes"
-- logistico (`confirmada`/`cancelada`) a un flujo con estados de
-- pago + vencimiento controlado por backend:
--
--   * pendiente  -> creada, sin pagar (pagable antes de fecha_limite_pago)
--   * pagada     -> pago confirmado por el proveedor (comprobante)
--   * fallida    -> el pago fue rechazado; el usuario puede reintentar
--   * cancelada  -> eliminada por el negocio (libera cupo)
--   * expirada   -> no se pago antes de fecha_limite_pago (libera cupo)
--
-- Se conservan los valores historicos: 'confirmada' migra a 'pagada'
-- (la inscripcion ya estaba confirmada) y 'cancelada' se mantiene.
--
-- Idempotente y no destructiva: no modifica migraciones historicas.
-- El orden es importante:
--   1) agregar columnas (para poder migrar datos con fecha_pago)
--   2) migrar datos existentes M  ANTES de cambiar el CHECK
--   3) reemplazar el CHECK con los nuevos estados
-- ============================================================

-- ------------------------------------------------------------
-- 1) Vencimiento y datos de pago (columnas nuevas, idempotentes)
-- ------------------------------------------------------------
-- Fecha limite para pagar la inscripcion (backend la controla y
-- expira las 'pendiente'/'fallida' vencidas).
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS fecha_limite_pago TIMESTAMP;
-- Cuando se confirmo el pago (backend verifica con el proveedor).
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP;
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Proveedor que proceso el pago: 'mock' (sandbox local) o 'mercadopago'.
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS pago_proveedor VARCHAR(40);
-- Referencia/id de la transaccion en el proveedor.
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS pago_referencia VARCHAR(120);
-- Metodo usado (nequi, daviplata, tarjeta...).
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS pago_metodo VARCHAR(60);
-- Snapshot crudo de la respuesta del proveedor (nunca datos de tarjeta).
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS pago_payload JSONB;

-- ------------------------------------------------------------
-- 2) Migrar datos historicos ANTES de cambiar el CHECK
-- ------------------------------------------------------------
UPDATE inscripciones SET estado = 'pagada', fecha_pago = NOW()
 WHERE estado = 'confirmada';

-- ------------------------------------------------------------
-- 3) Estados de pago
-- ------------------------------------------------------------
ALTER TABLE inscripciones DROP CONSTRAINT IF EXISTS chk_inscripciones_estado;

ALTER TABLE inscripciones
  ADD CONSTRAINT chk_inscripciones_estado
  CHECK (estado IN ('pendiente', 'pagada', 'fallida', 'cancelada', 'expirada'));

-- ------------------------------------------------------------
-- 4) Indices para expiracion rapida
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado_vencimiento
  ON inscripciones (estado, fecha_limite_pago);

-- ============================================================
-- Fin de migracion 014
-- ============================================================