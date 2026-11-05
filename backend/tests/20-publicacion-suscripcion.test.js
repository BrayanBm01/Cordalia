// ============================================================
// 20-publicacion-suscripcion.test.js — Vencimiento comercial y
// publicacion de negocios (Cordalia).
//
// Cubre los requisitos obligatorios:
//   * Prueba gratuita de 168 horas EXACTAS (7 dias de 24 h).
//   * Vigente a 7d-1s; vencida exactamente al cumplirse y despues.
//   * La prueba NO se reinicia por login/recarga ni se puede repetir.
//   * Negocio aprobado + suscripcion vigente = publico.
//   * Negocio pendiente = oculto (aunque el vendedor tenga plan).
//   * Vencido: ausente de listados, busquedas, planes y URL directa.
//   * El panel del vendedor sigue accesible con la cuenta vencida.
//   * La renovacion (pago verificado) restaura SOLO lo oculto por
//     vencimiento; no toca la moderacion ni revierte suspensiones.
//   * Vendedor legado (sin politica) conserva su publicacion.
//   * El cliente no puede falsificar fechas ni estado de pago.
// ============================================================
const h = require("./helpers");
const SuscripcionModel = require("../src/models/suscripcionModel");

const pass = "Test1234x!";

function planPayload(nombre) {
  return {
    nombre,
    descripcion: "Plan de prueba de publicacion comercial.",
    destination_id: 1,
    destino: "Cordoba",
    duracion_dias: 1,
    duracion_noches: 0,
    precio: 100000,
    tipo_precio: "por_persona",
    tipo_plan: "paquete",
    descuentos_rango: [{ min: 1, descuento: 0 }],
    incluye: [],
    itinerario: [],
  };
}

async function crearNegocio(token, nombre) {
  const r = await h.api("/api/businesses", {
    method: "POST",
    token,
    body: {
      nombre,
      category_id: 4,
      destination_id: 1,
      whatsapp: "3200000099",
      email_contacto: "pub@test.com",
      descripcion: "Negocio de prueba de publicacion.",
    },
  });
  h.assertStatus(r.status, 201, `crear negocio ${nombre}`);
  return r.json.data;
}

async function crearPlan(token, businessId, nombre) {
  const r = await h.api(`/api/businesses/${businessId}/planes`, {
    method: "POST",
    token,
    body: planPayload(nombre),
  });
  h.assertStatus(r.status, 201, `crear plan ${nombre}`);
  return r.json.data;
}

async function aprobar(adminToken, businessId, estado = "approved") {
  const r = await h.api(`/api/businesses/${businessId}/estado`, {
    method: "PUT",
    token: adminToken,
    body: { estado },
  });
  h.assertStatus(r.status, 200, `moderacion ${estado} del negocio ${businessId}`);
  return r.json.data;
}

async function idsPublicos() {
  const r = await h.api("/api/businesses");
  h.assertStatus(r.status, 200, "listado publico de negocios");
  return (Array.isArray(r.json.data) ? r.json.data : []).map((b) => b.id);
}

async function idsPlanesPublicos() {
  const r = await h.api("/api/planes");
  h.assertStatus(r.status, 200, "listado publico de planes");
  return (Array.isArray(r.json.data) ? r.json.data : []).map((p) => p.id);
}

async function esconderPorVencimiento(usuarioId) {
  // Simula el vencimiento real: no queda prueba ni suscripcion vigente.
  await h.q(
    `UPDATE subscriptions
        SET estado = 'expired', ends_at = NOW() - interval '1 second', updated_at = NOW()
      WHERE usuario_id = $1 AND estado = 'active'`,
    [usuarioId]
  );
  await h.q(
    `UPDATE usuarios
        SET estado_cuenta = 'EXPIRED', trial_fin = NOW() - interval '1 second',
            updated_at = NOW()
      WHERE id = $1`,
    [usuarioId]
  );
  await SuscripcionModel.sincronizarVencimientosComerciales();
}

