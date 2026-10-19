const { OAuth2Client } = require("google-auth-library");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

let oauthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
/**
 * Error de verificacion de una credencial de Google.
 *
 * Permite distinguir, en el controlador, entre:
 *   - credencial ausente/invalida/caducada  -> 401 (culpa del cliente)
 *   - configuracion del servidor incompleta -> 503
 *   - fallo inesperado del servicio         -> 500
 *
 * El mensaje NUNCA contiene el idToken ni datos sensibles del payload.
 */
class GoogleAuthError extends Error {
  constructor(motivo, message, { status = 401, detalle = null } = {}) {
    super(message);
    this.name = "GoogleAuthError";
    this.motivo = motivo;
    this.status = status;
    this.detalle = detalle;
  }
}

/**
 * Verifica un ID token de Google.
 *
 * NO confia en la identidad enviada por el frontend:
 * valida la firma, el emisor, la audiencia (GOOGLE_CLIENT_ID),
 * el email verificado y la expiracion contra los certificados
 * publicos de Google via google-auth-library.
 *
 * @param {string} idToken - ID token obtenido por Google Identity Services.
 * @returns {Promise<object>} payload verificado y normalizado.
 * @throws {GoogleAuthError} si la credencial es invalida o falta configuracion.
 */
async function verifyGoogleIdToken(idToken) {
  if (!oauthClient) {
    throw new GoogleAuthError(
      "sin_configuracion",
      "GOOGLE_CLIENT_ID no configurado",
      { status: 503 }
    );
  }
  if (!idToken || typeof idToken !== "string") {
    throw new GoogleAuthError("token_ausente", "Credencial de Google ausente");
  }

  let ticket;
  try {
    ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    // Firma invalida, audiencia distinta, token caducado o certificados
    // inaccesibles. Se registra solo el motivo tecnico (nunca el token).
    const causa = String(error && error.message ? error.message : error).slice(0, 200);
    throw new GoogleAuthError(
      "token_invalido",
      "Credencial de Google inválida o expirada",
      { status: 401, detalle: causa }
    );
  }

  const payload = ticket.getPayload();
  if (!payload) {
    throw new GoogleAuthError("payload_vacio", "Credencial de Google sin datos", {
      status: 401,
    });
  }

  // La verificacion de la firma/audiencia es hecha por google-auth-library.
  // Validacion adicional defensiva del payload.
  if (!payload.sub || !payload.email) {
    throw new GoogleAuthError("identidad_incompleta", "Credencial de Google incompleta", {
      status: 401,
    });
  }
  if (payload.email_verified !== true) {
    throw new GoogleAuthError("email_no_verificado", "El email de Google no está verificado", {
      status: 401,
    });
  }

  return {
    googleId: payload.sub,
    email: (payload.email || "").toLowerCase(),
    nombre: payload.name || null,
    avatarUrl: payload.picture || null,
    emailVerified: true,
    audiencia: payload.aud || null,
    hdDominio: payload.hd || null,
  };
}

module.exports = { verifyGoogleIdToken, GoogleAuthError };

/**
 * Permite inyectar un cliente OAuth en pruebas (doble de la libreria de Google).
 * No se usa en produccion: `oauthClient` se construye con google-auth-library.
 * @param {object|null} client
 */
module.exports.__setOAuthClientParaPruebas = (client) => {
  oauthClient = client;
};
