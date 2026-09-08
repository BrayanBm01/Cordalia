-- ============================================================
-- Migracion 008: Datos de prueba - Planes y promociones
-- AJUSTES POST-FASE 7 - Explora Turismo
-- Precios SOLO informativos: no existe sistema de pago.
-- Idempotente: elimina los registros demo (slug 'demo-*' y
-- promos 'Demo ...') antes de insertar de nuevo.
-- ============================================================

DELETE FROM promotions   WHERE nombre LIKE 'Demo %';
DELETE FROM tour_plans   WHERE slug LIKE 'demo-%';
DELETE FROM tour_plan_images WHERE plan_id NOT IN (SELECT id FROM tour_plans);

-- ============================================================
-- PLANES (11): tipos plan/paquete/experiencia variados
-- ============================================================
INSERT INTO tour_plans
  (business_id, nombre, slug, descripcion, destination_id, destino,
   duracion_dias, duracion_noches, precio, tipo_precio, precio_anterior,
   tipo_plan, incluye, itinerario, moneda, estado) VALUES
(
  34, 'Trekking Ciudad Perdida', 'demo-ciudad-perdida',
  'La ruta ancestral por la Sierra Nevada de Santa Marta hasta la Ciudad Perdida, guiada por indígenas koguis.',
  9, 'Ciudad Perdida', 4, 3, 1850000, 'por_persona', 2100000,
  'paquete',
  '["Guías indígenas certificados","Transporte a Machete Pelao","Alimentación completa","Campamento todo incluido","Seguro de viajero"]'::jsonb,
  '[{"dia":1,"titulo":"Llegada a Machete Pelao","actividades":[{"hora":"06:00","descripcion":"Salida desde Santa Marta"},{"hora":"14:00","descripcion":"Inicio de la caminata por la Sierra Nevada"}]},{"dia":2,"titulo":"Campamento 1","actividades":[{"hora":"07:00","descripcion":"Senderismo entre ríos y montaña"},{"hora":"18:00","descripcion":"Campamento en la cueva"}]},{"dia":3,"titulo":"La Ciudad Perdida","actividades":[{"hora":"05:30","descripcion":"Ascenso a los 1.200 escalones"},{"hora":"10:00","descripcion":"Recorrido por terrazas y aldeas ancestrales"}]},{"dia":4,"titulo":"Retorno","actividades":[{"hora":"06:00","descripcion":"Descenso y regreso a Santa Marta"}]}]'::jsonb,
  'COP', 'activo'
),
(
  34, 'Tayrona + Ciudad Perdida combinado', 'demo-tayrona-ciudad-perdida',
  'La combinación perfecta: playas del Parque Tayrona y la magia de la Ciudad Perdida en una sola expedición.',
  2, 'Parque Nacional Natural Tayrona', 6, 5, 2650000, 'por_persona', 2990000,
  'paquete',
  '["Entradas al Parque Tayrona","Camping y hamacas","Guías certificados","Alimentación completa","Transporte terrestre"]'::jsonb,
  '[{"dia":1,"titulo":"Parque Tayrona","actividades":[{"descripcion":"Llegada a Cañaveral y playas del Parque"}]},{"dia":2,"titulo":"Ciudad Perdida etapa 1","actividades":[{"descripcion":"Inicio de la travesía hacia la Sierra"}]},{"dia":3,"titulo":"Ciudad Perdida etapa 2","actividades":[{"descripcion":"Senderismo y campamento intermedio"}]},{"dia":4,"titulo":"La Ciudad Perdida","actividades":[{"descripcion":"Visita completa a las terrazas ancestrales"}]},{"dia":5,"titulo":"Descenso","actividades":[{"descripcion":"Regreso a la civilización"}]},{"dia":6,"titulo":"Tayrona de nuevo","actividades":[{"descripcion":"Día libre en las playas del Tayrona y retorno"}]}]'::jsonb,
  'COP', 'activo'
),
(
  34, 'Expedición Caño Cristales', 'demo-cano-cristales',
  'Descubre el río de los siete colores, la alfombra roja de la Macarenia clavigera y los pozos más hermosos de Colombia.',
  7, 'Caño Cristales', 5, 4, 2350000, 'por_persona', NULL,
  'plan',
  '["Vuelos interno sugeridos (se asesora gratis)","Hospedaje en cabaña","Caminatas ecológicas","Guía local especializado","Seguro de viajero"]'::jsonb,
  '[{"dia":1,"titulo":"Llegada a La Macarena","actividades":[{"descripcion":"Check-in y aclimatación"}]},{"dia":2,"titulo":"Caño Cristales","actividades":[{"descripcion":"Recorrido por los jardines de la Macarenia"}]},{"dia":3,"titulo":"Caño Piedra","actividades":[{"descripcion":"Pozos y saltos naturales"}]},{"dia":4,"titulo":"Raudal Guayabero","actividades":[{"descripcion":"Reserva y fauna local"}]},{"dia":5,"titulo":"Retorno","actividades":[{"descripcion":"Regreso a Villavicencio"}]}]'::jsonb,
  'COP', 'activo'
),
(
  34, 'Avistamiento de aves Sierra Nevada', 'demo-observacion-aves',
  'Experiencia de una mañana con binoculares y guía experto para ver tucanes, colibríes y aves endémicas.',
  2, 'Parque Nacional Natural Tayrona', 1, 0, 320000, 'por_persona', NULL,
  'experiencia',
  '["Guía naturalista","Binoculares profesionales","Café de altura","Salida al amanecer"]'::jsonb,
  '[{"dia":1,"titulo":"Amanecer","actividades":[{"hora":"05:30","descripcion":"Observación en el eco sendero"},{"hora":"08:00","descripcion":"Café y cierre de la experiencia"}]}]'::jsonb,
  'COP', 'activo'
),
(
  32, 'Plan Todo Incluido Tayrona', 'demo-hotel-tayrona',
  'Hospedaje frente al mar con pensión completa: desayuno, almuerzo y cena, más excursión a Cabo San Juan.',
  2, 'Parque Nacional Natural Tayrona', 3, 2, 1450000, 'por_persona', 1600000,
  'plan',
  '["Desayuno, almuerzo y cena","Acceso directo a playa","Excursión a Cabo San Juan","Hamacas y mirador","Turco riegue; sauna"]'::jsonb,
  '[{"dia":1,"titulo":"Llegada","actividades":[{"descripcion":"Check-in y tarde de playa"}]},{"dia":2,"titulo":"Cabo San Juan","actividades":[{"descripcion":"Excursión y snorkel"}]},{"dia":3,"titulo":"Despedida","actividades":[{"descripcion":"Amanecer y salida"}]}]'::jsonb,
  'COP', 'activo'
),
(
  32, 'Paquete Luna de Miel Caribe', 'demo-luna-de-miel',
  '5 días inolvidables en el mar de los siete colores: cena romántica, paseo en jet ski y tour de islas.',
  3, 'San Andrés', 5, 4, 3800000, 'precio_total', 4200000,
  'paquete',
  '["Habitación con vista al mar","Cena romántica a la luz de las velas","Paseo en jet ski (30 min)","Tour 7 colores","Recogida en aeropuerto"]'::jsonb,
  '[{"dia":1,"titulo":"Llegada","actividades":[{"descripcion":"Welcome pack y sunset"}]},{"dia":2,"titulo":"Islas y cayos","actividades":[{"descripcion":"Tour 7 colores y almuerzo típico"}]},{"dia":3,"titulo":"Aventura","actividades":[{"descripcion":"Jet ski y buceo"}]},{"dia":4,"titulo":"Romance","actividades":[{"descripcion":"Cena privada en la playa"}]},{"dia":5,"titulo":"Despedida","actividades":[{"descripcion":"Día libre y salida"}]}]'::jsonb,
  'COP', 'activo'
),
(
  32, 'Amanecer en la playa', 'demo-amanecer-playa',
  'Una mañana mágica: caminata por la orilla, yoga al amanecer y desayuno campestre frente al mar.',
  2, 'Parque Nacional Natural Tayrona', 1, 0, 180000, 'por_persona', NULL,
  'experiencia',
  '["Guía acompañante","Sesión de yoga 60 min","Desayuno campestre","Fotos del amanecer"]'::jsonb,
  '[{"dia":1,"titulo":"Amanecer","actividades":[{"hora":"05:30","descripcion":"Caminata y yoga"},{"hora":"07:30","descripcion":"Desayuno campestre"}]}]'::jsonb,
  'COP', 'activo'
),
(
  33, 'Salento y Valle de Cocora', 'demo-salento-cocora',
  'Tres días en el corazón del Eje Cafetero: cocorazales, fincas cafeteras y el colorido pueblo de Salento.',
  5, 'Salento', 3, 2, 890000, 'por_persona', 990000,
  'paquete',
  '["Hospedaje en hostal","Tour al Valle de Cocora","Caminata a palmas de cera","Cata de café en finca","Desayunos incluidos"]'::jsonb,
  '[{"dia":1,"titulo":"Salento","actividades":[{"descripcion":"Recorrido por el pueblo"}]},{"dia":2,"titulo":"Valle de Cocora","actividades":[{"descripcion":"Senderismo y palmas de cera"}]},{"dia":3,"titulo":"Finca cafetera","actividades":[{"descripcion":"Catación y proceso del café"}]}]'::jsonb,
  'COP', 'activo'
),
(
  33, 'Caminata Valle de Cocora', 'demo-cocora-caminata',
  'Ruta corta de un día para ver las palmas de cera más altas del mundo por el camino de los cóndores.',
  5, 'Salento', 1, 0, 120000, 'por_persona', NULL,
  'experiencia',
  '["Guía certificado","Entrada al sendero","Poncho para la lluvia"]'::jsonb,
  '[{"dia":1,"titulo":"Cocora","actividades":[{"hora":"08:00","descripcion":"Ascenso al mirador"},{"hora":"12:00","descripcion":"Descenso y cierre"}]}]'::jsonb,
  'COP', 'inactivo'
),
(
  35, 'Catación de café artesanal', 'demo-catacion-cafe',
  'Aprende a catar café de especialidad: origen, aroma, acidez y cuerpo con un maestro tostador.',
  6, 'Villa de Leyva', 1, 0, 95000, 'por_persona', NULL,
  'experiencia',
  '["Maestro tostador","Kit de cata","3 cafés de especialidad","Tostado en vivo"]'::jsonb,
  '[{"dia":1,"titulo":"Cata","actividades":[{"hora":"10:00","descripcion":"Catación guiada"},{"hora":"12:00","descripcion":"Tueste artesanal"}]}]'::jsonb,
  'COP', 'activo'
),
(
  37, 'Noche de estrellas en la Tatacoa', 'demo-tatacoa-estrellas',
  'Campos de cactus, senderos rojos y una noche de observación astronómica en el desierto.',
  8, 'Desierto de la Tatacoa', 2, 1, 450000, 'por_pareja', NULL,
  'experiencia',
  '["Hospedaje en glamping","Telescopio profesional","Astrofotografía básica","Cena típica","Fogata"]'::jsonb,
  '[{"dia":1,"titulo":"Desierto rojo","actividades":[{"descripcion":"Senderismo al Cuzco"}]},{"dia":2,"titulo":"Observación","actividades":[{"descripcion":"Noche de estrellas y retorno"}]}]'::jsonb,
  'COP', 'inactivo'
);

