// ============================================================
// PaymentService — proveedor de pagos de las SUSCRIPCIONES
// COMERCIALES de los vendedores (Cordalia).
// ------------------------------------------------------------
// Este servicio NO toca los planes turisticos: en Cordalia las
// inscripciones a planes turisticos son GRATUITAS (ver
// planModel.createInscripcion). Aqui solo se cobra el PLAN COMERCIAL
// mensual del vendedor.
//
// Proveedores soportados:
//   * 'mock'          (DEFAULT) Sandbox local sin credenciales: el
//                     backend simula el pago. NUNCA activa una
//                     suscripcion real fuera de este modo.
//   * 'mercadopago'   Integracion real con el SDK oficial.
//
// REGLAS (Parte 5 del requerimiento):
//   - El importe y el plan SIEMPRE los valida el servidor: el
//     navegador nunca fija el precio.
//   - No se guardan datos de tarjeta.
//   - No se activa una suscripcion por el hecho de abrir la pagina de
//     pago ni por volver desde Mercado Pago: solo un evento de pago
//     VERIFICADO (consulta al proveedor) la activa.
//   - La activacion es idempotente.
// ============================================================

const crypto = require("crypto");

const PROVEEDOR = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();

const ESTADOS_PROVEEDOR = {
  APPROVED: "approved", // pago confirmado por el proveedor
  REJECTED: "rejected", // pago rechazado
  IN_PROCESS: "in_process", // pago en proceso (no confirmado)
};

const MONEDA = "COP";

/**
 * El modo simulado ('mock') es SOLO de desarrollo. En produccion debe
 * usarse un proveedor real: el mock no mueve dinero y no puede (no debe)
 * habilitar suscripciones de pago.
 */
function esProduccion() {
  return (process.env.NODE_ENV || "development") === "production";
}

/**
 * Genera una referencia de transaccion unica y legible.
 */
function generarReferencia(prefix = "CORD") {
  const stamp = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

/**
 * Devuelve el proveedor configurado y si la integracion real esta lista.
 */
function estadoProveedor() {
  const esMp = PROVEEDOR === "mercadopago";
  return {
    proveedor: PROVEEDOR,
    real: esMp,
    credencialesConfiguradas: esMp
      ? Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN)
      : false,
    sandbox: PROVEEDOR === "mock",
    // En produccion el modo simulado queda bloqueado: no habilita cobros.
    bloqueadoEnProduccion: PROVEEDOR === "mock" && esProduccion(),
    pagosTuristicos: false, // los planes turisticos no tienen pagos
  };
}

// ------------------------------------------------------------
// Mercado Pago: cliente perezoso (solo si hay credenciales)
// ------------------------------------------------------------
let mpClient = null;
let mpClases = null;
let mpConfigurado = null;

function configMp() {
  if (mpConfigurado !== null) return mpConfigurado;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  mpConfigurado = Boolean(accessToken);
  if (mpConfigurado) {
    // El SDK oficial no se carga si no hay token (modo sandbox).
    // MercadoPagoConfig es el cliente HTTP; Preference y Payment son
    // los recursos. No se deben mezclar (el SDK v3 no expone
    // `preferences` dentro de Payment).
    const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
    mpClient = new MercadoPagoConfig({ accessToken });
    mpClases = { Preference, Payment };
  }
  return mpConfigurado;
}

function backendUrl(ruta) {
  const base = (process.env.APP_URL || process.env.BACKEND_URL || "").replace(/\/+$/, "");
  return base ? `${base}${ruta}` : null;
}

function frontendUrl(ruta) {
  const base = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
  return base ? `${base}${ruta}` : null;
}

