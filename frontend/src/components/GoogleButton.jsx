import { useState } from 'react'
import { toast } from 'sonner'
import { GOOGLE_CLIENT_ID } from '../services/api'
import { getGoogleIdToken } from '../services/google'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

export default function GoogleButton({
  rol = 'TOURIST',
  onSuccess,
  redirectTo = '/',
  label = 'Continuar con Google',
  className = '',
}) {
  const [loading, setLoading] = useState(false)
  const { googleLogin } = useAuth()
  const navigate = useNavigate()

  const googleConfigured = Boolean(
    GOOGLE_CLIENT_ID &&
    GOOGLE_CLIENT_ID !== 'tu_google_client_id.apps.googleusercontent.com'
  )

  const handleClick = async () => {
    if (!googleConfigured) {
      toast.info('Inicio con Google en modo desarrollo', {
        description:
          'Para habilitar el popup de Google en vivo, agrega tu Client ID en VITE_GOOGLE_CLIENT_ID dentro del archivo .env.',
      })
      return
    }

    setLoading(true)
    try {
      const idToken = await getGoogleIdToken(GOOGLE_CLIENT_ID)
      const res = await googleLogin(idToken, rol)
      toast.success('Bienvenido a Cordalia')
      if (onSuccess) {
        onSuccess(res)
      } else {
        navigate(redirectTo)
      }
    } catch (err) {
      const msg = err.message || 'Error al iniciar sesión con Google'
      if (msg.includes('sesión activa')) {
        toast.error('Ya hay una sesión activa', {
          description: 'Cierra la sesión actual antes de iniciar una nueva.',
        })
      } else if (msg.includes('cancelado') || msg.includes('popup')) {
        toast.info('Autenticación con Google cancelada')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-3.5 px-6 bg-white hover:bg-cream-100/70 border border-cream-300 text-dark-800 font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow hover:-translate-y-0.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-moss-700" />
          <span className="text-sm sm:text-base">Conectando con Google...</span>
        </>
      ) : (
        <>
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
          <span className="text-sm sm:text-base font-medium text-dark-800">{label}</span>
        </>
      )}
    </button>
  )
}
