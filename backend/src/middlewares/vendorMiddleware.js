// ============================================================
// vendorMiddleware — control de acceso COMERCIAL del vendedor
// ------------------------------------------------------------
// Regla de negocio (requerimiento, parte 4):
//   * Durante la prueba gratuita de 7 dias el vendedor puede usar las
//     funcionalidades comerciales.
//   * Al vencer la prueba, las funcionalidades comerciales RESTRINGIDAS
//     quedan bloqueadas EN EL BACKEND (no solo escondiendo botones).
//   * El vendedor CONSERVA acceso a: inicio de sesion, su perfil, la
//     informacion de facturacion y la pantalla de contratacion o
//     renovacion. Sus datos NO se borran ni se desactivan.
//
// La decision se toma con el estado calculado en el SERVIDOR
// (SuscripcionModel.estadoComercial), no con lo que envíe el cliente.
// ============================================================
const SuscripcionModel = require("../models/suscripcionModel");

const MENSAJE_PRUEBA_VENCIDA =
  "Tu prueba gratuita de 7 días terminó. Contrata un plan para recuperar las funcionalidades comerciales.";

const MENSAJE_SUSPENDIDO =
  "Tu cuenta está suspendida. Contacta al administrador de Cordalia para regularizar tu situación.";

/**
 * Middleware: exige que el usuario tenga acceso comercial.
 *
 * - ADMIN: siempre pasa (administra la plataforma).
 * - BUSINESS: pasa si su estado comercial lo permite.
 * - TOURIST u otros: no aplica (deben usar requireBusinessRole).
 */
async function requireVendorActive(req, res, next) {
  try {
    if (req.usuario?.rol === "ADMIN") return next();

    const est = await SuscripcionModel.estadoComercial(req.usuario.id);
    if (!est) {
      return res.status(401).json({ success: false, message: "No autenticado" });
    }

    if (est.estado === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "CUENTA_SUSPENDIDA",
        message: MENSAJE_SUSPENDIDO,
        data: { estado: est.estado },
      });
    }

    if (est.estado === "EXPIRED") {
      return res.status(403).json({
        success: false,
        code: "PRUEBA_VENCIDA",
        message: MENSAJE_PRUEBA_VENCIDA,
        data: {
          estado: est.estado,
          trial_fin: est.trial_fin,
          dias_restantes: 0,
        },
      });
    }

    // TRIALING, ACTIVE o vendedor anterior sin poliza: acceso concedido.
    req.comercial = est;
    return next();
  } catch (error) {
    console.error("Error en requireVendorActive:", error);
    return res.status(500).json({ success: false, message: "Error al verificar el estado comercial" });
  }
}

module.exports = { requireVendorActive, MENSAJE_PRUEBA_VENCIDA, MENSAJE_SUSPENDIDO };
