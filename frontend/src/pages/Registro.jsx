import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { User, Mail, Lock, Eye, EyeOff, Loader2, MapPin, Compass, Store } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import GoogleButton from '../components/GoogleButton'

const registerSchema = z
  .object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().min(1, 'El email es requerido').email('Ingresa un email válido'),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

const TIPOS = [
  {
    id: 'TOURIST',
    title: 'Turista',
    subtitle: 'Quiero descubrir destinos y experiencias.',
    icon: Compass,
  },
  {
    id: 'BUSINESS',
    title: 'Negocio',
    subtitle: 'Tengo un negocio y quiero aparecer en Cordalia.',
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
      await registerUser(data.nombre, data.email, data.password, tipo)
      toast.success('Cuenta creada correctamente', {
        description: 'Ahora puedes iniciar sesión con tus credenciales.',
      })
      navigate('/login')
    } catch (err) {
      toast.error(err.message || 'Error al crear la cuenta')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoogleSuccess() {
    toast.success('Cuenta creada correctamente')
    navigate('/')
  }

  return (
    <div className="h-screen overflow-hidden flex">
      {/* Left side - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-900 via-ocean-900 to-primary-950 items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-ocean-500/10 blur-3xl" />
          <div className="absolute bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full bg-primary-400/10 blur-3xl" />
        </div>
        <div className="relative z-10 px-12 max-w-lg">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-ocean-500 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
              Cordalia
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-white mb-4 leading-tight">
            Únete a la comunidad
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            Crea tu cuenta para acceder a experiencias exclusivas, guardar tus planes favoritos
            y descubrir lo mejor de Córdoba.
          </p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-none px-6 pt-6 sm:pt-8">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-dark-900">
              Cordalia
            </span>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-dark-900 mb-2">
            Crear cuenta
          </h1>
          <p className="text-dark-500 mb-4">¿Qué tipo de cuenta quieres crear?</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-2 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md mx-auto"
          >

          {/* Tipo de cuenta */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {TIPOS.map((t) => {
              const Icon = t.icon
              const selected = tipo === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    selected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-dark-200 bg-white hover:border-primary-300'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${selected ? 'text-primary-600' : 'text-dark-400'}`} />
                  <p className={`font-semibold text-sm ${selected ? 'text-primary-700' : 'text-dark-800'}`}>
                    {t.title}
                  </p>
                  <p className="text-xs text-dark-500 mt-1">{t.subtitle}</p>
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-dark-700 mb-1.5">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="nombre"
                  type="text"
                  autoComplete="name"
                  placeholder="Tu nombre"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors ${
                    errors.nombre ? 'border-red-300' : 'border-dark-200'
                  }`}
                  {...register('nombre')}
                />
              </div>
              {errors.nombre && (
                <p className="mt-1.5 text-sm text-red-500">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors ${
                    errors.email ? 'border-red-300' : 'border-dark-200'
                  }`}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-12 py-3 rounded-xl border bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors ${
                    errors.password ? 'border-red-300' : 'border-dark-200'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-dark-700 mb-1.5"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-12 py-3 rounded-xl border bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors ${
                    errors.confirmPassword ? 'border-red-300' : 'border-dark-200'
                  }`}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-6 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-dark-200" />
            <span className="text-sm text-dark-400">o</span>
            <div className="flex-1 h-px bg-dark-200" />
          </div>

          <GoogleButton rol={tipo} onSuccess={handleGoogleSuccess} />

          <p className="mt-8 text-center text-dark-500">
            ¿Ya tienes una cuenta?{' '}
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              Iniciar sesión
            </Link>
          </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
