-- ============================================================
-- Migracion 015: Contenido administrable de destinos
-- CORDALIA - Plataforma turistica de Cordoba
--
-- Objetivo: que las secciones "Que hacer", "Que visitar" e
-- "Informacion para tu viaje" de la pagina publica de un destino
-- NO dependan de contenido hardcodeado en el frontend.
--
-- Arquitectura (concepto "contenido disponible" vs "contenido
-- asignado a un destino"):
--
--   actividades        -> catalogo reutilizable de actividades
--   puntos_interes     -> catalogo reutilizable de lugares/puntos de interes
--   destino_actividades     -> relacion N:M destino <-> actividad
--   destino_puntos_interes  -> relacion N:M destino <-> punto de interes
--   destino_info_viaje      -> informacion de viaje POR destino,
--                              incluye costos estimados por cuenta
--                              propia para la comparacion de presupuesto.
--
-- Una misma actividad/punto de interes puede reutilizarse en varios
-- destinos (no se duplica el catalogo por destino).
--
-- Idempotente y no destructiva: no modifica migraciones historicas.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Catalogo de actividades (reutilizables)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actividades (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT,
    imagen      TEXT,
    categoria   VARCHAR(100),
    activo      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_actividades_nombre UNIQUE (nombre)
);

CREATE INDEX IF NOT EXISTS idx_actividades_activo ON actividades (activo);

-- ------------------------------------------------------------
-- 2) Catalogo de puntos de interes (reutilizables)
--    tipo: Cienaga, Museo, Plaza, Parque natural, Mirador,
--          Iglesia, Rio, Playa, Monumento, Reserva natural...
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS puntos_interes (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT,
    imagen      TEXT,
    tipo        VARCHAR(100),
    activo      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_puntos_interes_nombre UNIQUE (nombre)
);

CREATE INDEX IF NOT EXISTS idx_puntos_interes_activo ON puntos_interes (activo);

-- ------------------------------------------------------------
-- 3) Relacion destino <-> actividades
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS destino_actividades (
    id           SERIAL PRIMARY KEY,
    lugar_id     INTEGER NOT NULL,
    actividad_id INTEGER NOT NULL,
    orden        INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_destino_actividades_lugar FOREIGN KEY (lugar_id)
        REFERENCES lugares (id) ON DELETE CASCADE,
    CONSTRAINT fk_destino_actividades_actividad FOREIGN KEY (actividad_id)
        REFERENCES actividades (id) ON DELETE CASCADE,
    CONSTRAINT uq_destino_actividades UNIQUE (lugar_id, actividad_id)
);

CREATE INDEX IF NOT EXISTS idx_destino_actividades_lugar ON destino_actividades (lugar_id);
CREATE INDEX IF NOT EXISTS idx_destino_actividades_actividad ON destino_actividades (actividad_id);

-- ------------------------------------------------------------
-- 4) Relacion destino <-> puntos de interes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS destino_puntos_interes (
    id              SERIAL PRIMARY KEY,
    lugar_id        INTEGER NOT NULL,
    punto_interes_id INTEGER NOT NULL,
    orden           INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_destino_puntos_interes_lugar FOREIGN KEY (lugar_id)
        REFERENCES lugares (id) ON DELETE CASCADE,
    CONSTRAINT fk_destino_puntos_interes_punto FOREIGN KEY (punto_interes_id)
        REFERENCES puntos_interes (id) ON DELETE CASCADE,
    CONSTRAINT uq_destino_puntos_interes UNIQUE (lugar_id, punto_interes_id)
);

CREATE INDEX IF NOT EXISTS idx_destino_puntos_interes_lugar ON destino_puntos_interes (lugar_id);
CREATE INDEX IF NOT EXISTS idx_destino_puntos_interes_punto ON destino_puntos_interes (punto_interes_id);

