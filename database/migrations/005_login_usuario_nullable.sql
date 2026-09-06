-- ============================================================
-- Migracion 005: login.usuario_id nullable
-- Permite auditar intentos fallidos de OAuth/Google y errores
-- de validacion cuando NO existe un usuario de Explora Turismo
-- (el usuario_id se desconoce). Los intentos exitosos SIEMPRE
-- registran el usuario_id correspondiente.
-- La FK ON DELETE CASCADE se conserva.
-- ============================================================

ALTER TABLE login ALTER COLUMN usuario_id DROP NOT NULL;

-- ============================================================
-- Migracion 005 completada
-- ============================================================