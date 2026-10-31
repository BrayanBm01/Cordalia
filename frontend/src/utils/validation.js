// ============================================================
// Validaciones compartidas del frontend.
//
// Replican las reglas del backend para dar feedback inmediato. El
// backend sigue siendo la autoridad final: nunca se confia solo en
// estas comprobaciones.
// ============================================================

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX_BYTES = 72;
export const PHONE_MAX = 30;
export const URL_MAX = 300;
export const PRECIO_MAX = 99999999.99;

// Campos de una sola linea: se rechazan todos los controles, incluidos
// tabulador y saltos de linea.
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;
const CONTROL_CHARS_MULTILINE_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const PERSON_NAME_RE = /^[\p{L}\p{M}]+(?:[ '\u2019.-][\p{L}\p{M}]+)*$/u;

export function normalizeText(value, { multiline = false } = {}) {
  if (typeof value !== 'string') return ''
  let limpio = value
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS_MULTILINE_RE, '')
  if (multiline) {
    limpio = limpio
      .split('\n')
      .map((linea) => linea.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } else {
    limpio = limpio.replace(/\s+/g, ' ').trim()
  }
  return limpio
}

export function isValidPersonName(value) {
  if (typeof value !== 'string' || CONTROL_CHARS_RE.test(value)) return false
  const normalizado = normalizeText(value)
  return (
    normalizado.length >= NAME_MIN &&
    normalizado.length <= NAME_MAX &&
    PERSON_NAME_RE.test(normalizado)
  )
}

export function isValidBusinessName(value, minLen = 2, maxLen = 200) {
  if (typeof value !== 'string' || CONTROL_CHARS_RE.test(value)) return false
  const normalizado = normalizeText(value)
  if (normalizado.length < minLen || normalizado.length > maxLen) return false
  return /[\p{L}\p{N}]/u.test(normalizado)
}

export function isEmail(value) {
  if (typeof value !== 'string') return false
  const limpio = value.trim()
  if (limpio.length < 3 || limpio.length > EMAIL_MAX) return false
  if (CONTROL_CHARS_RE.test(limpio) || /\s/.test(limpio)) return false
  if (limpio.includes('..') || limpio.startsWith('.') || limpio.endsWith('.')) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)
}

function utf8Bytes(value) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length
  // Estimacion conservadora para entornos sin TextEncoder.
  return value.length * 3
}

export function validatePassword(password) {
  if (typeof password !== 'string') return 'La contraseña es obligatoria'
  if (password.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`
  }
  if (CONTROL_CHARS_RE.test(password)) return 'La contraseña contiene caracteres no permitidos'
  if (utf8Bytes(password) > PASSWORD_MAX_BYTES) {
    return `La contraseña no puede superar ${PASSWORD_MAX_BYTES} bytes (bcrypt)`
  }
  return null
}

export function isValidPhone(value) {
  if (typeof value !== 'string' || CONTROL_CHARS_RE.test(value)) return false
  const limpio = normalizeText(value)
  if (!limpio || limpio.length > PHONE_MAX) return false
  if (!/^[+()\d\s.-]+$/.test(limpio)) return false
  const digitos = (limpio.match(/\d/g) || []).length
  return digitos >= 7 && digitos <= 15
}

export function isValidHttpUrl(value, maxLen = URL_MAX) {
  if (typeof value !== 'string') return false
  const limpio = value.trim()
  if (!limpio || limpio.length > maxLen || CONTROL_CHARS_RE.test(limpio)) return false
  try {
    const url = new URL(limpio)
    if (!['http:', 'https:'].includes(url.protocol)) return false
    if (url.username || url.password) return false
    if (!url.hostname || !url.hostname.includes('.')) return false
    return true
  } catch {
    return false
  }
}

export function parseInteger(value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) return null
    if (value < min || value > max) return null
    return value
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    const n = Number(value.trim())
    if (!Number.isSafeInteger(n) || n < min || n > max) return null
    return n
  }
  return null
}

export function parseDecimal(value, { min = -Number.MAX_VALUE, max = Number.MAX_VALUE, decimals = 2 } = {}) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean' || Array.isArray(value) || typeof value === 'object') return NaN
  if (typeof value === 'string' && !/^-?\d+(?:[.,]\d+)?$/.test(value.trim())) return NaN
  const n = Number(value)
  if (!Number.isFinite(n)) return NaN
  if (n < min || n > max) return NaN
  const factor = 10 ** decimals
  if (Math.round(n * factor) !== n * factor) return NaN
  return n
}

export function isValidDateOnly(value, { min = '1900-01-01', max = '2100-12-31' } = {}) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  if (value < min || value > max) return false
  const [anio, mes, dia] = value.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  )
}
