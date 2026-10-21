// ============================================================
// InscripcionController — flujo del turista: mis inscripciones
// (GRATUITAS) y detalle de la inscripcion.
// ------------------------------------------------------------
// REGLA DE NEGOCIO (obligatoria):
//   Los planes turisticos de Cordalia NO tienen pagos. El usuario se
//   INSCRIBE (reserva cupo) sin pagar. El precio es SOLO informativo.
//
//   Por eso este controlador NO expone ningun endpoint de cobro:
//   no hay 'pagar', no hay checkout y no hay webhook de pagos turisticos.
//   El cobro comercial de los VENDEDORES vive en un flujo separado
//   (suscripciones, ver subscriptionController.js).
//
// Seguridad:
//   * IDOR: el usuario solo accede a sus propias inscripciones; los
//     negocios solo a las de su negocio; el admin a todas.
//   * El backend decide el estado de la inscripcion; el frontend NUNCA
//     informa exito por su cuenta.
// ============================================================
const InscripcionModel = require("../models/inscripcionModel");
const PlanModel = require("../models/planModel");
const pool = require("../config/db");

function serverError(res, error, context) {
  console.error(`Error ${context}:`, error);
  return res.status(500).json({ success: false, message: "Error interno del servidor" });
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
    const data = {
      confirmadas: [], // inscripciones gratuitas activas (estado 'confirmada')
      pendientes: [],  // historico: pendiente de pago
      pagadas: [],     // historico: pago confirmado
      vencidas: [],    // historico: viaje ya ocurrido
      historial: [],   // cancelada / expirada
    };
    for (const i of rows) {
      if (i.estado === "confirmada") data.confirmadas.push(i);
      else if (["pendiente", "fallida"].includes(i.estado)) data.pendientes.push(i);
      else if (i.estado === "pagada") data.pagadas.push(i);
      else if (i.estado === "vencida") data.vencidas.push(i);
      else data.historial.push(i); // cancelada / expirada
    }
    return res.json({
      success: true,
      data,
      meta: { pagosTuristicos: false },
    });
  } catch (error) {
    return serverError(res, error, "misInscripciones");
  }
};

// ---------- PUT /api/inscripciones/:id/cancelar ----------
// El TURISTA cancela su propia inscripcion gratuita y libera el cupo.
// Solo el dueño de la inscripcion puede hacerlo (IDOR).
exports.cancelar = async (req, res) => {
  try {
    const inscripcionId = Number(req.params.inscripcionId);
    if (!Number.isInteger(inscripcionId) || inscripcionId <= 0) {
      return res.status(400).json({ success: false, message: "ID de inscripción inválido" });
    }
    const ok = await PlanModel.cancelarInscripcionPropia(inscripcionId, req.usuario.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Inscripción no encontrada" });
    }
    return res.json({
      success: true,
      message: "Inscripción cancelada. Se liberó tu cupo.",
    });
  } catch (error) {
    if (error && error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    return serverError(res, error, "cancelar inscripcion");
  }
};

// ---------- GET /api/inscripciones/:id/comprobante ----------
// Detalle de la inscripcion. En el flujo turistico gratuito se comporta
// como una "constancia de inscripcion"; las inscriptions historicas
// pagadas conservan sus datos de pago historicos (no se borran).
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
