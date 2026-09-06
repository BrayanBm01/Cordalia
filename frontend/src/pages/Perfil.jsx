import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Shield, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'

export default function Perfil() {
  const { user, updateUser } = useAuth()

  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const body = { nombre: form.nombre, email: form.email }
    if (form.password.trim()) {
      body.password = form.password
    }

    try {
      const res = await authAPI.updateProfile(user._id || user.id, body)
      const updatedUser = res.data?.usuario || res.data
      if (updatedUser) {
        updateUser(updatedUser)
      } else {
        updateUser({ nombre: form.nombre, email: form.email })
      }
      setForm((prev) => ({ ...prev, password: '' }))
      setSaved(true)
      toast.success('Perfil actualizado correctamente')
    } catch (err) {
      toast.error(err.message || 'Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            className="text-3xl md:text-4xl font-bold text-dark-900 mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Mi Perfil
          </h1>
          <p className="text-dark-500 mb-8">Gestiona tu información personal y configuración de cuenta.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-1"
          >
            <div className="bg-white rounded-2xl border border-dark-100 p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500 to-ocean-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>

              <h3 className="font-semibold text-dark-900 text-lg">{user?.nombre}</h3>
              <p className="text-dark-500 text-sm mt-1">{user?.email}</p>

              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                <Shield className="w-3 h-3" />
                {user?.rol === 'ADMIN' ? 'Administrador' : user?.rol === 'BUSINESS' ? 'Negocio' : 'Turista'}
              </div>

              <div className="mt-6 pt-5 border-t border-dark-100 space-y-3 text-sm text-left">
                <div className="flex justify-between">
                  <span className="text-dark-500">Rol</span>
                  <span className="text-dark-700 font-medium">{user?.rol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">Estado</span>
                  <span className="text-primary-600 font-medium">Activo</span>
                </div>
                {user?.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-dark-500">Miembro desde</span>
                    <span className="text-dark-700 font-medium">
                      {new Date(user.createdAt).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-2"
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-dark-100 p-6 md:p-8">
              <h2
                className="text-xl font-bold text-dark-900 mb-6"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Información personal
              </h2>

              <div className="space-y-5">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-dark-700 mb-1.5">
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      required
                      value={form.nombre}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-dark-200 text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                      placeholder="Tu nombre"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-dark-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-dark-200 text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-dark-700 mb-1.5">
                    Nueva contraseña <span className="text-dark-400 font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-dark-200 text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                      placeholder="Dejar en blanco para no cambiar"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Guardado
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
