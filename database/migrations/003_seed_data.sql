-- ============================================================
-- Migracion 003: Datos iniciales
-- Categorias de negocio y planes de suscripcion.
-- Usa ON CONFLICT DO NOTHING para ser seguro en multiples ejecuciones.
-- ============================================================

-- ============================================================
-- business_categories: categorias iniciales
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
    ('Otro',          'otro',          'Otros tipos de negocio',             'store',           true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- plans: planes de suscripcion iniciales
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
    )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Migracion 003 completada
-- ============================================================