// ------------------------------------------------------------
// Preparacion
// ------------------------------------------------------------
h.test("PUB: setup (admin, 2 vendedores, legado y suspendido)", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, h.ADMIN_PASSWORD);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const crearVendedor = async (alias) => {
    const email = h.repo(`f21test.pub.${alias}`);
    const r = await h.createUser(admin.token, { nombre: `Vendedor ${alias}`, email, password: pass, rol_id: 2 });
    h.assertStatus(r.status, 201, `crear vendedor ${alias}`);
    const login = await h.login(email, pass);
    h.assertStatus(login.status, 200, `login vendedor ${alias}`);
    return { email, token: login.token, id: login.usuario.id };
  };

  const vig = await crearVendedor("vigente");
  const venc = await crearVendedor("vencido");
  const legado = await crearVendedor("legado");
  const susp = await crearVendedor("suspendido");
  h.test.vig = vig;
  h.test.venc = venc;
  h.test.legado = legado;
  h.test.susp = susp;

  // Cada vendedor crea un negocio; el admin los aprueba.
  h.test.negVig = await crearNegocio(vig.token, "Negocio Vigente");
  h.test.negVenc = await crearNegocio(venc.token, "Negocio Vencido");
  h.test.negLegado = await crearNegocio(legado.token, "Negocio Legado");
  h.test.negSusp = await crearNegocio(susp.token, "Negocio Suspendido");
  for (const neg of [h.test.negVig, h.test.negVenc, h.test.negLegado, h.test.negSusp]) {
    await aprobar(admin.token, neg.id);
  }

  // Vendedor anterior sin politica (legado): conserva publicacion.
  await h.q(
    `UPDATE usuarios SET estado_cuenta = NULL, trial_inicio = NULL, trial_fin = NULL,
            updated_at = NOW()
      WHERE id = $1`,
    [legado.id]
  );
  await h.q("UPDATE businesses SET publicacion_estado = 'visible' WHERE owner_id = $1", [legado.id]);

  // Suspension administrativa del cuarto vendedor.
  const sus = await h.api(`/api/admin/vendedores/${susp.id}/estado`, {
    method: "PUT",
    token: admin.token,
    body: { suspendido: true, motivo: "Prueba de publicacion" },
  });
  h.assertStatus(sus.status, 200, "suspender vendedor");

  // Planes creados durante la vigencia (para probar que desaparecen).
  h.test.planVenc = await crearPlan(venc.token, h.test.negVenc.id, "Plan Vencido");
  h.test.planLegado = await crearPlan(legado.token, h.test.negLegado.id, "Plan Legado");
});

// ------------------------------------------------------------
// 168 horas exactas
// ------------------------------------------------------------
h.test("PUB: la prueba gratuita dura exactamente 168 horas", async () => {
  const { rows } = await h.q(
    `SELECT EXTRACT(EPOCH FROM (trial_fin - trial_inicio)) AS segundos,
            EXTRACT(EPOCH FROM (trial_fin - (trial_inicio + interval '168 hours'))) AS desvio
       FROM usuarios WHERE id = $1`,
    [h.test.vig.id]
  );
  h.assert(rows.length === 1, "vendedor con prueba");
  const segundos = Number(rows[0].segundos);
  const desvio = Math.abs(Number(rows[0].desvio));
  h.assert(Math.abs(segundos - 168 * 3600) < 1, `dura 168 h (fue ${segundos / 3600} h)`);
  h.assert(desvio < 0.001, `trial_fin = trial_inicio + 168 h exactas (desvio ${desvio} s)`);
});

