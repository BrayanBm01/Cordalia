-- ============================================================
-- Migracion 013: Limpieza de datos demo y siembra de Cordoba.
-- EXPLORA TURISMO - (ronda 4)
--
-- Objetivo: que TODOS los datos demo de la aplicacion apunten a
-- destinos reales de CORDOBA (Colombia), con municipio real y
-- descripciones verificadas (sic).
--   * Se eliminan los lugares de otras regiones (Caribe yet otra)
--     y los negocios/planes/promos/salidas/transportes asociados.
--   * Se conservan los usuarios admin id 24 y 186. Se eliminan los
--     demas usuarios de prueba (fase2/demo/f21ext/personales).
--   * Se crea UN usuario nuevo: 'Vendedor Demo' (TEST) dueno de los
--     negocios demo, para que el panel vendedor tenga datos.
--
-- REGLA DE PRECIOS (migracion 012): descuento UNICO. Si hay
-- promocion activa se usa SOLO la promocion; si no, descuento por
-- rango de personas (o ninguno). Las promociones 'futuras' o
-- 'inactivas' no aplican y el precio muestra el rango.
--
-- NO borra tablas, NO toca migraciones historicas (001..012).
-- Los precios/cupos/inscripciones/transporte son SOLO informativos/
-- logisticos. NO existe ningun sistema de pago.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Limpieza de datos demo (hijas primero; muchas son CASCADE)
-- ------------------------------------------------------------
DELETE FROM inscripciones;
DELETE FROM transportes;
DELETE FROM tour_plan_salidas;
DELETE FROM promotions;
DELETE FROM tour_plan_images;
DELETE FROM tour_plans;
DELETE FROM vehiculos;
DELETE FROM conductores;
DELETE FROM review_replies;
DELETE FROM reviews;
DELETE FROM favorite_destinos;
DELETE FROM favorite_negocios;
DELETE FROM business_social_links;
DELETE FROM business_services;
DELETE FROM business_hours;
DELETE FROM business_images;
DELETE FROM subscriptions;
DELETE FROM analytics_events;
DELETE FROM businesses;
DELETE FROM lugares;
DELETE FROM login
 WHERE usuario_id IN (1, 7, 9, 10, 11, 12, 54, 108, 109, 110, 111, 668, 695, 722);
DELETE FROM usuarios
 WHERE id IN (1, 7, 9, 10, 11, 12, 54, 108, 109, 110, 111, 668, 695, 722);

-- Reset de secuencias de tablas demo (limpias)
SELECT setval('lugares_id_seq', 1, false);
SELECT setval('businesses_id_seq', 1, false);
SELECT setval('tour_plans_id_seq', 1, false);
SELECT setval('promotions_id_seq', 1, false);
SELECT setval('tour_plan_images_id_seq', 1, false);
SELECT setval('tour_plan_salidas_id_seq', 1, false);
SELECT setval('inscripciones_id_seq', 1, false);
SELECT setval('vehiculos_id_seq', 1, false);
SELECT setval('conductores_id_seq', 1, false);
SELECT setval('transportes_id_seq', 1, false);
SELECT setval('reviews_id_seq', 1, false);
SELECT setval('review_replies_id_seq', 1, false);
SELECT setval('favorite_destinos_id_seq', 1, false);
SELECT setval('favorite_negocios_id_seq', 1, false);
SELECT setval('business_hours_id_seq', 1, false);
SELECT setval('business_images_id_seq', 1, false);
SELECT setval('business_services_id_seq', 1, false);
SELECT setval('business_social_links_id_seq', 1, false);
SELECT setval('subscriptions_id_seq', 1, false);

-- ------------------------------------------------------------
-- 2) Destinos: SOLO Cordoba (Colombia)
-- ------------------------------------------------------------
INSERT INTO lugares (id, nombre, descripcion, ubicacion, imagen, slug, municipio, tipo) VALUES
(1,  'Montería',
     'Capital de Córdoba y "ciudad verde de Colombia". Ronda del Sinú (Malecón), Catedral San Jerónimo y Zoológico de Montería.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANklEQVR4nO3OQQ0AMAgEMLQgGrubC45Hkwpo9bxTKj4QEhISSg+EhISE0gMhISGh9EBISGjZB/rCSpcWHMZFAAAAAElFTkSuQmCC', 'monteria', 'Montería', 'ciudad'),
