// ============================================================
// InscripcionController — flujo del turista: mis inscripciones,
// pago (backend autoriza) y comprobante. Incluye la webhook del
// proveedor (stub seguro mientras el proveedor es 'mock').
// ------------------------------------------------------------
// Seguridad (Parte 14):
//   * El backend decide si el pago fue aprobado (modo 'mock' lo
//     aprueba en servidor; un proveedor real via SDK/webhook).
//   * El frontend NUNCA informa exito: los flags del cliente
//     (paymentSuccess...) se ignoran por completo.
//   * IDOR: el usuario solo accede a sus inscripciones; los
//     negocios solo a las de su negocio; el admin a todas.
// ============================================================
const InscripcionModel = require("../models/inscripcionModel");
const PlanModel = require("../models/planModel");
const paymentService = require("../services/paymentService");
const pool = require("../config/db");

const METODOS_PERMITIDOS = ["nequi", "daviplata", "bancolombia", "pse", "tarjeta", "efectivo", "simulado"];

function serverError(res, error, context) {
  console.error(`Error ${context}:`, error);
  return res.status(500).json({ success: false, message: "Error interno del servidor" });
}

function validarMetodoPago(val) {
  const m = String(val || "simulado").toLowerCase().trim();
  if (!METODOS_PERMITIDOS.includes(m)) return null;
  return m;
}

// ¿El usuario BUSINESS es dueño del negocio al que pertenece la inscripción?
async function esDuenoDelNegocio(userId, inscripcion) {
  const { rows } = await pool.query(
    `SELECT id FROM businesses WHERE owner_id = $1 AND id = $2 LIMIT 1`,
    [userId, inscripcion.business_id]
  );
  return rows.length > 0;
}

// ---------- GET /api/mis-inscripciones ----------
exports.misInscripciones = async (req, res) => {
  try {
    await InscripcionModel.expirarVencidas();
    const rows = await InscripcionModel.listMisInscripciones(req.usuario.id);
    const data = { pendientes: [], pagadas: [], vencidas: [], historial: [] };
    for (const i of rows) {
      if (["pendiente", "fallida"].includes(i.estado)) data.pendientes.push(i);
      else if (i.estado === "pagada") data.pagadas.push(i);
      else if (i.estado === "vencida") data.vencidas.push(i);
      else data.historial.push(i); // cancelada / expirada
    }
    return res.json({
      success: true,
      data,
      meta: { proveedor: paymentService.estadoProveedor() },
    });
  } catch (error) {
    return serverError(res, error, "misInscripciones");
  }
};

// ---------- GET /api/inscripciones/:id/comprobante ----------
exports.comprobante = async (req, res) => {
  try {
    const inscripcionId = Number(req.params.inscripcionId);
    if (!Number.isInteger(inscripcionId) || inscripcionId <= 0) {
      return res.status(400).json({ success: false, message: "ID de inscripción inválido" });
    }

    const inscripcion = await InscripcionModel.findById(inscripcionId);
    if (!inscripcion) {
      return res.status(404).json({ success: false, message: "Inscripción no encontrada" });
    }

    // IDOR: dueño de la inscripción, admin o negocio al que pertenece.
    const esAdmin = req.usuario.rol === "ADMIN";
    const esDueno = inscripcion.user_id !== null && inscripcion.user_id === req.usuario.id;
    const esNegocio = req.usuario.rol === "BUSINESS" && (await esDuenoDelNegocio(req.usuario.id, inscripcion));
    if (!esAdmin && !esDueno && !esNegocio) {
      return res.status(403).json({ success: false, message: "No tienes acceso a esta inscripción" });
    }

    return res.json({ success: true, data: inscripcion });
  } catch (error) {
    return serverError(res, error, "comprobante inscripcion");
  }
};

