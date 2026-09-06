-- ============================================================
-- Migracion 004: Indice UNIQUE en google_id
-- Asegura que cada cuenta de Google se vincule a un unico
-- usuario de Explora Turismo (evita duplicados).
-- Usa un indice UNIQUE parcial: solo donde google_id NO es NULL.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'usuarios'
          AND indexname = 'uq_usuarios_google_id'
    ) THEN
        CREATE UNIQUE INDEX uq_usuarios_google_id
        ON usuarios (google_id)
        WHERE google_id IS NOT NULL
          AND google_id <> '';
    END IF;
END $$;

-- ============================================================
-- Migracion 004 completada
-- ============================================================
