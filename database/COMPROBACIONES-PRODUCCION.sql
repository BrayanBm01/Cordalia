-- ============================================================
-- Comprobaciones PREVIAS (solo lectura) para la migracion de
-- produccion de Cordalia. No modifica nada.
-- Ejecutar en el SQL Editor de Supabase o con psql (solo lectura).
-- ============================================================

\echo '--- 1) ¿Qué migraciones están aplicadas? (columnas que cada una crea) ---'
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='inscripciones' AND column_name='plan_id')  AS "018_plan_id",
  EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='usuarios' AND column_name='trial_inicio')   AS "019_trial_inicio",
  EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='plans' AND column_name='meses')            AS "019_planes_meses",
  EXISTS (SELECT 1 FROM information_schema.tables
            WHERE table_schema='public' AND table_name='suscripcion_pagos')                        AS "019_suscripcion_pagos",
  EXISTS (SELECT 1 FROM information_schema.tables
            WHERE table_schema='public' AND table_name='password_reset_tokens')                    AS "020_password_reset_tokens";

\echo '--- 2) Tablas base que exigen las 3 migraciones ---'
SELECT table_name FROM information_schema.tables
 WHERE table_schema='public'
   AND table_name IN ('inscripciones','tour_plans','tour_plan_salidas','plans','subscriptions','usuarios')
 ORDER BY table_name;

\echo '--- 3) Constraints de estado actuales (018 y 019 los reemplazan) ---'
SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
 WHERE conname IN ('chk_inscripciones_estado','chk_subscriptions_estado')
 ORDER BY conname;

\echo '--- 4) RIESGO 018: duplicados que bloquearian el indice unico parcial ---'
SELECT user_id, salida_id, count(*) AS duplicados
  FROM inscripciones
 WHERE estado = 'confirmada' AND user_id IS NOT NULL
 GROUP BY user_id, salida_id
HAVING count(*) > 1;

\echo '--- 5) RIESGO 019: dos suscripciones activas del mismo usuario ---'
SELECT usuario_id, count(*) AS activas
  FROM subscriptions
 WHERE estado = 'active' AND usuario_id IS NOT NULL
 GROUP BY usuario_id
HAVING count(*) > 1;

\echo '--- 6) RIESGO 018: estados presentes en inscripciones (deben caber en la constraint nueva) ---'
SELECT estado, count(*) AS filas FROM inscripciones GROUP BY estado ORDER BY estado;

\echo '--- 7) RIESGO 019: estados presentes en subscriptions (deben caber en la constraint nueva) ---'
SELECT estado, count(*) AS filas FROM subscriptions GROUP BY estado ORDER BY estado;

\echo '--- 8) FILAS que la migracion 018 va a backfillear (UPDATE real) ---'
SELECT count(*) AS inscriptions_sin_plan_id
  FROM inscripciones i
 WHERE i.plan_id IS NULL
   AND EXISTS (SELECT 1 FROM tour_plan_salidas s WHERE s.id = i.salida_id);

\echo '--- 9) Tamaño real de las tablas afectadas (duracion estimada de los bloqueos) ---'
SELECT relname AS tabla, n_live_tup AS filas_aprox
  FROM pg_stat_user_tables
 WHERE relname IN ('inscripciones','subscriptions','usuarios','plans')
 ORDER BY relname;
