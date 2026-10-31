// ============================================================
// Validadores compartidos del backend.
//
// Toda validacion de entrada debe pasar por aqui para que las reglas
// sean coherentes entre creacion, edicion, registro, perfil, negocios
// y resenas. El backend NUNCA confia en lo que valide el navegador.
// ============================================================

const NAME_MIN = 2;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 6;
const PASSWORD_MAX_BYTES = 72; // limite real de bcrypt
const PHONE_MAX = 30;
const URL_MAX = 300;

// Caracteres de control. En campos de una sola linea se rechazan TODOS
// (incluidos \t, \n y \r). En textos multilinea se permiten unicamente
// \t, \n y \r; el resto sigue prohibido.
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;
const CONTROL_CHARS_MULTILINE_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * Letras Unicode (incluye tildes, dieresis y ñ), marcas combinadas,
 * espacios simples, guiones y apostrofos. Cada separador debe ir
 * seguido de otra letra, de modo que no se aceptan guiones sueltos,
 * nombres formados solo por espacios ni secuencias raras.
 */
const PERSON_NAME_RE = /^[\p{L}\p{M}]+(?:[ '\u2019.-][\p{L}\p{M}]+)*$/u;

function hasControlChars(value, permitirSaltos = false) {
  if (typeof value !== "string") return true;
  if (permitirSaltos) {
    // Quita primero los saltos permitidos y comprueba el resto.
    return CONTROL_CHARS_MULTILINE_RE.test(value.replace(/[\n\r\t]/g, ""));
  }
  return CONTROL_CHARS_RE.test(value);
}

/**
 * Recorta y normaliza espacios. En textos de una linea colapsa los
 * espacios internos; en multilinea conserva saltos pero elimina
 * espacios sobrantes alrededor de cada linea.
 */
function normalizeText(value, { multiline = false } = {}) {
  if (typeof value !== "string") return "";
  let limpio = value.replace(/\r\n?/g, "\n");
  // Elimina controles no imprimibles (nunca silenciosamente en campos
  // donde el control es invalido: los validadores lo rechazan antes).
  limpio = limpio.replace(CONTROL_CHARS_MULTILINE_RE, "");
  if (multiline) {
    limpio = limpio
      .split("\n")
      .map((linea) => linea.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } else {
    limpio = limpio.replace(/\s+/g, " ").trim();
  }
  return limpio;
}

// Compatibilidad con el resto del codigo: recorta y elimina controles.
function sanitizeString(val) {
  if (typeof val !== "string") return "";
  return normalizeText(val);
}

function isNonEmptyString(val, minLen = 1, maxLen = 255) {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  return trimmed.length >= minLen && trimmed.length <= maxLen;
}

/**
 * Nombre o apellido de una persona real.
 * Acepta "María José", "Núñez", "O'Connor", "Jean-Luc".
 * Rechaza numeros, vacios, solo espacios y controles.
 */
function isValidPersonName(val) {
  if (typeof val !== "string") return false;
  if (hasControlChars(val)) return false;
  const normalizado = normalizeText(val);
  if (normalizado.length < NAME_MIN || normalizado.length > NAME_MAX) return false;
  return PERSON_NAME_RE.test(normalizado);
}

/**
 * Nombre comercial/negocio: puede contener numeros ("Hotel 5 Estrellas"),
 * pero no puede estar vacio, superar el limite ni contener controles.
 */
function isValidBusinessName(val, minLen = 2, maxLen = 200) {
  if (typeof val !== "string") return false;
  if (hasControlChars(val)) return false;
  const normalizado = normalizeText(val);
  if (normalizado.length < minLen || normalizado.length > maxLen) return false;
  // Evita nombres compuestos solo por signos o espacios.
  return /[\p{L}\p{N}]/u.test(normalizado);
}

/**
 * Email: formato basico, longitud maxima y sin controles/espacios.
 * La normalizacion a minusculas la hacen los controladores.
 */
function isEmail(email) {
  if (typeof email !== "string") return false;
  const limpio = email.trim();
  if (limpio.length < 3 || limpio.length > EMAIL_MAX) return false;
  if (hasControlChars(limpio) || /\s/.test(limpio)) return false;
  if (limpio.includes("..") || limpio.startsWith(".") || limpio.endsWith(".")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio);
}

/**
 * Politica de contrasena compatible con bcrypt.
 * Devuelve null si es valida o un mensaje de error.
 * NO recorta espacios: la contrasena se usa exactamente como se ingresa.
 */
function validatePassword(password) {
  if (typeof password !== "string") {
    return "La contraseña es obligatoria";
  }
  if (password.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`;
  }
  if (hasControlChars(password)) {
    return "La contraseña contiene caracteres no permitidos";
  }
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
    return `La contraseña no puede superar ${PASSWORD_MAX_BYTES} bytes (bcrypt)`;
  }
  return null;
}

/**
 * Telefono internacional flexible: digitos, espacios, +, -, parentesis
 * y puntos. Debe tener entre 7 y 15 digitos.
 */
function isValidPhone(val) {
  if (typeof val !== "string") return false;
  if (hasControlChars(val)) return false;
  const limpio = normalizeText(val);
  if (!limpio || limpio.length > PHONE_MAX) return false;
  if (!/^[+()\d\s.-]+$/.test(limpio)) return false;
  const digitos = (limpio.match(/\d/g) || []).length;
  return digitos >= 7 && digitos <= 15;
}

/**
 * URL http/https valida. Rechaza javascript:, data: y credenciales
 * embebidas que suelen usarse en enlaces enganosos.
 */
function isValidHttpUrl(val, maxLen = URL_MAX) {
  if (typeof val !== "string") return false;
  const limpio = val.trim();
  if (!limpio || limpio.length > maxLen || hasControlChars(limpio)) return false;
  try {
    const url = new URL(limpio);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (url.username || url.password) return false;
    if (!url.hostname || !url.hostname.includes(".")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Convierte un valor a entero estricto. Rechaza booleanos, arreglos,
 * decimales, NaN e Infinity.
 */
function parseInteger(val, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof val === "number") {
    if (!Number.isSafeInteger(val)) return null;
  } else if (typeof val === "string" && /^-?\d+$/.test(val.trim())) {
    const n = Number(val.trim());
    if (!Number.isSafeInteger(n)) return null;
    if (n < min || n > max) return null;
    return n;
  } else {
    return null;
  }
  if (val < min || val > max) return null;
  return val;
}

/**
 * Convierte un valor a decimal finito con limites y precision.
 * Rechaza "", null, booleanos, arreglos, NaN e Infinity.
 */
function parseDecimal(val, { min = -Number.MAX_VALUE, max = Number.MAX_VALUE, decimals = 2 } = {}) {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "boolean" || Array.isArray(val) || typeof val === "object") return NaN;
  if (typeof val === "string" && !/^-?\d+(?:[.,]\d+)?$/.test(val.trim())) return NaN;
  const n = Number(val);
  if (!Number.isFinite(n)) return NaN;
  if (n < min || n > max) return NaN;
  const factor = 10 ** decimals;
  if (Math.round(n * factor) !== n * factor) return NaN;
  return n;
}

/**
 * Fecha real en formato YYYY-MM-DD. Comprueba que el dia exista
 * (new Date("2026-02-31") se desborda al mes siguiente si no se valida).
 */
function isValidDateOnly(val, { min = "1900-01-01", max = "2100-12-31" } = {}) {
  if (typeof val !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  if (val < min || val > max) return false;
  const [anio, mes, dia] = val.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

/**
 * Valida texto comun. Devuelve { value } o { error }.
 */
function validarTexto(val, {
  min = 0,
  max = 255,
  label = "El campo",
  obligatorio = false,
  multiline = false,
} = {}) {
  if (val === undefined || val === null) {
    if (obligatorio) return { error: `${label} es obligatorio` };
    return { value: null };
  }
  if (typeof val !== "string") {
    return { error: `${label} debe ser texto` };
  }
  if (hasControlChars(val, multiline)) {
    return { error: `${label} contiene caracteres no permitidos` };
  }
  const value = normalizeText(val, { multiline });
  if (obligatorio && value.length === 0) {
    return { error: `${label} es obligatorio` };
  }
  if (value.length > 0 && value.length < min) {
    return { error: `${label} debe tener al menos ${min} caracteres` };
  }
  if (value.length > max) {
    return { error: `${label} no puede superar ${max} caracteres` };
  }
  return { value: value === "" ? null : value };
}

module.exports = {
  NAME_MIN,
  NAME_MAX,
  EMAIL_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX_BYTES,
  PHONE_MAX,
  URL_MAX,
  hasControlChars,
  normalizeText,
  sanitizeString,
  isNonEmptyString,
  isValidPersonName,
  isValidBusinessName,
  isEmail,
  validatePassword,
  isValidPhone,
  isValidHttpUrl,
  parseInteger,
  parseDecimal,
  isValidDateOnly,
  validarTexto,
};