h.test("PUB: la prueba no se reinicia al entrar ni al reasignarla", async () => {
  const { rows: antes } = await h.q(
    "SELECT trial_inicio, trial_fin FROM usuarios WHERE id = $1",
    [h.test.vig.id]
  );

  // Reasignar la prueba (lo que ejecuta el alta/login) es un no-op.
  await SuscripcionModel.asignarPruebaGratuita(h.test.vig.id);
  await h.clearSession(h.test.vig.email);
  const login2 = await h.login(h.test.vig.email, pass);
  h.assertStatus(login2.status, 200, "nuevo login");
  h.test.vig.token = login2.token;

  const { rows: despues } = await h.q(
    "SELECT trial_inicio, trial_fin FROM usuarios WHERE id = $1",
    [h.test.vig.id]
  );
  h.assert(String(antes[0].trial_inicio) === String(despues[0].trial_inicio), "trial_inicio intacto");
  h.assert(String(antes[0].trial_fin) === String(despues[0].trial_fin), "trial_fin intacto");
});

h.test("PUB: a 7d-1s sigue vigente; al cumplirse y +1s queda vencido", async () => {
  // 7 dias - 1 segundo y 1 segundo de margen: sigue TRIALING y publico.
  await h.q(
    `UPDATE usuarios
        SET trial_inicio = NOW() - interval '168 hours' + interval '1 second',
            trial_fin = NOW() + interval '1 second',
            estado_cuenta = 'TRIALING', updated_at = NOW()
      WHERE id = $1`,
    [h.test.vig.id]
  );
  await h.q("UPDATE businesses SET publicacion_estado = 'visible' WHERE owner_id = $1", [h.test.vig.id]);

  let estado = await h.api("/api/vendedor/estado", { token: h.test.vig.token });
  h.assertStatus(estado.status, 200, "estado comercial");
  h.assert(estado.json.data.estado === "TRIALING", `TRIALING a 7d-1s (fue ${estado.json.data.estado})`);
  h.assert((await idsPublicos()).includes(h.test.negVig.id), "negocio publico a 7d-1s");

  // Exactamente al cumplirse la fecha (trial_fin = NOW() del UPDATE),
  // cualquier consulta posterior ya lo considera vencido: la regla es
  // trial_fin > NOW().
  await h.q(
    `UPDATE usuarios SET trial_fin = NOW(), estado_cuenta = 'TRIALING', updated_at = NOW()
      WHERE id = $1`,
    [h.test.vig.id]
  );
  await h.q("UPDATE businesses SET publicacion_estado = 'visible' WHERE owner_id = $1", [h.test.vig.id]);
  h.assert(!(await idsPublicos()).includes(h.test.negVig.id), "al cumplirse la fecha deja de ser publico");
  estado = await h.api("/api/vendedor/estado", { token: h.test.vig.token });
  h.assert(estado.json.data.estado === "EXPIRED", `EXPIRED en la fecha exacta (fue ${estado.json.data.estado})`);

  // +1 segundo: la bandera ya quedo oculta tras la comprobacion perezosa.
  const { rows } = await h.q(
    `SELECT b.publicacion_estado, u.estado_cuenta
       FROM businesses b JOIN usuarios u ON u.id = b.owner_id
      WHERE b.id = $1`,
    [h.test.negVig.id]
  );
  h.assert(rows[0].publicacion_estado === "oculto_suscripcion", "bandera oculta al vencer (+1s)");
  h.assert(rows[0].estado_cuenta === "EXPIRED", "estado EXPIRED (+1s)");
  h.assert(!(await idsPublicos()).includes(h.test.negVig.id), "ausente del listado (+1s)");

  // Se restaura la vigencia para las siguientes pruebas.
  await h.q(
    `UPDATE usuarios
        SET trial_inicio = NOW(), trial_fin = NOW() + interval '168 hours',
            estado_cuenta = 'TRIALING', updated_at = NOW()
      WHERE id = $1`,
    [h.test.vig.id]
  );
  await SuscripcionModel.sincronizarVencimientosComerciales();
});

