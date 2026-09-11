-- ============================================================
-- Migracion 010: Mejoras de negocios/vendedores
-- EXPLORA TURISMO - (fase de mejoras)
-- Imagenes desde dispositivo, dashboard de vendedor, precios por
-- persona con descuentos, paquetes grupales con cupos e
-- inscripciones, e integracion de transporte segun personas.
-- Los precios/cupos/inscripciones son SOLO informativos/logisticos.
-- NO existe ningun sistema de pago.
--
-- Se modifica tour_plans:
--   * descuentos_rango  JSONB  -> descuentos escalonados por rango de
--                                personas (ej. [{min:1,max:4,descuento:0},
--                                {min:5,max:9,descuento:10}]).
--   * transporte_capacidad INTEGER -> capacidad referencial por viaje
--                                (opcional) para sugerir transporte.
-- Se crean tablas nuevas:
--   * tour_plan_salidas   -> salidas/fechas con cupo y fecha limite.
--   * inscripciones       -> interesados (con cuenta turista/anonimo) en
--                            una salida; descuentan cupo. Sin pago.
--   * vehiculos           -> vehiculos del negocio (flota).
--   * conductores         -> conductores del negocio.
--   * transportes         -> relaciona un plan con el transporte requerido
--                            (vehiculo + conductor) cuando el numero de
--                            personas lo amerita. Solo informativo.
-- ============================================================

-- ============================================================
-- Ampliar tour_plans con descuentos escalonados y capacidad
-- ============================================================
ALTER TABLE tour_plans ADD COLUMN IF NOT EXISTS descuentos_rango      JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tour_plans ADD COLUMN IF NOT EXISTS capacidad_referencial INTEGER;

-- ============================================================
-- tour_plan_salidas: fechas programadas de salida con cupo
-- ============================================================
CREATE TABLE IF NOT EXISTS tour_plan_salidas (
    id              SERIAL PRIMARY KEY,
    plan_id         INTEGER NOT NULL,
    fecha           DATE NOT NULL,
    hora            TIME,
    cupo_maximo     INTEGER NOT NULL DEFAULT 30,
    cupo_ocupado    INTEGER NOT NULL DEFAULT 0,
    fecha_limite    DATE,
    estado          VARCHAR(20) NOT NULL DEFAULT 'activa',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tour_plan_salidas_plan FOREIGN KEY (plan_id)
        REFERENCES tour_plans (id) ON DELETE CASCADE,
    CONSTRAINT chk_tour_plan_salidas_estado CHECK (estado IN ('activa', 'llena', 'cancelada', 'cerrada')),
    CONSTRAINT chk_tour_plan_salidas_cupo CHECK (cupo_maximo >= 0 AND cupo_ocupado >= 0 AND cupo_ocupado <= cupo_maximo)
);

CREATE INDEX IF NOT EXISTS idx_tour_plan_salidas_plan ON tour_plan_salidas (plan_id);
CREATE INDEX IF NOT EXISTS idx_tour_plan_salidas_fecha ON tour_plan_salidas (fecha);
CREATE INDEX IF NOT EXISTS idx_tour_plan_salidas_estado ON tour_plan_salidas (estado);

-- ============================================================
-- inscripciones: interes en una salida (sin pago)
-- ============================================================
CREATE TABLE IF NOT EXISTS inscripciones (
    id              SERIAL PRIMARY KEY,
    salida_id       INTEGER NOT NULL,
    user_id         INTEGER,
    nombre          VARCHAR(150),
    email           VARCHAR(150),
    personas        INTEGER NOT NULL DEFAULT 1,
    mensaje         TEXT,
    estado          VARCHAR(20) NOT NULL DEFAULT 'confirmada',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_inscripciones_salida FOREIGN KEY (salida_id)
        REFERENCES tour_plan_salidas (id) ON DELETE CASCADE,
    CONSTRAINT fk_inscripciones_user FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE SET NULL,
    CONSTRAINT chk_inscripciones_personas CHECK (personas >= 1),
    CONSTRAINT chk_inscripciones_estado CHECK (estado IN ('confirmada', 'cancelada'))
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_salida ON inscripciones (salida_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_user ON inscripciones (user_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado ON inscripciones (estado);

-- ============================================================
-- vehiculos: flota del negocio
-- ============================================================
CREATE TABLE IF NOT EXISTS vehiculos (
    id              SERIAL PRIMARY KEY,
    business_id     INTEGER NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    tipo            VARCHAR(50),
    placa           VARCHAR(20),
    capacidad       INTEGER NOT NULL DEFAULT 4,
    descripcion     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_vehiculos_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT chk_vehiculos_capacidad CHECK (capacidad >= 1)
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_business ON vehiculos (business_id);

-- ============================================================
-- conductores: conductores del negocio
-- ============================================================
CREATE TABLE IF NOT EXISTS conductores (
    id              SERIAL PRIMARY KEY,
    business_id     INTEGER NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    telefono        VARCHAR(30),
    licencia        VARCHAR(50),
    disponible      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_conductores_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conductores_business ON conductores (business_id);

-- ============================================================
-- transportes: sugiere un vehiculo/conductor para un plan
-- ============================================================
CREATE TABLE IF NOT EXISTS transportes (
    id              SERIAL PRIMARY KEY,
    plan_id         INTEGER NOT NULL,
    vehiculo_id     INTEGER NOT NULL,
    conductor_id    INTEGER,
    orden           INTEGER NOT NULL DEFAULT 0,
    notas           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_transportes_plan FOREIGN KEY (plan_id)
        REFERENCES tour_plans (id) ON DELETE CASCADE,
    CONSTRAINT fk_transportes_vehiculo FOREIGN KEY (vehiculo_id)
        REFERENCES vehiculos (id) ON DELETE CASCADE,
    CONSTRAINT fk_transportes_conductor FOREIGN KEY (conductor_id)
        REFERENCES conductores (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transportes_plan ON transportes (plan_id);
CREATE INDEX IF NOT EXISTS idx_transportes_vehiculo ON transportes (vehiculo_id);

-- ============================================================
-- Fin de migracion 010
-- ============================================================