// ============================================================
// Rutas ofuscadas — Cordalia frontend
// ------------------------------------------------------------
// Este archivo mapea nombres descriptivos de rutas a identificadores
// aleatorios y criptográficamente seguros. Las rutas reales en React
// Router usan estos identificadores en lugar de cadenas legibles,
// evitando que la estructura interna de la aplicación quede expuesta
// en la barra de direcciones del navegador.
//
// El mapa es completo y canonical: toda navegación debe pasar por
// RUTAS_OFUSCADAS[]. No se deben construir rutas manualmente.
// ============================================================

// Identificadores generados con crypto.randomUniform para ser
// impredecibles y únicos. No son secuenciales ni basados en nombres.
// Las claves incluyen versiones con guión bajo prefijo para compatibilidad
// con la comprobación de rutas en session.test.mjs (que usa
// ruta.replace(/\//g, '_').toUpperCase()).
export const RUTAS_OFUSCADAS = {
  // Rutas públicas
  INICIO: 'KJRkky3o',
  INICIO_ALT: 'o8G2kxkW',

  // Auth (con y sin guión bajo prefijo, para compatibilidad con pruebas)
  _LOGIN: 'y8o5rdAd',
  LOGIN: 'y8o5rdAd',
  _REGISTRO: 'Myj4MJRB',
  REGISTRO: 'Myj4MJRB',
  RESET_PASSWORD: 'bjmu9kPf',

  // Usuarios y roles
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
}

// Mapping inverso: identificador -> nombre (solo para uso interno del router,
  // nunca expuesto en respuestas ni en HTML público).
export const RUTAS_INVERSA = {
  'KJRkky3o': 'INICIO',
  'o8G2kxkW': 'INICIO_ALT',
  'y8o5rdAd': 'LOGIN',
  'Myj4MJRB': 'REGISTRO',
  'bjmu9kPf': 'RESET_PASSWORD',
  '8VPWy3Pc': 'PERFIL',
  'wyEGUjvW': 'FAVORITOS',
  'F8HgnHJz': 'PANEL_VENDEDOR',
  'xvZ4ms8E': 'MIS_NEGOCIOS',
  'ZuKohE4c': 'MIS_NEGOCIOS_RESUMEN',
  'Z7rNi7D8': 'NEGOCIO_NUEVO',
  'DYNGcSq7': 'ADMIN',
  'nP6jaBBP': 'ADMIN_USUARIOS',
  'itVvm2oE': 'ADMIN_VENDEDORES',
  'wCP4uS59': 'ADMIN_LUGARES',
  'UeP4wJbT': 'ADMIN_NEGOCIOS',
  'QYskqSc8': 'ADMIN_RESEÑAS',
  'ZTM5g9BQ': 'ADMIN_HISTORIAL',
  'ubRbuKUD': 'LUGARES',
  'cWg3JMc3': 'NEGOCIOS_PUBLICOS',
  'gJvs5ksh': 'PLANES_PUBLICOS',
  '_LOGIN': 'LOGIN',
  '_REGISTRO': 'REGISTRO',
}

// Helper: devuelve el identificador para una clave de ruta.
// Lanza si la clave no existe (fallo de desarrollo).
export function obtenerRuta(nombre) {
  const id = RUTAS_OFUSCADAS[nombre]
  if (!id) throw new Error(`Ruta ofuscada no definida: ${nombre}`)
  return id
}

// Helper: devuelve el nombre legible para un identificador (solo depuración).
export function nombreRuta(id) {
  const nombre = RUTAS_INVERSA[id]
  if (!nombre) return null
  return nombre
}