import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, Loader2, Sprout, ShieldCheck, Compass, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { consumirAvisoSesion, suscribirAvisoSesion, SESION_INACTIVIDAD_MS } from '../utils/session'
import GoogleButton from '../components/GoogleButton'
import { rutaInicioPorRol } from '../utils/roles'

const loginSchema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Ingresa un email válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const mostrarAviso = () => {
      const minutos = Math.round(SESION_INACTIVIDAD_MS / 60000)
      toast.info('Tu sesión se cerró por inactividad', {
        description: `Por seguridad, tu sesión se cerró tras ${minutos} minutos sin actividad. Inicia sesión nuevamente para continuar.`,
      })
    }
    // Aviso pendiente (llegada desde otra vista) o expiración en vivo (401 /
    // inactividad con la vista abierta): siempre una única notificación.
    if (consumirAvisoSesion()) mostrarAviso()
    return suscribirAvisoSesion(mostrarAviso)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      const res = await login(data.email, data.password)
      const rol = res?.data?.usuario?.rol || user?.rol
      toast.success('Bienvenido de vuelta a Cordalia')
      // Cada rol entra a SU panel: el vendedor a su panel comercial
      // (prueba gratuita, planes y pagos), el administrador al suyo.
      navigate(rutaInicioPorRol(rol), { replace: true })
    } catch (err) {
      const msg = err.message || 'Error al iniciar sesión'
      if (msg.includes('sesión activa')) {
        toast.error('Ya hay una sesión activa', {
          description: 'Cierra la sesión actual antes de iniciar una nueva.',
        })
      } else if (msg.includes('Sesión cerrada')) {
        toast.info('Tu sesión fue cerrada', {
          description: 'Inicia sesión nuevamente para continuar.',
        })
      } else if (msg.includes('usa Google')) {
        // La cuenta se creó con Google y no tiene contraseña local.
        toast.error('Esta cuenta usa Google', {
          description:
            'Entra con "Continuar con Google" o establece tu propia contraseña para entrar con correo.',
          action: {
            label: 'Establecer contraseña',
            onClick: () => navigate('/restablecer-contrasena'),
          },
        })
      } else {
        toast.error(msg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col lg:flex-row">
      {/* ── Left side: Editorial Brand Showcase (Desktop) ─────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-moss-950 flex-col justify-between p-12 xl:p-16">
        {/* Background Image con overlay TerraGo */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{ backgroundImage: 'url("/img/hero/hero-nature.jpg")' }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-moss-950 via-moss-950/70 to-moss-900/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        </div>

        {/* Brand header */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-full bg-moss-900 border border-moss-700/60 text-white flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105">
              <Sprout className="w-5 h-5 text-moss-200" />
            </div>
            <div>
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white block leading-none">
                Cordalia
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-moss-200/80 mt-1 block">
                Turismo Sostenible • Córdoba
              </span>
            </div>
          </Link>
        </div>

        {/* Hero editorial message */}
        <div className="relative z-10 max-w-lg my-auto py-12">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-moss-300 mb-4">
            <Compass className="w-4 h-4 text-moss-400" />
            VIAJA CON PROPÓSITO
          </span>
          <h2
            className="text-4xl xl:text-5xl font-bold text-white mb-5 leading-[1.12] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Descubre la magia de Córdoba{' '}
            <span className="font-serif italic font-normal text-moss-200">
              de forma consciente
            </span>
          </h2>
          <p className="text-stone-300 text-base leading-relaxed mb-8">
            Accede a tu cuenta para gestionar tus favoritos, reservar planes con operadores locales verificados y proteger la riqueza natural de nuestro territorio.
          </p>

          {/* Trust bullets */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3 text-sm text-stone-200">
              <span className="w-5 h-5 rounded-full bg-moss-800/90 text-moss-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <span>Operadores y experiencias 100% locales verificadas</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-200">
              <span className="w-5 h-5 rounded-full bg-moss-800/90 text-moss-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <span>Protección y apoyo a comunidades de ríos, ciénagas y playas</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-200">
              <span className="w-5 h-5 rounded-full bg-moss-800/90 text-moss-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <span>Gestión transparente de tus reservas e itinerarios</span>
            </div>
          </div>
        </div>

        {/* Footer caligráfico */}
        <div className="relative z-10 flex items-center justify-between text-xs text-stone-400 border-t border-white/10 pt-4">
          <span>© 2026 Cordalia Turismo Sostenible</span>
          <span className="font-[family-name:var(--font-script)] text-xl text-moss-300/90">
            Córdoba te espera
          </span>
        </div>
      </div>

      {/* ── Right side: Login Form (Responsive) ───────────────────────── */}
      <div className="flex-1 min-h-screen flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-16 sm:py-20">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-full bg-moss-900 text-white flex items-center justify-center shadow-sm">
              <Sprout className="w-5 h-5 text-moss-200" />
            </div>
            <div>
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-moss-950 block leading-none">
                Cordalia
              </span>
              <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-moss-700/80 mt-1 block">
                Turismo Sostenible • Córdoba
              </span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-moss-700 mb-2">
                <Sprout className="w-3.5 h-3.5" />
                BIENVENIDO DE VUELTA
              </span>
              <h1
                className="text-3xl sm:text-4xl font-bold text-dark-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Iniciar sesión
              </h1>
              <p className="text-dark-500 text-sm sm:text-base mt-2">
                Ingresa tus credenciales para acceder a tu cuenta de viajero.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-dark-800 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    className={`w-full pl-11 pr-4 py-3 rounded-2xl border bg-white text-dark-900 text-sm placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-moss-600/20 focus:border-moss-700 transition-colors shadow-sm ${
                      errors.email ? 'border-red-300 ring-2 ring-red-100' : 'border-cream-300'
                    }`}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs sm:text-sm font-semibold text-dark-800">
                    Contraseña
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-11 py-3 rounded-2xl border bg-white text-dark-900 text-sm placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-moss-600/20 focus:border-moss-700 transition-colors shadow-sm ${
                      errors.password ? 'border-red-300 ring-2 ring-red-100' : 'border-cream-300'
                    }`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-moss-900 hover:bg-moss-800 disabled:bg-moss-700 text-white font-semibold text-sm sm:text-base rounded-full transition-all duration-300 shadow-pill hover:shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-moss-200" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <span>Iniciar sesión</span>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-cream-300" />
              <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">o</span>
              <div className="flex-1 h-px bg-cream-300" />
            </div>

            {/* Google: el rol se conoce DESPUÉS de autenticarse, así que
                la redirección se decide en onSuccess. */}
            <GoogleButton
              label="Continuar con Google"
              onSuccess={(res) => {
                const rol = res?.data?.usuario?.rol
                toast.success('Bienvenido a Cordalia')
                navigate(rutaInicioPorRol(rol), { replace: true })
              }}
            />

            <div className="mt-8 text-center pt-6 border-t border-cream-200">
              <p className="text-xs sm:text-sm text-dark-600">
                ¿Aún no tienes una cuenta?{' '}
                <Link
                  to="/registro"
                  className="text-moss-800 hover:text-moss-950 font-bold hover:underline transition-colors ml-1"
                >
                  Regístrate aquí
                </Link>
              </p>
              <p className="text-xs sm:text-sm text-dark-500 mt-2">
                ¿Tu cuenta se creó con Google y quieres usar correo y contraseña?{' '}
                <Link
                  to="/restablecer-contrasena"
                  className="text-moss-800 hover:text-moss-950 font-semibold hover:underline transition-colors ml-1"
                >
                  Establece tu contraseña
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
