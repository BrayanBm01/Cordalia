// ============================================================
// roles.js — Rol canónico y navegación por rol.
// ------------------------------------------------------------
// El backend usa un ÚNICO vocabulario de roles:
//   'ADMIN' | 'BUSINESS' | 'TOURIST'
// (`usuarios.rol_id`: 0 = ADMIN, 1 = TURISTA, 2 = VENDEDOR).
//
// Aquí se normalizan los valores que llegan desde la API o desde
// `localStorage` (que pudo quedar guardado por una versión anterior de
// la app) para que las comparaciones del frontend nunca fallen por una
// variante de nombre. No se "traduce" nada en la base de datos: solo se
// interpreta de forma coherente en el cliente.
// ============================================================

export const ROL_ADMIN = 'ADMIN'
export const ROL_BUSINESS = 'BUSINESS'
export const ROL_TOURIST = 'TOURIST'

/**
 * Alias admitidos -> rol canónico.
 * 'VENDEDOR', 'SELLER', 'VENDOR', 'NEGOCIO'... son variantes que
 *emaporean al rol canónico del backend.
 */
const ALIAS_ROL = {
  ADMIN: ROL_ADMIN,
  ADMINISTRATOR: ROL_ADMIN,
  BUSINESS: ROL_BUSINESS,
  VENDEDOR: ROL_BUSINESS,
  VENDOR: ROL_BUSINESS,
  SELLER: ROL_BUSINESS,
  NEGOCIO: ROL_BUSINESS,
  TOURIST: ROL_TOURIST,
  TURISTA: ROL_TOURIST,
  VIAJERO: ROL_TOURIST,
  USER: ROL_TOURIST,
}

/**
 * Normaliza un rol a su valor canónico.
 * @param {string|number|null|undefined} rol
 * @returns {'ADMIN'|'BUSINESS'|'TOURIST'}
 */
export function normalizarRol(rol) {
  if (rol === null || rol === undefined) return ROL_TOURIST
  // El backend puede enviar el rol numérico (rol_id).
  if (typeof rol === 'number') {
    if (rol === 0) return ROL_ADMIN
    if (rol === 2) return ROL_BUSINESS
    return ROL_TOURIST
  }
  const clave = String(rol).trim().toUpperCase()
  return ALIAS_ROL[clave] || ROL_TOURIST
}

/**
 * Devuelve una copia del usuario con el rol normalizado.
 * @param {object|null} usuario
 * @returns {object|null}
 */
export function normalizarUsuario(usuario) {
  if (!usuario || typeof usuario !== 'object') return usuario || null
  return { ...usuario, rol: normalizarRol(usuario.rol) }
}

/**
 * Ruta a la que debe ir cada rol tras registrarse o iniciar sesión.
 * El vendedor entra a SU panel comercial (donde ve la prueba gratuita
 * y los planes); el administrador a su panel; el turista a la home.
 */
export function rutaInicioPorRol(rol) {
  switch (normalizarRol(rol)) {
    case ROL_BUSINESS:
      return '/panel-vendedor'
    case ROL_ADMIN:
      return '/admin'
    default:
      return '/'
  }
}

/**
 * Decide a dónde va un usuario que intenta abrir una ruta protegida.
 *
 * @param {object} params
 * @param {string|null} params.rol            - rol del usuario autenticado.
 * @param {string[]|null} params.rolesPermitidos - roles con acceso (null = cualquiera).
 * @param {boolean} params.autenticado       - ¿hay sesión?
 * @returns {{destino: string, permitido: boolean}}
 *
 * Reglas:
 *   - Sin sesión  -> /login
 *   - Con sesión y sin permiso -> SU panel (no una página de error)
 *   - Con sesión y con permiso -> la ruta solicitada
 */
export function destinoRutaProtegida({ rol, rolesPermitidos, autenticado }) {
  if (!autenticado) {
    return { destino: '/login', permitido: false }
  }
  const canonico = normalizarRol(rol)
  if (rolesPermitidos && rolesPermitidos.length > 0) {
    const permitidos = rolesPermitidos.map(normalizarRol)
    if (!permitidos.includes(canonico)) {
      return { destino: rutaInicioPorRol(canonico), permitido: false }
    }
  }
  return { destino: null, permitido: true }
}
