-- ============================================================
-- Migracion 027: precios comerciales terminados en 900
-- ------------------------------------------------------------
-- Cambia UNICAMENTE el precio de CATALOGO de los planes de
-- suscripcion del vendedor:
--   * Profesional: 49000  -> 49900 COP
--   * Premium:     129000 -> 129900 COP
--   * Gratis:      0         (sin cambio; se explicita por claridad)
--
-- NO MODIFICA:
--   * migraciones anteriores (003_seed_data.sql queda intacta),
--   * pagos ya registrados (suscripcion_pagos),
--   * importes de suscripciones ya contratadas (subscriptions.monto):
--     los recibos historicos se conservan tal como se cobraron.
--
-- IDEMPOTENTE: el WHERE por precio antiguo hace que ejecutarla dos
-- veces no cambie nada la segunda. Si un administrador ya habia
-- ajustado el precio a 49900/129900, la sentencia simplemente no
-- aplica y no sobrescribe ese valor.
-- ============================================================

UPDATE plans
   SET precio = 49900,
       moneda = 'COP',
       updated_at = NOW()
 WHERE slug = 'profesional'
   AND precio = 49000;

UPDATE plans
   SET precio = 129900,
       moneda = 'COP',
       updated_at = NOW()
 WHERE slug = 'premium'
   AND precio = 129000;

UPDATE plans
   SET precio = 0,
       moneda = 'COP',
       updated_at = NOW()
 WHERE slug = 'gratis'
   AND precio <> 0;

-- Verificacion (solo lectura; no altera datos):
-- SELECT slug, precio, moneda FROM plans
--  WHERE slug IN ('gratis', 'profesional', 'premium') ORDER BY orden;
