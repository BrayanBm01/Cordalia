-- ============================================================
-- Migracion 007: Campos extra de perfil de usuario
-- AJUSTES POST-FASE 7 - Explora Turismo
-- ============================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellido          VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono          VARCHAR(30);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ciudad            VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pais              VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bio               TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intereses_turisticos TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS preferencias_viaje   TEXT;

-- ============================================================
-- Fin de migracion 007
-- ============================================================