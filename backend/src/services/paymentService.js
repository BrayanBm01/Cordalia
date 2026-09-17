// ============================================================
// PaymentService — abstracción del proveedor de pagos (Cordalia)
// ------------------------------------------------------------
// Proveedores soportados:
//   * 'mock'          (DEFAULT) Simula al proveedor APROBANDO el pago
//                     de forma 100% controlada por el backend. No existen
//                     credenciales, no hay datos sensibles de tarjeta y
//                     el frontend JAMAS informa el exito: el backend es
//                     la autoridad sobre el estado del pago.
//   * 'mercadopago'   Integración real pendiente de credenciales.
//                     No se hardcodean claves: se leen de variables de
//                     entorno (MERCADOPAGO_*). Al configurarlas, solo hay
//                     que implementar crearPago()/verificarPago() y
//                     activar la webhook.
//
// IMPORTANTE (Parte 14):
//   - Nunca almacenar datos sensibles de tarjeta.
//   - Nunca confiar en flags del cliente ("paymentSuccess=true").
//   - El backend verifica/decide el estado del pago.
// ============================================================

const crypto = require("crypto");

const PROVEEDOR = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();

// Minutos que un usuario tiene para pagar antes de que la inscripcion
// PENDIENTE -> EXPIRADA (controlado por backend, ver migracion 014).
const EXPIRACION_MINUTOS = Number(process.env.PAYMENT_EXPIRATION_MINUTES) || 1440;

const ESTADOS_PROVEEDOR = {
  APPROVED: "approved", // pago confirmado
  REJECTED: "rejected", // pago rechazado por el proveedor
  IN_PROCESS: "in_process", // pago en proceso (no confirmado)
};

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
 * Devuelve el proveedor configurado y si la integracion real
 * esta lista (tiene credenciales).
 */
function estadoProveedor() {
  const lista = PROVEEDOR === "mercadopago";
  return {
    proveedor: PROVEEDOR,
    real: PROVEEDOR === "mercadopago",
    credencialesConfiguradas: lista
      ? Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_PUBLIC_KEY)
      : false,
    sandbox: PROVEEDOR === "mock",
  };
}

/**
 * Crea el pago para una inscripcion.
 *
 * En modo 'mock' devuelve inmediatamente un pago APROBADO (simula al
 * proveedor confirmando). En modo 'mercadopago' crearia la preferencia de
 * checkout y devolveria la URL de redireccion (pendiente de credenciales).
 *
 * @param {object} inscripcion - inscripcion con id, precio_total, personas.
 * @param {string} metodoPago  - nequi | daviplata | pse | tarjeta | (libre)
 * @returns {Promise<{proveedor, referencia, estado, metodo, url?}>}
 */
async function crearPago({ inscripcion, metodoPago }) {
  const metodo = String(metodoPago || "simulado").slice(0, 60);
  const monto = Math.round(Number(inscripcion?.precio_total) || 0);

  if (PROVEEDOR === "mercadopago") {
    // Integración real: al tener MERCADOPAGO_* se crea aqui la preferencia
    // con el SDK (mercadopago) y se devuelve { url, referencia }.
    throw Object.assign(new Error("Pagos reales no configurados aún"), {
      status: 503,
      code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
    });
  }

  // Modo sandbox: el backend decide aprobar el pago (simulacion).
  // Para pruebas se puede forzar un rechazo controlado.
  const failTest = process.env.PAYMENT_MOCK_FAIL === "1";
  return {
    proveedor: "mock",
    referencia: generarReferencia("CORD-MOCK"),
    estado: failTest ? ESTADOS_PROVEEDOR.REJECTED : ESTADOS_PROVEEDOR.APPROVED,
    metodo,
    monto,
    url: null, // en modo real apuntaria al checkout del proveedor
  };
}

/**
 * Verifica/confirma con el proveedor que un pago fue aprobado.
 * Es la pieza que usa la webhook en produccion (verificarPago real del SDK).
 *
 * En modo 'mock' confirma el resultado simulado de crearPago().
 *
 * @param {object} pago - { proveedor, referencia, estado, payload }
 * @returns {Promise<{confirmado, proveedor, referencia}>}
 */
async function verificarPago(pago = {}) {
  if (PROVEEDOR === "mercadopago") {
    // Pendiente: consultar el pago en el SDK por referencia/payment_id.
    throw Object.assign(new Error("Pagos reales no configurados aún"), {
      status: 503,
      code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
    });
  }
  const confirmado = pago.estado === ESTADOS_PROVEEDOR.APPROVED;
  return {
    confirmado,
    proveedor: pago.proveedor || "mock",
    referencia: pago.referencia || null,
  };
}

module.exports = {
  PROVEEDOR,
  EXPIRACION_MINUTOS,
  ESTADOS_PROVEEDOR,
  crearPago,
  verificarPago,
  generarReferencia,
  estadoProveedor,
};