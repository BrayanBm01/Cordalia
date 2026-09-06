const { OAuth2Client } = require("google-auth-library");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

let oauthClient = null;
if (GOOGLE_CLIENT_ID) {
  oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);
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
 * @returns {Promise<object|null>} payload verificado o null si es invalido.
 */
async function verifyGoogleIdToken(idToken) {
  if (!oauthClient) {
    throw new Error("GOOGLE_CLIENT_ID no configurado");
  }
  if (!idToken || typeof idToken !== "string") {
    return null;
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) return null;

  // La verificacion de la firma/audiencia es hecha por google-auth-library.
  // Validacion adicional defensiva del payload.
  if (!payload.sub || !payload.email) return null;
  if (payload.email_verified !== true && payload.email_verified !== undefined) {
    return null;
  }

  return {
    googleId: payload.sub,
    email: (payload.email || "").toLowerCase(),
    nombre: payload.name || null,
    avatarUrl: payload.picture || null,
    emailVerified: payload.email_verified === true,
  };
}

module.exports = { verifyGoogleIdToken };
