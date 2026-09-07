/**
 * seed-demo.js
 * -----------
 * Pobla la base de datos con datos DEMO para Fases 5 y 6:
 *   - 1 usuario BUSINESS demo + 3 usuarios TOURIST demo.
 *   - 7 negocios con el sufijo "Demo" asociados a destinos reales.
 *   - Imagenes, servicios, horarios y redes de cada negocio.
 *   - Resenas de los turistas demo + respuesta del negocio.
 *   - Algunos favoritos demo.
 *
 * Caracteristicas:
 *   - Idempotente: se puede ejecutar N veces sin duplicar datos.
 *   - No destructivo: solo INSERTs con ON CONFLICT DO NOTHING.
 *   - La contrasena del usuario BUSINESS demo es aleatoria y se
 *     imprime por consola (NO queda escrita en codigo fuente).
 *
 * Ejecutar: node seed-demo.js
 */
require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEMO_OWNER_EMAIL = "demo.negocios@exploraturismo.local";
const DEMO_OWNER_NOMBRE = "Negocios Demo";
const DEMO_TOURISTAS = [
  { nombre: "Turista Demo Uno", email: "demo.turista1@exploraturismo.local" },
  { nombre: "Turista Demo Dos", email: "demo.turista2@exploraturismo.local" },
  { nombre: "Turista Demo Tres", email: "demo.turista3@exploraturismo.local" },
];

const img = (seed) => `https://picsum.photos/seed/${seed}/900/600`;