-- ------------------------------------------------------------
-- 5) Informacion para tu viaje POR destino (incluye presupuesto)
--    Los campos costo_* y total_estimado_* permiten calcular la
--    comparacion "viajar por tu cuenta" VS "planes de negocios".
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS destino_info_viaje (
    id                     SERIAL PRIMARY KEY,
    lugar_id               INTEGER NOT NULL,
    transporte             TEXT,
    alimentacion           TEXT,
    alojamiento            TEXT,
    actividades            TEXT,
    otros_gastos           TEXT,
    recomendaciones        TEXT,
    duracion_recomendada   VARCHAR(200),
    mejor_epoca            TEXT,
    como_llegar            TEXT,
    moneda                 VARCHAR(3) NOT NULL DEFAULT 'COP',
    costo_transporte       NUMERIC(12,2),
    costo_alimentacion     NUMERIC(12,2),
    costo_alojamiento      NUMERIC(12,2),
    costo_actividades      NUMERIC(12,2),
    costo_otros            NUMERIC(12,2),
    updated_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_destino_info_viaje_lugar FOREIGN KEY (lugar_id)
        REFERENCES lugares (id) ON DELETE CASCADE,
    CONSTRAINT uq_destino_info_viaje_lugar UNIQUE (lugar_id)
);

-- ============================================================
-- Siembra del catalogo base (contenido disponible)
-- ============================================================

-- Actividades
INSERT INTO actividades (nombre, descripcion, categoria) VALUES
    ('Senderismo', 'Rutas de senderismo por zonas naturales, ciénagas y parques.', 'Naturaleza'),
    ('Avistamiento de aves', 'Avistamiento de la avifauna local (garzas, martinetes, ibis, colibríes).', 'Naturaleza'),
    ('Paseo en lancha', 'Recorridos en lancha por ciénagas, manglares y el río Sinú.', 'Aventura'),
    ('Kayak', 'Remadas guiadas por ciénagas y caños con guía local.', 'Aventura'),
    ('Pesca artesanal', 'Pesca tradicional con pescadores de la región.', 'Cultura'),
    ('Visita cultural', 'Recorridos por pueblos patrimonio, iglesias y mercados públicos.', 'Cultura'),
    ('Gastronomía local', 'Degustación de platos típicos del Sinú: mote de queso, sancocho, bollo limpio.', 'Gastronomía'),
    ('Kitesurf', 'Clases y sesiones de kitesurf en Playa del Viento.', 'Aventura'),
    ('Fotografía de paisaje', 'Safaris fotográficos al amanecer y atardecer.', 'Naturaleza'),
    ('Senderismo ecológico', 'Caminatas por senderos ecológicos de manglar y bosque seco.', 'Naturaleza'),
    ('Camping', 'Acampar en playas y zonas rurales custodiadas por guías.', 'Aventura'),
    ('Observación de estrellas', 'Noches de cielo despejado en zonas de baja contaminación lumínica.', 'Naturaleza'),
    ('Ciclismo', 'Rutas en bicicleta por el campo cordobés.', 'Aventura'),
    ('Buceo artesanal', 'Inmersiones con pescadores buzos del Caribe cordobés.', 'Aventura'),
    ('Cerámica y artesanía', 'Talleres de sombrero vueltiao y artesanías zenú.', 'Cultura'),
    ('Nado en ríos y pozas', 'Baño en el río Sinú y sus playas de agua dulce.', 'Naturaleza');

