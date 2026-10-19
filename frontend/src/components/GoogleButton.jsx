import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertCircle, Loader2, RotateCw } from 'lucide-react'
import { GOOGLE_CLIENT_ID } from '../services/api'
import { renderGoogleButton } from '../services/google'
import { useAuth } from '../context/AuthContext'

/**
 * Botón de registro / inicio de sesión con Google.
 *
 * Usa el botón oficial de Google Identity Services (`renderButton`) porque es
 * el flujo soportado para una acción explícita del usuario. El ID token que
 * entrega Google se envía al backend, que lo verifica criptográficamente:
 * el frontend NUNCA decide identidad, rol ni sesión.
 *
 * Fases de la interfaz:
 *   sin_configurar → falta VITE_GOOGLE_CLIENT_ID (se conserva el botón visual
 *                    de desarrollo, sin autenticación real).
 *   cargando       → se está cargando el SDK de Google.
 *   listo          → el botón oficial está renderizado y operativo.
 *   autenticando   → el backend está validando la credencial (solicitud en curso).
 *   error_sdk      → el SDK no cargó: se ofrece "Reintentar".
 *   error_api      → el backend rechazó la credencial: se muestra el motivo y
 *                    el botón de Google sigue disponible para reintentar.
 */

const CLIENT_ID_PLACEHOLDER = 'tu_google_client_id.apps.googleusercontent.com'

function googleConfigurado() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== CLIENT_ID_PLACEHOLDER)
}

/**
 * Traduce el error real (estado HTTP + mensaje del backend) a un aviso
 * comprensible. Se conserva el mensaje del servidor cuando aporta contexto.
 */
function describirError(err) {
  const status = err?.status
  const msg = (err?.message || '').trim()

  if (status === 403 && /sesi[oó]n activa/i.test(msg)) {
    return {
      titulo: 'Ya hay una sesión activa',
      detalle: 'Cierra la sesión actual antes de iniciar una nueva.',
    }
  }
  if (status === 429) {
    return { titulo: 'Demasiados intentos', detalle: msg || 'Espera unos minutos e inténtalo de nuevo.' }
  }
  if (status === 503) {
    return { titulo: 'Google no está disponible', detalle: msg || 'El inicio de sesión con Google no está configurado.' }
  }
  if (status === 401) {
    return { titulo: 'No se pudo validar tu cuenta de Google', detalle: msg || 'Intenta de nuevo.' }
  }
  if (!status && /conectar con el servidor|failed to fetch|network/i.test(msg)) {
    return { titulo: 'Sin conexión con el servidor', detalle: msg }
  }
  return { titulo: msg || 'No se pudo iniciar sesión con Google', detalle: null }
}

