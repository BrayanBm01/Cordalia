// Constantes de sesión (cliente). El auto-logout por inactividad
// solo cuenta interacción humana real (no renders/fetch/polling).
export const SESION_INACTIVIDAD_MS = 8 * 60 * 1000
export const SESION_INACTIVIDAD_FLAG = 'cordalia_sesion_inactividad'

// Evento de bajo nivel: el interceptor HTTP detectó una sesión inválida (401).
// Lo escucha el AuthContext, que centraliza el cierre (una sola vez).
export const EVENTO_SESION_INVALIDA = 'cordalia:sesion-invalida'

// Evento de aviso: la sesión ya se cerró (inactividad, token vencido o 401) y
// las vistas montadas deben mostrar el mensaje. Se emite UNA vez por cierre.
export const EVENTO_SESION_EXPIRADA = 'cordalia:sesion-expirada'

// Página pública real de Cordalia (ruta declarada en App.jsx).
export const RUTA_INICIO = '/'

// Rutas públicas del router de React (declaradas en App.jsx).
export const RUTAS_PUBLICAS = ['/', '/login', '/registro']

export function rutaActual() {
  if (typeof window === 'undefined') return RUTA_INICIO
  return window.location.pathname || RUTA_INICIO
}

/**
 * Marca que la sesión terminó sola (token vencido / respuesta 401 / inactividad)
 * y notifica a las vistas montadas.
 *
 * Se usa sessionStorage para que el aviso sobreviva a una recarga de página y
 * un CustomEvent para que las vistas YA montadas (p. ej. la página actual o el
 * inicio) lo muestren sin volver a cargar el documento.
 *
 * La unicidad del aviso la garantiza quien llama (`cerrarSesionExpirada` en el
 * AuthContext), no esta función: el consumidor borra la bandera al leerla.
 */
export function marcarSesionExpirada() {
  try {
    sessionStorage.setItem(SESION_INACTIVIDAD_FLAG, '1')
  } catch {
    // sessionStorage puede no estar disponible (modo privado, etc.)
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA))
  }
  return RUTA_INICIO
}

/**
 * Indica si hay un aviso de expiración pendiente y lo consume (una sola vez),
 * de modo que no se muestre repetidamente ni se dupliquen notificaciones.
 */
export function consumirAvisoSesion() {
  try {
    const pendiente = sessionStorage.getItem(SESION_INACTIVIDAD_FLAG)
    if (pendiente) sessionStorage.removeItem(SESION_INACTIVIDAD_FLAG)
    return Boolean(pendiente)
  } catch {
    return false
  }
}

/**
 * Suscribe una vista al aviso de expiración. Devuelve la función para
 * desuscribirse. No dispara nada si no quedaba aviso pendiente.
 */
export function suscribirAvisoSesion(callback) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {}
  }
  const handler = () => {
    if (consumirAvisoSesion()) callback()
  }
  window.addEventListener(EVENTO_SESION_EXPIRADA, handler)
  return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, handler)
}