-- Puntos de interés (qué visitar)
INSERT INTO puntos_interes (nombre, descripcion, tipo) VALUES
    ('Ronda del Sinú', 'Malecón junto al río Sinú: caminatas, ciclovía y atardeceres.', 'Parque natural'),
    ('Catedral San Jerónimo', 'Catedral principal de Montería con su arquitectura moderna.', 'Iglesia'),
    ('Zoológico de Montería', 'Zoológico para conocer la fauna del Caribe colombiano.', 'Museo'),
    ('Mercado Público de Lorica', 'Mercado sobre pilotes en el río Sinú, patrimonio cultural.', 'Monumento'),
    ('Ciénaga de Betancí', 'Extenso humedal, refugio de aves y paisaje único.', 'Ciénaga'),
    ('Ciénaga de Ayapel', 'Ciénaga navegable con pesca artesanal y avistamiento de aves.', 'Ciénaga'),
    ('Playa Blanca', 'Playa de arena clara en San Antero.', 'Playa'),
    ('Bahía de Cispatá', 'Estuario con manglares y refugio de manatíes.', 'Reserva natural'),
    ('Parque Nacional Natural Paramillo', 'Parque nacional con senderismo y biodiversidad en el Alto Sinú.', 'Parque natural'),
    ('Represa de Urrá', 'Hidroeléctrica y embalse en el Alto Sinú.', 'Monumento'),
    ('Iglesia San Jerónimo de Lorica', 'Templo con arquitectura republicana en el centro histórico.', 'Iglesia'),
    ('Punta Piedra', 'Punta rocosa en San Bernardo del Viento, ideal para fotografías.', 'Mirador'),
    ('Playa del Viento', 'Playas con brisa constante, ideales para kitesurf.', 'Playa'),
    ('Muelle turístico de Moñitos', 'Muelle para contemplar el mar Caribe.', 'Mirador'),
    ('Sendero del río Cedro', 'Sendero ecológico junto al río en Moñitos.', 'Reserva natural'),
    ('Museo Arqueológico Zenú', 'Museo con piezas de la cultura zenú.', 'Museo'),
    ('Iglesia de San Andrés de Sotavento', 'Templo en el resguardo zenú, cerca de Tuchín.', 'Iglesia'),
    ('Plaza principal de Tuchín', 'Plaza central con artesanías de sombrero vueltiao.', 'Plaza'),
    ('Ciénaga de Momil', 'Humedal con paso de aves migratorias.', 'Ciénaga'),
    ('Vereda de Maracayó', 'Corregimiento de Montería frente a la Ciénaga de Betancí.', 'Parque natural'),
    ('Malecón de Puerto Escondido', 'Paseo marítimo sobre el mar Caribe.', 'Mirador'),
    ('Fiestas del Río en San Pelayo', 'Escenario de las tradicionales Fiestas del Río.', 'Plaza'),
    ('Caño Aguas Negras', 'Caño en la Bahía de Cispatá navegable entre manglares.', 'Reserva natural'),
    ('Monumento al Burro', 'Monumento en honor al burro, símbolo de San Antero.', 'Monumento');

-- ------------------------------------------------------------
-- Asignaciones DEMO (contenido asignado a destinos reales de Córdoba)
--    Montería (1), Lorica (2), San Antero (3),
--    San Bernardo del Viento (4), Moñitos (5), Tuchín (6),
--    Tierralta (7), Valencia (8), Ayapel (9),
--    Ciénaga de Betancí (10), Bahía de Cispatá (11),
--    PNN Paramillo (12), Puerto Escondido (13), Momil (14),
--    San Pelayo (15), Los Córdobas (16)
-- ------------------------------------------------------------

-- Actividades por destino
INSERT INTO destino_actividades (lugar_id, actividad_id, orden) VALUES
    (1,  6, 0), (1,  7, 1), (1, 16, 2),   -- Montería: cultural, gastronomía, nado
    (2,  6, 0), (2,  7, 1), (2, 15, 2),   -- Lorica: cultural, gastronomía, artesanía
    (3,  3, 0), (3, 10, 1), (3,  2, 2), (3,  7, 3), -- San Antero: lancha, manglar, aves, gastronomía
    (4,  8, 0), (4,  3, 1), (4,  9, 2),   -- San Bernardo: kitesurf, lancha, fotografía
    (5, 14, 0), (5,  1, 1), (5,  2, 2),   -- Moñitos: buceo, senderismo, aves
    (6, 15, 0), (6,  6, 1), (6,  7, 2),   -- Tuchín: artesanía, cultural, gastronomía
    (7,  1, 0), (7, 13, 1), (7,  2, 2),   -- Tierralta: senderismo, ciclismo, aves
    (8,  1, 0), (8, 10, 1), (8, 16, 2),   -- Valencia: senderismo, ecológico, nado
    (9,  3, 0), (9,  5, 1), (9,  2, 2), (9,  4, 3), -- Ayapel: lancha, pesca, aves, kayak
    (10, 2, 0), (10, 3, 1), (10, 11, 2),  -- Betancí: aves, lancha, camping
    (11, 3, 0), (11, 2, 1), (11, 10, 2),  -- Cispatá: lancha, aves, manglar
    (12, 1, 0), (12, 13, 1), (12, 10, 2), (12, 11, 3), -- Paramillo: senderismo, ciclismo, ecológico, camping
    (13, 3, 0), (13, 16, 1), (13, 9, 2),  -- Puerto Escondido: lancha, nado, fotografía
    (14, 2, 0), (14, 3, 1), (14, 5, 2),   -- Momil: aves, lancha, pesca
    (15, 6, 0), (15, 7, 1), (15, 15, 2),  -- San Pelayo: cultural, gastronomía, artesanía
    (16, 12, 0), (16, 16, 1), (16, 3, 2); -- Los Córdobas: estrellas, nado, lancha

