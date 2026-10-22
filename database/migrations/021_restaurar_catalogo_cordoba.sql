-- ============================================================
-- Migracion 021: restaurar el catalogo demo de Cordoba
-- ------------------------------------------------------------
-- PROBLEMA
--   La base de produccion conserva destinos, actividades, categorias
--   y planes comerciales, pero las tablas de catalogo turistico
--   (`businesses`, `tour_plans`, `tour_plan_images`,
--   `tour_plan_salidas`) quedaron vacias. Por eso el sitio no
--   muestra negocios ni planes de viaje.
--
-- POR QUE UNA MIGRACION NUEVA
--   El contenido original vive en `013_seed_cordoba_limpieza.sql`,
--   pero esa migracion EMPIEZA BORRANDO datos (usuarios, negocios,
--   inscripciones, etc.). Volver a ejecutarla destruiria informacion
--   real. Esta migracion SOLO INSERTA lo que falta.
--
-- GARANTIAS
--   * NO borra ni modifica filas existentes.
--   * NO reinicia secuencias ni usa IDs fijos.
--   * Es IDEMPOTENTE: se puede ejecutar varias veces. Cada bloque
--     inserta unicamente si el negocio/plan no existe (por slug) y
--     solo crea imagenes/salidas cuando el plan no tiene ninguna.
--   * El propietario se resuelve en el servidor: se usa el primer
--     usuario BUSINESS; si no existe, el primer ADMIN. Asi no se
--     crean cuentas nuevas ni se exponen credenciales demo.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_owner INTEGER;

  v_b1 INTEGER; v_b2 INTEGER; v_b3 INTEGER; v_b4 INTEGER;

  v_p1 INTEGER; v_p2 INTEGER; v_p3 INTEGER; v_p4 INTEGER;
  v_p5 INTEGER; v_p6 INTEGER; v_p7 INTEGER; v_p8 INTEGER;