// ---------- POST /api/inscripciones/:id/pagar ----------
exports.pagar = async (req, res) => {
  try {
    const inscripcionId = Number(req.params.inscripcionId);
    if (!Number.isInteger(inscripcionId) || inscripcionId <= 0) {
      return res.status(400).json({ success: false, message: "ID de inscripción inválido" });
    }

    // El backend expira vencidas antes de intentar pagar.
    await InscripcionModel.expirarVencidas();

    let inscripcion = await InscripcionModel.findById(inscripcionId);
    if (!inscripcion) {
      return res.status(404).json({ success: false, message: "Inscripción no encontrada" });
    }

    // IDOR: solo el dueño de la inscripción (o admin) puede pagarla.
    const esAdmin = req.usuario.rol === "ADMIN";
    const esDueno = inscripcion.user_id !== null && inscripcion.user_id === req.usuario.id;
    if (!esAdmin && !esDueno) {
      return res.status(403).json({ success: false, message: "No puedes pagar una inscripción que no es tuya" });
    }

    if (inscripcion.estado === "pagada") {
      return res.status(400).json({ success: false, message: "La inscripción ya está pagada" });
    }
    if (["cancelada", "expirada", "vencida"].includes(inscripcion.estado)) {
      return res.status(400).json({ success: false, message: `No se puede pagar una inscripción ${inscripcion.estado}` });
    }

    const metodoPago = validarMetodoPago(req.body?.metodo_pago);
    if (!metodoPago) {
      return res.status(400).json({ success: false, message: "Método de pago inválido (elija nequi, daviplata, pse, tarjeta...)" });
    }

    // El pago lo crea y aprueba el BACKEND; los flags del cliente se ignoran.
    // El precio se recalcula AHORA (calcularPrecio usa solo promociones
    // vigentes según CURRENT_DATE en PostgreSQL): si la promoción venció,
    // el snapshot se actualiza al precio normal antes de cobrar.
    const precioVigente = await PlanModel.calcularPrecio(inscripcion.plan_id, inscripcion.personas, false);
    if (precioVigente && Number(precioVigente.total) !== Number(inscripcion.precio_total)) {
      await InscripcionModel.actualizarSnapshotPrecio(inscripcionId, precioVigente);
      inscripcion = await InscripcionModel.findById(inscripcionId);
    }

    const pago = await paymentService.crearPago({ inscripcion, metodoPago });

    if (pago.estado !== paymentService.ESTADOS_PROVEEDOR.APPROVED) {
      await InscripcionModel.marcarFallida(inscripcionId, {
        proveedor: pago.proveedor,
        referencia: pago.referencia,
        metodo: pago.metodo,
        payload: { monto: pago.monto, motivo: pago.motivo || "rechazado" },
      });
      return res.status(402).json({
        success: false,
        message: "El pago fue rechazado. Puedes intentarlo de nuevo.",
        data: { estado: "fallida" },
      });
    }

    const actualizada = await InscripcionModel.marcarPagada(inscripcionId, {
      proveedor: pago.proveedor,
      referencia: pago.referencia,
      metodo: pago.metodo,
      payload: { monto: pago.monto, aprobado_por: "backend" },
    });

    return res.json({
      success: true,
      message: "Pago confirmado: bienvenido a la aventura",
      data: {
        inscripcion: actualizada,
        pago: {
          proveedor: pago.proveedor,
          referencia: pago.referencia,
          metodo: pago.metodo,
          monto: pago.monto,
          moneda: "COP",
        },
      },
    });
  } catch (error) {
    if (error && error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    return serverError(res, error, "pagar inscripcion");
  }
};

// ---------- POST /api/pagos/webhook/mercadopago ----------
// Webhook del proveedor (producción). En sandbox ('mock') se acusa recibo
// sin procesar: no hay pagos reales que confirmar.
exports.webhookMercadopago = async (req, res) => {
  try {
    if (paymentService.PROVEEDOR !== "mercadopago") {
      return res.status(200).json({
        success: true,
        accepted: false,
        message: `Proveedor ${paymentService.PROVEEDOR} activo: webhook no procesa pagos.`,
      });
    }
    // TODO (Parte 14, cuando haya credenciales): verificar firma/tipo,
    // consultar verificarPago() y llamar InscripcionModel.marcarPagada.
    return res.status(501).json({ success: false, message: "Webhook MercadoPago aún no habilitado" });
  } catch (error) {
    return serverError(res, error, "webhook pos");
  }
};

// ---------- GET /api/pagos/estado (público) ----------
exports.estadoPagos = (req, res) => {
  return res.json({ success: true, data: paymentService.estadoProveedor() });
};