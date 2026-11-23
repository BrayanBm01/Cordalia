-- ============================================================
-- Migracion 025: integridad de cuentas y unicidad de email OAuth
-- ------------------------------------------------------------
-- OBJETIVO
--   * Que el rol de una cuenta solo pueda ser ADMIN(0), TOURIST(1) o
--     BUSINESS(2), tanto por API como por SQL directo.
--   * Evitar cuentas duplicadas por variaciones de mayusculas en el email
--     (Google siempre normaliza el email a minusculas antes de buscarlo).
--   * Conservar `uq_usuarios_google_id` (migracion 004) como segunda
--     barrera contra duplicados de identidad Google.
--
-- NO DESTRUCTIVA E IDEMPOTENTE
--   * No borra ni modifica cuentas. Si hay datos anomalos, ABORTA con un
--     mensaje explicito antes de crear indices/constraints.
--   * Se ejecuta en transaccion; reejecutarla no duplica nada.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0) Preflight: datos anomalos preexistentes
-- ------------------------------------------------------------
DO $$
DECLARE
  roles_invalidos TEXT;
  emails_duplicados TEXT;
BEGIN
  SELECT string_agg(rol_id::text || ' (id=' || id::text || ')', ', ')
    INTO roles_invalidos
    FROM usuarios
    WHERE rol_id IS NULL OR rol_id NOT IN (0, 1, 2);

  IF roles_invalidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Migracion 025: hay usuarios con rol_id invalido: %. Corrigalos antes de continuar; no se borrara ningun usuario.',
      roles_invalidos;
  END IF;

  SELECT string_agg(lower(email) || ' -> ' || ids, '; ')
    INTO emails_duplicados
    FROM (
      SELECT lower(email) AS email, string_agg(id::text, ',' ORDER BY id) AS ids
      FROM usuarios
      GROUP BY lower(email)
      HAVING COUNT(*) > 1
    ) d;

  IF emails_duplicados IS NOT NULL THEN
    RAISE EXCEPTION
      'Migracion 025: hay emails duplicados ignorando mayusculas: %. Unifiquelos manualmente antes de continuar; no se borrara ningun usuario.',
      emails_duplicados;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1) CHECK de roles publicos/administrativos
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuarios_rol_id_valido') THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT chk_usuarios_rol_id_valido
      CHECK (rol_id IN (0, 1, 2));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) Email unico en forma canonica (usado por el vinculado OAuth)
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email_lower
  ON usuarios (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_usuarios_google_id
  ON usuarios (google_id)
  WHERE google_id IS NOT NULL;

COMMIT;

-- ============================================================
-- Fin de migracion 025
-- ============================================================
