import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Ticket, MapPin, Clock, ArrowRight, Users, Sprout, Tag } from 'lucide-react'
import { planesAPI, lugaresAPI } from '../../services/api'
import { getPlanImagen } from '../../utils/media'
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
    <div className="bg-white rounded-[24px] p-4 overflow-hidden shadow-card border border-cream-200">
      <div className="aspect-[16/10] rounded-[18px] bg-cream-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-cream-200 rounded-full w-3/4 animate-pulse" />
        <div className="h-4 bg-cream-200 rounded-full w-1/2 animate-pulse" />
        <div className="h-10 bg-cream-200 rounded-xl w-full animate-pulse mt-5" />
      </div>
    </div>
  )
}

export function PlanCard({ plan, index = 0 }) {
  const navigate = useNavigate()
  const imagen = getPlanImagen(plan, index)
  const { efectivo, anterior, descuento } = planPrecios(plan)

  return (
    <div className="group bg-white rounded-[24px] p-4 border border-cream-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Photo Container */}
        <div className="relative aspect-[16/10] rounded-[18px] overflow-hidden bg-cream-200">
          <Link to={`/planes/${plan.id}`} className="block w-full h-full">
            <img
              src={imagen}
              alt={plan.nombre}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          </Link>

          {/* Floating Pill Tag Badge on Top Right */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {descuento > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-bold shadow-sm">
                -{descuento}%
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-moss-900 shadow-sm border border-black/5">
              <Sprout className="w-3 h-3 text-moss-600" />
              {TIPO_PLAN_LABEL[plan.tipo_plan] || 'Ecoturismo'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 pt-4">
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-dark-900 group-hover:text-moss-900 transition-colors leading-snug">
            <Link to={`/planes/${plan.id}`}>{plan.nombre}</Link>
          </h3>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-dark-500 font-medium">
            {(plan.destino_lugar || plan.destino) && (
              <span className="inline-flex items-center gap-1 text-moss-800 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-moss-700" />
                <span className="truncate">{plan.destino_lugar || plan.destino}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-moss-700" />
              <span>{formatDuracion(plan.duracion_dias, plan.duracion_noches)}</span>
            </span>

            {plan.negocio_nombre && (
              <span
                role="link"
                title={`Ver negocio ${plan.negocio_nombre}`}
                className="inline-flex items-center gap-1 hover:text-moss-900 cursor-pointer text-dark-600"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  navigate(`/negocios/${plan.business_id}`)
                }}
              >
                <Users className="w-3.5 h-3.5 text-moss-700" />
                <span className="truncate">{plan.negocio_nombre}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Pricing & Action */}
      <div className="p-3 pt-4 border-t border-cream-100 flex items-center justify-between mt-2">
        <div>
          {anterior && (
            <span className="block text-xs text-dark-400 line-through">
              {formatMoney(anterior)}
            </span>
          )}
          <span className="text-[11px] uppercase tracking-wider text-dark-400 font-semibold block">
            Precio
          </span>
          <span className="text-lg font-bold text-moss-950 font-[family-name:var(--font-display)]">
            {efectivo ? formatMoney(efectivo) : 'Consultar'}
          </span>
        </div>

        <Link
          to={`/planes/${plan.id}`}
          aria-label={`Ver detalles del plan ${plan.nombre}`}
          className="w-10 h-10 rounded-full bg-moss-900 group-hover:bg-moss-800 text-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
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
    <div className="min-h-screen bg-cream-50">
      {/* Editorial Banner */}
      <section className="relative overflow-hidden bg-moss-950 py-20 md:py-28 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("/img/hero/hero-cordoba-sunset.jpg")',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-cream-50 via-transparent to-black/30" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-moss-200 mb-3">
              <Ticket className="w-4 h-4 text-moss-300" />
              PLANES, PAQUETES Y EXPERIENCIAS
            </span>

            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-5">
              Planes para Descubrir Córdoba
            </h1>

            <p className="text-stone-200 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Tours de naturaleza, cultura ribereña, avistamiento de aves y descanso frente al Caribe.
            </p>

            <div className="max-w-xl mx-auto">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar plan, destino o experiencia..."
                  className="w-full pl-12 pr-6 py-4 rounded-full bg-white text-dark-900 placeholder-dark-400 text-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-moss-400 border border-cream-200"
                />
                <Search className="absolute left-4 w-5 h-5 text-moss-700 pointer-events-none" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filter Toolbar & Listings */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Filter Card */}
        <div className="bg-white rounded-[24px] border border-cream-200 p-6 mb-10 shadow-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-dark-500 mb-1.5">
                Destino
              </label>
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-200 text-sm bg-cream-50 text-dark-900 focus:outline-none focus:ring-2 focus:ring-moss-400"
              >
                <option value="">Todos los destinos</option>
                {lugares.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-dark-500 mb-1.5">
                Duración
              </label>
              <select
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-200 text-sm bg-cream-50 text-dark-900 focus:outline-none focus:ring-2 focus:ring-moss-400"
              >
                {DURACION_OPCIONES.map((o) => (
                  <option key={o.label} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-dark-500 mb-1.5">
                Tipo de Plan
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-200 text-sm bg-cream-50 text-dark-900 focus:outline-none focus:ring-2 focus:ring-moss-400"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(TIPO_PLAN_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-cream-200 bg-cream-50 w-full cursor-pointer hover:bg-cream-100 transition-colors">
                <input
                  type="checkbox"
                  checked={soloPromos}
                  onChange={(e) => setSoloPromos(e.target.checked)}
                  className="rounded text-moss-700 focus:ring-moss-500"
                />
                <span className="text-xs font-bold text-dark-800">Solo promociones</span>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-8 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-cream-200 max-w-lg mx-auto p-8">
            <Ticket className="w-12 h-12 text-moss-500 mx-auto mb-4" />
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-dark-900 mb-2">
              No se encontraron planes
            </h3>
            <p className="text-dark-500 text-sm mb-6">
              Prueba cambiando los filtros o la búsqueda para encontrar otras opciones.
            </p>
            <button
              onClick={() => {
                setSearch('')
                setDestino('')
                setDuracion('')
                setTipo('')
                setSoloPromos(false)
              }}
              className="px-6 py-2.5 rounded-full bg-moss-900 text-white text-xs font-semibold hover:bg-moss-800 transition-colors"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtrados.map((plan, index) => (
              <PlanCard key={plan.id || index} plan={plan} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}