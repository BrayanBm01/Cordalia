-- ============================================================
-- Migracion 018: Inscripciones gratuitas (sin pago) en planes turisticos
-- CORDALIA - Plataforma turistica de Cordoba
-- ------------------------------------------------------------
-- REGLA DE NEGOCIO (obligatoria):
--   Los planes de viaje turisticos NO tienen pagos dentro de Cordalia.
--   El usuario se INSCRIBE (reserva cupo) sin realizar ningun cobro.
--   El precio del plan es SOLO INFORMATIVO.
--
-- Esta migracion es NO DESTRUCTIVA e idempotente:
--   * No borra filas.
--   * No elimina columnas ni tablas de pago.
--   * Conserva los estados historicos ('pendiente', 'pagada', 'fallida',
--     'cancelada', 'expirada', 'vencida') y sus registros.
--   * Solo AGREGA el estado 'confirmada' (inscripcion gratuita activa),
--     que es el estado historico original del modelo logistico y el que
--     usaran las nuevas inscripciones.
--
-- Los pagos comerciales de los VENDEDORES (suscripciones mensuales) se
-- registran en la tabla `subscriptions` (migracion 019), separada de las
-- inscripciones turisticas. Aqui no se toca ningun flujo de cobro.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Permitir el estado 'confirmada' (inscripcion gratuita)
-- ------------------------------------------------------------
-- Se reemplaza SOLO la constraint del CHECK de estados (no hay datos).
ALTER TABLE inscripciones DROP CONSTRAINT IF EXISTS chk_inscripciones_estado;

ALTER TABLE inscripciones
  ADD CONSTRAINT chk_inscripciones_estado
  CHECK (estado IN (
    'confirmada',  -- inscripcion gratuita activa (sin pago) [NUEVO]
    'pendiente',   -- historico: creada y pendiente de pago
    'pagada',      -- historico: pago confirmado por el proveedor
    'fallida',     -- historico: pago rechazado
    'cancelada',   -- cancelada: libera cupo
    'expirada',    -- historico: no se pago a tiempo, libera cupo
    'vencida'      -- historico: viaje ya ocurrido
  ));

-- ------------------------------------------------------------
-- 2) Indice de apoyo: estado + fecha (consultas de historial)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado_created
  ON inscripciones (estado, created_at DESC);

-- ------------------------------------------------------------
-- 3) Columna plan_id (desnormalizada) en inscripciones
--    La inscripcion apuntaba solo a `salida_id`; el plan se obtenia
--    por JOIN con tour_plan_salidas. Se agrega la referencia directa
--    para poder:
--      a) validar en el servidor que la inscripcion corresponde al
--         plan que se esta inscribiendo, y
--      b) aplicar un indice unico parcial que impida la inscripcion
--         duplicada del mismo usuario al mismo plan.
--    Es ADD COLUMN (no destructivo). El backfill copia el valor que
--    ya existe en el JOIN; NO modifica `estado` ni ningun dato de pago.
-- ------------------------------------------------------------
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS plan_id INTEGER;

UPDATE inscripciones i
   SET plan_id = s.plan_id
  FROM tour_plan_salidas s
 WHERE i.salida_id = s.id
   AND i.plan_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_inscripciones_plan'
  ) THEN
    ALTER TABLE inscripciones
      ADD CONSTRAINT fk_inscripciones_plan
      FOREIGN KEY (plan_id) REFERENCES tour_plans (id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inscripciones_plan_id ON inscripciones (plan_id);

-- ------------------------------------------------------------
-- 4) Prevencion de inscripciones duplicadas del mismo usuario
--    a la MISMA salida (mismo plan + misma fecha).
--    Regla de negocio: una persona no reserva dos veces el mismo
--    viaje. Un mismo plan puede tener varias salidas (fechas) y el
--    usuario SI puede inscribirse a fechas distintas.
--    Indice unico PARCIAL: solo aplica a inscripciones activas
--    ('confirmada'), por lo que las historicas no bloquean nada.
--    user_id IS NOT NULL: las inscripciones anonimas (sin sesion) no
--    se restringen entre si (el requisito es "del mismo usuario").
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_inscripciones_usuario_salida_activa
  ON inscripciones (user_id, salida_id)
  WHERE estado = 'confirmada' AND user_id IS NOT NULL;

-- ============================================================
-- Fin de migracion 018
-- ============================================================
