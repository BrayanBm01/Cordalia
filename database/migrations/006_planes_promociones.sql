-- ============================================================
-- Migracion 006: Planes turisticos, paquetes y promociones
-- FASE 7 - Explora Turismo
-- Los precios son INFORMATIVOS. No existe ningun sistema de pago.
-- ============================================================

-- ============================================================
-- tour_plans: planes/paquetes/experiencias de un negocio
-- tipo_plan distingue: plan | paquete | experiencia
-- ============================================================
CREATE TABLE IF NOT EXISTS tour_plans (
    id               SERIAL PRIMARY KEY,
    business_id      INTEGER NOT NULL,
    nombre           VARCHAR(200) NOT NULL,
    slug             VARCHAR(250) NOT NULL,
    descripcion      TEXT,
    destination_id   INTEGER,
    destino          VARCHAR(200),
    duracion_dias    INTEGER NOT NULL DEFAULT 1,
    duracion_noches  INTEGER NOT NULL DEFAULT 0,
    precio           DECIMAL(12,2) NOT NULL DEFAULT 0,
    tipo_precio      VARCHAR(30) NOT NULL DEFAULT 'por_persona',
    precio_anterior  DECIMAL(12,2),
    tipo_plan        VARCHAR(30) NOT NULL DEFAULT 'plan',
    incluye          JSONB NOT NULL DEFAULT '[]'::jsonb,
    itinerario       JSONB NOT NULL DEFAULT '[]'::jsonb,
    moneda           VARCHAR(3) NOT NULL DEFAULT 'COP',
    estado           VARCHAR(20) NOT NULL DEFAULT 'activo',
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tour_plans_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_tour_plans_destination FOREIGN KEY (destination_id)
        REFERENCES lugares (id) ON DELETE SET NULL,
    CONSTRAINT uq_tour_plans_slug UNIQUE (slug),
    CONSTRAINT chk_tour_plans_estado CHECK (estado IN ('activo', 'inactivo')),
    CONSTRAINT chk_tour_plans_tipo_precio CHECK (tipo_precio IN
        ('por_persona', 'por_pareja', 'por_grupo', 'precio_total')),
    CONSTRAINT chk_tour_plans_tipo_plan CHECK (tipo_plan IN
        ('plan', 'paquete', 'experiencia')),
    CONSTRAINT chk_tour_plans_dias CHECK (duracion_dias >= 1),
    CONSTRAINT chk_tour_plans_noches CHECK (duracion_noches >= 0),
    CONSTRAINT chk_tour_plans_precio CHECK (precio >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tour_plans_business ON tour_plans (business_id);
CREATE INDEX IF NOT EXISTS idx_tour_plans_destination ON tour_plans (destination_id);
CREATE INDEX IF NOT EXISTS idx_tour_plans_estado ON tour_plans (estado);
CREATE INDEX IF NOT EXISTS idx_tour_plans_tipo ON tour_plans (tipo_plan);

-- ============================================================
-- tour_plan_images: galeria de imagenes del plan
-- ============================================================
CREATE TABLE IF NOT EXISTS tour_plan_images (
    id          SERIAL PRIMARY KEY,
    plan_id     INTEGER NOT NULL,
    url         TEXT NOT NULL,
    alt_text    VARCHAR(250),
    is_primary  BOOLEAN NOT NULL DEFAULT false,
    orden       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tour_plan_images_plan FOREIGN KEY (plan_id)
        REFERENCES tour_plans (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tour_plan_images_plan ON tour_plan_images (plan_id);
CREATE INDEX IF NOT EXISTS idx_tour_plan_images_primary ON tour_plan_images (plan_id, is_primary) WHERE is_primary = true;

-- ============================================================
-- promotions: ofertas temporales informativas
-- Solo informativo: no hay cobro ni checkout.
-- ============================================================
CREATE TABLE IF NOT EXISTS promotions (
    id                SERIAL PRIMARY KEY,
    business_id       INTEGER NOT NULL,
    plan_id           INTEGER,
    service_id        INTEGER,
    nombre            VARCHAR(150) NOT NULL,
    descripcion       TEXT,
    tipo_descuento    VARCHAR(20) NOT NULL DEFAULT 'porcentaje',
    valor_descuento   DECIMAL(12,2) NOT NULL,
    precio_anterior   DECIMAL(12,2),
    precio_promocional DECIMAL(12,2),
    imagen_url        TEXT,
    fecha_inicio      DATE NOT NULL,
    fecha_fin         DATE NOT NULL,
    estado            VARCHAR(20) NOT NULL DEFAULT 'activo',
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_promotions_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_promotions_plan FOREIGN KEY (plan_id)
        REFERENCES tour_plans (id) ON DELETE CASCADE,
    CONSTRAINT fk_promotions_service FOREIGN KEY (service_id)
        REFERENCES business_services (id) ON DELETE CASCADE,
    CONSTRAINT chk_promotions_estado CHECK (estado IN ('activo', 'inactivo')),
    CONSTRAINT chk_promotions_tipo CHECK (tipo_descuento IN ('porcentaje', 'valor')),
    CONSTRAINT chk_promotions_relacion CHECK (plan_id IS NOT NULL OR service_id IS NOT NULL),
    CONSTRAINT chk_promotions_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT chk_promotions_valor CHECK (valor_descuento >= 0)
);

CREATE INDEX IF NOT EXISTS idx_promotions_business ON promotions (business_id);
CREATE INDEX IF NOT EXISTS idx_promotions_plan ON promotions (plan_id);
CREATE INDEX IF NOT EXISTS idx_promotions_estado ON promotions (estado);

-- ============================================================
-- Fin de migracion 006
-- ============================================================