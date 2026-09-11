-- ============================================================
-- Migracion 012: Tipo de descuento en inscripciones y geografia
-- de destinos (municipio + tipo de lugar).
-- EXPLORA TURISMO - (fase de mejoras)
--
-- La regla de precios pasa a aplicar UN SOLO descuento efectivo:
--   * si hay promocion activa (estado='activo' y fechas vigentes)
--     se usa SOLO la promocion;
--   * si no hay promocion activa, se aplica el descuento por rango
--     de personas (o ninguno).
-- Nunca se combinan promocion + rango.
--
-- inscripciones.tipo_descuento  VARCHAR(20):
--   'promocion' | 'rango' | 'ninguno'  -> descuento que se aplico.
--
-- lugares.municipio VARCHAR(150): municipio real (departamento
--   implicito en ubicacion, ej. "Córdoba, Colombia").
-- lugares.tipo      VARCHAR(30):  categoria del lugar
--   (ciudad, pueblo_patrimonio, playa, humedal, montana, naturaleza,
--   ecoturismo, cultura).
--
-- Aplicable sobre la BD existente; idempotente.
-- ============================================================

ALTER TABLE inscripciones
    ADD COLUMN IF NOT EXISTS tipo_descuento VARCHAR(20);

ALTER TABLE lugares
    ADD COLUMN IF NOT EXISTS municipio VARCHAR(150);

ALTER TABLE lugares
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) DEFAULT 'lugar';