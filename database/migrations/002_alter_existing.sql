-- ============================================================
-- Migracion 002: Alterar tablas existentes
-- Asegurar compatibilidad con nueva arquitectura.
-- Usa IF NOT EXISTS / IF EXISTS para ser seguro en
-- instalaciones nuevas y existentes.
-- ============================================================

-- ============================================================
-- usuarios: agregar campos nuevos
-- ============================================================
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS proveedor VARCHAR(20) NOT NULL DEFAULT 'local';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- ============================================================
-- lugares: agregar slug y timestamps
-- ============================================================
ALTER TABLE lugares ADD COLUMN IF NOT EXISTS slug VARCHAR(200);
ALTER TABLE lugares ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE lugares ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Generar slugs para destinos existentes que no tengan slug
CREATE OR REPLACE FUNCTION slugify_ext(txt TEXT) RETURNS TEXT AS $$
SELECT regexp_replace(
  regexp_replace(
    lower(
      replace(replace(replace(replace(replace(replace(
        replace(replace(replace(replace(replace(replace(txt,
          'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u'),'ñ','n'),
        'Á','a'),'É','e'),'Í','i'),'Ó','o'),'Ú','u'),'Ñ','n')
    ), '[^a-z0-9]+', '-', 'g'
  ), '^-+|-+$', '', 'g');
$$ LANGUAGE SQL IMMUTABLE;

UPDATE lugares
SET slug = COALESCE(
  slugify_ext(nombre),
  'lugar-' || id
)
WHERE slug IS NULL OR slug = '';

DROP FUNCTION IF EXISTS slugify_ext(TEXT);

-- Agregar restriccion UNIQUE al slug de lugares (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_lugares_slug'
    ) THEN
        ALTER TABLE lugares ADD CONSTRAINT uq_lugares_slug UNIQUE (slug);
    END IF;
END $$;

-- ============================================================
-- login: agregar campos de auditoria
-- ============================================================
ALTER TABLE login ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE login ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ============================================================
-- Migracion 002 completada
-- ============================================================