const NEGOCIOS_DEMO = [
  {
    slug: "demo-casa-de-pescado-cartagena",
    nombre: "La Casa de Pescado Demo",
    category_id: 1, // Restaurante
    destination_id: 1, // Cartagena
    estado: "approved",
    descripcion:
      "Restaurante demo de cocina caribena frente al mar. Pruebas de la Fase 5.",
    direccion: "Calle del Pescador 12, Centro Historico, Cartagena Demo",
    telefono: "+57 605 000 0101",
    whatsapp: "+57 300 000 0101",
    email_contacto: "contacto@casadepescado.demo",
    website: "https://casadepescado.demo",
    precio_min: 45000,
    precio_max: 120000,
    portada_url: img("demo-pescado"),
    servicios: [
      { nombre: "Almuerzo tipico", descripcion: "Menus del dia con pescados de la region." },
      { nombre: "Cena a la luz de velas", descripcion: "Terrazas con vista al mar." },
      { nombre: "Menu infantil" },
      { nombre: "Acceso para sillas de ruedas" },
    ],
    redes: ["instagram", "facebook"],
    email_resena: "contacto@casadepescado.demo",
  },
  {
    slug: "demo-eco-tayrona",
    nombre: "Eco Hotel Tayrona Demo",
    category_id: 2, // Hotel
    destination_id: 2, // Tayrona
    estado: "approved",
    descripcion:
      "Hotel eco demo a pocos minutos del Parque Tayrona. Glamping y habitaciones.",
    direccion: "Via al Parque Tayrona, Costanera km 2, Demo",
    telefono: "+57 605 000 0202",
    whatsapp: "+57 300 000 0202",
    email_contacto: "reservas@ecotayrona.demo",
    website: "https://ecotayrona.demo",
    precio_min: 180000,
    precio_max: 450000,
    portada_url: img("demo-eco"),
    servicios: [
      { nombre: "Alojamiento", descripcion: "Cabanas ecologicas y glamping." },
      { nombre: "Desayuno incluido" },
      { nombre: "Senderismo guiado", descripcion: "Salidas diarias a la playa." },
      { nombre: "WiFi en areas comunes" },
    ],
    redes: ["instagram", "facebook"],
    email_resena: "reservas@ecotayrona.demo",
  },
  {
    slug: "demo-cafe-salento",
    nombre: "Hostal Cafe Salento Demo",
    category_id: 3, // Hostal
    destination_id: 5, // Salento
    estado: "approved",
    descripcion:
      "Hostal demo en el corazon del Quindio. Barra de cafe de especialidad.",
    direccion: "Calle Real 5-27, Salento Demo",
    telefono: "+57 606 000 0303",
    whatsapp: "+57 310 000 0303",
    email_contacto: "hola@cafesalento.demo",
    website: "https://cafesalento.demo",
    precio_min: 60000,
    precio_max: 150000,
    portada_url: img("demo-salento"),
    servicios: [
      { nombre: "Habitacion compartida", descripcion: "Dormitorios con lockers." },
      { nombre: "Habitacion privada" },
      { nombre: "Tour al Valle de Cocora", descripcion: "Salidas 8:00 desde el hostal." },
      { nombre: "Cafetería", descripcion: "Cafe de fincas vecinas." },
    ],
    redes: ["instagram", "facebook"],
    email_resena: "hola@cafesalento.demo",
  },
  {
    slug: "demo-lost-city-adventure",
    nombre: "Lost City Adventure Demo",
    category_id: 4, // Tour
    destination_id: 9, // Ciudad Perdida
    estado: "approved",
    descripcion:
      "Operador demo de trekking a la Ciudad Perdida. Guias certificados.",
    direccion: "Calle 20 4-30, Santa Marta (salidas a Ciudad Perdida)",
    telefono: "+57 605 000 0404",
    whatsapp: "+57 315 000 0404",
    email_contacto: "info@lostcity.demo",
    website: "https://lostcity.demo",
    precio_min: 1250000,
    precio_max: 1550000,
    portada_url: img("demo-lostcity"),
    servicios: [
      { nombre: "Trekking 4 dias", descripcion: "Campamentos y guias certificados." },
      { nombre: "Transporte ida y vuelta" },
      { nombre: "Alimentacion incluida" },
      { nombre: "Seguro de viajero" },
    ],
    redes: ["instagram", "facebook"],
    email_resena: "info@lostcity.demo",
  },
  {
    slug: "demo-cafe-de-la-villa",
    nombre: "Cafe de la Villa Demo",
    category_id: 8, // Cafe
    destination_id: 6, // Villa de Leyva
    estado: "approved",
    descripcion:
      "Cafeteria demo en la plaza principal de Villa de Leyva. Postres y cafe de origen.",
    direccion: "Plaza Principal 3-15, Villa de Leyva Demo",
    telefono: "+57 608 000 0505",
    whatsapp: "+57 320 000 0505",
    email_contacto: "mesa@cafedelavilla.demo",
    website: "https://cafedelavilla.demo",
    precio_min: 18000,
    precio_max: 35000,
    portada_url: img("demo-villa"),
    servicios: [
      { nombre: "Cafe de origen", descripcion: "Granos de Santander y Huila." },
      { nombre: "Postres caseros" },
      { nombre: "Terraza con vista a la plaza" },
    ],
    redes: ["instagram", "facebook"],
    email_resena: "mesa@cafedelavilla.demo",
  },
  {
    slug: "demo-guatape-tours",
    nombre: "Guatape Tours Demo",
    category_id: 5, // Agencia de viajes
    destination_id: 4, // Guatape
    estado: "pending",
    descripcion:
      "Agencia demo de tours a la Piedra del Penol y embalse de Guatape. Pendiente de aprobacion.",
    direccion: "Cra 30 40-12 zona centro, Guatape Demo",
    telefono: "+57 604 000 0606",
    whatsapp: "+57 301 000 0606",
    email_contacto: "ventas@guatapetours.demo",
    website: "https://guatapetours.demo",
    precio_min: 70000,
    precio_max: 250000,
    portada_url: img("demo-guatape"),
    servicios: [
      { nombre: "Tour Piedra del Penol", descripcion: "Subida y vista panoramica." },
      { nombre: "Paseo en lancha por el embalse" },
      { nombre: "Tour en ciudad del zocalo" },
    ],
    redes: ["instagram", "facebook"],
    email_resena: "ventas@guatapetours.demo",
  },
  {
    slug: "demo-bar-tatacoa",
    nombre: "Bar El Desierto Demo",
    category_id: 7, // Bar
    destination_id: 8, // Desierto de la Tatacoa
    estado: "approved",
    descripcion:
      "Bar demo en el observatorio de la Tatacoa. Noches de astronomia y terrazas.",
    direccion: "Vereda La Mana, sector observatorio, Tatacoa Demo",
    telefono: "+57 608 000 0707",
    whatsapp: "+57 322 000 0707",
    email_contacto: "bar@eldesierto.demo",
    website: "https://eldesierto.demo",
    precio_min: 25000,
    precio_max: 60000,
    portada_url: img("demo-tatacoa"),
    servicios: [
      { nombre: "Barra de cocteles" },
      { nombre: "Sesion de astronomia", descripcion: "Telescopio guiado 8pm." },
      { nombre: "Tapas y picadas" },
    ],
    redes: ["instagram", "facebook"],
    email_resena: "bar@eldesierto.demo",
  },
];

