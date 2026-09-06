let gisPromise = null

/**
 * Carga el script oficial de Google Identity Services una sola vez.
 * @returns {Promise<Window['google']>}
 */
export function loadGoogleIdentity() {
  if (window.google?.accounts) return Promise.resolve(window.google)

  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => resolve(window.google)
      script.onerror = () => {
        gisPromise = null
        reject(new Error('No se pudo cargar Google Identity Services'))
      }
      document.head.appendChild(script)
    })
  }
  return gisPromise
}

/**
 * Obtiene un ID token de Google mediante el flujo popup (One Tap / Sign In).
 * @param {string} clientId - Google OAuth Client ID (publico por diseno).
 * @returns {Promise<string>} ID token.
 */
export function getGoogleIdToken(clientId) {
  return loadGoogleIdentity().then((g) => {
    return new Promise((resolve, reject) => {
      if (!clientId) {
        reject(new Error('Google Client ID no configurado'))
        return
      }
      g.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response && response.credential) {
            resolve(response.credential)
          } else {
            reject(new Error('OAuth cancelado o sin credencial'))
          }
        },
        auto_select: false,
      })
      g.accounts.id.prompt()
    })
  })
}
