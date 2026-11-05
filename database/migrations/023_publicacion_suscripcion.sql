-- ============================================================
-- Migracion 023: publicacion comercial y vigencias en UTC
-- ------------------------------------------------------------
-- OBJETIVO
--   * Ocultar de TODAS las vistas publicas los negocios cuyo vendedor
--     no tiene prueba gratuita ni suscripcion vigente.
--   * Mantener la moderacion SEPARADA: `businesses.estado` NO cambia.
--   * Guardar instantes (prueba y suscripcion) como TIMESTAMPTZ para que
--     el vencimiento sea un instante UTC y se muestre en la zona del
--     navegador.
--
-- SEGURIDAD DE LA MIGRACION
--   * No borra datos ni toca `estado` (aprobacion/rechazo/suspension).
--   * Los vendedores anteriores sin politica (estado_cuenta NULL y
--     trial_inicio NULL) conservan su publicacion.
--   * Es idempotente: la columna y el indice usan IF NOT EXISTS y la
--     conversion de tipos comprueba el tipo actual antes de cambiar.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Estado de publicacion comercial del negocio
-- ------------------------------------------------------------
-- visible             -> puede mostrarse si la moderacion lo aprueba
-- oculto_suscripcion  -> oculto por falta de prueba/suscripcion vigente
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS publicacion_estado VARCHAR(24) NOT NULL DEFAULT 'visible';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_businesses_publicacion_estado'
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT chk_businesses_publicacion_estado
      CHECK (publicacion_estado IN ('visible', 'oculto_suscripcion'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_publicacion_estado
  ON businesses (publicacion_estado, estado, owner_id);

-- Busqueda por propietario al ocultar/restaurar sus negocios al vencer
-- o renovar la suscripcion.
CREATE INDEX IF NOT EXISTS idx_businesses_owner_publicacion
  ON businesses (owner_id, publicacion_estado);

-- ------------------------------------------------------------
-- 2) Instantes UTC para prueba y suscripciones
-- ------------------------------------------------------------
-- Las columnas eran TIMESTAMP SIN zona: el instante exacto dependia de
-- la zona de la sesion que escribio cada fila (NOW() convertido a naive).
-- Al convertirlas a TIMESTAMPTZ se interpretan con la zona actual de la
-- base (`current_setting('TimeZone')`), que es la misma que uso el
-- backend al escribir los valores. Asi la duracion de la prueba se
-- conserva exacta (168 horas) en cualquier entorno, y `NOW()` sobre
-- TIMESTAMPTZ compara instantes absolutos.
--
-- La conversion comprueba el tipo actual (idempotente): una segunda
-- ejecucion no vuelve a convertir ni desplaza las fechas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios'
      AND column_name = 'trial_inicio' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE usuarios
      ALTER COLUMN trial_inicio TYPE TIMESTAMPTZ
      USING trial_inicio AT TIME ZONE current_setting('TimeZone');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios'
      AND column_name = 'trial_fin' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE usuarios
      ALTER COLUMN trial_fin TYPE TIMESTAMPTZ
      USING trial_fin AT TIME ZONE current_setting('TimeZone');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios'
      AND column_name = 'suspension_fecha' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE usuarios
      ALTER COLUMN suspension_fecha TYPE TIMESTAMPTZ
      USING suspension_fecha AT TIME ZONE current_setting('TimeZone');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
      AND column_name = 'starts_at' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE subscriptions
      ALTER COLUMN starts_at TYPE TIMESTAMPTZ
      USING starts_at AT TIME ZONE current_setting('TimeZone');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
      AND column_name = 'ends_at' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE subscriptions
      ALTER COLUMN ends_at TYPE TIMESTAMPTZ
      USING ends_at AT TIME ZONE current_setting('TimeZone');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
      AND column_name = 'cancelada_at' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE subscriptions
      ALTER COLUMN cancelada_at TYPE TIMESTAMPTZ
      USING cancelada_at AT TIME ZONE current_setting('TimeZone');
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) Backfill: ocultar SOLO a quien ya no tiene derecho comercial
-- ------------------------------------------------------------
-- La moderacion no se modifica. El flag es reversible al renovar.
UPDATE businesses b
   SET publicacion_estado = 'oculto_suscripcion',
       updated_at = NOW()
  FROM usuarios u
 WHERE u.id = b.owner_id
   AND b.publicacion_estado = 'visible'
   AND NOT (
     (u.estado_cuenta IS NULL AND u.trial_inicio IS NULL)
     OR (
       u.estado_cuenta IS DISTINCT FROM 'SUSPENDED'
       AND (
         EXISTS (
           SELECT 1 FROM subscriptions s
           WHERE s.usuario_id = u.id
             AND s.estado = 'active'
             AND s.ends_at IS NOT NULL
             AND s.ends_at > NOW()
         )
         OR (u.trial_fin IS NOT NULL AND u.trial_fin > NOW())
       )
     )
   );

-- ============================================================
-- Fin de migracion 023
-- ============================================================