const RESENAS_DEMO = {
  "demo-casa-de-pescado-cartagena": [
    { turista: "demo.turista1@exploraturismo.local", rating: 5, comment: "El arroz con coco y el pescado frito son imperdibles. Atencion excelente." },
    { turista: "demo.turista2@exploraturismo.local", rating: 4, comment: "Buena terraza con vista al mar. Un poco lleno en hora pico." },
  ],
  "demo-eco-tayrona": [
    { turista: "demo.turista2@exploraturismo.local", rating: 5, comment: "Glamping muy comodo, el desayuno frente a la selva es un regalo." },
    { turista: "demo.turista3@exploraturismo.local", rating: 4, comment: "Buena opcion para llegar temprano al parque." },
    { turista: "demo.turista1@exploraturismo.local", rating: 5, comment: "Los guias de senderismo son muy conocedores." },
  ],
  "demo-cafe-salento": [
    { turista: "demo.turista3@exploraturismo.local", rating: 4, comment: "El tour al Cocora bien coordinado y el cafe delicioso." },
    { turista: "demo.turista1@exploraturismo.local", rating: 5, comment: "Ambiente acogedor y habitaciones limpias." },
  ],
  "demo-lost-city-adventure": [
    { turista: "demo.turista1@exploraturismo.local", rating: 5, comment: "Increible experiencia, guias muy profesionales." },
    { turista: "demo.turista3@exploraturismo.local", rating: 5, comment: "Campamentos bien organizados, comida abundante." },
  ],
  "demo-cafe-de-la-villa": [
    { turista: "demo.turista2@exploraturismo.local", rating: 4, comment: "Excelente cafe y la vista a la plaza es única." },
  ],
  "demo-bar-tatacoa": [
    { turista: "demo.turista3@exploraturismo.local", rating: 5, comment: "La sesion de astronomia es mágica. Volveria." },
    { turista: "demo.turista2@exploraturismo.local", rating: 4, comment: "Buen lugar para ver estrellas con musica de fondo." },
  ],
};

const RESPUESTAS_DEMO = {
  "demo-casa-de-pescado-cartagena": "demo.turista1@exploraturismo.local",
  "demo-eco-tayrona": "demo.turista2@exploraturismo.local",
  "demo-cafe-salento": "demo.turista3@exploraturismo.local",
};

const FAVORITOS_DEMO = {
  "demo.turista1@exploraturismo.local": {
    destinos: [1, 4],
    negocios: ["demo-casa-de-pescado-cartagena", "demo-eco-tayrona"],
  },
  "demo.turista2@exploraturismo.local": {
    destinos: [5],
    negocios: ["demo-cafe-salento"],
  },
};

