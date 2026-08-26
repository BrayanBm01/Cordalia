-- ============================================================
-- Schema: turismo_db
-- Generado a partir del análisis del código fuente del proyecto
-- ============================================================

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL,
    password    TEXT NOT NULL,
    rol_id      INTEGER NOT NULL DEFAULT 1,
    token_activo TEXT
);

-- Restricciones
ALTER TABLE usuarios
    ADD CONSTRAINT uq_usuarios_email UNIQUE (email);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_id ON usuarios (rol_id);

-- ============================================================

-- Tabla: login (historial de intentos de acceso)
CREATE TABLE IF NOT EXISTS login (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER NOT NULL,
    exito       BOOLEAN NOT NULL DEFAULT false,
    fecha       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Clave foránea → usuarios
ALTER TABLE login
    ADD CONSTRAINT fk_login_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id)
    ON DELETE CASCADE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_login_usuario_id ON login (usuario_id);
CREATE INDEX IF NOT EXISTS idx_login_fecha ON login (fecha);

-- ============================================================

-- Tabla: lugares (destinos turísticos)
CREATE TABLE IF NOT EXISTS lugares (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    descripcion TEXT,
    ubicacion   VARCHAR(200),
    imagen      TEXT
);

-- ============================================================
-- Fin del esquema
-- ============================================================