-- Puntos de interés por destino
INSERT INTO destino_puntos_interes (lugar_id, punto_interes_id, orden) VALUES
    (1,  1, 0), (1,  2, 1), (1,  3, 2),                  -- Montería: Ronda, Catedral, Zoo
    (2,  4, 0), (2, 11, 1),                              -- Lorica: Mercado, Iglesia
    (3,  7, 0), (3,  8, 1), (3, 23, 2), (3, 24, 3),      -- San Antero: Playa Blanca, Cispatá, Caño, Burro
    (4, 12, 0), (4, 13, 1),                              -- San Bernardo: Punta Piedra, Playa del Viento
    (5, 14, 0), (5, 15, 1),                              -- Moñitos: Muelle, Sendero Cedro
    (6, 16, 0), (6, 17, 1), (6, 18, 2),                  -- Tuchín: Museo Zenú, Iglesia, Plaza
    (7,  9, 0), (7, 10, 1),                              -- Tierralta: Paramillo, Urrá
    (8,  9, 0), (8, 10, 1),                              -- Valencia: Paramillo, Urrá
    (9,  6, 0), (9, 16, 1),                              -- Ayapel: Ciénaga, Museo Zenú
    (10, 5, 0), (10, 20, 1),                             -- Betancí: Ciénaga, Maracayó
    (11, 8, 0), (11, 23, 1), (11, 7, 2),                 -- Cispatá: Bahía, Caño, Playa Blanca
    (12, 9, 0),                                          -- Paramillo
    (13, 21, 0), (13, 7, 1),                             -- Puerto Escondido: Malecón, Playa
    (14, 19, 0), (14, 6, 1),                             -- Momil: Ciénaga de Momil, Ayapel
    (15, 22, 0), (15, 1, 1),                             -- San Pelayo: Fiestas del Río, Ronda
    (16, 21, 0), (16, 20, 1);                            -- Los Córdobas: Malecón, Maracayó

-- ------------------------------------------------------------
-- Información de viaje por destino (DEMO)
-- Incluye costos estimados por cuenta propia y recomendaciones.
-- ------------------------------------------------------------
-- Montería
INSERT INTO destino_info_viaje
  (lugar_id, transporte, alimentacion, alojamiento, actividades, otros_gastos,
   recomendaciones, duracion_recomendada, mejor_epoca, como_llegar,
   costo_transporte, costo_alimentacion, costo_alojamiento, costo_actividades, costo_otros)