async function upsertUsuario({ nombre, email, role }) {
  const password = crypto.randomBytes(12).toString("base64url") + "A1!";
  const hashed = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol_id, proveedor)
     VALUES ($1, $2, $3, $4, 'local')
     ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre
     RETURNING id, email, rol_id`,
    [nombre, email, hashed, role]
  );
  const user = rows[0];
  return { user, password: user.rol_id === role ? password : null };
}

async function findLugarPorSlug(slug) {
  const { rows } = await pool.query("SELECT id FROM lugares WHERE slug = $1", [slug]);
  return rows[0] || null;
}

async function asegurarNegocio(demo) {
  const { rows } = await pool.query(
    `INSERT INTO businesses
       (owner_id, category_id, destination_id, nombre, slug, descripcion, direccion,
        telefono, whatsapp, email_contacto, website, precio_min, precio_max, moneda,
        portada_url, estado, is_verified, is_featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'COP', $14, $15, $16, $17)
     ON CONFLICT (slug) DO NOTHING
     RETURNING id, slug, nombre`,
    [
      demo.ownerId, demo.category_id, demo.destination_id, demo.nombre, demo.slug,
      demo.descripcion, demo.direccion, demo.telefono, demo.whatsapp,
      demo.email_contacto, demo.website, demo.precio_min, demo.precio_max,
      demo.portada_url, demo.estado,
      demo.estado === "approved", demo.estado === "approved" && demo.is_featured === true,
    ]
  );
  if (rows[0]) return rows[0];
  const { rows: existing } = await pool.query("SELECT id FROM businesses WHERE slug = $1", [demo.slug]);
  return existing[0];
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const owner = await upsertUsuario({
      nombre: DEMO_OWNER_NOMBRE,
      email: DEMO_OWNER_EMAIL,
      role: 2,
    });
    const ownerPassword = owner.password;
    console.log("");
    console.log("================================================");
    console.log("Usuario BUSINESS demo");
    console.log("  Email:   ", DEMO_OWNER_EMAIL);
    console.log("  Password:", ownerPassword);
    console.log("  (Credenciales solo para el reporte, no en codigo)");
    console.log("================================================");

    const turistas = {};
    for (const t of DEMO_TOURISTAS) {
      turistas[t.email] = await upsertUsuario({ nombre: t.nombre, email: t.email, role: 1 });
    }
    const touristIds = {};
    for (const [email, { user }] of Object.entries(turistas)) touristIds[email] = user.id;

    const creados = [];
    for (const demo of NEGOCIOS_DEMO) {
      const negocio = await asegurarNegocio({ ...demo, ownerId: owner.user.id });
      creados.push({ demo, negocio });

      for (const [i, s] of (demo.servicios || []).entries()) {
        await client.query(
          `INSERT INTO business_services (business_id, nombre, descripcion)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [negocio.id, s.nombre, s.descripcion || null]
        );
      }

      for (let d = 1; d <= 6; d++) {
        await client.query(
          `INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed, orden)
           VALUES ($1, $2, '09:00', '18:00', false, 0)
           ON CONFLICT DO NOTHING`,
          [negocio.id, d]
        );
      }
      await client.query(
        `INSERT INTO business_hours (business_id, day_of_week, is_closed, orden)
         VALUES ($1, 0, true, 0)
         ON CONFLICT DO NOTHING`,
        [negocio.id]
      );

      for (const plataforma of demo.redes || []) {
        await client.query(
          `INSERT INTO business_social_links (business_id, plataforma, url)
           VALUES ($1, $2, $3)
           ON CONFLICT (business_id, plataforma) DO NOTHING`,
          [negocio.id, plataforma, `https://${plataforma}.com/${demo.slug}`]
        );
      }

      await client.query(
        `INSERT INTO business_images (business_id, url, alt_text, is_primary, orden)
         VALUES ($1, $2, $3, true, 0)
         ON CONFLICT DO NOTHING`,
        [negocio.id, demo.portada_url, `${demo.nombre} - portada`]
      );
      await client.query(
        `INSERT INTO business_images (business_id, url, alt_text, is_primary, orden)
         VALUES ($1, $2, $3, false, 1)
         ON CONFLICT DO NOTHING`,
        [negocio.id, img(demo.slug + "-2"), `${demo.nombre} - galeria 1`]
      );
      await client.query(
        `INSERT INTO business_images (business_id, url, alt_text, is_primary, orden)
         VALUES ($1, $2, $3, false, 2)
         ON CONFLICT DO NOTHING`,
        [negocio.id, img(demo.slug + "-3"), `${demo.nombre} - galeria 2`]
      );
    }

    let reviewsCreadas = 0;
    for (const { demo, negocio } of creados) {
      for (const r of RESENAS_DEMO[demo.slug] || []) {
        const { rowCount } = await pool.query(
          `INSERT INTO reviews (user_id, business_id, rating, comment, estado)
           VALUES ($1, $2, $3, $4, 'active')
           ON CONFLICT (user_id, business_id) DO NOTHING`,
          [touristIds[r.turista], negocio.id, r.rating, r.comment]
        );
        if (rowCount > 0) reviewsCreadas++;
      }
    }

    let respuestasCreadas = 0;
    for (const [slug, turista] of Object.entries(RESPUESTAS_DEMO)) {
      const negocio = creados.find((c) => c.demo.slug === slug)?.negocio;
      if (!negocio) continue;
      const { rows: reviewRows } = await pool.query(
        "SELECT id FROM reviews WHERE business_id = $1 AND user_id = $2 AND estado = 'active' ORDER BY created_at LIMIT 1",
        [negocio.id, touristIds[turista]]
      );
      if (!reviewRows[0]) continue;
      const { rowCount } = await pool.query(
        "INSERT INTO review_replies (review_id, user_id, reply) SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM review_replies WHERE review_id = $1)",
        [reviewRows[0].id, owner.user.id, "¡Gracias por tu visita! Trabajamos cada día para dar el mejor servicio. — Equipo Demo"]
      );
      if (rowCount > 0) respuestasCreadas++;
    }

    let favoritosCreados = 0;
    for (const [email, favs] of Object.entries(FAVORITOS_DEMO)) {
      const userId = touristIds[email];
      if (!userId) continue;
      for (const destino of favs.destinos || []) {
        const { rowCount } = await pool.query(
          `INSERT INTO favorite_destinos (user_id, destination_id)
           VALUES ($1, $2) ON CONFLICT (user_id, destination_id) DO NOTHING`,
          [userId, destino]
        );
        if (rowCount > 0) favoritosCreados++;
      }
      for (const slug of favs.negocios || []) {
        const negocio = creados.find((c) => c.demo.slug === slug)?.negocio;
        if (!negocio) continue;
        const { rowCount } = await pool.query(
          `INSERT INTO favorite_negocios (user_id, business_id)
           VALUES ($1, $2) ON CONFLICT (user_id, business_id) DO NOTHING`,
          [userId, negocio.id]
        );
        if (rowCount > 0) favoritosCreados++;
      }
    }

    await client.query("COMMIT");

    const { rows: conteo } = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM businesses WHERE slug LIKE 'demo-%') AS negocios,
         (SELECT COUNT(*) FROM business_services s JOIN businesses b ON b.id = s.business_id WHERE b.slug LIKE 'demo-%') AS servicios,
         (SELECT COUNT(*) FROM business_images s JOIN businesses b ON b.id = s.business_id WHERE b.slug LIKE 'demo-%') AS imagenes,
         (SELECT COUNT(*) FROM business_hours s JOIN businesses b ON b.id = s.business_id WHERE b.slug LIKE 'demo-%') AS horarios,
         (SELECT COUNT(*) FROM business_social_links s JOIN businesses b ON b.id = s.business_id WHERE b.slug LIKE 'demo-%') AS redes,
         (SELECT COUNT(*) FROM reviews r JOIN businesses b ON b.id = r.business_id WHERE b.slug LIKE 'demo-%') AS resenas,
         (SELECT COUNT(*) FROM favorite_destinos fd JOIN usuarios u ON u.id = fd.user_id WHERE u.email LIKE 'demo.turista%') AS fav_destinos,
         (SELECT COUNT(*) FROM favorite_negocios fn JOIN usuarios u ON u.id = fn.user_id WHERE u.email LIKE 'demo.turista%') AS fav_negocios`
    );
    const c = conteo[0];
    console.log("");
    console.log("Datos demo creados/verificados:");
    console.log(`  Negocios:  ${c.negocios}`);
    console.log(`  Servicios: ${c.servicios}`);
    console.log(`  Imagenes:  ${c.imagenes}`);
    console.log(`  Horarios:  ${c.horarios}`);
    console.log(`  Redes:     ${c.redes}`);
    console.log(`  Resenas:   ${c.resenas}`);
    console.log(`  Favoritos destinos: ${c.fav_destinos}`);
    console.log(`  Favoritos negocios: ${c.fav_negocios}`);
    console.log(`  Respuestas creadas ahora: ${respuestasCreadas}`);
    console.log(`  Resenas creadas ahora:    ${reviewsCreadas}`);
    console.log(`  Favoritos creados ahora:  ${favoritosCreados}`);
    console.log("Listo.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en seed demo:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();