-- ============================================================
-- IMAGENES (algunos planes con galeria)
-- ============================================================
INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
SELECT id, 'https://picsum.photos/seed/demo-ciudad-perdida/1200/800', 'Ciudad Perdida, Sierra Nevada', true, 0 FROM tour_plans WHERE slug = 'demo-ciudad-perdida'
UNION ALL
SELECT id, 'https://picsum.photos/seed/demo-ciudad-perdida-2/1200/800', 'Senderismo Sierra Nevada', false, 1 FROM tour_plans WHERE slug = 'demo-ciudad-perdida'
UNION ALL
SELECT id, 'https://picsum.photos/seed/demo-tayrona/1200/800', 'Playas del Parque Tayrona', true, 0 FROM tour_plans WHERE slug = 'demo-tayrona-ciudad-perdida'
UNION ALL
SELECT id, 'https://picsum.photos/seed/demo-cano-cristales/1200/800', 'Caño Cristales, río de los siete colores', true, 0 FROM tour_plans WHERE slug = 'demo-cano-cristales'
UNION ALL
SELECT id, 'https://picsum.photos/seed/demo-cocora/1200/800', 'Palmas de cera del Valle de Cocora', true, 0 FROM tour_plans WHERE slug = 'demo-salento-cocora';

-- ============================================================
-- PROMOCIONES (8): vigente / proxima / vencida / inactiva
-- ============================================================
INSERT INTO promotions
  (business_id, plan_id, nombre, descripcion, tipo_descuento, valor_descuento,
   precio_anterior, precio_promocional, imagen_url, fecha_inicio, fecha_fin, estado) VALUES
