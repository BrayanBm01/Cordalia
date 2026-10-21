// ============================================================
// mailService — envio de correos (recuperacion de contrasena).
// ------------------------------------------------------------
// IMPORTANTE: este proyecto NO tiene un proveedor de correo
// configurado. El servicio es "pluggable" y NO simula el exito:
//
//   * MAIL_PROVIDER=log  -> escribe el correo en el log. SOLO
//     desarrollo: en produccion falla (no se puede "enviar" nada).
//   * MAIL_PROVIDER=http -> POST a un endpoint HTTP de correo
//     (Mailgun/Resend/SendGrid o un relay propio) usando
//     MAIL_API_URL + MAIL_API_KEY.
//
// Si no hay proveedor configurado, la recuperacion de contrasena
// responde 503 con un mensaje claro. NUNCA se finge un envio.
const MAIL_PROVIDER = (process.env.MAIL_PROVIDER || "log").toLowerCase();

function esProduccion() {
  return (process.env.NODE_ENV || "development") === "production";
}

/**
 * Envia un correo.
 *
 * @param {{para: string, asunto: string, texto: string, html?: string}} correo
 * @returns {Promise<{enviado: boolean, modo: string, detalle?: string}>}
 */
async function enviarCorreo({ para, asunto, texto, html }) {
  if (!para || !asunto || !texto) {
    throw Object.assign(new Error("Correo incompleto"), { status: 500 });
  }

  if (MAIL_PROVIDER === "http") {
    const url = process.env.MAIL_API_URL;
    const key = process.env.MAIL_API_KEY;
    if (!url || !key) {
      throw Object.assign(
        new Error("Envío de correos no configurado (MAIL_API_URL / MAIL_API_KEY)"),
        { status: 503, code: "MAIL_NOT_CONFIGURED" }
      );
    }
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Cordalia <no-reply@cordalia.app>",
        to: para,
        subject: asunto,
        text,
        html: html || null,
      }),
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => "");
      console.error("[mail] fallo el envio:", res.status, cuerpo.slice(0, 200));
      throw Object.assign(new Error("No se pudo enviar el correo"), { status: 502 });
    }
    return { enviado: true, modo: "http" };
  }

  // Modo 'log'.
  if (esProduccion()) {
    throw Object.assign(
      new Error("Envío de correos no configurado en el servidor"),
      { status: 503, code: "MAIL_NOT_CONFIGURED" }
    );
  }
  console.log(
    `\n[mail:log] Para: ${para}\n[mail:log] Asunto: ${asunto}\n[mail:log] ${texto}\n`
  );
  return { enviado: true, modo: "log" };
}

/**
 * Indica si el envio de correo esta realmente disponible. En
 * produccion, 'log' NO cuenta como disponible.
 */
function correoDisponible() {
  if (MAIL_PROVIDER === "http") {
    return Boolean(process.env.MAIL_API_URL && process.env.MAIL_API_KEY);
  }
  return !esProduccion();
}

module.exports = { enviarCorreo, correoDisponible, MAIL_PROVIDER };