/**
 * Crea el pago del plan comercial (un mes).
 *
 * En modo 'mock' devuelve una operacion APROBADA simulada por el
 * backend (sandbox). En modo 'mercadopago' crea una PREFERENCIA de
 * Checkout Pro (un pago por el periodo mensual). No se usa la API de
 * suscripciones recurrentes porque el requisito es cobrar UN mes por
 * vez: la renovacion es una nueva compra, no un cargo automatico.
 *
 * @param {object} args
 * @param {number} args.planId      - id del plan comercial (servidor).
 * @param {string} args.nombrePlan  - nombre del plan.
 * @param {number} args.monto       - importe en COP (viene del servidor).
 * @param {string} args.referencia  - referencia interna de la operacion.
 * @param {string} args.usuarioEmail - email del vendedor (para la preferencia).
 * @returns {Promise<{proveedor, referencia, estado, monto, moneda, url, sandbox}>}
 */
async function crearPago({ planId, nombrePlan, monto, referencia, usuarioEmail, idUsuario }) {
  const valor = Math.round(Number(monto) || 0);
  if (valor <= 0) {
    throw Object.assign(new Error("El plan no tiene un importe válido"), { status: 500 });
  }

  if (PROVEEDOR === "mercadopago") {
    if (!configMp()) {
      throw Object.assign(new Error("Mercado Pago no está configurado en el servidor"), {
        status: 503,
        code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
      });
    }
    const cuerpo = {
      items: [
        {
          id: String(planId),
          title: nombrePlan,
          description: `Membresía mensual - ${nombrePlan}`,
          quantity: 1,
          currency_id: MONEDA,
          unit_price: valor,
        },
      ],
      // Identificador externo: permite reconciliar la preferencia con
      // la suscripcion creada en nuestra base de datos.
      external_reference: referencia,
      back_urls: {
        success: frontendUrl("/panel-vendedor?pago=aprobado") || undefined,
        pending: frontendUrl("/panel-vendedor?pago=pendiente") || undefined,
        failure: frontendUrl("/panel-vendedor?pago=rechazado") || undefined,
      },
      auto_return: "approved",
      notification_url: backendUrl("/api/suscripciones/webhook/mercadopago") || undefined,
      metadata: { usuario_id: String(idUsuario || ""), plan_id: String(planId) },
    };
    if (!cuerpo.notification_url) delete cuerpo.notification_url;
    if (!cuerpo.back_urls.success) delete cuerpo.back_urls;

    const preference = await new mpClases.Preference(mpClient).create({ body: cuerpo });
    return {
      proveedor: "mercadopago",
      referencia,
      estado: ESTADOS_PROVEEDOR.IN_PROCESS, // solo el webhook/consulta confirma
      monto: valor,
      moneda: MONEDA,
      url: preference.init_point || preference.sandbox_init_point || null,
      sandbox: false,
      externo: preference.id,
    };
  }

  // Modo sandbox: el backend decide (simula al proveedor confirmando).
  //
  // SEGURIDAD: el modo simulado NUNCA debe habilitar una suscripcion
  // real. Por eso, en PRODUCCION el proveedor 'mock' queda bloqueado:
  // si alguien dejara PAYMENT_PROVIDER=mock por error, ningun vendedor
  // obtendria acceso comercial de pago. Para cobrar de verdad hay que
  // configurar PAYMENT_PROVIDER=mercadopago con sus credenciales.
  if (esProduccion()) {
    throw Object.assign(
      new Error(
        "El proveedor de pagos no está configurado en producción (PAYMENT_PROVIDER=mock). " +
          "Configura PAYMENT_PROVIDER=mercadopago con MERCADOPAGO_ACCESS_TOKEN para cobrar de verdad."
      ),
      { status: 503, code: "PAYMENT_PROVIDER_NOT_CONFIGURED" }
    );
  }

  const failTest = process.env.PAYMENT_MOCK_FAIL === "1";
  return {
    proveedor: "mock",
    referencia,
    estado: failTest ? ESTADOS_PROVEEDOR.REJECTED : ESTADOS_PROVEEDOR.APPROVED,
    monto: valor,
    moneda: MONEDA,
    url: null,
    sandbox: true,
    externo: referencia,
  };
}

