// ============================================================
// SuscripcionController — estado comercial del vendedor, planes
// comerciales y suscripciones mensuales con Mercado Pago.
// ------------------------------------------------------------
// Seguridad:
//   * El importe y el plan los valida SIEMPRE el servidor.
//   * La suscripcion NO se activa por abrir la pagina de pago ni por
//     volver desde Mercado Pago: solo un evento de pago verificado
//     (consulta al proveedor) la activa, de forma idempotente.
//   * El frontend nunca informa el exito del pago.
// ============================================================
const SuscripcionModel = require("../models/suscripcionModel");
const UsuarioModel = require("../models/usuarioModel");
const paymentService = require("../services/paymentService");
const pool = require("../config/db");

function serverError(res, error, context) {
  console.error(`Error ${context}:`, error);
  if (error && error.status) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: "Error interno del servidor" });
}

// ---------- GET /api/planes-comerciales (PÚBLICO) ----------
// Catálogo de planes comerciales: nombre, precio y beneficios.
//
// Es información de marketing (no datos de ningún usuario), por lo que es
// PÚBLICO: la página de registro debe poder mostrar el precio REAL que
// cobra el sistema (tabla `plans`), no un valor escrito a mano en el
// frontend. El panel del vendedor usa su propia ruta autenticada
// (/api/vendedor/planes) para lo mismo.
exports.planesPublicos = async (req, res) => {
  try {
    const planes = await SuscripcionModel.listPlanesComerciales({ soloActivos: true });
    return res.json({
      success: true,
      data: planes.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: Number(p.precio),
        moneda: p.moneda,
        meses: p.meses,
        features: p.features || [],
      })),
    });
  } catch (error) {
    return serverError(res, error, "planes publicos");
  }
};

// ---------- GET /api/vendedor/estado ----------
// Estado comercial del vendedor: prueba, dias restantes, plan actual,
// vigencia e historial de pagos. Disponible SIEMPRE (tambien con la
// prueba vencida): el vendedor necesita verlo para contratar.
exports.estado = async (req, res) => {
  try {
    // Vencimiento perezoso: una suscripcion cuya vigencia paso queda
    // expirada aunque el vendedor no haya entrado nunca mas.
    await SuscripcionModel.expirarSuscripcionesVencidas();

    const est = await SuscripcionModel.estadoComercial(req.usuario.id);
    if (!est) return res.status(404).json({ success: false, message: "Usuario no encontrado" });

    const suscripciones = await SuscripcionModel.listSuscripciones(req.usuario.id);
    const pagos = await SuscripcionModel.listPagos(req.usuario.id);

    let planActual = null;
    if (est.plan_activo_id) {
      planActual = await SuscripcionModel.findPlanComercial(est.plan_activo_id);
    }

    return res.json({
      success: true,
      data: {
        ...est,
        plan_actual: planActual,
        suscripciones,
        pagos,
        proveedor: paymentService.estadoProveedor(),
      },
    });
  } catch (error) {
    return serverError(res, error, "estado comercial vendedor");
  }
};

// ---------- GET /api/vendedor/planes ----------
// Planes comerciales disponibles (publico: el vendedor ve el catalogo
// incluso con la prueba vencida, para poder contratar).
exports.planes = async (req, res) => {
  try {
    const planes = await SuscripcionModel.listPlanesComerciales({ soloActivos: true });
    return res.json({ success: true, data: planes });
  } catch (error) {
    return serverError(res, error, "listar planes comerciales");
  }
};

