const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

// Seguridad: headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        "img-src": ["'self'", "data:", "https:", "https://*.googleusercontent.com"],
        "frame-src": ["'self'", "https://accounts.google.com"],
        "script-src": ["'self'", "https://accounts.google.com", "https://*.gstatic.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "connect-src": ["'self'", "https://*.googleapis.com"],
        "frame-ancestors": ["'self'"],
      },
    },
  })
);

/**
 * Normaliza un origen configurado (p. ej. FRONTEND_URL) para compararlo con
 * el header `Origin` del navegador: quita espacios, barra final y pasa a
 * minusculas. Un `FRONTEND_URL` con barra final (error tipico al pegar la URL
 * en Railway/Vercel) rompia CORS de forma silenciosa en produccion.
 * NO amplia la lista de permitidos: solo tolera diferencias de formato.
 */
function normalizarOrigen(valor) {
  if (!valor) return null;
  const limpio = String(valor).trim().replace(/\/+$/, "").toLowerCase();
  return limpio || null;
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL,
]
  .map(normalizarOrigen)
  .filter(Boolean);

// Admite varios origenes separados por coma en FRONTEND_URL (previews).
const allowedOriginsExpandidos = new Set();
for (const entrada of allowedOrigins) {
  for (const parte of entrada.split(",")) {
    const o = normalizarOrigen(parte);
    if (o) allowedOriginsExpandidos.add(o);
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origen (curl, postman, health checks) y origenes permitidos.
      if (!origin) return callback(null, true);
      const normalizado = normalizarOrigen(origin);
      if (normalizado && allowedOriginsExpandidos.has(normalizado)) {
        callback(null, true);
      } else {
        callback(new Error("Origen no permitido por CORS"));
      }
    },
    credentials: true,
  })
);

// El avatar de perfil se guarda como data-URL base64 (hasta ~2 MB de imagen,
// que como JSON ocupa hasta ~2.7 MB). Elevamos el limite del body para
// permitir ese caso manteniendo un margen seguro para el resto de endpoints.
//
// `verify` conserva el CUERPO CRUDO de la peticion en `req.rawBody`:
// es necesario para verificar la FIRMA de la webhook de Mercado Pago
// (x-signature se calcula sobre el texto exacto recibido).
app.use(
  express.json({
    limit: "4mb",
    verify: (req, res, buf) => {
      try {
        req.rawBody = buf.toString("utf8");
      } catch (_) {
        req.rawBody = "";
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "4mb" }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/usuarios", require("./routes/usuarioRoutes"));
app.use("/api/lugares", require("./routes/lugaresRoutes"));
// Contenido de destinos: catálogos asignables y enlace a un destino.
app.use("/api/contenido", require("./routes/destinoContenidoRoutes").contenidoRouter);
app.use(
  "/api/lugares/:id/administrar",
  require("./routes/destinoContenidoRoutes").lugarContenidoRouter
);
app.use("/api/businesses", require("./routes/businessRoutes"));
app.use("/api/planes", require("./routes/planRoutes").publicRouter);
app.use("/api/favoritos", require("./routes/favoritoRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
// Inscripciones turisticas (GRATUITAS): /api/mis-inscripciones,
// /api/inscripciones/:id/... No hay pagos turisticos.
app.use("/api", require("./routes/inscripcionRoutes"));
// Estado comercial del vendedor y suscripciones (planes COMERCIALES).
app.use("/api", require("./routes/suscripcionRoutes"));
// Webhook del proveedor de pagos (firma verificada, sin sesión).
app.use("/api", require("./routes/suscripcionRoutes").webhookRouter);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API funcionando" });
});

app.use(require("./middlewares/errorHandler"));

module.exports = app;