/**
 * Consulta al proveedor el estado REAL de un pago.
 *
 * Es la pieza que usa la webhook: nunca se confía en el cuerpo que
 * envia el proveedor, se pregunta a la API.
 *
 * @param {object} pago - { proveedor, referencia, externo }
 * @returns {Promise<{confirmado, estado, referencia, monto, datos}>}
 */
async function verificarPago(pago = {}) {
  if (PROVEEDOR === "mercadopago") {
    if (!configMp()) {
      throw Object.assign(new Error("Mercado Pago no está configurado en el servidor"), {
        status: 503,
        code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
      });
    }
    const id = pago.externo || pago.pago_id;
    if (!id) {
      return { confirmado: false, estado: ESTADOS_PROVEEDOR.IN_PROCESS, referencia: pago.referencia || null };
    }
    const respuesta = await new mpClases.Payment(mpClient).get({ id: String(id) });
    const data = respuesta && respuesta.response ? respuesta.response : respuesta;
    const estado = data && data.status ? String(data.status) : null;
    const monto = data && data.transaction_amount ? Number(data.transaction_amount) : null;
    return {
      confirmado: estado === "approved",
      estado: estado === "approved" ? ESTADOS_PROVEEDOR.APPROVED : estado,
      referencia: (data && data.external_reference) || pago.referencia || null,
      pago_id: data && data.id ? String(data.id) : String(id),
      monto,
      moneda: (data && data.currency_id) || null,
      datos: data || null,
    };
  }

  const confirmado = pago.estado === ESTADOS_PROVEEDOR.APPROVED;
  return {
    confirmado,
    estado: pago.estado || ESTADOS_PROVEEDOR.IN_PROCESS,
    referencia: pago.referencia || null,
    pago_id: pago.pago_id || null,
    monto: pago.monto ?? null,
    datos: null,
  };
}

/**
 * Valida la FIRMA de la webhook de Mercado Pago.
 *
 * La documentacion oficial define la firma como `ts=<segundos>,v1=<hmac>`
 * y el HMAC SHA-256 se calcula sobre el manifiesto:
 *
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *
 * (los pares sin valor se omiten). NO se firma el cuerpo completo.
 * Se usa el validador oficial del SDK para no desviarse del algoritmo.
 *
 * Si el secreto no esta configurado, la validacion no puede realizarse:
 * la webhook NO procesa pagos (fail closed). Ademas se exige que el
 * timestamp este dentro de una ventana de 5 minutos para evitar replay.
 *
 * @returns {{valido: boolean, motivo?: string}}
 */
function validarFirmaWebhook({ headers = {}, bodyRaw = "", query = {} } = {}) {
  // `bodyRaw` se conserva en la firma por compatibilidad con el
  // controlador, pero NO forma parte del manifiesto oficial.
  void bodyRaw;

  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secreto) {
    return { valido: false, motivo: "Webhook sin secreto configurado (MERCADOPAGO_WEBHOOK_SECRET)" };
  }

  const xSignature = headers["x-signature"];
  if (!xSignature) return { valido: false, motivo: "Falta la cabecera x-signature" };

  const dataId = query["data.id"] || query?.data?.id || "";
  const xRequestId = headers["x-request-id"] || "";

  try {
    const { WebhookSignatureValidator } = require("mercadopago");
    WebhookSignatureValidator.validate({
      xSignature: String(xSignature),
      xRequestId: String(xRequestId),
      dataId: String(dataId),
      secret: secreto,
      toleranceSeconds: 5 * 60,
    });
    return { valido: true };
  } catch (error) {
    return {
      valido: false,
      motivo: error && (error.reason || error.message)
        ? String(error.reason || error.message)
        : "Firma inválida",
    };
  }
}

module.exports = {
  PROVEEDOR,
  ESTADOS_PROVEEDOR,
  MONEDA,
  crearPago,
  verificarPago,
  validarFirmaWebhook,
  generarReferencia,
  estadoProveedor,
};