// ------------------------------------------------------------
// Publicacion, vencimiento y restauracion
// ------------------------------------------------------------
h.test("PUB: el flag de publicacion NO basta: la consulta en vivo bloquea al vencido", async () => {
  // Aunque la bandera quede en 'visible' (dato atrasado), el negocio
  // vencido no aparece: la regla SQL comprueba la vigencia con NOW().
  await h.q(
    `UPDATE usuarios SET trial_fin = NOW() - interval '1 second', estado_cuenta = 'TRIALING',
            updated_at = NOW()
      WHERE id = $1`,
    [h.test.venc.id]
  );
  await h.q("UPDATE businesses SET publicacion_estado = 'visible' WHERE owner_id = $1", [h.test.venc.id]);

  h.assert(!(await idsPublicos()).includes(h.test.negVenc.id), "listado lo excluye en vivo");
  h.assert(!(await idsPlanesPublicos()).includes(h.test.planVenc.id), "planes lo excluyen en vivo");

  const directo = await h.api(`/api/businesses/${h.test.negVenc.id}`);
  h.assertStatus(directo.status, 404, "URL directa del negocio vencido -> 404");
  const plan = await h.api(`/api/planes/${h.test.planVenc.id}`);
  h.assertStatus(plan.status, 404, "plan del negocio vencido -> 404");
  const salidas = await h.api(`/api/planes/${h.test.planVenc.id}/salidas`);
  h.assertStatus(salidas.status, 404, "salidas del plan vencido -> 404");
  const precio = await h.api(`/api/planes/${h.test.planVenc.id}/precio?personas=2`);
  h.assertStatus(precio.status, 404, "precio del plan vencido -> 404");
  const transporte = await h.api(`/api/planes/${h.test.planVenc.id}/transporte/sugerir`);
  h.assertStatus(transporte.status, 404, "transporte del plan vencido -> 404");
});

h.test("PUB: el negocio aprobado con suscripcion vigente vuelve a ser publico", async () => {
  // Estado consistente: vencido y oculto por sincronizacion.
  await esconderPorVencimiento(h.test.venc.id);
  const { rows: oculto } = await h.q(
    "SELECT publicacion_estado FROM businesses WHERE id = $1",
    [h.test.negVenc.id]
  );
  h.assert(oculto[0].publicacion_estado === "oculto_suscripcion", "oculto por vencimiento");

  // Renovacion por el flujo del servidor (sandbox: pago aprobado en
  // servidor). Es el mismo camino que usa la webhook verificada.
  const compra = await h.api("/api/vendedor/suscripciones", {
    method: "POST",
    token: h.test.venc.token,
    body: { plan_id: 2 },
  });
  h.assertStatus(compra.status, 201, "contratar/renovar plan");
  h.assert(compra.json.data.suscripcion.estado === "active", "suscripcion activa");

  const { rows } = await h.q(
    `SELECT b.publicacion_estado, b.estado, u.estado_cuenta
       FROM businesses b JOIN usuarios u ON u.id = b.owner_id
      WHERE b.id = $1`,
    [h.test.negVenc.id]
  );
  h.assert(rows[0].publicacion_estado === "visible", "publicacion restaurada");
  h.assert(rows[0].estado === "approved", "la moderacion no cambio");
  h.assert(rows[0].estado_cuenta === "ACTIVE", "cuenta ACTIVE");

  h.assert((await idsPublicos()).includes(h.test.negVenc.id), "negocio publico de nuevo");
  h.assert((await idsPlanesPublicos()).includes(h.test.planVenc.id), "plan publico de nuevo");
  const directo = await h.api(`/api/businesses/${h.test.negVenc.id}`);
  h.assertStatus(directo.status, 200, "URL directa disponible de nuevo");
  const plan = await h.api(`/api/planes/${h.test.planVenc.id}`);
  h.assertStatus(plan.status, 200, "plan disponible de nuevo");
});

