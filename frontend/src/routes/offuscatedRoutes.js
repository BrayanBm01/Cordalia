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
//
// CONTRATO DE NAVEGACIÓN (devuelve SIEMPRE rutas absolutas):
//   * React Router interpreta un `to` que NO empieza por "/" como
//     una ruta RELATIVA a la ruta actual dentro del árbol de
//     `<Route>`: navegar "F8HgnHJz" desde "/y8o5rdAd" (login) produce
//     "/y8o5rdAd/F8HgnHJz" (404 por concatenación). Por eso el
//     resolutor antepone SIEMPRE la barra: cada salida es una ruta
//     absoluta y válida desde cualquier punto del árbol
//     (registro, login, paneles, detalle, 404...)
//     — corrección del 404 tras completar el registro.
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

// Antepone "/" a un identificador: TODAS las rutas devueltas por este
// módulo son absolutas, para que navigate()/Link/Navigate nunca las
// resuelvan como relativas (causa del 404 tras completar el registro).
function ABSOLUTA(id) {
  return typeof id === 'string' ? `/${id.replace(/^\/+/, '')}` : id
}

/** Normaliza un destinatario de ruta quitando la(s) barra(s) inicial(es). */
function sinBarra(valor) {
  return typeof valor === 'string' ? valor.replace(/^\/+/, '') : null
}

/**
 * Devuelve la ruta ABSOLUTA correspondiente a un nombre de ruta.
 * Lanza si la clave no existe (error de programación: ruta no registrada).
 *
 * La ruta se antepone con "/" para blindarla contra la resolución
 * RELATIVA de React Router (que concatenaría el destino con la ruta
 * actual si la cadena no empezara por "/", produciendo 404 tras el
 * registro/login y en cualquier redirección ejecutada desde páginas
 * con segmento en la URL).
 *
 * @param {string} nombre - Clave canónica (p. ej. 'ADMIN_USUARIOS').
 * @returns {string} Ruta absoluta ("KJRkky3o" -> "/KJRkky3o").
 */
export function obtenerRuta(nombre) {
  if (typeof nombre !== 'string' || nombre.length === 0) {
    throw new Error('obtenerRuta: el nombre de ruta debe ser un texto no vacío')
  }
  const id = RUTAS_OFUSCADAS[nombre]
  if (!id) throw new Error(`Ruta ofuscada no definida: ${nombre}`)
  return ABSOLUTA(id)
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
    .map((p) => String(p))
  return segmentos.length > 0 ? `${base}/${segmentos.map(encodeURIComponent).join('/')}` : base
}

/**
 * Devuelve el nombre legible para un identificador (con o sin "/" inicial;
 * solo depuración) o `null` si el identificador no corresponde a ninguna ruta.
 *
 * @param {string} id - Identificador ofuscado (acepta "/KJRkky3o" o "KJRkky3o").
 * @returns {string|null}
 */
export function nombreRuta(id) {
  const limpio = sinBarra(id)
  if (!limpio) return null
  return RUTAS_INVERSA[limpio] || null
}

/**
 * Indica si un segmento corresponde a un identificador de ruta conocido.
 * Acepta "/identificador" o "identificador". No lanza: devuelve `false`
 * ante valores inválidos.
 *
 * @param {string} id - Identificador a comprobar.
 * @returns {boolean}
 */
export function esRutaOfuscada(id) {
  const limpio = sinBarra(id)
  if (!limpio) return false
  return IDS_VALIDOS.has(limpio)
}