export default function GoogleButton({
  rol = 'TOURIST',
  onSuccess,
  redirectTo = '/',
  label = 'Continuar con Google',
  text,
  className = '',
}) {
  const configurado = googleConfigurado()
  const [fase, setFase] = useState(configurado ? 'cargando' : 'sin_configurar')
  const [error, setError] = useState(null)
  // `intento` fuerza un nuevo intento de carga/render del SDK.
  const [intento, setIntento] = useState(0)

  const contenedorRef = useRef(null)
  const montadoRef = useRef(true)
  const enCursoRef = useRef(false)
  const manejarCredencialRef = useRef(null)
  const sesionRef = useRef(null)

  const { googleLogin } = useAuth()
  const navigate = useNavigate()
  const enErrorRef = useRef(false)

  const textoBoton = text || (/registr|crear cuenta|sign ?up/i.test(label) ? 'signup_with' : 'continue_with')

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

  /** Procesa la credencial ya verificada por Google contra el backend. */
  const manejarCredencial = useCallback(
    async (idToken) => {
      // Sin credencial: el usuario cerró el popup. No se guarda sesión ni se
      // marca error; el botón queda disponible para volver a intentar.
      if (!idToken) {
        toast.info('Autenticación con Google cancelada')
        return
      }
      // Evita solicitudes simultáneas (doble clic / doble callback).
      if (enCursoRef.current) return
      enCursoRef.current = true
      setError(null)
      setFase('autenticando')

      try {
        const res = await googleLogin(idToken, rol)
        if (!montadoRef.current) return
        // Si la página define onSuccess, ella controla el mensaje y el
        // redireccionamiento (se conserva el comportamiento actual).
        if (onSuccess) {
          onSuccess(res)
        } else {
          toast.success('Bienvenido a Cordalia')
          navigate(redirectTo)
        }
        setFase('listo')
      } catch (err) {
        if (!montadoRef.current) return
        const info = describirError(err)
        setError(info)
        setFase('error_api')
        toast.error(info.titulo, info.detalle ? { description: info.detalle } : undefined)
      } finally {
        enCursoRef.current = false
      }
    },
    [googleLogin, rol, onSuccess, navigate, redirectTo],
  )

  // Mantiene el callback más reciente sin obligar a re-renderizar el botón.
  useEffect(() => {
    manejarCredencialRef.current = manejarCredencial
  }, [manejarCredencial])

  // Carga el SDK y renderiza el botón oficial.
  // Se ejecuta UNA sola vez por montaje (y al pulsar Reintentar): re-ejecutarlo
  // crear cientos de veces el botón y vacía el contenedor en bucle.
  useEffect(() => {
    // Crea una sesión de render atada a ESTE montaje, de modo que el desmontaje
    // de StrictMode (montar -> desmontar -> montar) no pueda cancelar el efecto
    // del montaje vigente, ni dejar el boton del montaje anterior en el DOM.
    const sesion = { cancelado: false }
    sesionRef.current = sesion
    let control = null
    const container = contenedorRef.current
    if (!container) return undefined

    setFase('cargando')
    setError(null)

    renderGoogleButton(container, {
      clientId: GOOGLE_CLIENT_ID,
      text: textoBoton,
      locale: 'es',
      sesion,
      onCredential: (credential) => {
        if (!sesion.cancelado) manejarCredencialRef.current?.(credential)
      },
    })
      .then((ctrl) => {
        if (sesion.cancelado) {
          ctrl.destroy()
          return
        }
        control = ctrl
        if (montadoRef.current) setFase('listo')
      })
      .catch((err) => {
        if (sesion.cancelado || !montadoRef.current) return
        setError({ titulo: 'No se pudo cargar Google', detalle: err?.message || null })
        setFase('error_sdk')
      })

    return () => {
      sesion.cancelado = true
      if (control) control.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configurado, intento])

  const cargando = fase === 'cargando'
  const autenticando = fase === 'autenticando'
  const ocupado = cargando || autenticando

  const reintentar = () => {
    enErrorRef.current = false
    setError(null)
    setIntento((n) => n + 1)
  }

  const avisoDesarrollo = () => {
    toast.info('Inicio con Google en modo desarrollo', {
      description:
        'Para habilitar el botón de Google en vivo, agrega tu Client ID en VITE_GOOGLE_CLIENT_ID dentro del archivo .env.',
    })
  }

  return (
    <div className={className}>
      <div className="relative">
        {/* Contenedor dedicado donde Google dibuja su botón oficial */}
        <div
          ref={contenedorRef}
          role="group"
          aria-label={label}
          className="flex min-h-[46px] w-full items-center justify-center"
        />

        {ocupado && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-full border border-cream-300 bg-white/95">
            <Loader2 className="w-4 h-4 animate-spin text-moss-700" />
            <span className="text-xs sm:text-sm font-medium text-dark-600">
              {autenticando ? 'Conectando con Google...' : 'Cargando Google...'}
            </span>
          </div>
        )}

        {fase === 'sin_configurar' && (
          <button
            type="button"
            onClick={avisoDesarrollo}
            className="absolute inset-0 w-full py-3.5 px-6 bg-white hover:bg-cream-100/70 border border-cream-300 text-dark-800 font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow hover:-translate-y-0.5 cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
              />
            </svg>
            <span className="text-sm sm:text-base">{label}</span>
          </button>
        )}
      </div>

      {fase === 'error_sdk' && (
        <div className="mt-3 flex flex-col items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-amber-900">{error?.titulo}</p>
              {error?.detalle && <p className="text-xs text-amber-800 mt-0.5">{error.detalle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={reintentar}
            data-testid="google-reintentar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-moss-800 hover:text-moss-950 hover:underline cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {fase === 'error_api' && error && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-red-900" data-testid="google-error-titulo">
              {error.titulo}
            </p>
            {error.detalle && <p className="text-xs text-red-800 mt-0.5">{error.detalle}</p>}
            <p className="text-[11px] text-red-700/80 mt-1">Puedes intentarlo de nuevo con el botón de Google.</p>
          </div>
        </div>
      )}
    </div>
  )
}