(2,  'Santa Cruz de Lorica',
     'Pueblo Patrimonio (2010). Mercado Público sobre el río Sinú y arquitectura republicana.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMKxhEpUTMRccjyYV0HrTp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg/RjJKXV3SpiQAAAABJRU5ErkJggg==', 'santa-cruz-de-lorica', 'Santa Cruz de Lorica', 'pueblo_patrimonio'),
(3,  'San Antero',
     'Playa Blanca, manglares de la Bahía de Cispatá y punto de partida hacia las Islas de San Bernardo. Sede del Festival Nacional del Burro.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMKThGAfTNhccjyYV0Oo3p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg+vDw6XBHYprwAAAABJRU5ErkJggg==', 'san-antero', 'San Antero', 'playa'),
(4,  'San Bernardo del Viento',
     'Playas del Viento (kitesurf), Punta Piedra y Los Venados; manglares cerca de la desembocadura del río Sinú.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMIQhH0kTMBccjyYV0HrTp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg8bwrimZGeXRQAAAABJRU5ErkJggg==', 'san-bernardo-del-viento', 'San Bernardo del Viento', 'playa'),
(5,  'Moñitos',
     'Muelle turístico, sendero ecológico del río Cedro y buceo artesanal en el Caribe cordobés.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMBShDzmTOhccjyYV0Oo3p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg+k4KRq56vQgAAAAABJRU5ErkJggg==', 'monitos', 'Moñitos', 'playa'),
(6,  'Tuchín',
     'Centro artesanal del sombrero vueltiao Zenú, en tierra de la etnia Zenú del resguardo de San Andrés de Sotavento.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMGQhBl3TOxccjyYV0HrTp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg+73/xb+TEDwAAAAABJRU5ErkJggg==', 'tuchin', 'Tuchín', 'cultura'),
(7,  'Tierralta',
     'Puerta de entrada al Parque Nacional Natural Paramillo y a la represa de Urrá, en el Alto Sinú.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMLQhA0lTPRccjyYV0JrXp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg+LCuRbp/s/4QAAAABJRU5ErkJggg==', 'tierralta', 'Tierralta', 'montaña'),
(8,  'Valencia',
     'Alto Sinú: ríos Manso y Verde, senderos y zona de amortiguación del PNN Paramillo.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMNQhAiWTPxccjyYV0HrTp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg+6c5BbA1YP0gAAAABJRU5ErkJggg==', 'valencia', 'Valencia', 'naturaleza'),
(9,  'Ayapel',
     'Ciénaga de Ayapel: paseos en lancha, pesca artesanal y avistamiento de aves.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMHQhDHnTNhccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg/IQpR5wzqZDAAAAABJRU5ErkJggg==', 'ayapel', 'Ayapel', 'humedal'),
(10, 'Ciénaga de Betancí',
     'Humedal de gran extensión (corregimiento de Maracayó, Montería) reconocido como área de conservación y refugio de aves.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMNRgDE3zOxccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg9HYLRbeb7IxwAAAABJRU5ErkJggg==', 'cienaga-de-betanci', 'Montería', 'humedal'),
(11, 'Bahía de Cispatá',
     'Estuario del Bajo Sinú con manglares, refugio de manatíes y aves; ruta en lancha desde San Antero.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMJQgERFTPhccjyYV0Oo3p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg/OZlRbdsOH6wAAAABJRU5ErkJggg==', 'bahia-de-cispata', 'San Antero', 'ecoturismo'),