h.test("PUB: un negocio pendiente NO es publico ni con plan activo", async () => {
  // El vendedor ya tiene suscripcion ACTIVE. Su segundo negocio sigue
  // pendiente de moderacion: no aparece hasta la aprobacion.
  const pendiente = await crearNegocio(h.test.venc.token, "Negocio Pendiente");
  const planPendiente = await crearPlan(h.test.venc.token, pendiente.id, "Plan Pendiente");

  h.assert(!(await idsPublicos()).includes(pendiente.id), "listado excluye al pendiente");
  h.assert(!(await idsPlanesPublicos()).includes(planPendiente.id), "planes excluyen al pendiente");
  const directo = await h.api(`/api/businesses/${pendiente.id}`);
  h.assertStatus(directo.status, 404, "URL directa del pendiente -> 404");
  const plan = await h.api(`/api/planes/${planPendiente.id}`);
  h.assertStatus(plan.status, 404, "plan del pendiente -> 404");

  // Al aprobarlo (con el plan vigente) si se vuelve publico.
  await aprobar(h.test.adminToken, pendiente.id);
  h.assert((await idsPublicos()).includes(pendiente.id), "aprobado y con plan -> publico");
  h.test.negPendiente = pendiente;
  h.test.planPendiente = planPendiente;
});

h.test("PUB: la suspension del vendedor oculta; renovar NO la revierte", async () => {
  // El vendedor suspendido no es publico.
  h.assert(!(await idsPublicos()).includes(h.test.negSusp.id), "suspendido fuera del listado");
  const directo = await h.api(`/api/businesses/${h.test.negSusp.id}`);
  h.assertStatus(directo.status, 404, "URL directa del suspendido -> 404");

  // Renueva (pago verificado del servidor) estando suspendido.
  const compra = await h.api("/api/vendedor/suscripciones", {
    method: "POST",
    token: h.test.susp.token,
    body: { plan_id: 2 },
  });
  h.assertStatus(compra.status, 201, "renovar estando suspendido");

  const { rows } = await h.q(
    "SELECT estado_cuenta FROM usuarios WHERE id = $1",
    [h.test.susp.id]
  );
  h.assert(rows[0].estado_cuenta === "SUSPENDED", "la suspension sobrevive al pago");
  h.assert(!(await idsPublicos()).includes(h.test.negSusp.id), "sigue sin ser publico");

  // Moderacion del negocio: suspendido tampoco se restaura al renovar.
  await aprobar(h.test.adminToken, h.test.negSusp.id, "suspended");
  h.assert(!(await idsPublicos()).includes(h.test.negSusp.id), "negocio suspendido no es publico");

  // Reactivacion administrativa: vuelve a ser publico si tiene derecho.
  const reac = await h.api(`/api/admin/vendedores/${h.test.susp.id}/estado`, {
    method: "PUT",
    token: h.test.adminToken,
    body: { suspendido: false },
  });
  h.assertStatus(reac.status, 200, "reactivar vendedor");
  h.assert(reac.json.data.estado.estado === "ACTIVE", `vuelve ACTIVE (fue ${reac.json.data.estado.estado})`);
  h.assert(!(await idsPublicos()).includes(h.test.negSusp.id), "moderacion 'suspended' sigue bloqueando");
  const { rows: mod } = await h.q(
    "SELECT estado, publicacion_estado FROM businesses WHERE id = $1",
    [h.test.negSusp.id]
  );
  h.assert(mod[0].estado === "suspended", "moderacion intacta (suspended)");
  h.assert(mod[0].publicacion_estado === "visible", "la bandera comercial si se restauro; la moderacion manda");
});

h.test("PUB: el vendedor legado (sin politica) conserva su publicacion", async () => {
  h.assert((await idsPublicos()).includes(h.test.negLegado.id), "negocio legado publico");
  h.assert((await idsPlanesPublicos()).includes(h.test.planLegado.id), "plan legado publico");
  const directo = await h.api(`/api/businesses/${h.test.negLegado.id}`);
  h.assertStatus(directo.status, 200, "URL directa del legado");

  // Conserva acceso comercial: puede crear otro plan.
  const nuevo = await h.api(`/api/businesses/${h.test.negLegado.id}/planes`, {
    method: "POST",
    token: h.test.legado.token,
    body: planPayload("Plan Legado 2"),
  });
  h.assertStatus(nuevo.status, 201, "el legado puede seguir trabajando");
});

