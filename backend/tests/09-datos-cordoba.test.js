const h = require("./helpers");

async function planId(slug) {
  const { rows } = await h.q("SELECT id FROM tour_plans WHERE slug = $1", [slug]);
  h.assert(rows.length === 1, `plan sembrado: ${slug}`);
  return rows[0].id;
}

// Las promos sembradas tienen fechas FIJAS. Para que la suite sea
// determinista se ajustan temporalmente a una ventana relativa a
// CURRENT_DATE y se restauran al terminar. Sin esto, las promos quedan
// vencidas (o activas) según la fecha en que se ejecute la prueba.
async function ajustarPromo(planSlug, { inicio, fin, estado }) {
  const pid = await planId(planSlug);
  const { rows } = await h.q(
    `SELECT id, fecha_inicio, fecha_fin, estado FROM promotions
      WHERE plan_id = $1 ORDER BY id LIMIT 1`,
    [pid]
  );
  h.assert(rows.length === 1, `promo sembrada del plan ${planSlug}`);
  const original = rows[0];
  await h.q(
    `UPDATE promotions
        SET fecha_inicio = (${inicio})::date, fecha_fin = (${fin})::date, estado = $2
      WHERE id = $1`,
    [original.id, estado]
  );
  return async () => {
    await h.q(
      `UPDATE promotions SET fecha_inicio = $2, fecha_fin = $3, estado = $4 WHERE id = $1`,
      [original.id, original.fecha_inicio, original.fecha_fin, original.estado]
    );
  };
}

h.test("CRD: destinos demo son de Córdoba (con municipio y tipo)", async () => {
  const r = await h.api("/api/lugares");
  h.assertStatus(r.status, 200, "lista pública de destinos");
  const lugares = r.json.data;
  h.assert(Array.isArray(lugares) && lugares.length >= 16, `16+ destinos sembrados (${lugares.length})`);
  for (const l of lugares) {
    h.assert(l.municipio && String(l.municipio).trim() !== "", `${l.nombre}: municipio presente`);
    h.assert(l.tipo && String(l.tipo).trim() !== "", `${l.nombre}: tipo presente`);
    h.assert(String(l.ubicacion || "").toLowerCase().includes("córdoba"), `${l.nombre}: ubicación apunta a Córdoba`);
  }
  const slugs = lugares.map((l) => l.slug);
  for (const s of [
    "monteria", "santa-cruz-de-lorica", "san-antero", "san-bernardo-del-viento",
    "tuchin", "ayapel", "tierralta", "cienaga-de-betanci", "parque-nacional-natural-paramillo",
  ]) {
    h.assert(slugs.includes(s), `destino ${s} presente`);
  }
});

h.test("CRD: negocios demo en Córdoba y dueño vendedor demo", async () => {
  const { rows } = await h.q(`
    SELECT b.id, b.nombre, b.destination_id, l.municipio, l.ubicacion
    FROM businesses b
    LEFT JOIN lugares l ON l.id = b.destination_id
    WHERE b.owner_id = (SELECT id FROM usuarios WHERE email = 'vendedor.demo@exploraturismo.local')
  `);
  h.assert(rows.length >= 4, `4 negocios demo del vendedor (${rows.length})`);
  for (const b of rows) {
    h.assert(b.municipio && String(b.municipio).trim() !== "", `${b.nombre}: municipio Córdoba`);
    h.assert(String(b.ubicacion || "").toLowerCase().includes("córdoba"), `${b.nombre}: ubicación Córdoba`);
  }
  const fuera = await h.q(`
    SELECT COUNT(*)::int AS c FROM businesses b
    JOIN lugares l ON l.id = b.destination_id
    WHERE LOWER(l.ubicacion) NOT LIKE '%córdoba%'
  `);
  h.assert(fuera.rows[0].c === 0, "ningún negocio fuera de Córdoba");
});

h.test("CRD: planes demo en Córdoba", async () => {
  const { rows } = await h.q(`
    SELECT COUNT(*)::int AS c FROM tour_plans
  `);
  h.assert(rows[0].c >= 8, `8 planes demo (${rows[0].c})`);
  const mal = await h.q(`
    SELECT COUNT(*)::int AS bad FROM tour_plans p
    LEFT JOIN lugares l ON l.id = p.destination_id
    WHERE l.id IS NULL OR LOWER(l.ubicacion) NOT LIKE '%córdoba%'
  `);
  h.assert(mal.rows[0].bad === 0, "todos los planes demo apuntan a destinos Córdoba");
});

