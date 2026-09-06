-- ============================================================
-- Seed: turismo_db
-- Datos iniciales para Explora Turismo
-- Incluye: destinos, categorias de negocio y planes.
-- ============================================================

-- ============================================================
-- Destinos turisticos (12 destinos existentes con slugs)
-- ============================================================
INSERT INTO lugares (nombre, slug, descripcion, ubicacion, imagen) VALUES
(
  'Cartagena de Indias',
  'cartagena-de-indias',
  'Ciudad amurallada en la costa caribe colombiana, famosa por su arquitectura colonial, murallas del siglo XVI, el Castillo San Felipe de Barajas y sus playas de arena blanca. La Ciudad Amurallada es Patrimonio de la Humanidad por la UNESCO desde 1984.',
  'Cartagena, Bolívar',
  'https://images.unsplash.com/photo-1583531160234-8f4f3b1d1a05?w=800'
),
(
  'Parque Nacional Natural Tayrona',
  'parque-nacional-natural-tayrona',
  'Reserva natural en la costa caribe con playas de arena blanca rodeadas de selva tropical y montañas de la Sierra Nevada de Santa Marta. Cabo San Juan y Playa Cristal son sus destinos más emblemáticos. Ideal para senderismo y camping.',
  'Santa Marta, Magdalena',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
),
(
  'San Andrés',
  'san-andres',
  'Isla colombiana en el Caribe conocida por sus aguas cristalinas de siete colores, arrecifes de coral y playa blanca. La.Pool en dedicada es el punto más famoso. Destino perfecto para buceo, snorkel y descanso.',
  'San Andrés y Providencia',
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800'
),
(
  'Guatapé',
  'guatape',
  'Municipio conocido por el Peñón de Guatapé, una formación rocosa de 220 metros con 740 escalones hasta la cima y vistas panorámicas impresionantes del embalse. El pueblo es famoso por sus zócalos coloridos en las fachadas de las casas.',
  'Guatapé, Antioquia',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800'
),
(
  'Salento',
  'salento',
  'Pueblo colorido en el Eje Cafetero rodeado de montañas, cañaverales y el Valle de Cocora. Desde aquí se accede al Valle de Cocora, hogar de las palmas de cera, el árbol nacional de Colombia, que pueden alcanzar los 60 metros de altura.',
  'Salento, Quindío',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800'
),
(
  'Villa de Leyva',
  'villa-de-leyva',
  'Pueblo colonial con una de las plazas principales más grandes de Sudamérica. Rodeado de desierto, fósiles prehistóricos y el monasterio del Santo Ecce Homo. Destino popular para observación de estrellas y turismo de naturaleza.',
  'Villa de Leyva, Boyacá',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800'
),
(
  'Caño Cristales',
  'cano-cristales',
  'Conocido como el "Río de los Cinco Colores" o "Río de la Belleza". Durante los meses de junio a noviembre, las algas acuáticas Macarenia clavigera colorean el río en tonos rojo, amarillo, verde, azul y negro. Considerado uno de los ríos más hermosos del mundo.',
  'La Macarena, Meta',
  'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800'
),
(
  'Desierto de la Tatacoa',
  'desierto-de-la-tatacoa',
  'Segundo desierto más grande de Colombia, con formaciones rojizas y grisáceas erosionadas por el viento y el agua. Es uno de los mejores lugares del país para observación astronómica gracias a su baja contaminación lumínica.',
  'Villavieja, Huila',
  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800'
),
(
  'Ciudad Perdida',
  'ciudad-perdida',
  'Yacimiento arqueológico precolombino construido por los Tayronas alrededor del año 800 d.C., unos 650 años antes que Machu Picchu. Se accede tras una caminata de 4 días por la Sierra Nevada de Santa Marta. Es uno de los trekking más icónicos de Colombia.',
  'Sierra Nevada de Santa Marta, Magdalena',
  'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800'
),
(
  'Eje Cafetero',
  'eje-cafetero',
  'Región cafetera que abarca partes de Caldas, Quindío y Risaralda. Paisajes de montañas verdes, fincas cafeteras, pueblos coloniales y la Reserva de la Biosfera del Río Blanco. El Café de Colombia tiene Denominación de Origen Protegida por la UE.',
  'Armenia, Pereira, Manizales',
  'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800'
),
(
  'Laguna de Guatavita',
  'laguna-de-guatavita',
  'Laguna sagrada muisca enclavada en una montaña. Se dice que de aquí partió la leyenda de El Dorado, cuando el zipa se bañaba en la laguna cubierto de polvo de oro. Actualmente es un sitio arqueológico y turístico protegida.',
  'Tocaima, Cundinamarca',
  'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=800'
),
(
  'Barichara',
  'barichara',
  'Pueblo considerado uno de los más hermosos de Colombia. Calles empedradas, arquitectura colonial, la Catedral de la Inmaculada Concepción y el Camino Real que conecta con Guane. Su gastronomía incluye hormigas culonas y mote de rosquilla.',
  'Barichara, Santander',
  'https://images.unsplash.com/photo-1482888428758-576961e5bfc0?w=800'
);

