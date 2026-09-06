-- ============================================================
-- Migracion 001: Crear tablas nuevas para Explora Turismo
-- Ejecutar DESPUES de 002_alter_existing.sql si se migra
-- una instalacion existente, o directamente en instalacion limpia.
-- ============================================================

-- ============================================================
-- business_categories (categorias de negocios)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_categories (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    slug        VARCHAR(120) NOT NULL,
    descripcion TEXT,
    icono       VARCHAR(50),
    activo      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_business_categories_slug ON business_categories (slug);
CREATE INDEX IF NOT EXISTS idx_business_categories_activo ON business_categories (activo);

-- ============================================================
-- businesses (negocios turisticos)
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
    id              SERIAL PRIMARY KEY,
    owner_id        INTEGER NOT NULL,
    category_id     INTEGER,
    destination_id  INTEGER,
    nombre          VARCHAR(200) NOT NULL,
    slug            VARCHAR(250) NOT NULL,
    descripcion     TEXT,
    direccion       VARCHAR(300),
    telefono        VARCHAR(30),
    whatsapp        VARCHAR(30),
    email_contacto  VARCHAR(150),
    website         VARCHAR(300),
    precio_min      DECIMAL(10,2),
    precio_max      DECIMAL(10,2),
    moneda          VARCHAR(3) DEFAULT 'COP',
    lat             DECIMAL(10,7),
    lng             DECIMAL(10,7),
    portada_url     TEXT,
    estado          VARCHAR(20) NOT NULL DEFAULT 'pending',
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    is_featured     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_businesses_owner FOREIGN KEY (owner_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_businesses_category FOREIGN KEY (category_id)
        REFERENCES business_categories (id) ON DELETE SET NULL,
    CONSTRAINT fk_businesses_destination FOREIGN KEY (destination_id)
        REFERENCES lugares (id) ON DELETE SET NULL,
    CONSTRAINT uq_businesses_slug UNIQUE (slug),
    CONSTRAINT chk_businesses_estado CHECK (estado IN (
        'draft', 'pending', 'approved', 'rejected', 'suspended', 'inactive'
    ))
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses (owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses (category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_destination ON businesses (destination_id);
CREATE INDEX IF NOT EXISTS idx_businesses_estado ON businesses (estado);
CREATE INDEX IF NOT EXISTS idx_businesses_is_featured ON businesses (is_featured) WHERE is_featured = true;

-- ============================================================
-- business_images (galeria de imagenes del negocio)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_images (
    id          SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    url         TEXT NOT NULL,
    alt_text    VARCHAR(250),
    is_primary  BOOLEAN NOT NULL DEFAULT false,
    orden       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_business_images_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_images_business ON business_images (business_id);
CREATE INDEX IF NOT EXISTS idx_business_images_primary ON business_images (business_id, is_primary) WHERE is_primary = true;

-- ============================================================
-- business_services (servicios del negocio)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_services (
    id          SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    nombre      VARCHAR(150) NOT NULL,
    descripcion TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_business_services_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_services_business ON business_services (business_id);

-- ============================================================
-- business_hours (horarios del negocio)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_hours (
    id          SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    day_of_week SMALLINT NOT NULL,
    open_time   TIME,
    close_time  TIME,
    is_closed   BOOLEAN NOT NULL DEFAULT false,
    orden       SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_business_hours_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT chk_business_hours_day CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT uq_business_hours_unique UNIQUE (business_id, day_of_week, orden)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_business ON business_hours (business_id);

-- ============================================================
-- business_social_links (redes sociales del negocio)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_social_links (
    id          SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    plataforma  VARCHAR(50) NOT NULL,
    url         TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_business_social_links_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT uq_business_social_links UNIQUE (business_id, plataforma)
);

CREATE INDEX IF NOT EXISTS idx_business_social_links_business ON business_social_links (business_id);

-- ============================================================
-- plans (planes de suscripcion)
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    slug            VARCHAR(120) NOT NULL,
    descripcion     TEXT,
    precio          DECIMAL(10,2) NOT NULL DEFAULT 0,
    moneda          VARCHAR(3) NOT NULL DEFAULT 'COP',
    duracion_dias   INTEGER,
    max_images      INTEGER DEFAULT 5,
    max_services    INTEGER DEFAULT 5,
    is_featured     BOOLEAN NOT NULL DEFAULT false,
    is_promoted     BOOLEAN NOT NULL DEFAULT false,
    features        JSONB DEFAULT '[]'::jsonb,
    activo          BOOLEAN NOT NULL DEFAULT true,
    orden           INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_plans_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_plans_activo ON plans (activo) WHERE activo = true;

-- ============================================================
-- subscriptions (suscripciones de negocios a planes)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id              SERIAL PRIMARY KEY,
    business_id     INTEGER NOT NULL,
    plan_id         INTEGER NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'active',
    starts_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    ends_at         TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_subscriptions_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id)
        REFERENCES plans (id) ON DELETE RESTRICT,
    CONSTRAINT chk_subscriptions_estado CHECK (estado IN (
        'active', 'expired', 'cancelled', 'pending'
    ))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON subscriptions (business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_estado ON subscriptions (estado);

-- ============================================================
-- favorite_destinos (favoritos de destinos)
-- ============================================================
CREATE TABLE IF NOT EXISTS favorite_destinos (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    destination_id  INTEGER NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_favorite_destinos_user FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_favorite_destinos_destination FOREIGN KEY (destination_id)
        REFERENCES lugares (id) ON DELETE CASCADE,
    CONSTRAINT uq_favorite_destinos UNIQUE (user_id, destination_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_destinos_user ON favorite_destinos (user_id);

-- ============================================================
-- favorite_negocios (favoritos de negocios)
-- ============================================================
CREATE TABLE IF NOT EXISTS favorite_negocios (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    business_id INTEGER NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_favorite_negocios_user FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_favorite_negocios_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT uq_favorite_negocios UNIQUE (user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_negocios_user ON favorite_negocios (user_id);

-- ============================================================
-- reviews (resenas de negocios)
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    business_id INTEGER NOT NULL,
    rating      SMALLINT NOT NULL,
    comment     TEXT,
    estado      VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT uq_reviews_user_business UNIQUE (user_id, business_id),
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_estado CHECK (estado IN (
        'active', 'hidden', 'deleted'
    ))
);

CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews (business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_estado ON reviews (estado);

-- ============================================================
-- review_replies (respuestas del negocio a resenas)
-- ============================================================
CREATE TABLE IF NOT EXISTS review_replies (
    id          SERIAL PRIMARY KEY,
    review_id   INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    reply       TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_review_replies_review FOREIGN KEY (review_id)
        REFERENCES reviews (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_replies_user FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_replies_review ON review_replies (review_id);

-- ============================================================
-- analytics_events (eventos de analitica)
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id              SERIAL PRIMARY KEY,
    business_id     INTEGER NOT NULL,
    user_id         INTEGER,
    event_type      VARCHAR(50) NOT NULL,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    metadata        JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_analytics_events_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_analytics_events_user FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_business ON analytics_events (business_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events (created_at);

-- ============================================================
-- Fin de migracion 001
-- ============================================================
