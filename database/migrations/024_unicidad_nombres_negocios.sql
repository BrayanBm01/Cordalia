-- ============================================================
-- Migracion 024: nombre de negocio unico, normalizado y auditable
-- ------------------------------------------------------------
-- OBJETIVO
--   * Evitar que dos negocios usen el mismo nombre con variaciones de
--     mayusculas, acentos, espacios o signos de puntuacion.
--   * Guardar un historial de renombres, eliminaciones e intentos
--     duplicados para que un administrador pueda investigarlos.
--   * Mantener la "soberania del administrador": un ADMIN puede marcar
--     excepciones explicitas (`permite_nombre_duplicado = true`) sin
--     borrar datos.
--
-- NO DESTRUCTIVA E IDEMPOTENTE
--   * No elimina filas, columnas ni indices existentes.
--   * La columna normalizada es GENERATED: la calcula PostgreSQL.
--   * Antes de crear el indice UNIQUE se comprueban los duplicados
--     preexistentes. Si los hay, la migracion ABORTA y los lista; la
--     decision sobre como resolverlos queda en manos del administrador.
--   * Se ejecuta dentro de una transaccion: un preflight fallido no deja
--     cambios a medias. Reejecutarla no duplica nada.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Columna de excepcion (necesaria para el preflight)
-- ------------------------------------------------------------
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS permite_nombre_duplicado BOOLEAN NOT NULL DEFAULT false;

-- ------------------------------------------------------------
-- 2) Preflight: detectar duplicados preexistentes (sin borrar nada)
-- ------------------------------------------------------------
DO $$
DECLARE
  duplicados TEXT;
BEGIN
  SELECT string_agg(
           '[' || normalizado || '] -> ' || nombres, '; ' ORDER BY normalizado
         )
    INTO duplicados
    FROM (
      SELECT normalizado, string_agg(nombre, ' | ' ORDER BY id) AS nombres
      FROM (
        SELECT id,
               nombre,
               permite_nombre_duplicado,
               NULLIF(
                 BTRIM(
                   REGEXP_REPLACE(
                     TRANSLATE(
                       LOWER(COALESCE(nombre, '')),
                       'áàäâãåéèëêíìïîóòöôõúùüûñçýÿÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇÝŸ',
                       'aaaaaaeeeeiiiiooooouuuuncyyAAAAAAEEEEIIIIOOOOOUUUUNCYY'
                     ),
                     '[^a-z0-9]+', ' ', 'g'
                   )
                 ),
                 ''
               ) AS normalizado
        FROM businesses
      ) n
      WHERE normalizado IS NOT NULL
      GROUP BY normalizado
      HAVING COUNT(*) > 1
         AND BOOL_OR(COALESCE(n.permite_nombre_duplicado, false)) = false
    ) d;

  IF duplicados IS NOT NULL THEN
    RAISE EXCEPTION
      'Migracion 024: hay nombres de negocio duplicados preexistentes. Reviselos y autorice las excepciones con UPDATE businesses SET permite_nombre_duplicado = true, duplicado_autorizado_por = <admin> WHERE id = ...; luego reintente. Duplicados: %',
      duplicados;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) Nombre normalizado calculado por la base de datos
-- ------------------------------------------------------------
-- "Hotel  Los Andes", "hotel-los-andes" y "HOTEL LOS ANDES" comparten
-- la misma forma canonica: "hotel los andes".
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS nombre_normalizado TEXT GENERATED ALWAYS AS (
    NULLIF(
      BTRIM(
        REGEXP_REPLACE(
          TRANSLATE(
            LOWER(COALESCE(nombre, '')),
            'áàäâãåéèëêíìïîóòöôõúùüûñçýÿÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇÝŸ',
            'aaaaaaeeeeiiiiooooouuuuncyyAAAAAAEEEEIIIIOOOOOUUUUNCYY'
          ),
          '[^a-z0-9]+', ' ', 'g'
        )
      ),
      ''
    )
  ) STORED;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS duplicado_autorizado_por INTEGER
  REFERENCES usuarios (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_businesses_nombre_normalizado
  ON businesses (nombre_normalizado)
  WHERE permite_nombre_duplicado = false
    AND nombre_normalizado IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_nombre_normalizado
  ON businesses (nombre_normalizado);

-- ------------------------------------------------------------
-- 4) Historial de cambios sensibles de identidad de negocio
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_identity_audit (
    id                  BIGSERIAL PRIMARY KEY,
    business_id         INTEGER,
    owner_id            INTEGER,
    actor_id            INTEGER,
    actor_rol           VARCHAR(16),
    accion              VARCHAR(32) NOT NULL,
    nombre_anterior     TEXT,
    nombre_nuevo        TEXT,
    nombre_normalizado  TEXT,
    motivo              TEXT,
    permitido           BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_business_identity_audit_accion
      CHECK (accion IN (
        'crear', 'renombrar', 'eliminar',
        'duplicado_detectado', 'duplicado_autorizado',
        'intento_renombrar_rechazado', 'intento_eliminar_rechazado'
      ))
);

-- Las tres FK usan ON DELETE SET NULL y son DEFERRABLE INITIALLY DEFERRED:
-- al borrar un usuario, PostgreSQL borra en cascada sus negocios y pone a
-- NULL owner_id/actor_id/business_id en la auditoria. Si la comprobacion
-- fuera inmediata, una fila podria revalidar business_id contra un negocio
-- ya borrado en la misma sentencia antes de recibir su propio SET NULL.
-- Diferir la comprobacion al final de la sentencia evita ese falso positivo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_business_identity_audit_business' AND NOT condeferrable
  ) THEN
    ALTER TABLE business_identity_audit DROP CONSTRAINT fk_business_identity_audit_business;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_business_identity_audit_business') THEN
    ALTER TABLE business_identity_audit
      ADD CONSTRAINT fk_business_identity_audit_business
      FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_business_identity_audit_owner' AND NOT condeferrable
  ) THEN
    ALTER TABLE business_identity_audit DROP CONSTRAINT fk_business_identity_audit_owner;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_business_identity_audit_owner') THEN
    ALTER TABLE business_identity_audit
      ADD CONSTRAINT fk_business_identity_audit_owner
      FOREIGN KEY (owner_id) REFERENCES usuarios (id) ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_business_identity_audit_actor' AND NOT condeferrable
  ) THEN
    ALTER TABLE business_identity_audit DROP CONSTRAINT fk_business_identity_audit_actor;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_business_identity_audit_actor') THEN
    ALTER TABLE business_identity_audit
      ADD CONSTRAINT fk_business_identity_audit_actor
      FOREIGN KEY (actor_id) REFERENCES usuarios (id) ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_identity_audit_business
  ON business_identity_audit (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_identity_audit_normalizado
  ON business_identity_audit (nombre_normalizado, created_at DESC);

COMMIT;

-- ============================================================
-- Fin de migracion 024
-- ============================================================
