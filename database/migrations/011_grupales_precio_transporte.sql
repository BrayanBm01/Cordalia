-- ============================================================
-- Migracion 011: Precio por inscripcion (snapshot), cierre con
-- hora, transporte por salida y flota ampliada.
-- EXPLORA TURISMO - (fase de mejoras)
--
-- Los precios/cupos/inscripciones/transporte son SOLO
-- informativos/logisticos. NO existe ningun sistema de pago.
--
-- Inscripciones guardan el precio calculado AL MOMENTO de la
-- inscripcion (precio original por persona, precio final por
-- persona, % de descuento combinado y total), de modo que una
-- promocion que cambie despues NO altera inscripciones pasadas.
--
-- tour_plan_salidas:
--   * hora_limite       TIME     -> cierre de inscripciones con
--                                   hora (fecha_limite + hora).
--   * lugar_encuentro   VARCHAR  -> punto de encuentro de la salida.
--
-- vehiculos:
--   * marca, modelo, anio, estado (disponible/mantenimiento/inactivo)
--   * conductor_id (FK opcional) -> conductor habitual asignado.
--   * placa unica activa por negocio (indice parcial).
--
-- conductores:
--   * email, licencia_categoria, licencia_vencimiento, experiencia.
--
-- transportes:
--   * salida_id (FK opcional) -> asignar vehiculo/conductor a una
--     salida concreta (no solo al plan). Un vehiculo o conductor
--     no puede estar asignado a dos salidas el mismo dia.
-- ============================================================

-- ============================================================
-- Inscripciones: snapshot de precio al momento de inscribirse
-- ============================================================
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS precio_original_persona INTEGER;
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS precio_persona INTEGER;
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(6,2) NOT NULL DEFAULT 0;
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS precio_total INTEGER;

-- ============================================================
-- Salidas: cierre con hora y lugar de encuentro
-- ============================================================
ALTER TABLE tour_plan_salidas ADD COLUMN IF NOT EXISTS hora_limite TIME;
ALTER TABLE tour_plan_salidas ADD COLUMN IF NOT EXISTS lugar_encuentro VARCHAR(255);

-- ============================================================
-- Vehiculos: datos ampliados de la flota
-- ============================================================
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS modelo VARCHAR(100);
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS anio INTEGER;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS estado VARCHAR(30) NOT NULL DEFAULT 'disponible';
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS conductor_id INTEGER REFERENCES conductores(id) ON DELETE SET NULL;

-- Estado permitido de un vehiculo (guardado con DO para poder
-- re-ejecutar la migracion sin duplicar la constraint).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_vehiculos_estado'
  ) THEN
    ALTER TABLE vehiculos ADD CONSTRAINT chk_vehiculos_estado
      CHECK (estado IN ('disponible', 'mantenimiento', 'inactivo'));
  END IF;
END $$;

-- Placa unica por negocio (solo vehiculos con placa definida).
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehiculos_business_placa
  ON vehiculos (business_id, lower(placa))
  WHERE placa IS NOT NULL AND placa <> '';

CREATE INDEX IF NOT EXISTS idx_vehiculos_estado ON vehiculos (estado);

-- ============================================================
-- Conductores: informacion personal/profesional ampliada
-- ============================================================
ALTER TABLE conductores ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE conductores ADD COLUMN IF NOT EXISTS licencia_categoria VARCHAR(20);
ALTER TABLE conductores ADD COLUMN IF NOT EXISTS licencia_vencimiento DATE;
ALTER TABLE conductores ADD COLUMN IF NOT EXISTS experiencia TEXT;

-- ============================================================
-- Transporte por salida (detalle de asignacion)
-- ============================================================
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS salida_id INTEGER
  REFERENCES tour_plan_salidas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_transportes_salida ON transportes (salida_id);

-- ============================================================
-- Fin de migracion 011
-- ============================================================