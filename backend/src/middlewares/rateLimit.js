const rateLimit = require("express-rate-limit");

const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX || 30);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiados intentos. Intenta de nuevo en unos minutos.",
  },
});

const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiados intentos de Google. Intenta de nuevo en unos minutos.",
  },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiados intentos. Intenta de nuevo en unos minutos.",
  },
});

module.exports = { authLimiter, googleLimiter, strictLimiter };