// ------------------------------------------------------------
// Inscripciones y panel
// ------------------------------------------------------------
h.test("PUB: un vencido no recibe inscripciones publicas", async () => {
  // Se crea una salida mientras el negocio esta oculto (como dueno) y
  // se verifica que un visitante NO puede inscribirse.
  const hoy = new Date();
  const fecha = new Date(hoy.getTime() + 15 * 86400000).toISOString().slice(0, 10);

  // Para crear la salida el vendedor necesita acceso comercial; el
  // negocio del vendedor vencido tiene suscripcion activa en este
  // punto de la suite, asi que se oculta de nuevo temporalmente.
  await esconderPorVencimiento(h.test.venc.id);

  const salida = await h.api(
    `/api/businesses/${h.test.negVenc.id}/planes/${h.test.planVenc.id}/salidas`,
    { method: "POST", token: h.test.venc.token, body: { fecha, cupo_maximo: 10 } }
  );
  // El vendedor vencido tampoco puede crear salidas (403). Si la salida
  // ya existiera, el visitante tampoco podria inscribirse; se comprueba
  // el rechazo publico de todas formas.
  if (salida.status === 201) {
    const insc = await h.api(
      `/api/businesses/${h.test.negVenc.id}/planes/${h.test.planVenc.id}/salidas/${salida.json.data.id}/inscripciones`,
      { method: "POST", body: { personas: 1 } }
    );
    h.assertStatus(insc.status, 404, "inscripcion publica en plan vencido -> 404");
  } else {
    h.assertStatus(salida.status, 403, "crear salida con cuenta vencida -> 403");
  }

  // Renovar devuelve el acceso.
  await h.api("/api/vendedor/suscripciones", { method: "POST", token: h.test.venc.token, body: { plan_id: 2 } });
});

h.test("PUB: el panel del vendedor sigue disponible con la cuenta vencida", async () => {
  await esconderPorVencimiento(h.test.venc.id);

  const perfil = await h.api("/api/auth/me", { token: h.test.venc.token });
  h.assertStatus(perfil.status, 200, "perfil disponible");

  const estado = await h.api("/api/vendedor/estado", { token: h.test.venc.token });
  h.assertStatus(estado.status, 200, "estado comercial disponible");
  h.assert(estado.json.data.estado === "EXPIRED", `estado EXPIRED (fue ${estado.json.data.estado})`);
  h.assert(typeof estado.json.data.publicacion_oculta === "boolean", "resumen de publicacion disponible");
  h.assert(Number(estado.json.data.negocios_ocultos) >= 1, "informa negocios ocultos");

  const planes = await h.api("/api/vendedor/planes", { token: h.test.venc.token });
  h.assertStatus(planes.status, 200, "catalogo comercial disponible");

  const propio = await h.api(`/api/businesses/${h.test.negVenc.id}`, { token: h.test.venc.token });
  h.assertStatus(propio.status, 200, "el dueno sigue viendo su negocio oculto");

  // Y los datos no se borraron.
  h.assert(propio.json.data.nombre === "Negocio Vencido", "los datos se conservan");
});