(12, 'Parque Nacional Natural Paramillo',
     'Parque Nacional Natural en la frontera Córdoba–Antioquia; senderismo y avistamiento de aves. Accesos por Tierralta y Valencia.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OMREAMAgEMIQxo6ny64JnyF0EpOb1KRUfCAkJCaUHQkJCQumBkJCQUHogJCS07AMq09xMU8xhMgAAAABJRU5ErkJggg==', 'parque-nacional-natural-paramillo', 'Tierralta', 'naturaleza'),
(13, 'Puerto Escondido',
     'Costa del Caribe cordobés: playas y paisaje de llanura costanera.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMDShGDmTNRccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg9oeZyIgiO2NgAAAABJRU5ErkJggg==', 'puerto-escondido', 'Puerto Escondido', 'playa'),
(14, 'Momil',
     'Ciénaga de Momil, lugar de paso del martinete (ibis) y aves; cultura zenú.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMNQhBxFTPhccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg/F5kRqq26z0AAAAABJRU5ErkJggg==', 'momil', 'Momil', 'humedal'),
(15, 'San Pelayo',
     'Cuna del fandango cordobés y de las Fiestas del Río en el Bajo Sinú.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMJSgCsVTNhccjyYV0HrTp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg8/3Thq7h414QAAAABJRU5ErkJggg==', 'san-pelayo', 'San Pelayo', 'cultura'),
(16, 'Los Córdobas',
     'Litoral cordobés en la ruta hacia la Ciénaga de Betancí; llanura costanera y playas.',
     'Córdoba, Colombia', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMDShGDmTNRccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg9oeZyIgiO2NgAAAABJRU5ErkJggg==', 'los-cordobas', 'Los Córdobas', 'playa');

SELECT setval('lugares_id_seq', 16, true);

-- ------------------------------------------------------------
-- 3) Usuario demo del vendedor (TEST) - dueno de los negocios
--    Credenciales: vendedor.demo@exploraturismo.local
--                  VendedorDemo#2026!
-- ------------------------------------------------------------
INSERT INTO usuarios (id, nombre, apellido, email, password, rol_id, telefono, ciudad, pais, bio, proveedor) VALUES
(187, 'Vendedor Demo', 'TEST', 'vendedor.demo@exploraturismo.local',
 '$2b$10$ou8lWyef9RP/.BXG.QOYxeNwEvRPiZkMKNU8N11JNJ7nZ.h53ICYW',
 2, '+57 300 123 4567', 'Montería', 'Colombia',
 'Perfil demo de vendedor para el panel de negocio (ronda 4).', 'local');

SELECT setval('usuarios_id_seq', 187, true);

