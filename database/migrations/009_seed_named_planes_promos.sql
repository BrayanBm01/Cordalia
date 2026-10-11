-- ============================================================
-- Migracion 009: Planes y promociones DEMO con nombre especifico
-- AJUSTES POST-FASE 7 - Explora Turismo
-- Agrega los planes de ejemplo pedidos (Guatapé, Cartagena,
-- Santa Marta, Tour Familiar) y promociones asociadas.
-- Precios SOLO informativos: no existe sistema de pago.
-- Idempotente: elimina los registros 'named-*' antes de insertar.
-- ============================================================

DELETE FROM promotions   WHERE nombre LIKE 'Named %';
DELETE FROM tour_plans   WHERE slug LIKE 'named-%';
DELETE FROM tour_plan_images WHERE plan_id NOT IN (SELECT id FROM tour_plans);

-- ============================================================
-- PLANES NOMBRADOS (adicionales a los 11 existentes)
-- ============================================================
INSERT INTO tour_plans
  (business_id, nombre, slug, descripcion, destination_id, destino,
   duracion_dias, duracion_noches, precio, tipo_precio,
   tipo_plan, incluye, itinerario, moneda, estado) VALUES
(
  36, 'Guatapé Aventura', 'named-guatape-aventura',
  'Escapada de tres días al Pueblo Zócalo: subida a la Piedra del Peñol, paseo en lancha por el embalse y tour por la ciudad de los zócalos.',
  4, 'Guatapé', 3, 2, 650000, 'por_persona',
  'plan',
  '["Transporte","Alojamiento","Desayuno","Almuerzo","Actividades","Entradas","Guía"]'::jsonb,
  '[{"dia":1,"titulo":"Llegada a Guatapé","actividades":[{"hora":"08:00","descripcion":"Salida desde Medellín"},{"hora":"12:00","descripcion":"Llegada y almuerzo típico"},{"hora":"15:00","descripcion":"Tour por la ciudad del zócalo"}]},{"dia":2,"titulo":"Piedra del Peñol y embalse","actividades":[{"hora":"07:00","descripcion":"Ascenso a la Piedra del Peñol (740 escalones)"},{"hora":"11:00","descripcion":"Paseo en lancha por el embalse"},{"hora":"14:00","descripcion":"Tarde libre en el malecón"}]},{"dia":3,"titulo":"Retorno","actividades":[{"hora":"09:00","descripcion":"Desayuno y salida de regreso"},{"hora":"13:00","descripcion":"Llegada a Medellín"}]}]'::jsonb,
  'COP', 'activo'
),
(
  31, 'Cartagena Express', 'named-cartagena-express',
  'Un día intenso por la ciudad amurallada: Castillo San Felipe, Getsemaní, las murallas y la mejor gastronomía caribeña.',
  1, 'Cartagena de Indias', 1, 0, 180000, 'por_persona',
  'experiencia',
  '["Transporte","Almuerzo","Entradas","Guía"]'::jsonb,
  '[{"dia":1,"titulo":"Cartagena Express","actividades":[{"hora":"08:00","descripcion":"Visita al Castillo San Felipe de Barajas"},{"hora":"11:00","descripcion":"Tour por la Ciudad Amurallada"},{"hora":"13:00","descripcion":"Almuerzo caribeño"},{"hora":"15:00","descripcion":"Getsemaní y atardecer en el malecón"}]}]'::jsonb,
  'COP', 'activo'
),
(
  32, 'Santa Marta Caribe', 'named-santa-marta-caribe',
  'Cinco días entre la Sierra Nevada y el mar Caribe: centro histórico, playas cercanas y una excursión al Parque Tayrona.',
  2, 'Parque Nacional Natural Tayrona', 5, 4, 1200000, 'por_persona',
  'plan',
  '["Transporte","Alojamiento","Alimentación","Excursiones","Entradas","Guía"]'::jsonb,
  '[{"dia":1,"titulo":"Llegada a Santa Marta","actividades":[{"descripcion":"Check-in y tarde libre en el centro histórico"}]},{"dia":2,"titulo":"Ciudad y Quinta de San Pedro","actividades":[{"descripcion":"Tour por el centro y museo"}]},{"dia":3,"titulo":"Parque Tayrona","actividades":[{"descripcion":"Excursión a Cabo San Juan"}]},{"dia":4,"titulo":"Playa y rodadero","actividades":[{"descripcion":"Día de playa en El Rodadero"}]},{"dia":5,"titulo":"Despedida","actividades":[{"descripcion":"Desayuno y retorno"}]}]'::jsonb,
  'COP', 'activo'
),
(
  36, 'Tour Familiar Guatapé', 'named-tour-familiar-guatape',
  'Experiencia de un día pensada para toda la familia: subida a la Piedra, paseo en lancha y actividades para niños.',
  4, 'Guatapé', 1, 0, 250000, 'por_grupo',
  'paquete',
  '["Transporte","Almuerzo","Actividad familiar"]'::jsonb,
  '[{"dia":1,"titulo":"Tour Familiar","actividades":[{"hora":"08:00","descripcion":"Salida desde Medellín"},{"hora":"10:00","descripcion":"Ascenso a la Piedra del Peñol"},{"hora":"13:00","descripcion":"Almuerzo familiar"},{"hora":"14:30","descripcion":"Paseo en lancha"},{"hora":"17:00","descripcion":"Regreso a Medellín"}]}]'::jsonb,
  'COP', 'activo'
),
(
  31, 'Delicias de Cartagena', 'named-delicias-cartagena',
  'Ruta gastronómica por los sabores del Caribe: arepa de huevo, posta cartagenera y cocina de la Ciénaga.',
  1, 'Cartagena de Indias', 1, 0, 150000, 'por_persona',
  'experiencia',
  '["Guía gastronómico","Catas de 5 lugares","Entradas","Transporte"]'::jsonb,
  '[{"dia":1,"titulo":"Ruta gastronómica","actividades":[{"hora":"10:00","descripcion":"Inicio en el mercado de Bazurto"},{"hora":"12:00","descripcion":"Comida típica caribeña"},{"hora":"15:00","descripcion":"Postres y café de la región"}]}]'::jsonb,
  'COP', 'inactivo'
),
(
  33, 'Café y Montaña Santa Marta', 'named-cafe-montana-santa-marta',
  'Recorrido por las fincas cafeteras de la Sierra Nevada de Santa Marta con degustación y miradores de la ciudad y el mar.',
  2, 'Parque Nacional Natural Tayrona', 2, 1, 520000, 'por_persona',
  'plan',
  '["Transporte 4x4","Hospedaje en finca","Desayuno y almuerzo","Cata de café","Guía local"]'::jsonb,
  '[{"dia":1,"titulo":"Senderos cafeteros","actividades":[{"descripcion":"Ascenso a las fincas de la Sierra"}]},{"dia":2,"titulo":"Cata y miradores","actividades":[{"descripcion":"Cata de café y retorno"}]}]'::jsonb,
  'COP', 'activo'
);

