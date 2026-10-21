import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { KeyRound, Loader2, Mail, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react'
import { authAPI } from '../services/api'

/**
 * Recuperación / establecimiento de contraseña.
 *
 * - Sin token en la URL: pide el correo y solicita el enlace.
 * - Con token en la URL: permite establecer una contraseña nueva.
 *
 * El token es de UN SOLO USO y lo valida el backend.
 */
export default function RestablecerContrasena() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)

  async function solicitarEnlace(e) {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Ingresa tu correo')
      return
    }
    setLoading(true)
    try {
      const res = await authAPI.recuperarPassword(email.trim())
      setEnviado(true)
      toast.success(res.message || 'Si el correo está registrado, te enviamos un enlace.')
    } catch (err) {
      toast.error(err.message || 'No se pudo procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  async function guardarNuevaContrasena(e) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmar) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      const res = await authAPI.resetearPassword(token, password)
      toast.success(res.message || 'Contraseña establecida')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.message || 'No se pudo restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-3xl border border-cream-200 p-7 sm:p-9 shadow-sm"
      >
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-dark-500 hover:text-moss-800 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio de sesión
        </Link>

        <div className="w-12 h-12 rounded-2xl bg-moss-900 text-white flex items-center justify-center mb-5">
          <KeyRound className="w-6 h-6" />
        </div>

        <h1 className="text-2xl font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
          {token ? 'Establece tu contraseña' : 'Recupera tu contraseña'}
        </h1>
        <p className="text-sm text-dark-500 mt-2 mb-7">
          {token
            ? 'El enlace es válido por una hora y por un solo uso.'
            : 'Si tu cuenta se creó con Google, aquí puedes establecer tu propia contraseña.'}
        </p>

        {token ? (
          <form onSubmit={guardarNuevaContrasena} className="space-y-4">
            <div>
              <label htmlFor="nueva" className="block text-xs font-semibold text-dark-700 mb-1.5">
                Nueva contraseña
              </label>
              <input
                id="nueva"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-cream-200 text-sm bg-cream-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss-400/30"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label htmlFor="confirmar" className="block text-xs font-semibold text-dark-700 mb-1.5">
                Confirmar contraseña
              </label>
              <input
                id="confirmar"
                type="password"
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-cream-200 text-sm bg-cream-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss-400/30"
                placeholder="Repite la contraseña"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-moss-900 hover:bg-moss-800 disabled:bg-moss-700 text-white font-semibold text-sm sm:text-base rounded-full transition-all duration-300 shadow-pill disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin text-moss-200" /> Guardando...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Guardar contraseña</>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={solicitarEnlace} className="space-y-4">
            <div>
              <label htmlFor="correo" className="block text-xs font-semibold text-dark-700 mb-1.5">
                Tu correo
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  id="correo"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-cream-200 text-sm bg-cream-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss-400/30"
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || enviado}
              className="w-full py-3.5 px-6 bg-moss-900 hover:bg-moss-800 disabled:bg-moss-700 text-white font-semibold text-sm sm:text-base rounded-full transition-all duration-300 shadow-pill disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin text-moss-200" /> Enviando...</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Enviar enlace</>
              )}
            </button>

            {enviado && (
              <p className="text-xs text-dark-500 bg-cream-50 border border-cream-200 rounded-xl p-3">
                Si el correo está registrado, te enviamos un enlace para establecer tu contraseña.
                Revisa también la carpeta de spam.
              </p>
            )}
          </form>
        )}
      </motion.div>
    </div>
  )
}