// ---------- POST /api/vendedor/suscripciones ----------
// El vendedor contrata un plan mensual. Crea la operacion de pago y la
// suscripcion en estado 'pending'. NO la activa.
exports.contratar = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const planId = Number(req.body?.plan_id);
    if (!Number.isInteger(planId) || planId <= 0) {
      return res.status(400).json({ success: false, message: "Plan inválido" });
    }

    // El plan se busca en el servidor: el cliente no puede inventarlo.
    const plan = await SuscripcionModel.findPlanComercial(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan comercial no encontrado" });
    }
    if (!plan.activo) {
      return res.status(400).json({ success: false, message: "El plan no está disponible" });
    }

    // El importe lo fija el servidor (plan.precio). Cualquier monto
    // enviado por el navegador se ignora.
    const monto = Math.round(Number(plan.precio) || 0);
    if (monto <= 0) {
      return res.status(400).json({ success: false, message: "El plan no tiene un importe válido" });
    }

    const usuario = await UsuarioModel.findById(usuarioId);
    const referencia = paymentService.generarReferencia("CORD-SUB");

    const pago = await paymentService.crearPago({
      planId,
      nombrePlan: plan.nombre,
      monto,
      referencia,
      usuarioEmail: usuario?.email || null,
      idUsuario: usuarioId,
    });

    const idempotencyKey = `sub:${usuarioId}:${referencia}`;

    if (pago.estado === paymentService.ESTADOS_PROVEEDOR.REJECTED) {
      // Sandbox con PAYMENT_MOCK_FAIL=1: se registra el rechazo.
      return res.status(402).json({
        success: false,
        message: "El pago fue rechazado. Intenta de nuevo.",
        data: { estado: "rejected" },
      });
    }

    const suscripcion = await SuscripcionModel.crearSuscripcion({
      usuarioId,
      planId,
      proveedor: pago.proveedor,
      // Referencia INTERNA (la que viaja como external_reference y la
      // que el proveedor devuelve al notificar). El id del proveedor
      // (p. ej. la preferencia de Mercado Pago) va aparte, en pago_id.
      referenciaExterna: referencia,
      pagoId: pago.externo || null,
      monto,
      moneda: pago.moneda,
      idempotencyKey,
      payload: { sandbox: pago.sandbox, url: pago.url, externo: pago.externo || null },
    });

    await SuscripcionModel.registrarPago({
      suscripcionId: suscripcion.id,
      usuarioId,
      planId,
      proveedor: pago.proveedor,
      evento: "creacion",
      estado: "pending",
      referenciaExterna: referencia,
      pagoId: pago.externo || null,
      monto,
      moneda: pago.moneda,
      idempotencyKey,
      payload: { sandbox: pago.sandbox },
    });

    // En modo sandbox el pago se aprueba en servidor (no hay checkout).
    if (pago.sandbox && pago.estado === paymentService.ESTADOS_PROVEEDOR.APPROVED) {
      const activacion = await SuscripcionModel.activarSuscripcion(suscripcion.id, {
        idempotencyKey,
        payload: { sandbox: true },
      });
      return res.status(201).json({
        success: true,
        message: "Pago aprobado (modo simulación). Tu plan quedó activo.",
        data: { suscripcion: activacion.suscripcion, sandbox: true },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Redirige al checkout del proveedor para completar el pago.",
      data: {
        suscripcion,
        url: pago.url,
        sandbox: false,
        // La activacion ocurre con la notificacion del proveedor, NO al volver.
        pendienteDePago: true,
      },
    });
  } catch (error) {
    return serverError(res, error, "contratar plan");
  }
};

// ---------- POST /api/vendedor/suscripciones/:id/cancelar ----------
exports.cancelar = async (req, res) => {
  try {
    const suscripcionId = Number(req.params.suscripcionId);
    if (!Number.isInteger(suscripcionId) || suscripcionId <= 0) {
      return res.status(400).json({ success: false, message: "ID de suscripción inválido" });
    }
    const sub = await SuscripcionModel.findSuscripcion(suscripcionId);
    if (!sub) return res.status(404).json({ success: false, message: "Suscripción no encontrada" });
    if (sub.usuario_id !== req.usuario.id && req.usuario.rol !== "ADMIN") {
      return res.status(403).json({ success: false, message: "No es tu suscripción" });
    }
    const cancelada = await SuscripcionModel.cancelarSuscripcion(sub.usuario_id);
    return res.json({
      success: true,
      message: "Suscripción cancelada",
      data: cancelada,
    });
  } catch (error) {
    return serverError(res, error, "cancelar suscripcion");
  }
};

