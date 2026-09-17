import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Clock, DollarSign, Calendar,
  Plane, Camera, Star, Compass, Info,
  Tag, ChevronRight, ImageOff, Store, ExternalLink, Wallet, Users,
} from 'lucide-react'
import { lugaresAPI } from '../services/api'
import destinationDetails from '../data/destinos'
import FavoritoButton from '../components/FavoritoButton'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

function GalleryImage({ src, alt, className }) {
  const [error, setError] = useState(false)
  return error ? (
    <div className={`bg-dark-100 flex items-center justify-center ${className}`}>
      <ImageOff className="w-8 h-8 text-dark-300" />
    </div>
  ) : (
    <img src={src} alt={alt} onError={() => setError(true)} className={className} />
  )
}

function SectionHeading({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary-600" />
      </div>
      <h2
        className="text-2xl md:text-3xl font-bold text-dark-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>
    </div>
  )
}

function ActivityCard({ activity, index }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="bg-white rounded-xl border border-dark-100 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
          <Compass className="w-4 h-4 text-primary-600" />
        </div>
        <div>
          <h4 className="font-semibold text-dark-900">{activity.name}</h4>
          <p className="text-sm text-dark-500 mt-1 leading-relaxed">{activity.description}</p>
        </div>
      </div>
    </motion.div>
  )
}