-- ============================================================
-- PROMOCIONES NOMBRADAS
-- ============================================================
INSERT INTO promotions
  (business_id, plan_id, nombre, descripcion, tipo_descuento, valor_descuento,
   imagen_url, fecha_inicio, fecha_fin, estado) VALUES
(
  36, (SELECT id FROM tour_plans WHERE slug = 'named-guatape-aventura'),
  'Named 20% de descuento Guatapé Aventura',
  'Aprovecha el 20% de descuento en Guatapé Aventura.',
  'porcentaje', 20,
  'https://picsum.photos/seed/named-promo-guatape/1200/800',
  (CURRENT_DATE - INTERVAL '10 days')::date, (CURRENT_DATE + INTERVAL '20 days')::date, 'activo'
),
(
  31, (SELECT id FROM tour_plans WHERE slug = 'named-cartagena-express'),
  'Named 15% de descuento Cartagena Express',
  'Paga menos por un día completo en Cartagena.',
  'porcentaje', 15,
  'https://picsum.photos/seed/named-promo-cartagena/1200/800',
  (CURRENT_DATE - INTERVAL '3 days')::date, (CURRENT_DATE + INTERVAL '12 days')::date, 'activo'
),
(
  36, (SELECT id FROM tour_plans WHERE slug = 'named-tour-familiar-guatape'),
  'Named 10% de descuento Tour Familiar',
  'Descuento para grupos familiares en Guatapé.',
  'porcentaje', 10,
  'https://picsum.photos/seed/named-promo-familiar/1200/800',
  (CURRENT_DATE + INTERVAL '5 days')::date, (CURRENT_DATE + INTERVAL '45 days')::date, 'activo'
),
(
  32, (SELECT id FROM tour_plans WHERE slug = 'named-santa-marta-caribe'),
  'Named Temporada baja Santa Marta',
  'Paquete Santa Marta Caribe con precio especial por temporada.',
  'valor', 100000,
  'https://picsum.photos/seed/named-promo-santamarta/1200/800',
  (CURRENT_DATE - INTERVAL '30 days')::date, (CURRENT_DATE - INTERVAL '8 days')::date, 'activo'
),
(
  31, (SELECT id FROM tour_plans WHERE slug = 'named-delicias-cartagena'),
  'Named Oferta del día Delicias',
  'Ruta gastronómica con descuento por tiempo limitado.',
  'porcentaje', 20,
  'https://picsum.photos/seed/named-promo-delicias/1200/800',
  (CURRENT_DATE - INTERVAL '2 days')::date, (CURRENT_DATE + INTERVAL '18 days')::date, 'inactivo'
);

-- ============================================================
-- IMAGENES de los nuevos planes
-- ============================================================
INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden)
SELECT id, 'https://picsum.photos/seed/named-guatape/1200/800', 'Guatapé, Piedra del Peñol', true, 0 FROM tour_plans WHERE slug = 'named-guatape-aventura'
UNION ALL
SELECT id, 'https://picsum.photos/seed/named-cartagena/1200/800', 'Cartagena, ciudad amurallada', true, 0 FROM tour_plans WHERE slug = 'named-cartagena-express'
UNION ALL
SELECT id, 'https://picsum.photos/seed/named-santamarta/1200/800', 'Santa Marta y el Caribe', true, 0 FROM tour_plans WHERE slug = 'named-santa-marta-caribe'
UNION ALL
SELECT id, 'https://picsum.photos/seed/named-familiar/1200/800', 'Tour familiar en Guatapé', true, 0 FROM tour_plans WHERE slug = 'named-tour-familiar-guatape';

-- ============================================================
-- Fin de migracion 009
-- ============================================================
