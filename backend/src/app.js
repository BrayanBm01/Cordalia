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

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origen (curl, postman, health checks) y origenes permitidos.
      if (!origin || allowedOrigins.includes(origin)) {
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
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/usuarios", require("./routes/usuarioRoutes"));
app.use("/api/lugares", require("./routes/lugaresRoutes"));
app.use("/api/businesses", require("./routes/businessRoutes"));
app.use("/api/planes", require("./routes/planRoutes").publicRouter);
app.use("/api/favoritos", require("./routes/favoritoRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API funcionando" });
});

app.use(require("./middlewares/errorHandler"));

module.exports = app;