BEGIN
  -- ----------------------------------------------------------
  -- 0) Propietario de los negocios demo
  -- ----------------------------------------------------------
  SELECT id INTO v_owner
    FROM usuarios
   WHERE rol_id = 2
   ORDER BY id
   LIMIT 1;

  IF v_owner IS NULL THEN
    SELECT id INTO v_owner
      FROM usuarios
     WHERE rol_id = 0
     ORDER BY id
     LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    RAISE NOTICE '021: no hay usuarios BUSINESS ni ADMIN; se omite la restauracion del catalogo';
    RETURN;
  END IF;

  -- ----------------------------------------------------------
  -- 1) Negocios (solo si no existe el slug)
  -- ----------------------------------------------------------
  INSERT INTO businesses
    (owner_id, category_id, destination_id, nombre, slug, descripcion,
     direccion, telefono, whatsapp, email_contacto, portada_url,
     estado, is_verified, is_featured)
  SELECT v_owner, 5, 1, 'Agencia Córdoba Aventura', 'agencia-cordoba-aventura',
         'Agencia de turismo local en Montería. Rutas por ciénagas, río Sinú y costa cordobesa. Grupos y planes personalizados.',
         'Centro de Montería', '+57 604 0000000', '3001234567',
         'hola@agencia-cordoba.local',
         'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANUlEQVR4nO3OQQ0AAAgEIHOazqi28HywEYDqnlcqPhASEhJKD4SEhITSAyEhIaH0QEhI6NgCKYb4atr0w8QAAAAASUVORK5CYII=',
         'approved', true, true
   WHERE NOT EXISTS (
     SELECT 1 FROM businesses WHERE slug = 'agencia-cordoba-aventura'
   )
  RETURNING id INTO v_b1;
  IF v_b1 IS NULL THEN
    SELECT id INTO v_b1 FROM businesses WHERE slug = 'agencia-cordoba-aventura' LIMIT 1;
  END IF;

  INSERT INTO businesses
    (owner_id, category_id, destination_id, nombre, slug, descripcion,
     direccion, telefono, whatsapp, email_contacto, portada_url,
     estado, is_verified, is_featured)
  SELECT v_owner, 4, 7, 'Aventura Sinú Ríos y Parques', 'aventura-sinu-rios-y-parques',
         'Tour operador del Alto Sinú: Paramillo, caños y ciénagas con guías locales. Equipos y transporte propio.',
         'Vía a Tierralta km 2', '+57 604 1111111', '3115556677',
         'info@aventurasinu.local',
         'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANUlEQVR4nO3OQQ0AAAgEIHOazqi28HywEYDqnlcqPhASEhJKD4SEhITSAyEhIaH0QEhI6NgCKYb4atr0w8QAAAAASUVORK5CYII=',
         'approved', true, true
   WHERE NOT EXISTS (
     SELECT 1 FROM businesses WHERE slug = 'aventura-sinu-rios-y-parques'
   )
  RETURNING id INTO v_b2;
  IF v_b2 IS NULL THEN
    SELECT id INTO v_b2 FROM businesses WHERE slug = 'aventura-sinu-rios-y-parques' LIMIT 1;
  END IF;

  INSERT INTO businesses
    (owner_id, category_id, destination_id, nombre, slug, descripcion,
     direccion, telefono, whatsapp, email_contacto, portada_url,
     estado, is_verified, is_featured)
  SELECT v_owner, 10, 4, 'Playas del Viento Tours', 'playas-del-viento-tours',
         'Experiencias de playa y kitesurf en San Bernardo del Viento. Atardeceres y fotografías en el Caribe cordobés.',
         'Playa del Viento', '+57 604 2222222', '3127778899',
         'turismo@playasdelviento.local',
         'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANUlEQVR4nO3OQQ0AAAgEIHOazqi28HywEYDqnlcqPhASEhJKD4SEhITSAyEhIaH0QEhI6NgCKYb4atr0w8QAAAAASUVORK5CYII=',
         'approved', false, false
   WHERE NOT EXISTS (
     SELECT 1 FROM businesses WHERE slug = 'playas-del-viento-tours'
   )
  RETURNING id INTO v_b3;
  IF v_b3 IS NULL THEN
    SELECT id INTO v_b3 FROM businesses WHERE slug = 'playas-del-viento-tours' LIMIT 1;
  END IF;

  INSERT INTO businesses
    (owner_id, category_id, destination_id, nombre, slug, descripcion,
     direccion, telefono, whatsapp, email_contacto, portada_url,
     estado, is_verified, is_featured)
  SELECT v_owner, 3, 10, 'Hostal Ciénaga de Betancí', 'hostal-cienaga-de-betanci',
         'Alojamiento rural frente a la Ciénaga de Betancí (corregimiento de Maracayó). Comida típica del Bajo Sinú.',
         'Maracayó, ruta Betancí', '+57 604 3333333', '3134445566',
         'reservas@hostalbetanci.local',
         'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANUlEQVR4nO3OQQ0AAAgEIHOazqi28HywEYDqnlcqPhASEhJKD4SEhITSAyEhIaH0QEhI6NgCKYb4atr0w8QAAAAASUVORK5CYII=',
         'approved', false, false
   WHERE NOT EXISTS (
     SELECT 1 FROM businesses WHERE slug = 'hostal-cienaga-de-betanci'
   )
  RETURNING id INTO v_b4;
  IF v_b4 IS NULL THEN
    SELECT id INTO v_b4 FROM businesses WHERE slug = 'hostal-cienaga-de-betanci' LIMIT 1;
  END IF;

  -- ----------------------------------------------------------
  -- 2) Planes turisticos (solo si no existe el slug)
  -- ----------------------------------------------------------
  INSERT INTO tour_plans
    (business_id, nombre, slug, descripcion, destination_id, destino,
     duracion_dias, duracion_noches, precio, tipo_precio, tipo_plan,
     incluye, itinerario, estado, descuentos_rango, capacidad_referencial)
  SELECT v_b1, 'Manglares de Cispatá y Bahía', 'manglares-de-cispata-y-bahia',
         'Recorrido en lancha por los manglares del estuario de Cispatá, avistamiento de aves y parada en Playa Blanca.',
         11, 'Bahía de Cispatá, San Antero', 1, 0, 130000, 'por_persona', 'experiencia',
         '["Guía local", "Lancha compartida", "Chalecos salvavidas"]'::jsonb,
         '[{"dia":1,"titulo":"Recorrido","descripcion":"Salida desde San Antero hacia el estuario"}]'::jsonb,
         'activo',
         '[{"min":1,"max":4,"descuento":0},{"min":5,"max":9,"descuento":20},{"min":10,"max":999,"descuento":35}]'::jsonb,
         15
   WHERE NOT EXISTS (SELECT 1 FROM tour_plans WHERE slug = 'manglares-de-cispata-y-bahia')
  RETURNING id INTO v_p1;
  IF v_p1 IS NULL THEN
    SELECT id INTO v_p1 FROM tour_plans WHERE slug = 'manglares-de-cispata-y-bahia' LIMIT 1;
  END IF;

  INSERT INTO tour_plans
    (business_id, nombre, slug, descripcion, destination_id, destino,
     duracion_dias, duracion_noches, precio, tipo_precio, tipo_plan,
     incluye, itinerario, estado, descuentos_rango, capacidad_referencial)
  SELECT v_b1, 'Amanecer en la Ciénaga de Betancí', 'amanecer-en-la-cienaga-de-betanci',
         'Salida muy temprano para ver el amanecer sobre el humedal de Betancí y su avifauna.',
         10, 'Ciénaga de Betancí, Montería', 1, 0, 85000, 'por_persona', 'experiencia',
         '["Guía local", "Cafecito de la región", "Binoculares"]'::jsonb,
         '[{"dia":1,"titulo":"Amanecer","descripcion":"Caminata a la orilla y avistamiento de aves"}]'::jsonb,
         'activo',
         '[{"min":1,"max":3,"descuento":0},{"min":4,"max":7,"descuento":15},{"min":8,"max":999,"descuento":25}]'::jsonb,
         20
   WHERE NOT EXISTS (SELECT 1 FROM tour_plans WHERE slug = 'amanecer-en-la-cienaga-de-betanci')
  RETURNING id INTO v_p2;
  IF v_p2 IS NULL THEN
    SELECT id INTO v_p2 FROM tour_plans WHERE slug = 'amanecer-en-la-cienaga-de-betanci' LIMIT 1;
  END IF;

  INSERT INTO tour_plans
    (business_id, nombre, slug, descripcion, destination_id, destino,
     duracion_dias, duracion_noches, precio, tipo_precio, tipo_plan,
     incluye, itinerario, estado, descuentos_rango, capacidad_referencial)
  SELECT v_b1, 'Ciudad Verde: Ronda del Sinú a pie', 'ciudad-verde-ronda-del-sinu-a-pie',
         'Caminata por la Ronda del Sinú, el Malecón, la Catedral San Jerónimo y el centro de Montería.',
         1, 'Montería', 1, 0, 45000, 'por_persona', 'experiencia',
         '["Guía urbana", "Parada en el Malecón"]'::jsonb,
         '[{"dia":1,"titulo":"Recorrido a pie","descripcion":"Centro histórico y malecón"}]'::jsonb,
         'activo',
         '[{"min":1,"max":4,"descuento":0},{"min":5,"max":999,"descuento":10}]'::jsonb,
         25
   WHERE NOT EXISTS (SELECT 1 FROM tour_plans WHERE slug = 'ciudad-verde-ronda-del-sinu-a-pie')
  RETURNING id INTO v_p3;
  IF v_p3 IS NULL THEN
    SELECT id INTO v_p3 FROM tour_plans WHERE slug = 'ciudad-verde-ronda-del-sinu-a-pie' LIMIT 1;
  END IF;

  INSERT INTO tour_plans
    (business_id, nombre, slug, descripcion, destination_id, destino,
     duracion_dias, duracion_noches, precio, tipo_precio, tipo_plan,
     incluye, itinerario, estado, descuentos_rango, capacidad_referencial)
  SELECT v_b2, 'Tierralta y PNN Paramillo (2 días)', 'tierralta-y-pnn-paramillo-2-dias',
         'Ruta de dos días por la zona de amortiguación del Parque Nacional Natural Paramillo y la represa de Urrá, desde Tierralta.',
         12, 'Parque Nacional Natural Paramillo, Tierralta', 2, 1, 320000, 'por_persona', 'plan',
         '["Guía especializado", "Transporte local", "Hospedaje rural", "Alimentación"]'::jsonb,
         '[{"dia":1,"titulo":"Llegada Alto Sinú","descripcion":"Ingreso y caminata corta"},{"dia":2,"titulo":"Ruta al parque","descripcion":"Sendero y avistamiento"}]'::jsonb,
         'activo',
         '[{"min":1,"max":3,"descuento":0},{"min":4,"max":6,"descuento":12},{"min":7,"max":999,"descuento":20}]'::jsonb,
         14
   WHERE NOT EXISTS (SELECT 1 FROM tour_plans WHERE slug = 'tierralta-y-pnn-paramillo-2-dias')
  RETURNING id INTO v_p4;
  IF v_p4 IS NULL THEN
    SELECT id INTO v_p4 FROM tour_plans WHERE slug = 'tierralta-y-pnn-paramillo-2-dias' LIMIT 1;
  END IF;

  INSERT INTO tour_plans
    (business_id, nombre, slug, descripcion, destination_id, destino,
     duracion_dias, duracion_noches, precio, tipo_precio, tipo_plan,
     incluye, itinerario, estado, descuentos_rango, capacidad_referencial)
  SELECT v_b2, 'Kayak y aves en la Ciénaga de Ayapel', 'kayak-y-aves-en-la-cienaga-de-ayapel',
         'Paseo en kayak por la Ciénaga de Ayapel con pesca artesanal y avistamiento de aves.',
         9, 'Ciénaga de Ayapel, Ayapel', 1, 0, 150000, 'por_persona', 'experiencia',
         '["Kayak", "Guía local", "Chaleco salvavidas"]'::jsonb,
         '[{"dia":1,"titulo":"Ciénaga","descripcion":"Remada y avistamiento"}]'::jsonb,
         'activo',
         '[{"min":1,"max":3,"descuento":0},{"min":4,"max":999,"descuento":15}]'::jsonb,
         16
   WHERE NOT EXISTS (SELECT 1 FROM tour_plans WHERE slug = 'kayak-y-aves-en-la-cienaga-de-ayapel')
  RETURNING id INTO v_p5;
  IF v_p5 IS NULL THEN
    SELECT id INTO v_p5 FROM tour_plans WHERE slug = 'kayak-y-aves-en-la-cienaga-de-ayapel' LIMIT 1;
  END IF;

  INSERT INTO tour_plans
    (business_id, nombre, slug, descripcion, destination_id, destino,
     duracion_dias, duracion_noches, precio, tipo_precio, tipo_plan,
     incluye, itinerario, estado, descuentos_rango, capacidad_referencial)
  SELECT v_b3, 'Playa del Viento: kitesurf y atardecer', 'playa-del-viento-kitesurf-y-atardecer',
         'Día de playa en San Bernardo del Viento con kitesurf y atardecer en Playa del Viento.',
         4, 'Playa del Viento, San Bernardo del Viento', 1, 0, 95000, 'por_persona', 'experiencia',
         '["Sesión de kitesurf", "Puesto de playa"]'::jsonb,
         '[{"dia":1,"titulo":"Playa","descripcion":"Kitesurf y atardecer"}]'::jsonb,
         'activo',
         '[{"min":1,"max":4,"descuento":0},{"min":5,"max":999,"descuento":10}]'::jsonb,
         12
   WHERE NOT EXISTS (SELECT 1 FROM tour_plans WHERE slug = 'playa-del-viento-kitesurf-y-atardecer')
  RETURNING id INTO v_p6;
  IF v_p6 IS NULL THEN
    SELECT id INTO v_p6 FROM tour_plans WHERE slug = 'playa-del-viento-kitesurf-y-atardecer' LIMIT 1;
  END IF;

  INSERT INTO tour_plans
    (business_id, nombre, slug, descripcion, destination_id, destino,
     duracion_dias, duracion_noches, precio, tipo_precio, tipo_plan,
     incluye, itinerario, estado, descuentos_rango, capacidad_referencial)
  SELECT v_b3, 'Safari fotográfico Punta Piedra', 'safari-fotografico-punta-piedra',
         'Caminata fotográfica al amanecer en Punta Piedra con guía y café de la región.',
         4, 'Punta Piedra, San Bernardo del Viento', 1, 0, 120000, 'por_persona', 'experiencia',
         '["Guía fotográfica", "Amueblamiento y agua"]'::jsonb,
         '[{"dia":1,"titulo":"Amanecer","descripcion":"Caminata y toma de fotos"}]'::jsonb,
         'activo',
         '[]'::jsonb,
         10
   WHERE NOT EXISTS (SELECT 1 FROM tour_plans WHERE slug = 'safari-fotografico-punta-piedra')
  RETURNING id INTO v_p7;
  IF v_p7 IS NULL THEN
    SELECT id INTO v_p7 FROM tour_plans WHERE slug = 'safari-fotografico-punta-piedra' LIMIT 1;
  END IF;

  INSERT INTO tour_plans
    (business_id, nombre, slug, descripcion, destination_id, destino,
     duracion_dias, duracion_noches, precio, tipo_precio, tipo_plan,
     incluye, itinerario, estado, descuentos_rango, capacidad_referencial)
  SELECT v_b4, 'Pernoctada frente a la ciénaga', 'pernoctada-frente-a-la-cienaga',
         'Una noche en el Hostal Ciénaga de Betancí con cena típica y desayuno del Bajo Sinú.',
         10, 'Ciénaga de Betancí, Montería', 1, 1, 180000, 'por_persona', 'plan',
         '["Hospedaje", "Cena", "Desayuno"]'::jsonb,
         '[{"dia":1,"titulo":"Llegada y cena","descripcion":"Atardecer en el humedal"}]'::jsonb,
         'activo',
         '[{"min":1,"max":3,"descuento":0},{"min":4,"max":999,"descuento":10}]'::jsonb,
         16
   WHERE NOT EXISTS (SELECT 1 FROM tour_plans WHERE slug = 'pernoctada-frente-a-la-cienaga')
  RETURNING id INTO v_p8;
  IF v_p8 IS NULL THEN
    SELECT id INTO v_p8 FROM tour_plans WHERE slug = 'pernoctada-frente-a-la-cienaga' LIMIT 1;
  END IF;

  -- ----------------------------------------------------------
  -- 3) Imagenes: solo si el plan aun no tiene ninguna
  -- ----------------------------------------------------------
  IF v_p1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_images WHERE plan_id = v_p1) THEN
    INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
    VALUES (v_p1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMJQgERFTPhccjyYV0Oo3p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg/OZlRbdsOH6wAAAABJRU5ErkJggg==', 'Manglares de Cispatá', true, 0);
  END IF;

  IF v_p2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_images WHERE plan_id = v_p2) THEN
    INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
    VALUES (v_p2, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMNRgDE3zOxccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg9HYLRbeb7IxwAAAABJRU5ErkJggg==', 'Ciénaga de Betancí', true, 0);
  END IF;

  IF v_p3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_images WHERE plan_id = v_p3) THEN
    INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
    VALUES (v_p3, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANklEQVR4nO3OQQ0AMAgEMLQgGrubC45Hkwpo9bxTKj4QEhISSg+EhISE0gMhISGh9EBISGjZB/rCSpcWHMZFAAAAAElFTkSuQmCC', 'Ronda del Sinú, Montería', true, 0);
  END IF;

  IF v_p4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_images WHERE plan_id = v_p4) THEN
    INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
    VALUES (v_p4, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OMREAMAgEMIQxo6ny64JnyF0EpOb1KRUfCAkJCaUHQkJCQumBkJCQUHogJCS07AMq09xMU8xhMgAAAABJRU5ErkJggg==', 'PNN Paramillo', true, 0);
  END IF;

  IF v_p5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_images WHERE plan_id = v_p5) THEN
    INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
    VALUES (v_p5, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMHQhDHnTNhccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg/IQpR5wzqZDAAAAABJRU5ErkJggg==', 'Ciénaga de Ayapel', true, 0);
  END IF;

  IF v_p6 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_images WHERE plan_id = v_p6) THEN
    INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
    VALUES (v_p6, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMIQhH0kTMBccjyYV0HrTp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg8bwrimZGeXRQAAAABJRU5ErkJggg==', 'Playa del Viento', true, 0);
  END IF;

  IF v_p7 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_images WHERE plan_id = v_p7) THEN
    INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
    VALUES (v_p7, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMIQhH0kTMBccjyYV0HrTp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg8bwrimZGeXRQAAAABJRU5ErkJggg==', 'Punta Piedra', true, 0);
  END IF;

  IF v_p8 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_images WHERE plan_id = v_p8) THEN
    INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
    VALUES (v_p8, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMNRgDE3zOxccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg9HYLRbeb7IxwAAAABJRU5ErkJggg==', 'Hostal Ciénaga de Betancí', true, 0);
  END IF;

  -- ----------------------------------------------------------
  -- 4) Salidas: solo si el plan aun no tiene ninguna
  --    Fechas relativas a la fecha de ejecucion (los planes
  --    necesitan salidas futuras para poder inscribirse).
  -- ----------------------------------------------------------
  IF v_p4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_salidas WHERE plan_id = v_p4) THEN
    INSERT INTO tour_plan_salidas
      (plan_id, fecha, hora, cupo_maximo, cupo_ocupado, fecha_limite,
       hora_limite, lugar_encuentro, estado)
    VALUES
      (v_p4, (CURRENT_DATE + 15)::date, '05:30', 14, 0,
       (CURRENT_DATE + 13)::date, '18:00',
       'Malecón de Montería (Ronda del Sinú)', 'activa');
  END IF;

  IF v_p1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_salidas WHERE plan_id = v_p1) THEN
    INSERT INTO tour_plan_salidas
      (plan_id, fecha, hora, cupo_maximo, cupo_ocupado, fecha_limite,
       hora_limite, lugar_encuentro, estado)
    VALUES
      (v_p1, (CURRENT_DATE + 8)::date, '07:00', 15, 0,
       (CURRENT_DATE + 6)::date, '18:00',
       'Terminal de San Antero', 'activa');
  END IF;

  IF v_p5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tour_plan_salidas WHERE plan_id = v_p5) THEN
    INSERT INTO tour_plan_salidas
      (plan_id, fecha, hora, cupo_maximo, cupo_ocupado, fecha_limite,
       hora_limite, lugar_encuentro, estado)
    VALUES
      (v_p5, (CURRENT_DATE + 22)::date, '06:00', 16, 0,
       (CURRENT_DATE + 20)::date, '18:00',
       'Malecón de Ayapel', 'activa');
  END IF;
END $$;

COMMIT;

-- ============================================================
-- Fin de migracion 021
-- ============================================================