// ------------------------------------------------------------
// Seguridad: el cliente no fija fechas ni pagos
// ------------------------------------------------------------
h.test("PUB: el cliente no puede falsificar publicacion, fechas ni pago", async () => {
  // Estado de partida: cuenta y negocio vencidos.
  await esconderPorVencimiento(h.test.venc.id);
  const { rows: antes } = await h.q(
    "SELECT trial_fin, estado_cuenta FROM usuarios WHERE id = $1",
    [h.test.venc.id]
  );

  // 1) El dueno intenta aprobar/ocultar/publicar su negocio por la API.
  const forge = await h.api(`/api/businesses/${h.test.negVenc.id}`, {
    method: "PUT",
    token: h.test.venc.token,
    body: { estado: "approved", publicacion_estado: "visible", trial_fin: "2099-12-31T00:00:00Z" },
  });
  // La cuenta vencida ni siquiera llega a la validacion (403 de acceso
  // comercial). Si estuviera vigente, la validacion de campos daria 400.
  h.assert([400, 403].includes(forge.status), `campos de moderacion/vencimiento rechazados (${forge.status})`);
  const { rows: neg } = await h.q(
    "SELECT estado, publicacion_estado FROM businesses WHERE id = $1",
    [h.test.negVenc.id]
  );
  h.assert(neg[0].estado === "approved", "la moderacion no la fija el cliente");
  h.assert(neg[0].publicacion_estado === "oculto_suscripcion", "la publicacion no la fija el cliente");

  // 2) Intenta fijar fechas/estado de la cuenta por cualquier via.
  const usuarios = await h.api(`/api/usuarios/${h.test.venc.id}`, {
    method: "PUT",
    token: h.test.venc.token,
    body: { estado_cuenta: "ACTIVE", trial_fin: "2099-12-31T00:00:00Z" },
  });
  h.assert(usuarios.status === 403 || usuarios.status === 404, `ruta admin bloqueada (${usuarios.status})`);

  // 3) Webhook sin firma: no activa nada.
  const webhook = await h.api("/api/suscripciones/webhook/mercadopago", {
    method: "POST",
    body: { type: "payment", data: { id: "publicacion-forge" } },
  });
  h.assertStatus(webhook.status, 401, "webhook sin firma -> 401");

  const { rows: despues } = await h.q(
    "SELECT trial_fin, estado_cuenta FROM usuarios WHERE id = $1",
    [h.test.venc.id]
  );
  h.assert(String(antes[0].trial_fin) === String(despues[0].trial_fin), "trial_fin intacto");
  h.assert(antes[0].estado_cuenta === despues[0].estado_cuenta, "estado_cuenta intacto");

  // 4) Con la cuenta VIGENTE (renovada por el flujo del servidor) la
  //    validacion de campos tambien impide fijar moderacion/publicacion.
  await h.api("/api/vendedor/suscripciones", {
    method: "POST", token: h.test.venc.token, body: { plan_id: 2 },
  });
  const forgeActivo = await h.api(`/api/businesses/${h.test.negVenc.id}`, {
    method: "PUT",
    token: h.test.venc.token,
    body: { estado: "pending", publicacion_estado: "visible", owner_id: 999 },
  });
  h.assertStatus(forgeActivo.status, 400, "con cuenta vigente, campos prohibidos -> 400");
  const { rows: negActivo } = await h.q(
    "SELECT estado, owner_id FROM businesses WHERE id = $1",
    [h.test.negVenc.id]
  );
  h.assert(negActivo[0].estado === "approved", "moderacion intacta con cuenta vigente");
  h.assert(negActivo[0].owner_id === h.test.venc.id, "propietario intacto");
});

h.test("PUB: la busqueda publica de destinos excluye negocios vencidos", async () => {
  // El listado de negocios de un destino (usado por la pagina publica)
  // aplica la misma regla en la base de datos.
  await esconderPorVencimiento(h.test.vig.id);
  const r = await h.api("/api/lugares/1/negocios");
  h.assertStatus(r.status, 200, "negocios del destino");
  const ids = (Array.isArray(r.json.data) ? r.json.data : []).map((b) => b.id);
  h.assert(!ids.includes(h.test.negVig.id), "destino excluye al vencido");

  // Se restaura la prueba para no dejar la suite con cuentas vencidas.
  await h.q(
    `UPDATE usuarios SET estado_cuenta = 'TRIALING', trial_fin = NOW() + interval '168 hours',
            updated_at = NOW()
      WHERE id = $1`,
    [h.test.vig.id]
  );
  await SuscripcionModel.sincronizarVencimientosComerciales();
});