-- ============================================================
-- Categorias de negocio
-- ============================================================
INSERT INTO business_categories (nombre, slug, descripcion, icono, activo) VALUES
    ('Restaurante',   'restaurante',   'Restaurantes y locales de comida',   'utensils-crossed', true),
    ('Hotel',         'hotel',         'Hoteles y alojamiento',              'bed',             true),
    ('Hostal',        'hostal',        'Hostales y hospedaje economico',     'home',            true),
    ('Tour',          'tour',          'Tours y recorridos guiados',         'map',             true),
    ('Agencia de viajes', 'agencia-de-viajes', 'Agencias de viajes y turismo', 'briefcase',   true),
    ('Transporte',    'transporte',    'Servicios de transporte',            'car',             true),
    ('Bar',           'bar',           'Bares y locales nocturnos',          'wine',            true),
    ('Cafe',          'cafe',          'Cafeterias y cafes',                 'coffee',          true),
    ('Tienda',        'tienda',        'Tiendas y comercios',                'shopping-bag',    true),
    ('Experiencia turistica', 'experiencia-turistica', 'Experiencias turisticas unicas', 'sparkles', true),
    ('Atraccion turistica', 'atraccion-turistica', 'Atracciones y sitios de interes', 'landmark', true),
    ('Otro',          'otro',          'Otros tipos de negocio',             'store',           true);

-- ============================================================
-- Planes de suscripcion
-- ============================================================
INSERT INTO plans (nombre, slug, descripcion, precio, moneda, duracion_dias, max_images, max_services, is_featured, is_promoted, features, activo, orden) VALUES
    (
        'Gratis',
        'gratis',
        'Plan basico para comenzar. Pagina basica con informacion limitada.',
        0,
        'COP',
        NULL,
        5,
        5,
        false,
        false,
        '["Pagina basica","Informacion de contacto","Horarios","Hasta 5 imagenes","Hasta 5 servicios","Aparicion normal en destino"]'::jsonb,
        true,
        1
    ),
    (
        'Profesional',
        'profesional',
        'Para negocios que quieren mas visibilidad y herramientas.',
        49000,
        'COP',
        30,
        20,
        15,
        false,
        false,
        '["Pagina profesional","Hasta 20 imagenes","Hasta 15 servicios","Estadisticas basicas","WhatsApp destacado","Mejor visibilidad","Sin anuncios","Soporte prioritario"]'::jsonb,
        true,
        2
    ),
    (
        'Premium',
        'premium',
        'Mxima visibilidad y todas las herramientas para destacar.',
        129000,
        'COP',
        30,
        50,
        50,
        true,
        true,
        '["Negocio destacado","Posicionamiento preferencial","Hasta 50 imagenes","Hasta 50 servicios","Promociones activas","Estadisticas avanzadas","Maxima visibilidad","Soporte dedicado","Badge de verificacion","Sin anuncios"]'::jsonb,
        true,
        3
    );