(
  34, (SELECT id FROM tour_plans WHERE slug = 'demo-ciudad-perdida'),
  'Demo Semana de descuento Ciudad Perdida',
  '20% para nuevas expediciones en este mes.',
  'porcentaje', 20, 2100000, 1680000,
  'https://picsum.photos/seed/demo-promo-cpd/1200/800',
  (CURRENT_DATE - INTERVAL '7 days')::date, (CURRENT_DATE + INTERVAL '14 days')::date, 'activo'
),
(
  32, (SELECT id FROM tour_plans WHERE slug = 'demo-luna-de-miel'),
  'Demo Verano en el Caribe',
  'Parejas: ahorra 15% en el paquete luna de miel.',
  'porcentaje', 15, 4200000, 3230000,
  'https://picsum.photos/seed/demo-promo-caribe/1200/800',
  (CURRENT_DATE - INTERVAL '20 days')::date, (CURRENT_DATE + INTERVAL '10 days')::date, 'activo'
),
(
  34, (SELECT id FROM tour_plans WHERE slug = 'demo-tayrona-ciudad-perdida'),
  'Demo Preventa Semana Santa',
  'Separación anticipada con $400.000 de descuento.',
  'valor', 400000, 2990000, 2590000,
  'https://picsum.photos/seed/demo-promo-ss/1200/800',
  (CURRENT_DATE + INTERVAL '20 days')::date, (CURRENT_DATE + INTERVAL '60 days')::date, 'activo'
),
(
  34, (SELECT id FROM tour_plans WHERE slug = 'demo-cano-cristales'),
  'Demo Aventura antes de temporada',
  'Expedición a Caño Cristales con 10% de descuento.',
  'porcentaje', 10, 2350000, 2115000,
  'https://picsum.photos/seed/demo-promo-cano/1200/800',
  (CURRENT_DATE + INTERVAL '10 days')::date, (CURRENT_DATE + INTERVAL '40 days')::date, 'activo'
),
(
  33, (SELECT id FROM tour_plans WHERE slug = 'demo-salento-cocora'),
  'Demo Liquidación fin de mes',
  'Últimos cupos del paquete Salento con 25% de descuento.',
  'porcentaje', 25, 990000, 742500,
  'https://picsum.photos/seed/demo-promo-salento/1200/800',
  (CURRENT_DATE - INTERVAL '40 days')::date, (CURRENT_DATE - INTERVAL '5 days')::date, 'activo'
),
(
  32, (SELECT id FROM tour_plans WHERE slug = 'demo-hotel-tayrona'),
  'Demo Oferta relámpago Tayrona',
  'Plan todo incluido al 30% durante una semana.',
  'porcentaje', 30, 1600000, 1120000,
  'https://picsum.photos/seed/demo-promo-tayrona/1200/800',
  (CURRENT_DATE - INTERVAL '60 days')::date, (CURRENT_DATE - INTERVAL '10 days')::date, 'activo'
),
(
  37, (SELECT id FROM tour_plans WHERE slug = 'demo-tatacoa-estrellas'),
  'Demo Descuento parejas Tatacoa',
  'Noche de estrellas con descuento por pareja.',
  'valor', 50000, 450000, 400000,
  'https://picsum.photos/seed/demo-promo-tatacoa/1200/800',
  (CURRENT_DATE - INTERVAL '5 days')::date, (CURRENT_DATE + INTERVAL '25 days')::date, 'inactivo'
),
(
  35, (SELECT id FROM tour_plans WHERE slug = 'demo-catacion-cafe'),
  'Demo Café 2x1',
  'Dos cataciones al precio de una para grupos pequeños.',
  'porcentaje', 50, 95000, 47500,
  'https://picsum.photos/seed/demo-promo-cafe/1200/800',
  (CURRENT_DATE - INTERVAL '15 days')::date, (CURRENT_DATE + INTERVAL '15 days')::date, 'inactivo'
);

-- ============================================================
-- Fin de migracion 008
-- ============================================================