h.test("CRD: promo ACTIVA => descuento ÚNICO (plan Betancí, 15%)", async () => {
  const restaurar = await ajustarPromo("amanecer-en-la-cienaga-de-betanci", {
    inicio: "CURRENT_DATE - 10", fin: "CURRENT_DATE + 10", estado: "activo",
  });
  try {
    const pid = await planId("amanecer-en-la-cienaga-de-betanci");
    for (const [personas, total, porPersona] of [[3, 216750, 72250], [4, 289000, 72250]]) {
      const r = await h.api(`/api/planes/${pid}/precio?personas=${personas}`);
      h.assertStatus(r.status, 200, `precio ${personas} personas`);
      h.assert(r.json.data.tipo_descuento === "promocion", `${personas}: tipo 'promocion'`);
      h.assert(Number(r.json.data.descuento_porcentaje) === 15, `${personas}: % efectivo 15%`);
      h.assert(Number(r.json.data.descuento_promocion) === 15, `${personas}: descuento_promocion 15%`);
      h.assert(r.json.data.rango_aplicado === null, `${personas}: rango NO aplica (promo activa)`);
      h.assert(Number(r.json.data.precio_persona) === porPersona, `${personas}: por persona ${porPersona}`);
      h.assert(Number(r.json.data.total) === total, `${personas}: total ${total}`);
    }
  } finally {
    await restaurar();
  }
});

h.test("CRD: promo FUTURA no aplica => precio por rango (plan Cispatá)", async () => {
  const restaurar = await ajustarPromo("manglares-de-cispata-y-bahia", {
    inicio: "CURRENT_DATE + 10", fin: "CURRENT_DATE + 20", estado: "activo",
  });
  try {
    const pid = await planId("manglares-de-cispata-y-bahia");
    const casos = [
      [1, "ninguno", 0, 130000, 130000],
      [5, "rango", 20, 104000, 520000],
      [12, "rango", 35, 84500, 1014000],
    ];
    for (const [personas, tipo, pct, porPersona, total] of casos) {
      const r = await h.api(`/api/planes/${pid}/precio?personas=${personas}`);
      h.assertStatus(r.status, 200, `precio ${personas} personas`);
      h.assert(r.json.data.tipo_descuento === tipo, `${personas}: tipo '${tipo}'`);
      h.assert(Number(r.json.data.descuento_porcentaje) === pct, `${personas}: % ${pct}`);
      h.assert(r.json.data.descuento_promocion === null, `${personas}: promo futura NO aplica`);
      h.assert(Number(r.json.data.precio_persona) === porPersona, `${personas}: por persona ${porPersona}`);
      h.assert(Number(r.json.data.total) === total, `${personas}: total ${total}`);
    }
  } finally {
    await restaurar();
  }
});

h.test("CRD: promo INACTIVA no aplica => precio por rango (plan Paramillo)", async () => {
  const pid = await planId("tierralta-y-pnn-paramillo-2-dias");
  for (const [personas, pct, porPersona, total] of [[4, 12, 281600, 1126400], [7, 20, 256000, 1792000]]) {
    const r = await h.api(`/api/planes/${pid}/precio?personas=${personas}`);
    h.assertStatus(r.status, 200, `precio ${personas} personas`);
    h.assert(r.json.data.tipo_descuento === "rango", `${personas}: tipo 'rango'`);
    h.assert(Number(r.json.data.descuento_porcentaje) === pct, `${personas}: % ${pct}`);
    h.assert(r.json.data.descuento_promocion === null, `${personas}: promo inactiva NO aplica`);
    h.assert(Number(r.json.data.precio_persona) === porPersona, `${personas}: por persona ${porPersona}`);
    h.assert(Number(r.json.data.total) === total, `${personas}: total ${total}`);
  }
});

h.test("CRD: login del vendedor demo y dashboard con datos", async () => {
  await h.clearSession("vendedor.demo@exploraturismo.local");
  const log = await h.login("vendedor.demo@exploraturismo.local", "VendedorDemo#2026!");
  h.assertStatus(log.status, 200, "login vendedor demo");
  h.assert(log.usuario && log.usuario.email === "vendedor.demo@exploraturismo.local", "email del vendedor");
  const r = await h.api("/api/businesses", { token: log.token });
  h.assertStatus(r.status, 200, "lista de negocios del vendedor");
  h.assert(Array.isArray(r.json.data) && r.json.data.length >= 4, `dashboard vendedor con ${r.json.data.length} negocios`);
});

h.test("CRD: snapshots demo con tipo_descuento válido", async () => {
  const { rows } = await h.q(`SELECT id, tipo_descuento FROM inscripciones`);
  h.assert(rows.length >= 2, `inscripciones demo presentes (${rows.length})`);
  for (const it of rows) {
    h.assert(["rango", "promocion", "ninguno"].includes(it.tipo_descuento), `inscripción ${it.id}: tipo_descuento válido (${it.tipo_descuento})`);
  }
});