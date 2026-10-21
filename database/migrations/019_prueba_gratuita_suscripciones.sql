-- ============================================================
-- Migracion 019: Prueba gratuita de 7 dias y suscripciones
--                comerciales de los vendedores (Cordalia)
-- ------------------------------------------------------------
-- OBJETIVO
--   * Cada vendedor nuevo recibe una PRUEBA GRATUITA de 7 dias
--     consecutivos, calculada en el servidor y registrada con fecha
--     de inicio y fecha exacta de fin.
--   * Estados comerciales claros: TRIALING / ACTIVE / EXPIRED /
--     SUSPENDED.
--   * Suscripciones mensuales (planes comerciales `plans`) con su
--     proveedor de pago, referencia externa, importe y vigencia.
--
-- SEPARACION DE FLUJOS
--   * `inscripciones`  -> planes TURISTICOS (GRATUITOS, sin pagos).
--   * `subscriptions`   -> planes COMERCIALES del vendedor (con pago).
--   No se mezclan ni se comparten registros.
--
-- NO DESTRUCTIVA E IDEMPOTENTE
--   * No borra filas, ni tablas, ni columnas de pago existentes.
--   * Los vendedores que YA existian quedan con estado_cuenta NULL:
--     su situacion comercial NO cambia sin una politica de migracion
--     explicita (segun el requerimiento).
--   * Las columnas nuevas son NULL/DEFAULT, por lo que las filas
--     existentes siguen siendo validas.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Estado comercial y prueba gratuita del VENDEDOR (usuarios)
-- ------------------------------------------------------------
-- trial_inicio / trial_fin: fechas de la prueba gratuita de 7 dias.
-- estado_cuenta: situacion comercial vigente.
--   NULL          -> vendedor anterior sin politica aplicada (no se restringe)
--   TRIALING      -> prueba gratuita activa
--   ACTIVE        -> suscripcion mensual pagada y vigente
--   EXPIRED       -> prueba o suscripcion finalizada
--   SUSPENDED     -> cuenta suspendida administrativamente
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trial_inicio TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trial_fin TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS estado_cuenta VARCHAR(20);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS suspension_motivo TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS suspension_fecha TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuarios_estado_cuenta'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT chk_usuarios_estado_cuenta
      CHECK (estado_cuenta IS NULL OR estado_cuenta IN (
        'TRIALING', 'ACTIVE', 'EXPIRED', 'SUSPENDED'
      ));
  END IF;
END $$;

-- Indice de consulta: estado comercial y fin de prueba.
CREATE INDEX IF NOT EXISTS idx_usuarios_estado_cuenta
  ON usuarios (estado_cuenta, trial_fin);

-- ------------------------------------------------------------
-- 2) Plan comercial: duracion en MESES (regla de calendario)
-- ------------------------------------------------------------
-- La duracion comercial es de UN MES calculado con regla de calendario
-- (intervalo '1 month' en PostgreSQL), NO 30 dias fijos.
-- `duracion_dias` (existente) se conserva como dato informativo.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS meses INTEGER NOT NULL DEFAULT 1;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS categoria VARCHAR(30) NOT NULL DEFAULT 'mensual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_plans_meses'
  ) THEN
    ALTER TABLE plans
      ADD CONSTRAINT chk_plans_meses CHECK (meses >= 0);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) Suscripciones comerciales del vendedor
-- ------------------------------------------------------------
-- La tabla `subscriptions` existia pero no la usaba ningun codigo.
-- Se completa con los datos del flujo real:
--   * usuario_id  -> el VENDEDOR (rol BUSINESS) que contrata.
--   * business_id -> negocio asociado (opcional: un vendedor puede
--                    contratar antes de crear su negocio).
--   * proveedor / referencias externas / importe / idempotencia.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS proveedor VARCHAR(20) NOT NULL DEFAULT 'mock';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referencia_externa VARCHAR(160);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pago_id VARCHAR(160);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS monto NUMERIC(12,2);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'COP';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(160);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS datos_pago JSONB;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelada_at TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscriptions_usuario'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT fk_subscriptions_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE;
  END IF;
END $$;

-- `business_id` deja de ser obligatorio: el vendedor puede contratar
-- su plan antes de tener un negocio creado.
ALTER TABLE subscriptions ALTER COLUMN business_id DROP NOT NULL;

-- Estados: pago pendiente, aprobado, rechazado, vigente, vencido,
-- cancelado.
--
-- IMPORTANTE: la constraint puede existir con la lista ANTIGUA (la del
-- schema original: active/expired/cancelled/pending). Por eso se
-- ELIMINA y se vuelve a crear siempre: un "IF NOT EXISTS" sobre la
-- constraint NO la reemplazaria y 'rejected' quedaria sin permitirse.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_estado;

ALTER TABLE subscriptions
  ADD CONSTRAINT chk_subscriptions_estado
  CHECK (estado IN (
    'pending',   -- pago creado, pendiente de confirmacion
    'active',    -- suscripcion vigente
    'expired',   -- vigencia terminada
    'cancelled', -- cancelada por el vendedor o el admin
    'rejected'   -- pago rechazado por el proveedor
  ));

-- Idempotencia: una misma clave de evento no se procesa dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_idempotency
  ON subscriptions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Un vendedor solo puede tener UNA suscripcion vigente a la vez.
-- Solo aplica a 'active': durante una renovacion coexiste la nueva
-- ('pending') con la anterior ('active') hasta que el pago se aprueba;
-- en ese momento la anterior pasa a 'expired' y se activa la nueva.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_usuario_activa
  ON subscriptions (usuario_id)
  WHERE estado = 'active';

-- Indices de consulta por vigencia y por proveedor.
CREATE INDEX IF NOT EXISTS idx_subscriptions_vigencia
  ON subscriptions (estado, ends_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_usuario
  ON subscriptions (usuario_id, created_at DESC);

-- ------------------------------------------------------------
-- 4) Bitacora de eventos de pago (idempotencia + auditoria)
-- ------------------------------------------------------------
-- Un renglon por evento de pago recibido. La clave de idempotencia
-- es UNIQUE: un webhook repetido no crea una segunda fila ni activa
-- dos veces la misma suscripcion.
CREATE TABLE IF NOT EXISTS suscripcion_pagos (
    id                 SERIAL PRIMARY KEY,
    suscripcion_id     INTEGER REFERENCES subscriptions (id) ON DELETE CASCADE,
    usuario_id         INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
    plan_id            INTEGER REFERENCES plans (id) ON DELETE SET NULL,
    proveedor          VARCHAR(20) NOT NULL DEFAULT 'mock',
    evento             VARCHAR(60) NOT NULL,
    estado             VARCHAR(20) NOT NULL,
    referencia_externa VARCHAR(160),
    pago_id            VARCHAR(160),
    monto              NUMERIC(12,2),
    moneda             VARCHAR(3) NOT NULL DEFAULT 'COP',
    idempotency_key    VARCHAR(160),
    payload            JSONB,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_suscripcion_pagos_estado CHECK (estado IN (
        'pending', 'approved', 'rejected', 'cancelled', 'expired'
    ))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_suscripcion_pagos_idempotency
  ON suscripcion_pagos (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suscripcion_pagos_suscripcion
  ON suscripcion_pagos (suscripcion_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suscripcion_pagos_usuario
  ON suscripcion_pagos (usuario_id, created_at DESC);

-- ============================================================
-- Fin de migracion 019
-- ============================================================
