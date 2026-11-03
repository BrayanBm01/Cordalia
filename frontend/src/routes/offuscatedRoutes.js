// ============================================================
// Rutas ofuscadas — Cordalia frontend
// ------------------------------------------------------------
// Mapea nombres descriptivos de rutas a identificadores aleatorios
// e impredecibles. Las rutas de React Router usan estos
// identificadores en lugar de cadenas legibles, de modo que la
// estructura interna de la aplicación no queda expuesta en la
// barra de direcciones del navegador.
//
// IMPORTANTE:
//   * Este mapa es la ÚNICA fuente de verdad de las rutas internas.
//   * Toda navegación debe construirse con `obtenerRuta(nombre)`.
//   * Los mapas están congelados: nadie puede modificarlos en runtime.
//   * La ofuscación es una capa de obscurity: NO sustituye la
//     autenticación ni la autorización, que se validan en el backend.
// ============================================================

// Identificadores de 8 caracteres generados con aleatoriedad
// criptográfica (crypto.randomUniform sobre un alfabeto sin caracteres
// ambiguos). No son secuenciales ni derivados de los nombres.
export const RUTAS_OFUSCADAS = Object.freeze({
  // Rutas públicas
  INICIO: 'KJRkky3o',

  // Autenticación
  LOGIN: 'y8o5rdAd',
  REGISTRO: 'Myj4MJRB',
  RESET_PASSWORD: 'bjmu9kPf',

  // Usuario
  PERFIL: '8VPWy3Pc',
  FAVORITOS: 'wyEGUjvW',

  // Panel vendedor
  PANEL_VENDEDOR: 'F8HgnHJz',
  MIS_NEGOCIOS: 'xvZ4ms8E',
  MIS_NEGOCIOS_RESUMEN: 'ZuKohE4c',
  NEGOCIO_NUEVO: 'Z7rNi7D8',

  // Administración
  ADMIN: 'DYNGcSq7',
  ADMIN_USUARIOS: 'nP6jaBBP',
  ADMIN_VENDEDORES: 'itVvm2oE',
  ADMIN_LUGARES: 'wCP4uS59',
  ADMIN_NEGOCIOS: 'UeP4wJbT',
  ADMIN_RESEÑAS: 'QYskqSc8',
  ADMIN_HISTORIAL: 'ZTM5g9BQ',

  // Catálogos públicos
  LUGARES: 'ubRbuKUD',
  NEGOCIOS_PUBLICOS: 'cWg3JMc3',
  PLANES_PUBLICOS: 'gJvs5ksh',
})

// Mapa inverso (solo depuración interna). No se expone por API ni HTML.
export const RUTAS_INVERSA = Object.freeze(
  Object.fromEntries(Object.entries(RUTAS_OFUSCADAS).map(([nombre, id]) => [id, nombre])),
)

// Conjunto de identificadores válidos: útil para validar rutas antes
// de usarlas como destino de una navegación.
const IDS_VALIDOS = new Set(Object.values(RUTAS_OFUSCADAS))

/**
 * Devuelve el identificador ofuscado correspondiente a un nombre de ruta.
 * Lanza si la clave no existe (error de programación: ruta no registrada).
 *
 * @param {string} nombre - Clave canónica (p. ej. 'ADMIN_USUARIOS').
 * @returns {string} Identificador ofuscado.
 */
export function obtenerRuta(nombre) {
  if (typeof nombre !== 'string' || nombre.length === 0) {
    throw new Error('obtenerRuta: el nombre de ruta debe ser un texto no vacío')
  }
  const id = RUTAS_OFUSCADAS[nombre]
  if (!id) throw new Error(`Ruta ofuscada no definida: ${nombre}`)
  return id
}

/**
 * Construye una ruta ofuscada con segmentos adicionales (el patrón
 * `/:id` o `/:id/editar` de React Router). Los segmentos se codifican
 * para no romper la URL.
 *
 * Ejemplo:
 *   rutaCon('LUGARES', 12)            -> '<id-lugares>/12'
 *   rutaCon('MIS_NEGOCIOS', 7, 'editar') -> '<id-mis-negocios>/7/editar'
 *
 * @param {string} nombre - Clave canónica de la ruta base.
 * @param {...(string|number)} partes - Segmentos a añadir.
 * @returns {string}
 */
export function rutaCon(nombre, ...partes) {
  const base = obtenerRuta(nombre)
  const segmentos = partes
    .filter((p) => p !== undefined && p !== null && p !== '')
    .map((p) => encodeURIComponent(String(p)))
  return segmentos.length > 0 ? `${base}/${segmentos.join('/')}` : base
}

/**
 * Devuelve el nombre legible para un identificador (solo depuración)
 * o `null` si el identificador no corresponde a ninguna ruta.
 *
 * @param {string} id - Identificador ofuscado.
 * @returns {string|null}
 */
export function nombreRuta(id) {
  if (typeof id !== 'string') return null
  return RUTAS_INVERSA[id] || null
}

/**
 * Indica si un segmento corresponde a un identificador de ruta conocido.
 * No lanza: devuelve `false` ante valores inválidos.
 *
 * @param {string} id - Identificador a comprobar.
 * @returns {boolean}
 */
export function esRutaOfuscada(id) {
  if (typeof id !== 'string' || id.length === 0) return false
  return IDS_VALIDOS.has(id)
}