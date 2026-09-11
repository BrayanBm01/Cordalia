import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Ticket, MapPin, Clock, ArrowRight, ImageOff, Star, Users, Map } from 'lucide-react'
import { planesAPI, lugaresAPI } from '../../services/api'
import { formatMoney } from '../negocios/businessUtils'
import { TIPO_PLAN_LABEL, formatDuracion, planPrecios } from '../negocios/planUtils'

const DURACION_OPCIONES = [
  { label: 'Cualquier duración', dias_min: null, dias_max: null },
  { label: '1 día', dias_min: 1, dias_max: 1 },
  { label: '2-3 días', dias_min: 2, dias_max: 3 },
  { label: '4-5 días', dias_min: 4, dias_max: 5 },
  { label: '6+ días', dias_min: 6, dias_max: null },
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-dark-100">
      <div className="aspect-[16/10] bg-dark-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-dark-100 rounded-full w-3/4 animate-pulse" />
        <div className="h-4 bg-dark-100 rounded-full w-1/2 animate-pulse" />
        <div className="h-10 bg-dark-100 rounded-xl w-full animate-pulse mt-5" />
      </div>
    </div>
  )
}

export function PlanCard({ plan, index }) {
  const [imgError, setImgError] = useState(false)
  const navigate = useNavigate()
  const portada = plan.plan_imagenes?.find((i) => i.is_primary) || plan.plan_imagenes?.[0]
  const { efectivo, anterior, descuento } = planPrecios(plan)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link
        to={`/planes/${plan.id}`}
        className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-dark-100 hover:shadow-xl hover:border-primary-200 transition-all duration-300"
      >
        <div className="aspect-[16/10] overflow-hidden bg-dark-100 relative">
          {portada && !imgError ? (
            <img
              src={portada.url}
              alt={plan.nombre}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-dark-400 gap-2">
              <ImageOff className="w-10 h-10" />
              <span className="text-sm">Sin imagen</span>
            </div>
          )}
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-xs font-semibold text-primary-700 shadow-sm">
            {TIPO_PLAN_LABEL[plan.tipo_plan] || plan.tipo_plan}
          </span>
          {descuento > 0 && (
            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-semibold shadow-sm">
              -{descuento}%
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-dark-900 group-hover:text-primary-700 transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
              {plan.nombre}
            </h3>
          </div>

          {(plan.destino_lugar || plan.destino) && (
            <div className="flex items-center gap-1.5 mt-1 text-dark-500 text-sm">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-primary-600 font-medium">{plan.destino_lugar || plan.destino}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 text-sm text-dark-500">
            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDuracion(plan.duracion_dias, plan.duracion_noches)}</span>
            {plan.negocio_nombre && (
              <span
                role="link"
                title={`Ir a ${plan.negocio_nombre}`}
                className="inline-flex items-center gap-1 hover:text-primary-600 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  navigate(`/negocios/${plan.business_id}`)
                }}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="truncate">{plan.negocio_nombre}</span>
              </span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-dark-100 flex items-center justify-between">
            <div>
              {anterior && <span className="block text-xs text-dark-400 line-through">{formatMoney(anterior)}</span>}
              <span className="text-base font-bold text-dark-900">
                {efectivo ? formatMoney(efectivo) : 'Consultar'}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-primary-600 font-medium text-sm group-hover:text-primary-700 transition-colors">
              Ver plan
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function PlanesPublicos() {
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [destino, setDestino] = useState('')
  const [duracion, setDuracion] = useState('')
  const [tipo, setTipo] = useState('')
  const [soloPromos, setSoloPromos] = useState(false)
  const [incluyeFiltro, setIncluyeFiltro] = useState([])
  const [lugares, setLugares] = useState([])

  useEffect(() => {
    lugaresAPI.getAll().then((r) => setLugares(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {
      promos: soloPromos ? '1' : '',
    }
    planesAPI
      .list(params)
      .then((res) => setPlanes(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.message || 'Error al cargar los planes'))
      .finally(() => setLoading(false))
  }, [soloPromos])

  const dur = DURACION_OPCIONES.find((d) => d.label === duracion)

  const filtrados = planes.filter((p) => {
    const term = search.trim().toLowerCase()
    if (term) {
      const hay =
        p.nombre?.toLowerCase().includes(term) ||
        p.descripcion?.toLowerCase().includes(term) ||
        (p.destino_lugar || p.destino || '')?.toLowerCase().includes(term)
      if (!hay) return false
    }
    if (destino && String(p.destination_id) !== String(destino)) return false
    if (dur) {
      const d = Number(p.duracion_dias) || 0
      if (dur.dias_min != null && d < dur.dias_min) return false
      if (dur.dias_max != null && d > dur.dias_max) return false
    }
    if (tipo && p.tipo_plan !== tipo) return false
    if (incluyeFiltro.length > 0) {
      const inc = (p.incluye || []).map((x) => x.toLowerCase())
      if (!incluyeFiltro.every((f) => inc.includes(f))) return false
    }
    return true
  })

  function toggleIncluye(label) {
    setIncluyeFiltro((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]))
  }

  return (
    <div className="min-h-screen bg-dark-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-ocean-900 via-primary-900 to-primary-950">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-sand-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-96 h-96 bg-ocean-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Ticket className="w-4 h-4 text-sand-300" />
              <span className="text-white/80 text-sm font-medium">Planes, paquetes y experiencias</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Explora planes turísticos
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
              Elige tu próxima aventura. Contacta directamente al negocio: los precios son informativos, no hay pagos en la plataforma.
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar plan, destino o negocio..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-dark-900 placeholder:text-dark-400 shadow-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-base"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl border border-dark-100 p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-dark-500 mb-1">Destino</label>
              <select value={destino} onChange={(e) => setDestino(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900">
                <option value="">Todos los destinos</option>
                {lugares.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">Duración</label>
              <select value={duracion} onChange={(e) => setDuracion(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900">
                {DURACION_OPCIONES.map((o) => (
                  <option key={o.label} value={o.label}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900">
                <option value="">Todos</option>
                {Object.entries(TIPO_PLAN_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setSoloPromos(!soloPromos)}
                className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                  soloPromos ? 'bg-red-50 border-red-300 text-red-700' : 'border-dark-200 text-dark-600 hover:border-red-300'
                }`}
              >
                <Star className="w-4 h-4" />
                Solo con promociones
              </button>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xs text-dark-500 mb-2">Qué incluye:</p>
            <div className="flex flex-wrap gap-2">
              {['Transporte', 'Alojamiento', 'Desayuno', 'Almuerzo', 'Guía local', 'Entradas'].map((label) => (
                <button
                  key={label}
                  onClick={() => toggleIncluye(label)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
                    incluyeFiltro.includes(label)
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-50 text-dark-600 hover:bg-primary-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">{error}</div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-100 flex items-center justify-center">
              <Map className="w-8 h-8 text-dark-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-700 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              No se encontraron planes
            </h3>
            <p className="text-dark-500 max-w-md mx-auto">
              {search || destino || duracion || tipo || incluyeFiltro.length
                ? 'Ajusta los filtros e intenta de nuevo.'
                : 'Aún no hay planes publicados. Vuelve pronto.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-dark-500 text-sm mb-8">
              {filtrados.length} plan{filtrados.length !== 1 ? 'es' : ''} disponible{filtrados.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtrados.map((plan, index) => (
                <PlanCard key={plan.id} plan={plan} index={index} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}