/**
 * Integración con Google Identity Services (GIS) para Cordalia.
 *
 * Estrategia elegida — una sola, sin mecanismos en competencia:
 *   `google.accounts.id.renderButton()` sobre un contenedor propio, que es el
 *   flujo oficial de GIS para un botón explícito ("Continuar con Google").
 *   El callback entrega `response.credential` (ID token) y se envía al backend
 *   (POST /api/auth/google), que es quien verifica firma, audiencia emisor y
 *   expiración con google-auth-library.
 *
 * Por qué NO se usa `google.accounts.id.prompt()` (One Tap):
 *   - One Tap está pensado para invocarse al cargar la página, no desde el clic
 *     de un botón propio.
 *   - Cuando el navegador no puede mostrarlo (cookies de terceros bloqueadas,
 *     shields/extensiones, `suppressed_by_user`, sin sesión de Google o FedCM
 *     deshabilitado) `prompt()` no entrega ni credencial ni error: el callback
 *     nunca se invoca y la promesa del llamador queda pendiente de forma
 *     indefinida. Ese era el origen del estado infinito "Conectando con
 *     Google..." del botón personalizado.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const SDK_TIMEOUT_MS = 12000

let sdkPromise = null
// google.accounts.id.initialize() es global: si dos botones coexisten (o el
// componente se re-monta en StrictMode) Google advierte "called multiple times".
// Se inicializa una sola vez con un callback estable que delega en el ultimo
// componente montado.
let inicializado = false
let callbackCredencial = null
const inicializados = new Set()

/**
 * Espera a que `window.google.accounts.id` esté operativo.
 * Usa sondeo (cubre el caso en que el evento `load` ya se emitió) con timeout
 * para no dejar nunca una promesa pendiente de forma indefinida.
 */
function esperarSdk(timeoutMs) {
  return new Promise((resolve, reject) => {
    const inicio = Date.now()
    const tick = () => {
      if (window.google?.accounts?.id) return resolve(window.google)
      if (Date.now() - inicio >= timeoutMs) {
        reject(new Error('Tiempo de espera agotado al cargar Google Identity Services'))
        return
      }
      setTimeout(tick, 120)
    }
    tick()
  })
}

/**
 * Carga el script oficial de GIS una sola vez.
 * Si falla (red, bloqueador de anuncios, CSP) la promesa se libera para
 * permitir un reintento posterior: nunca se cachea el error.
 *
 * @returns {Promise<Window['google']>}
 */
export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    const existente = document.querySelector(`script[src="${GIS_SRC}"]`)
    if (!existente) {
      const script = document.createElement('script')
      script.src = GIS_SRC
      script.async = true
      script.defer = true
      script.onerror = () =>
        reject(new Error('No se pudo cargar Google Identity Services (script bloqueado o sin conexión)'))
      document.head.appendChild(script)
    }
    esperarSdk(SDK_TIMEOUT_MS).then(resolve, reject)
  })

  sdkPromise = sdkPromise.catch((err) => {
    sdkPromise = null
    throw err
  })
  return sdkPromise
}

/**
 * Renderiza el botón oficial de Google dentro de `container`.
 *
 * @param {HTMLElement} container - contenedor dedicado (sin contenido propio).
 * @param {object} opts
 * @param {string} opts.clientId - Google OAuth Client ID (público).
 * @param {(credential: string|null) => void} opts.onCredential
 *        Se invoca con el ID token o con `null` si el usuario cerró el popup
 *        sin completar la autenticación (no es un error fatal).
 * @param {'continue_with'|'sign_in_with'|'signup_with'} [opts.text]
 * @param {string} [opts.locale] - idioma del botón oficial.
 * @param {'outline'|'filled_blue'|'filled_black'} [opts.theme]
 * @returns {Promise<{ destroy: () => void }>}
 */
export async function renderGoogleButton(container, opts = {}) {
  const { clientId, onCredential, text = 'continue_with', locale = 'es', theme = 'outline', sesion } = opts

  if (!container) throw new Error('Contenedor del botón de Google no disponible')
  if (!clientId) throw new Error('Google Client ID no configurado')

  const g = await loadGoogleIdentity()

  // Si el componente se desmontó mientras se cargaba el SDK, no se toca el DOM
  // (React ya pudo reutilizar/limpiar ese contenedor).
  if (sesion?.cancelado) {
    return { destroy: () => {} }
  }

  // initialize() se llama UNA sola vez por client_id. El callback delegado
  // siempre invoca el ultimo manejador registrado (evita el aviso de GIS y
  // el comportamiento impredecible de inicializaciones repetidas).
  const claveInit = clientId
  callbackCredencial = (response) => {
    // `credential` ausente = el usuario cerró el popup o Google no emitió
    // credencial. Se informa al componente sin bloquear la interfaz.
    if (typeof callbackCredencial.manejador === 'function') {
      callbackCredencial.manejador(response?.credential || null)
    }
  }
  callbackCredencial.manejador = onCredential

  if (!inicializado || !inicializados.has(claveInit)) {
    g.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: false,
      use_fedcm_for_prompt: false,
      callback: (response) => callbackCredencial(response),
    })
    inicializado = true
    inicializados.add(claveInit)
  }

  // Evita botones duplicados si el componente se vuelve a montar (StrictMode).
  const anchoDisponible = container.clientWidth || container.parentElement?.clientWidth || 320
  const width = Math.min(400, Math.max(200, Math.round(anchoDisponible)))

  container.replaceChildren()
  g.accounts.id.renderButton(container, {
    type: 'standard',
    theme,
    size: 'large',
    shape: 'pill',
    text,
    logo_alignment: 'left',
    locale,
    width,
  })

  return {
    destroy: () => {
      if (container) container.replaceChildren()
      if (callbackCredencial && callbackCredencial.manejador === onCredential) {
        callbackCredencial.manejador = null
      }
    },
  }
}
