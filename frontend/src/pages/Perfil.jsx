import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User, Mail, Lock, Shield, Save, Loader2, CheckCircle2, Phone, MapPin,
  Info, Camera, Trash2, Percent, Ticket, Wallet, CalendarDays, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { authAPI, inscripcionesAPI } from '../services/api'
import { formatMoney } from './negocios/businessUtils'

const inputBase =
  'w-full pl-10 pr-4 py-3 rounded-xl border border-dark-200 text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white'

const INTERESES_OPCIONES = [
  'Naturaleza', 'Playa', 'Aventura', 'Cultura', 'Gastronomía',
  'Historia', 'Ecoturismo', 'Senderismo', 'Ciudad', 'Relax',
]

const PREFERENCIAS_OPCIONES = [
  'Solo', 'En pareja', 'Con familia', 'Con amigos', 'Aventura',
  'Relax', 'Económico', 'Fotografía', 'Lujo', 'Gastronomía',
]

function toArray(value) {
  if (!value) return []
  return String(value)
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

const FOTO_MAX = 1024 * 1024 * 2

function formatFechaPago(fecha) {
  if (!fecha) return null
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('es-CO', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatoSalida(i) {
  if (!i?.salida_fecha) return 'Sin fecha'
  const fecha = new Date(i.salida_fecha + 'T00:00:00')
  const base = Number.isNaN(fecha.getTime())
    ? i.salida_fecha
    : fecha.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  return i.salida_hora ? `${base} · ${i.salida_hora}` : base
}

const ESTADO_BADGE = {
  pagada: 'bg-emerald-100 text-emerald-700',
  pendiente: 'bg-amber-100 text-amber-700',
  fallida: 'bg-orange-100 text-orange-700',
  cancelada: 'bg-dark-100 text-dark-500',
  expirada: 'bg-red-100 text-red-600',
}

const ESTADO_LABEL = {
  pagada: 'Pagada',
  pendiente: 'Pendiente de pago',
  fallida: 'Pago fallido',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
}

function InscripcionCard({ insc }) {
  const estado = insc.estado
  return (
    <div className="rounded-xl border border-dark-100 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
        {estado === 'pagada' ? <CheckCircle2 className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/planes/${insc.plan_id}`} className="font-semibold text-dark-900 hover:text-primary-700 transition-colors">
            {insc.plan_nombre}
          </Link>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${ESTADO_BADGE[estado] || 'bg-dark-100 text-dark-500'}`}>
            {ESTADO_LABEL[estado] || estado}
          </span>
        </div>
        <p className="text-xs text-dark-500 mt-0.5">{insc.business_nombre}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-dark-600 mt-1">
          <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3 text-primary-500" /> {formatoSalida(insc)}</span>
          <span className="inline-flex items-center gap-1"><User className="w-3 h-3 text-primary-500" /> {insc.personas} {Number(insc.personas) === 1 ? 'persona' : 'personas'}</span>
          <span className="font-semibold">{formatMoney(insc.precio_total)}</span>
        </div>
        {insc.pago_referencia && (
          <p className="text-[11px] text-dark-400 mt-0.5">Ref: <span className="font-mono">{insc.pago_referencia}</span></p>
        )}
      </div>
      <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
        {estado === 'pendiente' && insc.fecha_limite_pago && (
          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
            Paga antes de {formatFechaPago(insc.fecha_limite_pago)}
          </span>
        )}
        {estado === 'fallida' && (
          <span className="text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1">
            Puedes reintentar el pago
          </span>
        )}
        <Link
          to={`/planes/${insc.plan_id}`}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            ['pendiente', 'fallida'].includes(estado)
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-dark-50 text-dark-600 border border-dark-100 hover:border-primary-300'
          }`}
        >
          {['pendiente', 'fallida'].includes(estado) ? 'Pagar / Ver cupo' : 'Ver plan'}
        </Link>
      </div>
    </div>
  )
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Perfil() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    avatar_url: user?.avatar_url || '',
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    ciudad: user?.ciudad || '',
    bio: user?.bio || '',
    intereses_turisticos: user?.intereses_turisticos || '',
    preferencias_viaje: user?.preferencias_viaje || '',
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [insc, setInsc] = useState({ pendientes: [], pagadas: [], historial: [], cargando: true })

  useEffect(() => {
    let activo = true
    inscripcionesAPI
      .misInscripciones()
      .then((res) => {
        if (!activo) return
        const d = res.data || {}
        setInsc({
          pendientes: d.pendientes || [],
          pagadas: d.pagadas || [],
          historial: d.historial || [],
          cargando: false,
        })
      })
      .catch(() => {
        if (activo) setInsc((s) => ({ ...s, cargando: false }))
      })
    return () => {
      activo = false
    }
  }, [])

  const interesesSel = toArray(form.intereses_turisticos)
  const preferenciasSel = toArray(form.preferencias_viaje)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  const toggleTag = (value, list, setter) => {
    const arr = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value]
    setter(arr.join(', '))
    setSaved(false)
  }

  const toggleInteres = (v) => toggleTag(v, interesesSel, (s) => {
    setForm((prev) => ({ ...prev, intereses_turisticos: s }))
  })

  const togglePreferencia = (v) => toggleTag(v, preferenciasSel, (s) => {
    setForm((prev) => ({ ...prev, preferencias_viaje: s }))
  })

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > FOTO_MAX) {
      toast.error('La foto debe pesar menos de 2 MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido')
      return
    }
    try {
      const dataUrl = await readAsDataURL(file)
      setForm((prev) => ({ ...prev, avatar_url: dataUrl }))
      setSaved(false)
    } catch {
      toast.error('No se pudo leer la imagen')
    }
  }

  async function removeAvatar() {
    setForm((prev) => ({ ...prev, avatar_url: '' }))
    setSaved(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const nombreCompleto = `${form.nombre} ${form.apellido}`.trim() || user?.nombre || ''

  // Indicador de completitud del perfil
  const camposCompletos = [
    form.nombre, form.apellido, form.telefono, form.ciudad,
    form.bio, form.avatar_url, form.intereses_turisticos, form.preferencias_viaje,
  ].filter(Boolean).length
  const totalCampos = 8
  const completitud = Math.round((camposCompletos / totalCampos) * 100)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const body = { ...form }
    delete body.password
    if (form.password.trim()) {
      body.password = form.password
    }

    try {
      const res = await authAPI.updateProfile(user._id || user.id, body)
      const updatedUser = res.data?.usuario || res.data
      if (updatedUser) {
        updateUser(updatedUser)
      } else {
        updateUser({ ...body })
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

  const Badge = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
        active
          ? 'bg-primary-600 text-white border-primary-600'
          : 'bg-white text-dark-600 border-dark-200 hover:border-primary-400 hover:text-primary-700'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="min-h-screen bg-dark-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-dark-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Mi Perfil
          </h1>
          <p className="text-dark-500 mb-8">Gestiona tu información personal, foto y preferencias de viaje.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: avatar + completitud */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-2xl border border-dark-100 p-6 text-center sticky top-24">
              <div className="relative w-28 h-28 mx-auto mb-4">
                <div
                  className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-ocean-500 flex items-center justify-center ring-4 ring-white shadow"
                  onMouseEnter={() => {}}
                >
                  {form.avatar_url ? (
                    <img
                      src={form.avatar_url}
                      alt={nombreCompleto}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const fallback = e.currentTarget.nextElementSibling
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  {!form.avatar_url ? (
                    <User className="w-12 h-12 text-white/80" />
                  ) : null}
                </div>
                <span className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white border border-dark-100 flex items-center justify-center text-dark-500 shadow-sm">
                  <Camera className="w-4 h-4" />
                </span>
              </div>

              <h3 className="font-semibold text-dark-900 text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                {nombreCompleto || 'Sin nombre'}
              </h3>
              <p className="text-dark-500 text-sm mt-1">
                {form.ciudad || 'Ciudad pendiente'}
              </p>

              <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2">
                <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer">
                  <Camera className="w-4 h-4" />
                  {form.avatar_url ? 'Cambiar foto' : 'Subir foto'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFile}
                  />
                </label>
                {form.avatar_url && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Quitar
                  </button>
                )}
              </div>
              <p className="text-xs text-dark-400 mt-2">JPG o PNG, máx 2 MB. Visible solo para ti.</p>

              {/* Completitud del perfil */}
              <div className="mt-6 pt-5 border-t border-dark-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-dark-700">
                    <Percent className="w-4 h-4 text-primary-500" />
                    Perfil completado
                  </span>
                  <span className="text-sm font-bold text-dark-900">{completitud}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-dark-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-ocean-500 transition-all duration-500"
                    style={{ width: `${completitud}%` }}
                  />
                </div>
                <p className="text-xs text-dark-400 mt-2">
                  {completitud === 100
                    ? '¡Perfil completo!'
                    : 'Completa tus datos para un mejor perfil turístico.'}
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-dark-100 text-left text-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="inline-flex items-center gap-1.5 text-dark-700 font-semibold">
                    <Shield className="w-4 h-4 text-primary-500" />
                    Detalles
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-dark-500">Rol</span>
                    <span className="text-dark-700 font-medium">
                      {user?.rol === 'ADMIN' ? 'Administrador' : user?.rol === 'BUSINESS' ? 'Negocio' : 'Turista'}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-dark-500 pt-2 border-t border-dark-100">
                    <p className="italic text-dark-400">Datos privados: solo tú puedes verlos.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Columna derecha: formulario e inscripciones */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2 space-y-8"
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-dark-100 p-6 md:p-8 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-dark-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  Información personal
                </h2>
                <p className="text-sm text-dark-400">
                  Tu email y teléfono son privados: solo tú puedes verlos y editarlos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-dark-700 mb-1.5">Nombre</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input id="nombre" name="nombre" type="text" required value={form.nombre} onChange={handleChange} className={inputBase} placeholder="Tu nombre" />
                  </div>
                </div>
                <div>
                  <label htmlFor="apellido" className="block text-sm font-medium text-dark-700 mb-1.5">Apellido</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input id="apellido" name="apellido" type="text" value={form.apellido} onChange={handleChange} className={inputBase} placeholder="Tu apellido" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-dark-700 mb-1.5">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} className={inputBase} placeholder="tu@email.com" />
                  </div>
                </div>
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-dark-700 mb-1.5">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input id="telefono" name="telefono" type="tel" value={form.telefono} onChange={handleChange} className={inputBase} placeholder="+57 300 000 0000" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="ciudad" className="block text-sm font-medium text-dark-700 mb-1.5">Ciudad / Municipio</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input id="ciudad" name="ciudad" type="text" value={form.ciudad} onChange={handleChange} className={inputBase} placeholder="Montería, Lorica, Cereté..." />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-dark-700 mb-1.5">Sobre mí</label>
                <div className="relative">
                  <Info className="absolute left-3 top-3 w-4 h-4 text-dark-400" />
                  <textarea id="bio" name="bio" rows={3} value={form.bio} onChange={handleChange} className={`${inputBase} resize-none`} placeholder="Cuéntanos sobre ti..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2.5">Intereses turísticos</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESES_OPCIONES.map((op) => (
                    <Badge
                      key={op}
                      active={interesesSel.includes(op)}
                      onClick={() => toggleInteres(op)}
                    >
                      {op}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2.5">Preferencias de viaje</label>
                <div className="flex flex-wrap gap-2">
                  {PREFERENCIAS_OPCIONES.map((op) => (
                    <Badge
                      key={op}
                      active={preferenciasSel.includes(op)}
                      onClick={() => togglePreferencia(op)}
                    >
                      {op}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-dark-700 mb-1.5">
                  Nueva contraseña <span className="text-dark-400 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input id="password" name="password" type="password" value={form.password} onChange={handleChange} className={inputBase} placeholder="Dejar en blanco para no cambiar" />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

            {/* Sección Mis Inscripciones */}
            <div className="bg-white rounded-2xl border border-dark-100 p-6 md:p-8">
              <h2 className="text-xl font-bold text-dark-900 mb-6 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <Ticket className="w-5 h-5 text-primary-600" /> Mis inscripciones
              </h2>

              {insc.cargando ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-dark-400">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                  <p className="text-sm">Cargando inscripciones...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {insc.pendientes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Pendientes de pago
                      </h3>
                      <div className="space-y-3">
                        {insc.pendientes.map(i => <InscripcionCard key={i.id} insc={i} />)}
                      </div>
                    </div>
                  )}

                  {insc.pagadas.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Pagadas y activas
                      </h3>
                      <div className="space-y-3">
                        {insc.pagadas.map(i => <InscripcionCard key={i.id} insc={i} />)}
                      </div>
                    </div>
                  )}

                  {insc.historial.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-dark-600 mb-3 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> Historial (canceladas/expiradas)
                      </h3>
                      <div className="space-y-3 opacity-80">
                        {insc.historial.map(i => <InscripcionCard key={i.id} insc={i} />)}
                      </div>
                    </div>
                  )}

                  {insc.pendientes.length === 0 && insc.pagadas.length === 0 && insc.historial.length === 0 && (
                    <div className="text-center py-8 rounded-xl bg-dark-50 border border-dark-100">
                      <Ticket className="w-10 h-10 text-dark-300 mx-auto mb-3" />
                      <p className="text-sm text-dark-600 font-medium">Aún no tienes inscripciones.</p>
                      <p className="text-xs text-dark-400 mt-1">Explora nuestros planes y reserva tu lugar.</p>
                      <Link to="/planes" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
                        Explorar planes
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
