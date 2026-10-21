-- ============================================================
-- Migracion 020: Recuperacion de contrasena (tokens de un solo uso)
-- CORDALIA
-- ------------------------------------------------------------
-- Permite que un usuario (en especial uno creado con Google que no
-- tiene contrasena local) recupere/establezca su contrasena mediante
-- un flujo seguro:
--   1. El usuario solicita el enlace de recuperacion con su correo.
--   2) El backend genera un token ALEATORIO, guarda solo su HASH
--      (nunca el token en claro) y el enlace se envia por correo.
--   3. El usuario usa el enlace; el token se valida, se consume (un solo
--      uso) y se establece la nueva contrasena.
--
-- NO destructiva e idempotente: solo crea una tabla nueva.
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id           SERIAL PRIMARY KEY,
    usuario_id   INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    token_hash   VARCHAR(128) NOT NULL,
    expira_en    TIMESTAMP NOT NULL,
    usado_en    TIMESTAMP,
    creado_en    TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_password_reset_token_hash UNIQUE (token_hash)
);

-- Indice para validar y limpiar tokens (los usados o vencidos se ignoran).
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_usuario
  ON password_reset_tokens (usuario_id, expira_en);

-- ============================================================
-- Fin de migracion 020
-- ============================================================