-- ------------------------------------------------------------
-- 4) Negocios demo (Cordoba)
-- ------------------------------------------------------------
INSERT INTO businesses (id, owner_id, category_id, destination_id, nombre, slug, descripcion, direccion, telefono, whatsapp, email_contacto, portada_url, estado, is_verified, is_featured) VALUES
(1, 187, 5,  1,  'Agencia Córdoba Aventura',        'agencia-cordoba-aventura',
     'Agencia de turismo local en Montería. Rutas por ciénagas, río Sinú y costa cordobesa. Grupos y planes personalizados.',
     'Centro de Montería', '+57 604 0000000', '3001234567', 'hola@agencia-cordoba.local',
     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANUlEQVR4nO3OQQ0AAAgEIHOazqi28HywEYDqnlcqPhASEhJKD4SEhITSAyEhIaH0QEhI6NgCKYb4atr0w8QAAAAASUVORK5CYII=', 'approved', true, true),
(2, 187, 4,  7,  'Aventura Sinú Ríos y Parques',   'aventura-sinu-rios-y-parques',
     'Tour operador del Alto Sinú: Paramillo, caños y ciénagas con guías locales. Equipos y transporte propio.',
     'Vía a Tierralta km 2', '+57 604 1111111', '3115556677', 'info@aventurasinu.local',
     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANUlEQVR4nO3OQQ0AAAgEIHOazqi28HywEYDqnlcqPhASEhJKD4SEhITSAyEhIaH0QEhI6NgCKYb4atr0w8QAAAAASUVORK5CYII=', 'approved', true, true),
(3, 187, 10, 4,  'Playas del Viento Tours',         'playas-del-viento-tours',
     'Experiencias de playa y kitesurf en San Bernardo del Viento. Atardeceres y fotografías en el Caribe cordobés.',
     'Playa del Viento', '+57 604 2222222', '3127778899', 'turismo@playasdelviento.local',
     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANUlEQVR4nO3OQQ0AAAgEIHOazqi28HywEYDqnlcqPhASEhJKD4SEhITSAyEhIaH0QEhI6NgCKYb4atr0w8QAAAAASUVORK5CYII=', 'approved', false, false),
(4, 187, 3,  10, 'Hostal Ciénaga de Betancí',       'hostal-cienaga-de-betanci',
     'Alojamiento rural frente a la Ciénaga de Betancí (corregimiento de Maracayó). Comida típica del Bajo Sinú.',
     'Maracayó, ruta Betancí', '+57 604 3333333', '3134445566', 'reservas@hostalbetanci.local',
     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANUlEQVR4nO3OQQ0AAAgEIHOazqi28HywEYDqnlcqPhASEhJKD4SEhITSAyEhIaH0QEhI6NgCKYb4atr0w8QAAAAASUVORK5CYII=', 'approved', false, false);

SELECT setval('businesses_id_seq', 4, true);

-- ------------------------------------------------------------
-- 5) Planes demo (Cordoba)
--    descuentos_rango = [{min,max,descuento}] (JsonB)
-- ------------------------------------------------------------
INSERT INTO tour_plans (id, business_id, nombre, slug, descripcion, destination_id, destino, duracion_dias, duracion_noches, precio, tipo_precio, tipo_plan, incluye, itinerario, estado, descuentos_rango, capacidad_referencial) VALUES
(1, 1, 'Manglares de Cispatá y Bahía',
     'manglares-de-cispata-y-bahia',
     'Recorrido en lancha por los manglares del estuario de Cispatá, avistamiento de aves y parada en Playa Blanca.',
     11, 'Bahía de Cispatá, San Antero', 1, 0, 130000, 'por_persona', 'experiencia',
     '["Guía local", "Lancha compartida", "Chalecos salvavidas"]'::jsonb,
     '[{"dia":1,"titulo":"Recorrido","descripcion":"Salida desde San Antero hacia el estuario"}]'::jsonb,
     'activo', '[{"min":1,"max":4,"descuento":0},{"min":5,"max":9,"descuento":20},{"min":10,"max":999,"descuento":35}]'::jsonb, 15),
(2, 1, 'Amanecer en la Ciénaga de Betancí',
     'amanecer-en-la-cienaga-de-betanci',
     'Salida muy temprano para ver el amanecer sobre el humedal de Betancí y su avifauna.',
     10, 'Ciénaga de Betancí, Montería', 1, 0, 85000, 'por_persona', 'experiencia',
     '["Guía local", "Cafecito de la región", "Binoculares"]'::jsonb,
     '[{"dia":1,"titulo":"Amanecer","descripcion":"Caminata a la orilla y avistamiento de aves"}]'::jsonb,
     'activo', '[{"min":1,"max":3,"descuento":0},{"min":4,"max":7,"descuento":15},{"min":8,"max":999,"descuento":25}]'::jsonb, 20),
(3, 1, 'Ciudad Verde: Ronda del Sinú a pie',
     'ciudad-verde-ronda-del-sinu-a-pie',
     'Caminata por la Ronda del Sinú, el Malecón, la Catedral San Jerónimo y el centro de Montería.',
     1, 'Montería', 1, 0, 45000, 'por_persona', 'experiencia',
     '["Guía urbana", "Parada en el Malecón"]'::jsonb,
     '[{"dia":1,"titulo":"Recorrido a pie","descripcion":"Centro histórico y malecón"}]'::jsonb,
     'activo', '[{"min":1,"max":4,"descuento":0},{"min":5,"max":999,"descuento":10}]'::jsonb, 25),
(4, 2, 'Tierralta y PNN Paramillo (2 días)',
     'tierralta-y-pnn-paramillo-2-dias',
     'Ruta de dos días por la zona de amortiguación del Parque Nacional Natural Paramillo y la represa de Urrá, desde Tierralta.',
     12, 'Parque Nacional Natural Paramillo, Tierralta', 2, 1, 320000, 'por_persona', 'plan',
     '["Guía especializado", "Transporte local", "Hospedaje rural", "Alimentación"]'::jsonb,
     '[{"dia":1,"titulo":"Llegada Alto Sinú","descripcion":"Ingreso y caminata corta"},{"dia":2,"titulo":"Ruta al parque","descripcion":"Sendero y avistamiento"}]'::jsonb,
     'activo', '[{"min":1,"max":3,"descuento":0},{"min":4,"max":6,"descuento":12},{"min":7,"max":999,"descuento":20}]'::jsonb, 14),
(5, 2, 'Kayak y aves en la Ciénaga de Ayapel',
     'kayak-y-aves-en-la-cienaga-de-ayapel',
     'Paseo en kayak por la Ciénaga de Ayapel con pesca artesanal y avistamiento de aves.',
     9, 'Ciénaga de Ayapel, Ayapel', 1, 0, 150000, 'por_persona', 'experiencia',
     '["Kayak", "Guía local", "Chaleco salvavidas"]'::jsonb,
     '[{"dia":1,"titulo":"Ciénaga","descripcion":"Remada y avistamiento"}]'::jsonb,
     'activo', '[{"min":1,"max":3,"descuento":0},{"min":4,"max":999,"descuento":15}]'::jsonb, 16),
(6, 3, 'Playa del Viento: kitesurf y atardecer',
     'playa-del-viento-kitesurf-y-atardecer',
     'Día de playa en San Bernardo del Viento con kitesurf y atardecer en Playa del Viento.',
     4, 'Playa del Viento, San Bernardo del Viento', 1, 0, 95000, 'por_persona', 'experiencia',
     '["Sesión de kitesurf", "Puesto de playa"]'::jsonb,
     '[{"dia":1,"titulo":"Playa","descripcion":"Kitesurf y atardecer"}]'::jsonb,
     'activo', '[{"min":1,"max":4,"descuento":0},{"min":5,"max":999,"descuento":10}]'::jsonb, 12),
(7, 3, 'Safari fotográfico Punta Piedra',
     'safari-fotografico-punta-piedra',
     'Caminata fotográfica al amanecer en Punta Piedra con guía y café de la región.',
     4, 'Punta Piedra, San Bernardo del Viento', 1, 0, 120000, 'por_persona', 'experiencia',
     '["Guía fotográfica", "Amueblamiento y agua"]'::jsonb,
     '[{"dia":1,"titulo":"Amanecer","descripcion":"Caminata y toma de fotos"}]'::jsonb,
     'activo', '[]'::jsonb, 10),
(8, 4, 'Pernoctada frente a la ciénaga',
     'pernoctada-frente-a-la-cienaga',
     'Una noche en el Hostal Ciénaga de Betancí con cena típica y desayuno del Bajo Sinú.',
     10, 'Ciénaga de Betancí, Montería', 1, 1, 180000, 'por_persona', 'plan',
     '["Hospedaje", "Cena", "Desayuno"]'::jsonb,
     '[{"dia":1,"titulo":"Llegada y cena","descripcion":"Atardecer en el humedal"}]'::jsonb,
     'activo', '[{"min":1,"max":3,"descuento":0},{"min":4,"max":999,"descuento":10}]'::jsonb, 16);

SELECT setval('tour_plans_id_seq', 8, true);

-- Imagenes de los planes (PNG pequeños locales, datos demo)
INSERT INTO tour_plan_images (plan_id, url, alt_text, is_primary, orden) VALUES
(1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMJQgERFTPhccjyYV0Oo3p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg/OZlRbdsOH6wAAAABJRU5ErkJggg==', 'Manglares de Cispatá', true, 0),
(2, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMNRgDE3zOxccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg9HYLRbeb7IxwAAAABJRU5ErkJggg==', 'Ciénaga de Betancí', true, 0),
(3, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAANklEQVR4nO3OQQ0AMAgEMLQgGrubC45Hkwpo9bxTKj4QEhISSg+EhISE0gMhISGh9EBISGjZB/rCSpcWHMZFAAAAAElFTkSuQmCC', 'Ronda del Sinú, Montería', true, 0),
(4, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OMREAMAgEMIQxo6ny64JnyF0EpOb1KRUfCAkJCaUHQkJCQumBkJCQUHogJCS07AMq09xMU8xhMgAAAABJRU5ErkJggg==', 'PNN Paramillo', true, 0),
(5, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMHQhDHnTNhccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg/IQpR5wzqZDAAAAABJRU5ErkJggg==', 'Ciénaga de Ayapel', true, 0),
(6, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMIQhH0kTMBccjyYV0HrTp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg8bwrimZGeXRQAAAABJRU5ErkJggg==', 'Playa del Viento', true, 0),
(7, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMIQhH0kTMBccjyYV0HrTp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg8bwrimZGeXRQAAAABJRU5ErkJggg==', 'Punta Piedra', true, 0),
(8, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMNRgDE3zOxccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg9HYLRbeb7IxwAAAABJRU5ErkJggg==', 'Hostal Ciénaga de Betancí', true, 0);

SELECT setval('tour_plan_images_id_seq', 8, true);

-- ------------------------------------------------------------
-- 6) Promociones demo
--    A y B: activas (fechas vigentes + estado 'activo') -> descuento UNICO.
--    C: 'inactiva' (estado) -> NO aplica -> precio por rango.
--    D: futura (aun no inicia) -> NO aplica -> precio por rango.
-- ------------------------------------------------------------
INSERT INTO promotions (id, business_id, plan_id, nombre, descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, estado, imagen_url) VALUES
(1, 1, 2, 'Amanecer 15% Off',
     'Promoción activa de lanzamiento sobre el amanecer en Betancí.', 'porcentaje', 15,
     (CURRENT_DATE - 5)::date, (CURRENT_DATE + 60)::date, 'activo',
     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMNRgDE3zOxccjyYV0Op5p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg9HYLRbeb7IxwAAAABJRU5ErkJggg=='),
(2, 3, 6, 'Kitesurf 20% Off',
     'Promoción activa de inicio de temporada en Playa del Viento.', 'porcentaje', 20,
     CURRENT_DATE, (CURRENT_DATE + 30)::date, 'activo',
     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMIQhH0kTMBccjyYV0HrTp1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg8bwrimZGeXRQAAAABJRU5ErkJggg=='),
(3, 2, 4, 'Paramillo (pausada)',
     'Promoción en estado inactivo: NO debe aplicar, el precio usa rango.', 'porcentaje', 10,
     (CURRENT_DATE - 10)::date, (CURRENT_DATE + 90)::date, 'inactivo',
     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OMREAMAgEMIQxo6ny64JnyF0EpOb1KRUfCAkJCaUHQkJCQumBkJCQUHogJCS07AMq09xMU8xhMgAAAABJRU5ErkJggg=='),
(4, 1, 1, 'Cispatá (próxima temporada)',
     'Promoción futura: aun no inicia, el precio usa rango.', 'porcentaje', 12,
     (CURRENT_DATE + 10)::date, (CURRENT_DATE + 70)::date, 'activo',
     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAN0lEQVR4nO3OQQ0AMAgEMJQgERFTPhccjyYV0Oo3p1R8ICQkJJQeCAkJCaUHQkJCQumBkJDQsg/OZlRbdsOH6wAAAABJRU5ErkJggg==');

SELECT setval('promotions_id_seq', 4, true);

-- ------------------------------------------------------------
-- 7) Flota y conductores (negocio 2)
-- ------------------------------------------------------------
INSERT INTO conductores (id, business_id, nombre, telefono, licencia, disponible, email, licencia_categoria, licencia_vencimiento, experiencia) VALUES
(1, 2, 'Carlos Martínez', '3001234567', 'C1-2027', true, 'carlos@aventurasinu.local', 'C', '2027-12-31', 'Conducción rural en el Alto Sinú'),
(2, 2, 'Diana Páez', '3012345678', 'B2-2027', true, 'diana@aventurasinu.local', 'B', '2027-06-30', 'Guía de navegación en ciénagas');

INSERT INTO vehiculos (id, business_id, nombre, tipo, placa, capacidad, descripcion, marca, modelo, anio, estado, conductor_id) VALUES
(1, 2, 'Van Coaster', 'van', 'MTC-001', 14, 'Van para grupos en el Alto Sinú.', 'Toyota', 'Coaster', 2021, 'disponible', 1),
(2, 2, 'Bus Sinú', 'bus', 'MTC-002', 20, 'Bus para rutas largas a Ayapel.', 'Mercedes-Benz', 'Sprinter 516', 2019, 'disponible', 2);

SELECT setval('conductores_id_seq', 2, true);
SELECT setval('vehiculos_id_seq', 2, true);

-- ------------------------------------------------------------
-- 8) Salidas demo (con cupo y fecha limite)
-- ------------------------------------------------------------
INSERT INTO tour_plan_salidas (id, plan_id, fecha, hora, cupo_maximo, cupo_ocupado, fecha_limite, hora_limite, lugar_encuentro, estado) VALUES
(1, 4, (CURRENT_DATE + 15)::date, '05:30', 14, 4, (CURRENT_DATE + 13)::date, '18:00', 'Malecón de Montería (Ronda del Sinú)', 'activa'),
(2, 1, (CURRENT_DATE + 8)::date, '07:00', 15, 6, (CURRENT_DATE + 6)::date, '18:00', 'Terminal de San Antero', 'activa'),
(3, 5, (CURRENT_DATE + 22)::date, '06:00', 16, 0, (CURRENT_DATE + 20)::date, '18:00', 'Malecón de Ayapel', 'activa');

SELECT setval('tour_plan_salidas_id_seq', 3, true);

-- ------------------------------------------------------------
-- 9) Transportes de las salidas
-- ------------------------------------------------------------
INSERT INTO transportes (id, plan_id, vehiculo_id, conductor_id, salida_id, orden, notas) VALUES
(1, 4, 1, 1, 1, 0, 'Recogida en el malecón 05:40'),
(2, 5, 2, 2, 3, 0, 'Salida desde el muelle de Ayapel');

SELECT setval('transportes_id_seq', 2, true);

-- ------------------------------------------------------------
-- 10) Inscripciones demo (usuarios anonimos: user_id NULL).
--     Snapshots coherentes con la regla de descuento UNICO:
--     salida 1 (P4) promo 'inactiva' -> rango 12% (4 personas).
--     salida 2 (P1) promo 'futura'  -> rango 20% (6 personas).
--     Precios SOLO informativos; NO hay pagos.
-- ------------------------------------------------------------
INSERT INTO inscripciones (id, salida_id, user_id, nombre, email, personas, mensaje, estado, precio_original_persona, precio_persona, descuento_porcentaje, precio_total, tipo_descuento) VALUES
(1, 1, NULL, 'Ana Gómez', 'ana.demo@sincorreo.test', 4, 'Somos familia, ¿podemos madrugar la salida?', 'confirmada', 320000, 281600, 12.00, 1126400, 'rango'),
(2, 2, NULL, 'Grupo Córdoba Natural', 'grupo@demo.test', 6, 'Grupo de amigos, preferimos lancha compartida.', 'confirmada', 130000, 104000, 20.00, 624000, 'rango');

SELECT setval('inscripciones_id_seq', 2, true);

-- ============================================================
-- Fin de la migracion 013.
-- Conjunto de datos demo: 16 destinos, 4 negocios, 8 planes,
-- 4 promos (2 activas / 1 inactiva / 1 futura), 2 salidas con
-- transporte y 2 inscripciones demo, todos en Cordoba.
-- ============================================================