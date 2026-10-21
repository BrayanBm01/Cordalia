import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Compass,
  Store,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Sprout,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import GoogleButton from '../components/GoogleButton'
import { VENDOR_MEMBERSHIP_PLAN } from '../services/mercadoPago'

const registerSchema = z
  .object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().min(1, 'El email es requerido').email('Ingresa un email válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

const TIPOS_CUENTA = [
  {
    id: 'TOURIST',
    title: 'Viajero / Turista',
    badge: 'Gratuito',
    subtitle: 'Explora destinos, guarda favoritos y reserva experiencias sostenibles.',
    icon: Compass,
  },
  {
    id: 'BUSINESS',
    title: 'Vendedor / Negocio',
    badge: 'Prueba gratuita 7 días',
    subtitle: 'Publica tus planes turísticos, tours y experiencias verificadas.',
    icon: Store,
  },
]

export default function Registro() {
  const [tipo, setTipo] = useState('TOURIST')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      // El backend es la autoridad sobre el rol: solo admite TOURIST o
      // BUSINESS. Una cuenta de vendedor recibe la prueba gratuita de
      // 7 días (calculada en el servidor).
      const rolRegistro = tipo === 'BUSINESS' ? 'BUSINESS' : 'TOURIST'

      await registerUser(data.nombre, data.email, data.password, rolRegistro)

      if (tipo === 'BUSINESS') {
        toast.success('¡Bienvenido a Cordalia!', {
          description:
            'Tu cuenta de vendedor se creó con una prueba gratuita de 7 días. Inicia sesión para publicar tus planes.',
        })
      } else {
        toast.success('Cuenta creada correctamente', {
          description: 'Inicia sesión con tus credenciales para comenzar tu viaje.',
        })
      }

      // El registro no inicia sesión: el backend no devuelve token en este
      // endpoint, por lo que el usuario entra con sus credenciales.
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Error al crear la cuenta')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoogleSuccess() {
    toast.success('Cuenta verificada con Google', {
      description: 'Ya puedes comenzar tu viaje por Córdoba.',
    })
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col lg:flex-row">
      {/* ── Left side: Editorial Brand Showcase (Desktop) ─────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-moss-950 flex-col justify-between p-12 xl:p-16">
        {/* Background Image con overlay TerraGo */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{ backgroundImage: 'url("/img/hero/cta-nature.jpg")' }}
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
            <Sparkles className="w-4 h-4 text-moss-400" />
            FORMA PARTE DEL CAMBIO
          </span>
          <h2
            className="text-4xl xl:text-5xl font-bold text-white mb-5 leading-[1.12] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Conecta con la riqueza natural de Córdoba{' '}
            <span className="font-serif italic font-normal text-moss-200">
              y apoya a su gente
            </span>
          </h2>
          <p className="text-stone-300 text-base leading-relaxed mb-8">
            Regístrate hoy para reservar experiencias comunitarias, guardar tus destinos favoritos y formar parte de una red turística responsable.
          </p>

          {/* Trust bullets */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3 text-sm text-stone-200">
              <span className="w-5 h-5 rounded-full bg-moss-800/90 text-moss-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <span>100% de experiencias comprometidas con la sostenibilidad</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-200">
              <span className="w-5 h-5 rounded-full bg-moss-800/90 text-moss-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <span>Arquitectura comercial segura lista para Mercado Pago</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-200">
              <span className="w-5 h-5 rounded-full bg-moss-800/90 text-moss-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <span>Comunidad de viajeros y operadores certificados de Córdoba</span>
            </div>
          </div>
        </div>

        {/* Footer caligráfico */}
        <div className="relative z-10 flex items-center justify-between text-xs text-stone-400 border-t border-white/10 pt-4">
          <span>© 2026 Cordalia Turismo Sostenible</span>
          <span className="font-[family-name:var(--font-script)] text-xl text-moss-300/90">
            Turismo que transforma
          </span>
        </div>
      </div>

      {/* ── Right side: Registration Form (Responsive) ────────────────── */}
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
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-moss-700 mb-2">
                <Sprout className="w-3.5 h-3.5" />
                NUEVA CUENTA
              </span>
              <h1
                className="text-3xl sm:text-4xl font-bold text-dark-900 tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Crear cuenta
              </h1>
              <p className="text-dark-500 text-sm sm:text-base mt-2">
                Selecciona tu tipo de perfil y completa tus datos.
              </p>
            </div>

            {/* Selector de Tipo de Cuenta */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {TIPOS_CUENTA.map((t) => {
                const Icon = t.icon
                const selected = tipo === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipo(t.id)}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selected
                        ? 'border-moss-800 bg-moss-50/70 shadow-sm'
                        : 'border-cream-300 bg-white hover:border-moss-300 hover:bg-cream-100/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            selected ? 'bg-moss-900 text-white' : 'bg-cream-100 text-dark-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selected
                              ? 'bg-moss-900 text-moss-100'
                              : 'bg-cream-200 text-dark-600'
                          }`}
                        >
                          {t.badge}
                        </span>
                      </div>
                      <p
                        className={`font-bold text-sm ${
                          selected ? 'text-moss-950' : 'text-dark-900'
                        }`}
                      >
                        {t.title}
                      </p>
                      <p className="text-xs text-dark-500 mt-1 leading-snug line-clamp-2">
                        {t.subtitle}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Aviso Informativo de Arquitectura de Vendedor con Mercado Pago */}
            <AnimatePresence>
              {tipo === 'BUSINESS' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cream-100 to-cream-200/70 border border-moss-300/70 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-moss-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <CreditCard className="w-4 h-4 text-moss-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                          <h4 className="font-bold text-sm text-moss-950 flex items-center gap-1.5">
                            <span>{VENDOR_MEMBERSHIP_PLAN.nombre}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              Mercado Pago
                            </span>
                          </h4>
                          <span className="text-xs font-bold text-moss-900">
                            $49.900 COP / mes
                          </span>
                        </div>
                        <p className="text-xs text-dark-600 leading-relaxed mb-3">
                          Tu cuenta de vendedor se activa con una <strong>prueba gratuita de 7 días</strong>.
                          Durante la prueba puedes publicar tus planes turísticos, tours y experiencias.
                          Después podrás contratar la membresía mensual con Mercado Pago.
                        </p>

                        <div className="p-2.5 rounded-xl bg-white/80 border border-cream-300/80 text-[11px] text-dark-700 flex items-start gap-2">
                          <Info className="w-4 h-4 text-moss-700 shrink-0 mt-0.5" />
                          <span>
                            <strong>Sin tarjeta ahora:</strong> la prueba se activa sola al crear la
                            cuenta y <strong>no se reinicia</strong> al volver a iniciar sesión. Tu
                            perfil y tus datos se conservan aunque decidas no contratar.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulario */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-xs sm:text-sm font-semibold text-dark-800 mb-1.5">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    id="nombre"
                    type="text"
                    autoComplete="name"
                    placeholder="Tu nombre y apellido"
                    className={`w-full pl-11 pr-4 py-3 rounded-2xl border bg-white text-dark-900 text-sm placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-moss-600/20 focus:border-moss-700 transition-colors shadow-sm ${
                      errors.nombre ? 'border-red-300 ring-2 ring-red-100' : 'border-cream-300'
                    }`}
                    {...register('nombre')}
                  />
                </div>
                {errors.nombre && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">{errors.nombre.message}</p>
                )}
              </div>

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
                <label htmlFor="password" className="block text-xs sm:text-sm font-semibold text-dark-800 mb-1.5">
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs sm:text-sm font-semibold text-dark-800 mb-1.5"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-11 py-3 rounded-2xl border bg-white text-dark-900 text-sm placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-moss-600/20 focus:border-moss-700 transition-colors shadow-sm ${
                      errors.confirmPassword
                        ? 'border-red-300 ring-2 ring-red-100'
                        : 'border-cream-300'
                    }`}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {errors.confirmPassword.message}
                  </p>
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
                    <span>Creando cuenta...</span>
                  </>
                ) : (
                  <span>Crear cuenta de {tipo === 'BUSINESS' ? 'Vendedor' : 'Viajero'}</span>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-cream-300" />
              <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">o</span>
              <div className="flex-1 h-px bg-cream-300" />
            </div>

            <GoogleButton
              rol={tipo}
              onSuccess={handleGoogleSuccess}
              label={tipo === 'BUSINESS' ? 'Registrarme como vendedor con Google' : 'Registrarme con Google'}
            />

            <div className="mt-8 text-center pt-6 border-t border-cream-200">
              <p className="text-xs sm:text-sm text-dark-600">
                ¿Ya tienes una cuenta registrada?{' '}
                <Link
                  to="/login"
                  className="text-moss-800 hover:text-moss-950 font-bold hover:underline transition-colors ml-1"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