// ---------- POST /api/suscripciones/webhook/mercadopago ----------
// Notificacion del proveedor. Solo un evento VERIFICADO activa la
// suscripcion. Es idempotente: puede llegar repetida o desordenada.
exports.webhookMercadopago = async (req, res) => {
  try {
    // 1) Verificacion de la FIRMA. Se hace PRIMERO, siempre, incluso en
    // modo simulado: una peticion sin firma valida no se procesa de
    // ninguna manera (fail closed). Un webhook arbitrario no puede
    // activar suscripciones.
    const bodyRaw = typeof req.rawBody === "string" ? req.rawBody : JSON.stringify(req.body || {});
    const firma = paymentService.validarFirmaWebhook({
      headers: req.headers,
      bodyRaw,
      query: req.query || {},
    });
    if (!firma.valido) {
      console.error(`[webhook mp] firma rechazada: ${firma.motivo}`);
      return res.status(401).json({ success: false, message: "Firma inválida" });
    }

    if (paymentService.PROVEEDOR !== "mercadopago") {
      // En sandbox no hay pagos reales que confirmar: se acusa recibo.
      return res.status(200).json({
        success: true,
        accepted: false,
        message: `Proveedor ${paymentService.PROVEEDOR} activo: la webhook no procesa pagos.`,
      });
    }

    // 2) Datos del evento.
    const data = (req.body && req.body.data) || {};
    const id = data.id || (req.query && req.query["data.id"]) || null;
    if (!id) {
      return res.status(400).json({ success: false, message: "Notificación sin id de pago" });
    }

    // 3) Consulta al proveedor: el cuerpo NO es fuente de verdad.
    const verificado = await paymentService.verificarPago({ externo: id, pago_id: id });
    if (!verificado.confirmado) {
      return res.status(200).json({
        success: true,
        accepted: false,
        message: "El pago no está aprobado",
        data: { estado: verificado.estado },
      });
    }

    // 4) Localizar la suscripcion. Se busca por la referencia interna
    //    (external_reference) y, como alternativa, por el identificador
    //    del proveedor (pago_id): segun como el proveedor notifique, el
    //    dato puede venir en uno u otro campo.
    const referenciaInterna = verificado.referencia;
    const idProveedor = verificado.pago_id || id;
    const { rows: subs } = await pool.query(
      `SELECT id, usuario_id, plan_id, monto, moneda FROM subscriptions
        WHERE referencia_externa = $1 OR pago_id = $2
        ORDER BY id DESC LIMIT 1`,
      [referenciaInterna, idProveedor]
    );
    if (subs.length === 0) {
      console.error("[webhook mp] suscripción no encontrada para la referencia notificada");
      return res.status(404).json({ success: false, message: "Suscripción no encontrada" });
    }
    const sub = subs[0];

    // 4.b) El importe y la moneda deben coincidir con lo contratado.
    //      Aunque la preferencia la crea el servidor, esta comprobacion
    //      impide activar un plan de 49.000 COP con un pago de otro
    //      importe o de otra moneda (por ejemplo, una preferencia
    //      manipulada o un pago ajeno con la misma referencia).
    const montoEsperado = Number(sub.monto);
    const montoRecibido = Number(verificado.monto);
    if (
      Number.isFinite(montoEsperado) &&
      montoEsperado > 0 &&
      (!Number.isFinite(montoRecibido) || Math.abs(montoRecibido - montoEsperado) > 1)
    ) {
      console.error("[webhook mp] el importe pagado no coincide con la suscripción");
      return res.status(400).json({
        success: false,
        message: "El importe del pago no corresponde a la suscripción",
      });
    }
    if (verificado.moneda && sub.moneda && String(verificado.moneda) !== String(sub.moneda)) {
      console.error("[webhook mp] la moneda pagada no coincide con la suscripción");
      return res.status(400).json({
        success: false,
        message: "La moneda del pago no corresponde a la suscripción",
      });
    }

    // 5) Idempotencia: la clave de idempotencia es el id del evento.
    const idempotencyKey = `mp:${id}`;
    const registro = await SuscripcionModel.registrarPago({
      suscripcionId: sub.id,
      usuarioId: sub.usuario_id,
      planId: sub.plan_id,
      proveedor: "mercadopago",
      evento: "payment",
      estado: "approved",
      referenciaExterna: referenciaInterna,
      pagoId: verificado.pago_id || id,
      monto: verificado.monto ?? null,
      moneda: verificado.moneda || sub.moneda || "COP",
      idempotencyKey,
      payload: verificado.datos || null,
    });
    if (registro.duplicado) {
      // Evento repetido: ya se habia procesado.
      return res.status(200).json({ success: true, accepted: true, duplicate: true });
    }

    // 6) Activar (idempotente).
    const activacion = await SuscripcionModel.activarSuscripcion(sub.id, {
      pagoId: verificado.pago_id || id,
      idempotencyKey,
      payload: verificado.datos || null,
    });

    return res.json({
      success: true,
      accepted: true,
      data: { suscripcion: activacion.suscripcion, yaActiva: activacion.yaActiva },
    });
  } catch (error) {
    console.error("[webhook mp] error:", error && error.message);
    return res.status(500).json({ success: false, message: "Error procesando la notificación" });
  }
};