function SpotCard({ spot, index }) {
  const typeColors = {
    Historia: 'bg-sand-100 text-sand-800',
    Cultura: 'bg-primary-100 text-primary-800',
    Playa: 'bg-ocean-100 text-ocean-800',
    Naturaleza: 'bg-primary-50 text-primary-700',
    Museo: 'bg-dark-100 text-dark-700',
    Ciudad: 'bg-ocean-50 text-ocean-700',
    Ciencia: 'bg-purple-100 text-purple-800',
    Aventura: 'bg-red-100 text-red-800',
  }

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="bg-white rounded-xl border border-dark-100 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-dark-900">{spot.name}</h4>
        {spot.type && (
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ${typeColors[spot.type] || 'bg-dark-100 text-dark-700'}`}>
            {spot.type}
          </span>
        )}
      </div>
      <p className="text-sm text-dark-500 leading-relaxed">{spot.description}</p>
    </motion.div>
  )
}

function RelatedCard({ lugar }) {
  const [imgError, setImgError] = useState(false)
  const imagen = lugar?.imagen || lugar?.foto || lugar?.image

  return (
    <Link
      to={`/lugares/${lugar._id || lugar.id}`}
      className="group bg-white rounded-xl border border-dark-100 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <div className="aspect-[16/10] bg-dark-100 overflow-hidden">
        {imagen && !imgError ? (
          <img
            src={imagen}
            alt={lugar.nombre}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-dark-300" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h4
          className="font-semibold text-dark-900 group-hover:text-primary-700 transition-colors"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {lugar.nombre}
        </h4>
        {lugar.ubicacion && (
          <div className="flex items-center gap-1 mt-1 text-dark-500 text-sm">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{lugar.ubicacion}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

function BusinessCard({ business }) {
  const [imgError, setImgError] = useState(false)
  const portada = business.portada_url

  return (
    <Link
      to={`/negocios/${business.id}`}
      className="group bg-white rounded-xl border border-dark-100 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <div className="aspect-[16/10] bg-dark-100 overflow-hidden relative">
        {portada && !imgError ? (
          <img
            src={portada}
            alt={business.nombre}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-dark-300" />
          </div>
        )}
        {business.categoria && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-xs font-semibold text-primary-700 shadow-sm">
            {business.categoria}
          </span>
        )}
      </div>
      <div className="p-4">
        <h4
          className="font-semibold text-dark-900 group-hover:text-primary-700 transition-colors"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {business.nombre}
        </h4>
        {business.direccion && (
          <div className="flex items-center gap-1 mt-1 text-dark-500 text-sm">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{business.direccion}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

const formatMoney = (n, moneda) => {
  if (n === null || n === undefined || n === '') return '—'
  return `${Number(n).toLocaleString('es-CO')} ${moneda || 'COP'}`
}

function InfoViajeDinamico({ infoViaje }) {
  const [showDetalle, setShowDetalle] = useState(false)

  const detalles = [
    infoViaje.transporte && { icon: Plane, label: 'Transporte', text: infoViaje.transporte, color: 'text-ocean-600' },
    infoViaje.alimentacion && { icon: Tag, label: 'Alimentación', text: infoViaje.alimentacion, color: 'text-sand-600' },
    infoViaje.alojamiento && { icon: Info, label: 'Alojamiento', text: infoViaje.alojamiento, color: 'text-primary-600' },
    infoViaje.actividades && { icon: Compass, label: 'Actividades', text: infoViaje.actividades, color: 'text-primary-600' },
    infoViaje.otros_gastos && { icon: DollarSign, label: 'Otros gastos', text: infoViaje.otros_gastos, color: 'text-dark-600' },
  ].filter(Boolean)

  const costos = [
    infoViaje.costo_transporte != null && { label: 'Transporte', value: infoViaje.costo_transporte },
    infoViaje.costo_alimentacion != null && { label: 'Alimentación', value: infoViaje.costo_alimentacion },
    infoViaje.costo_alojamiento != null && { label: 'Alojamiento', value: infoViaje.costo_alojamiento },
    infoViaje.costo_actividades != null && { label: 'Actividades', value: infoViaje.costo_actividades },
    infoViaje.costo_otros != null && { label: 'Otros', value: infoViaje.costo_otros },
  ].filter(Boolean)
  const subtotal = costos.reduce((s, c) => s + (Number(c.value) || 0), 0)

  const recomendaciones = (infoViaje.recomendaciones || '')
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <SectionHeading icon={Info} title="Información para tu viaje" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-primary-50 rounded-xl p-5 border border-primary-100">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              <h4 className="font-semibold text-primary-900">Mejor época para visitar</h4>
            </div>
            <p className="text-sm text-primary-800 leading-relaxed">{infoViaje.mejor_epoca || '—'}</p>
          </div>

          <div className="bg-ocean-50 rounded-xl p-5 border border-ocean-100">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="w-4 h-4 text-ocean-600" />
              <h4 className="font-semibold text-ocean-900">Cómo llegar</h4>
            </div>
            <p className="text-sm text-ocean-800 leading-relaxed">{infoViaje.como_llegar || '—'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-sand-50 rounded-xl p-5 border border-sand-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-sand-600" />
              <h4 className="font-semibold text-sand-900">Duración recomendada</h4>
            </div>
            <p className="text-sm text-sand-800 leading-relaxed">{infoViaje.duracion_recomendada || '—'}</p>
          </div>

          <div className="bg-dark-50 rounded-xl p-5 border border-dark-100">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-dark-600" />
              <h4 className="font-semibold text-dark-900">Costo estimado por tu cuenta</h4>
            </div>
            {costos.length > 0 ? (
              <>
                <ul className="space-y-1 text-sm text-dark-600 mb-2">
                  {costos.map((c) => (
                    <li key={c.label} className="flex items-center justify-between">
                      <span>{c.label}</span>
                      <span className="font-medium">{formatMoney(c.value, infoViaje.moneda)}</span>
                    </li>
                  ))}
                </ul>
                <p className="flex items-center justify-between text-sm font-semibold text-dark-900 border-t border-dark-200 pt-2">
                  <span>Total viaje</span>
                  <span>{formatMoney(subtotal, infoViaje.moneda)}</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-dark-500">{infoViaje.transporte || 'Información de costos disponible próximamente.'}</p>
            )}
          </div>
        </div>
      </div>

      {(detalles.length > 0 || recomendaciones.length > 0) && (
        <div className="mt-6">
          <button
            onClick={() => setShowDetalle(!showDetalle)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800 transition-colors cursor-pointer"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${showDetalle ? 'rotate-90' : ''}`} />
            {showDetalle ? 'Ocultar detalles' : 'Ver detalles del viaje'}
          </button>

          {showDetalle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 overflow-hidden space-y-4"
            >
              {detalles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detalles.map((d) => (
                    <div key={d.label} className="bg-white rounded-xl border border-dark-100 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <d.icon className={`w-4 h-4 ${d.color}`} />
                        <h4 className="font-semibold text-dark-900">{d.label}</h4>
                      </div>
                      <p className="text-sm text-dark-600 leading-relaxed">{d.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {recomendaciones.length > 0 && (
                <div className="bg-white rounded-xl border border-dark-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="w-4 h-4 text-primary-600" />
                    <h4 className="font-semibold text-dark-900">Consejos útiles</h4>
                  </div>
                  <ul className="space-y-3">
                    {recomendaciones.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-dark-600">
                        <ChevronRight className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.section>
  )
}

function PresupuestoComparacion({ presupuesto, lugarNombre }) {
  const infoViaje = presupuesto?.info_viaje
  const planes = Array.isArray(presupuesto?.planes) ? presupuesto.planes : []
  const moneda = infoViaje?.moneda || 'COP'

  const costos = [
    infoViaje?.costo_transporte != null && { label: 'Transporte', value: infoViaje.costo_transporte },
    infoViaje?.costo_alimentacion != null && { label: 'Alimentación', value: infoViaje.costo_alimentacion },
    infoViaje?.costo_alojamiento != null && { label: 'Alojamiento', value: infoViaje.costo_alojamiento },
    infoViaje?.costo_actividades != null && { label: 'Actividades', value: infoViaje.costo_actividades },
    infoViaje?.costo_otros != null && { label: 'Otros', value: infoViaje.costo_otros },
  ].filter(Boolean)
  const subtotal = costos.reduce((s, c) => s + (Number(c.value) || 0), 0)

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <SectionHeading icon={Wallet} title="¿Por tu cuenta o con planes?" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-dark-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-ocean-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-ocean-600" />
            </div>
            <div>
              <h3 className="font-semibold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
                Viajar por tu cuenta
              </h3>
              <p className="text-xs text-dark-400">Organizando todo por separado</p>
            </div>
          </div>

          {costos.length === 0 ? (
            <p className="text-sm text-dark-500">
              Aún no tenemos una estimación de costos para este destino.
            </p>
          ) : (
            <>
              <ul className="space-y-2 text-sm text-dark-600 mb-3">
                {costos.map((c) => (
                  <li key={c.label} className="flex items-center justify-between">
                    <span>{c.label}</span>
                    <span className="font-medium">{formatMoney(c.value, moneda)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-dark-100 pt-3">
                <span className="text-sm font-medium text-dark-700">Total estimado</span>
                <span className="text-lg font-bold text-dark-900">{formatMoney(subtotal, moneda)}</span>
              </div>
              {infoViaje?.duracion_recomendada && (
                <p className="text-xs text-dark-400 mt-2">
                  Estimado para: {infoViaje.duracion_recomendada}
                </p>
              )}
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-dark-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
                Con planes de negocios
              </h3>
              <p className="text-xs text-dark-400">Precios reales por persona</p>
            </div>
          </div>

          {planes.length === 0 ? (
            <p className="text-sm text-dark-500">
              {lugarNombre} todavía no tiene planes publicados por negocios aprobados.
            </p>
          ) : (
            <div className="space-y-3">
              {planes.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  to={`/planes/${p.slug}`}
                  className="block rounded-xl border border-dark-100 p-3.5 hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark-900 truncate">{p.nombre}</p>
                      <p className="text-xs text-dark-400 truncate">{p.negocio}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary-700">
                        {formatMoney(p.precio, p.moneda)}
                      </p>
                      <p className="text-[11px] text-dark-400 capitalize">
                        {p.tipo_precio === 'por_persona' ? 'por persona' : 'por grupo'} · {p.duracion_dias} día(s)
                      </p>
                    </div>
                  </div>
                  {p.promociones?.length > 0 && (
                    <p className="text-xs font-medium text-sand-700 mt-1">
                      Promo activa: {p.promociones[0].valor_descuento}% de descuento
                    </p>
                  )}
                </Link>
              ))}
              {planes.length > 6 && (
                <p className="text-xs text-dark-400">Y {planes.length - 6} plan(es) más disponibles.</p>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-dark-400 mt-3">
        Las cifras son estimaciones reales de los negocios aprobados en este destino. Cada plan puede cubrir
        transporte, alojamiento o alimentación: revisa el detalle antes de decidir.
      </p>
    </motion.section>
  )
}

export default function LugarDetalle() {
  const { id } = useParams()
  const [lugar, setLugar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [relatedLugares, setRelatedLugares] = useState([])
  const [negocios, setNegocios] = useState([])
  const [negociosLoading, setNegociosLoading] = useState(true)
  const [contenido, setContenido] = useState(null)
  const [presupuesto, setPresupuesto] = useState(null)
  const details = destinationDetails[id]

  useEffect(() => {
    async function fetchLugar() {
      setLoading(true)
      setNotFound(false)
      try {
        const res = await lugaresAPI.getById(id)
        if (res.data) {
          setLugar(res.data)
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchLugar()
  }, [id])

  useEffect(() => {
    let active = true
    setNegociosLoading(true)
    async function fetchNegocios() {
      try {
        const res = await lugaresAPI.businesses(id)
        if (active) setNegocios(Array.isArray(res.data) ? res.data : [])
      } catch {
        if (active) setNegocios([])
      } finally {
        if (active) setNegociosLoading(false)
      }
    }
    fetchNegocios()
    return () => { active = false }
  }, [id])

  // Contenido dinámico del destino (qué hacer, qué visitar e info de viaje)
  useEffect(() => {
    let active = true
    async function fetchContenido() {
      try {
        const res = await lugaresAPI.contenido(id)
        if (active && res.data) setContenido(res.data)
      } catch {
        if (active) setContenido(null)
      }
    }
    fetchContenido()
    return () => { active = false }
  }, [id])

  // Presupuesto real: costos por tu cuenta VS planes de negocios aprobados
  useEffect(() => {
    let active = true
    async function fetchPresupuesto() {
      try {
        const res = await lugaresAPI.presupuesto(id)
        if (active && res.data) setPresupuesto(res.data)
      } catch {
        if (active) setPresupuesto(null)
      }
    }
    fetchPresupuesto()
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!details?.related) return
    async function fetchRelated() {
      const results = await Promise.allSettled(
        details.related.map((rid) => lugaresAPI.getById(rid))
      )
      setRelatedLugares(
        results
          .filter((r) => r.status === 'fulfilled' && r.value?.data)
          .map((r) => r.value.data)
      )
    }
    fetchRelated()
  }, [details])

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="aspect-[21/9] bg-dark-100 animate-pulse" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <div className="h-10 bg-dark-100 rounded-full w-1/2 animate-pulse" />
          <div className="h-5 bg-dark-100 rounded-full w-1/3 animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 bg-dark-100 rounded-full w-full animate-pulse" />
            <div className="h-4 bg-dark-100 rounded-full w-4/5 animate-pulse" />
            <div className="h-4 bg-dark-100 rounded-full w-3/5 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-dark-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !lugar) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-100 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-dark-400" />
          </div>
          <h1
            className="text-2xl font-bold text-dark-900 mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Destino no encontrado
          </h1>
          <p className="text-dark-500 mb-6">El destino que buscas no existe o ha sido removido.</p>
          <Link
            to="/lugares"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a destinos
          </Link>
        </div>
      </div>
    )
  }

  const heroImage = details?.heroImage || lugar.imagen || lugar.foto || lugar.image

  return (
    <div className="min-h-screen bg-white">
      <section className="relative aspect-[21/9] min-h-[400px] md:min-h-[500px] overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={lugar.nombre}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-800 to-ocean-900" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />

        <div className="absolute inset-0 flex flex-col justify-end max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 md:pb-14">
          <Link
            to="/lugares"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-6 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {lugar.ubicacion && (
              <div className="flex items-center gap-1.5 text-white/70 text-sm mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>{lugar.ubicacion}</span>
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <h1
                className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {lugar.nombre}
              </h1>
              <FavoritoButton tipo="destino" id={lugar.id} withLabel className="mb-3 shadow-lg" />
            </div>

            {details?.tagline && (
              <p className="text-lg md:text-xl text-white/70 italic">{details.tagline}</p>
            )}

            {!details && lugar.descripcion && (
              <p className="text-lg text-white/70 max-w-3xl">{lugar.descripcion}</p>
            )}
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-16">

        {details?.gallery && (
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <SectionHeading icon={Camera} title="Galería" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <motion.div variants={fadeUp} className="col-span-2 row-span-2 rounded-2xl overflow-hidden">
                <GalleryImage
                  src={details.gallery[0]}
                  alt={`${lugar.nombre} - galería`}
                  className="w-full h-full object-cover aspect-square md:aspect-auto min-h-[200px]"
                />
              </motion.div>
              {details.gallery.slice(1, 4).map((img, i) => (
                <motion.div key={i} variants={fadeUp} className="rounded-2xl overflow-hidden">
                  <GalleryImage
                    src={img}
                    alt={`${lugar.nombre} - galería ${i + 2}`}
                    className="w-full h-full object-cover aspect-square"
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {details?.overview && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <SectionHeading icon={Info} title="Sobre este destino" />
            <div className="prose prose-lg max-w-none">
              <p className="text-dark-600 leading-relaxed text-base md:text-lg">{details.overview}</p>
            </div>
          </motion.section>
        )}

        {lugar.descripcion && !details?.overview && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <SectionHeading icon={Info} title="Sobre este destino" />
            <p className="text-dark-600 leading-relaxed text-base md:text-lg">{lugar.descripcion}</p>
          </motion.section>
        )}

        <section>
          <SectionHeading icon={MapPin} title="Ubicación" />
          <div className="bg-white rounded-2xl border border-dark-100 p-6">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
                  {lugar.nombre}
                </h3>
                <p className="text-dark-600 leading-relaxed break-words">{lugar.ubicacion}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl overflow-hidden border border-dark-100">
              <iframe
                title={`Mapa de ${lugar.nombre}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(`${lugar.nombre}, ${lugar.ubicacion}`)}&z=10&output=embed`}
                className="w-full h-[320px] border-0 block"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lugar.nombre}, ${lugar.ubicacion}`)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver ruta en Google Maps
            </a>
          </div>
        </section>

        <section>
          <SectionHeading icon={Store} title="Negocios en este destino" />
          {negociosLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-[16/10] bg-dark-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : negocios.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-dark-100 p-10 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
                <Store className="w-7 h-7 text-primary-500" />
              </div>
              <h3 className="text-lg font-semibold text-dark-800 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                Este destino todavía no tiene negocios registrados.
              </h3>
              <p className="text-sm text-dark-500 max-w-md mx-auto">
                Cuando un negocio sea aprobado y asociado a este destino, aparecerá aquí.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {negocios.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          )}
        </section>

        {contenido?.actividades?.length > 0 && (
          <section>
            <SectionHeading icon={Compass} title="Qué hacer" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contenido.actividades.map((a, i) => (
                <ActivityCard
                  key={a.id}
                  activity={{ name: a.nombre, description: a.descripcion }}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}

        {contenido?.puntosInteres?.length > 0 && (
          <section>
            <SectionHeading icon={Star} title="Qué visitar" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contenido.puntosInteres.map((p, i) => (
                <SpotCard
                  key={p.id}
                  spot={{ name: p.nombre, description: p.descripcion, type: p.tipo }}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}

        {contenido?.infoViaje && <InfoViajeDinamico infoViaje={contenido.infoViaje} />}

        <PresupuestoComparacion presupuesto={presupuesto} lugarNombre={lugar.nombre} />

        {relatedLugares.length > 0 && (
          <section>
            <SectionHeading icon={Compass} title="También te puede interesar" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedLugares.map((rl) => (
                <RelatedCard key={rl._id || rl.id} lugar={rl} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