VALUES
  (1,
   'Transporte público urbano y taxi desde el terminal. Moverse por la ciudad a pie o en mototaxi.',
   'Puedes comer en restaurantes del centro por $25.000-$45.000 por persona al día.',
   'Hoteles y hostales en Montería desde $90.000 por noche.',
   'Paseos por la Ronda del Sinú y visitas al zoológico ($15.000).',
   'Recuerdos, artesanías y gastronomía callejera.',
   'Lleva ropa fresca y repelente. La Ronda del Sinú es mejor al atardecer.',
   '1-2 días', 'Diciembre a abril', 'Por avión hasta Montería (MTR) o por carretera desde Sincelejo.',
   45000, 70000, 120000, 30000, 20000),

  -- Santa Cruz de Lorica
  (2,
   'Llega en bus desde Montería (1h) o en lancha por el río Sinú.',
   'El mercado público ofrece bollo limpio, mote de queso y fritos desde $10.000.',
   'Casa colonial o posada desde $70.000 por noche.',
   'Recorrido por el centro histórico y el mercado sobre el río.',
   'Artesanías y café local.',
   'Haz el recorrido cultural por la mañana y el atardecer en el malecón.',
   '1 día', 'Todo el año', 'Bus desde Montería: 1 hora.',
   20000, 30000, 80000, 20000, 15000),

  -- San Antero
  (3,
   'Lancha desde San Antero a Playa Blanca e islas; mototaxismo local.',
   'Pescado frito con patacón y arroz con coco desde $25.000.',
   'Posadas y cabañas en la playa desde $100.000 por noche.',
   'Tours en lancha por la Bahía de Cispatá y snorkel.',
   'Recuerdos y fotografía.',
   'Reserva el tour de los manatíes temprano; lleva protector solar.',
   '2-3 días', 'Diciembre a abril', 'Bus desde Montería vía Lorica.',
   50000, 100000, 180000, 80000, 30000),

  -- San Bernardo del Viento
  (4,
   'Taxi/moto desde el casco urbano hasta Playa del Viento.',
   'Comida típica costeña en puestos de playa desde $20.000.',
   'Cabañas frente al mar desde $120.000 por noche.',
   'Kitesurf, paseos en lancha y tardes de playa.',
   'Souvenirs y bebidas.',
   'Los vientos soplan con fuerza entre diciembre y marzo: ideal para kitesurf.',
   '2-3 días', 'Diciembre a marzo', 'Carretera desde Montería (2.5h).',
   40000, 90000, 200000, 120000, 30000),

  -- Moñitos
  (5,
   'Moto o carro hasta el muelle; caminatas por el sendero del río Cedro.',
   'Restaurantes de mariscos y pescado fresco.',
   'Cabañas y alojamientos rurales desde $80.000.',
   'Buceo artesanal, senderismo y avistamiento de aves.',
   'Gastronomía local.',
   'El buceo artesanal depende del clima; consulta con pescadores locales.',
   '1-2 días', 'Todo el año', 'Carretera desde Montería (2h).',
   35000, 80000, 150000, 90000, 20000),

  -- Tuchín
  (6,
   'Bus o carro desde Montería (1.5h); caminar el pueblo.',
   'Comida típica del Sinú y café con bollo.',
   'Alojamiento sencillo en la zona desde $60.000.',
   'Taller de sombrero vueltiao y visita al resguardo zenú.',
   'Artesanías de caña flecha (sombreros y bolsos).',
   'Aprende a tejer un sombrero; los artesanos comparten su sabiduría.',
   '1 día', 'Todo el año', 'Bus desde Montería vía Ciénaga de Oro.',
   30000, 40000, 70000, 40000, 25000),

  -- Tierralta
  (7,
   'Carro o moto hasta la represa de Urrá; luego caminatas.',
   'Comida casera del campo (sancocho, fríjol).',
   'Hospedaje rural sencillo desde $60.000.',
   'Senderismo en el área de amortiguación del Paramillo.',
   'Guías locales (obligatorios para ingresar al parque).',
   'Ingreso al PNN Paramillo requiere guía local autorizado; gestionalo con anticipación.',
   '2-3 días', 'Diciembre a abril', 'Carretera desde Montería (2h).',
   40000, 70000, 120000, 80000, 30000),

  -- Valencia
  (8,
   'Vehículo particular o jalón (camioneta); ríos y senderos.',
   'Comida típica del Alto Sinú.',
   'Alojamiento rural desde $50.000.',
   'Senderos a ríos Manso y Verde.',
   'Guiado local.',
   'Lleva calzado de montaña; los ríos suben de nivel en lluvias.',
   '1-2 días', 'Diciembre a marzo', 'Carretera desde Montería (2.5h).',
   45000, 60000, 100000, 70000, 20000),

  -- Ayapel
  (9,
   'Lancha para cruzar la ciénaga; moto en el casco urbano.',
   'Pescado de ciénaga y arroz con coco.',
   'Hostales desde $60.000 por noche.',
   'Paseos en lancha, pesca artesanal y avistamiento de aves.',
   'Motos cocteleras y lanchas.',
   'En época de subienda, el paisaje de la ciénaga cambia por completo.',
   '2 días', 'Todo el año', 'Bus desde Montería (2h) vía San Marcos.',
   50000, 100000, 140000, 80000, 25000),

  -- Ciénaga de Betancí
  (10,
   'Moto o carro hasta Maracayó; paseos en lancha por el humedal.',
   'Comida típica en el hostal y puestos locales.',
   'Hospedaje rural (Hostal Ciénaga de Betancí).',
   'Avistamiento de aves al amanecer y paseo en lancha.',
   'Binoculares y guía.',
   'El mejor horario para aves es al amanecer. Lleva binoculares.',
   '1 día (o pernocta)', 'Diciembre a abril', 'Carretera desde Montería (45 min).',
   35000, 60000, 150000, 70000, 20000),

  -- Bahía de Cispatá
  (11,
   'Lancha desde San Antero; caminatas por los manglares.',
   'Comida en San Antero o en lancha.',
   'Alojamiento en San Antero.',
   'Recorrido en lancha por manglares, avistamiento de manatíes y aves.',
   'Chalecos y guía.',
   'El paseo por el caño Aguas Negras es único; respeta la fauna.',
   '1 día (desde San Antero)', 'Diciembre a abril', 'Lancha desde San Antero.',
   50000, 70000, 150000, 90000, 20000),

  -- PNN Paramillo
  (12,
   'Guía local con vehículo autorizado; caminatas por senderos.',
   'Comida empacada y agua (no hay restaurantes dentro).',
   'Camping o hospedaje en Tierralta.',
   'Senderismo, avistamiento de aves y camping.',
   'Entrada al parque y guía.',
   'Ingreso con guía autorizado y registro en el parque.',
   '2-4 días', 'Diciembre a abril', 'Desde Tierralta con guía autorizado.',
   80000, 90000, 120000, 150000, 50000),

  -- Puerto Escondido
  (13,
   'Moto o carro desde Montería; caminar el malecón.',
   'Comida de mar en restaurantes locales.',
   'Cabañas y posadas desde $80.000.',
   'Paseos en lancha, nado y fotografía de atardecer.',
   'Recuerdos.',
   'El atardecer desde el malecón es imperdible.',
   '1-2 días', 'Todo el año', 'Carretera desde Montería (2h).',
   35000, 80000, 140000, 50000, 20000),

  -- Momil
  (14,
   'Moto o carro hasta la ciénaga; lanchas locales.',
   'Comida típica con pescado de ciénaga.',
   'Alojamiento sencillo desde $50.000.',
   'Avistamiento de aves (martinete, ibis), paseos en lancha.',
   'Guiado.',
   'En ciertas épocas pasan bandadas de martinetes: espectáculo único.',
   '1 día', 'Todo el año', 'Bus desde Montería (1.5h).',
   30000, 50000, 70000, 50000, 15000),

  -- San Pelayo
  (15,
   'Bus desde Montería (1h); caminar el casco urbano.',
   'Mote de queso, bollo limpio y café.',
   'Alojamiento sencillo en el pueblo.',
   'Visita al escenario de las Fiestas del Río y la cultura fandango.',
   'Artesanías.',
   'Si viajas en enero, no te pierdas las Fiestas del Río.',
   '1 día', 'Enero (fiestas)', 'Bus desde Montería: 1 hora.',
   20000, 40000, 60000, 30000, 15000),

  -- Los Córdobas
  (16,
   'Moto o carro desde Montería; caminar la playa.',
   'Comida de mar en puestos de playa.',
   'Cabañas frente al mar.',
   'Nado, fotografía y paseos en lancha.',
   'Souvenirs.',
   'Zona de playa tranquila y poco masiva.',
   '1-2 días', 'Todo el año', 'Carretera desde Montería (2.5h).',
   35000, 90000, 160000, 50000, 20000);

-- ============================================================
-- Fin de la migracion 015
-- ============================================================