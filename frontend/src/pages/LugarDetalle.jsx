import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Clock, DollarSign, Calendar,
  Plane, Star, Compass, Info,
  Tag, ChevronRight, Store, ExternalLink, Wallet, Users,
  Sprout, Trees, ArrowRight,
} from 'lucide-react'
import { lugaresAPI } from '../services/api'
import { getDestinoImagen, esImagenDeRelleno } from '../utils/media'
import FavoritoButton from '../components/FavoritoButton'

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatMoney = (n, moneda) => {
  if (n === null || n === undefined || n === '') return '—'
  return `${Number(n).toLocaleString('es-CO')} ${moneda || 'COP'}`
}

function escribePrecioEfectivo(p) {
  const base = Number(p.precio) || 0
  const promo = Array.isArray(p.promociones) ? p.promociones[0] : null
  const valor = Number(promo?.valor_descuento) || 0
  if (!promo) return base
  return promo.tipo_descuento === 'porcentaje'
    ? Math.max(0, Math.round(base * (1 - Math.min(Math.max(valor, 0), 100) / 100)))
    : Math.max(0, base - Math.round(valor))
}

function textoPromo(p) {
  const promo = Array.isArray(p.promociones) ? p.promociones[0] : null
  if (!promo) return ''
  return promo.tipo_descuento === 'porcentaje'
    ? `Promo: -${Math.min(Math.max(Number(promo.valor_descuento) || 0, 0), 100)}%`
    : `Promo: -${formatMoney(promo.valor_descuento, 'COP')}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-moss-700 mb-3">
      <Sprout className="w-3.5 h-3.5" />
      {children}
    </span>
  )
}

function SectionTitle({ children }) {
  return (
    <h2
      className="text-2xl md:text-3xl font-bold text-dark-900 mb-8 leading-tight"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {children}
    </h2>
  )
}

function ActivityCard({ activity }) {
  return (
    <div className="group bg-white rounded-[20px] border border-cream-200 p-5 hover:shadow-card-hover hover:border-moss-200 transition-all duration-300 flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-moss-900 flex items-center justify-center shrink-0 mt-0.5">
        <Compass className="w-4.5 h-4.5 text-moss-100 w-[18px] h-[18px]" />
      </div>
      <div>
        <h4 className="font-bold text-dark-900 group-hover:text-moss-900 transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
          {activity.name}
        </h4>
        <p className="text-sm text-dark-500 mt-1 leading-relaxed">{activity.description}</p>
      </div>
    </div>
  )
}

function SpotCard({ spot }) {
  const typeColors = {
    Historia: 'bg-sand-100 text-sand-800',
    Cultura: 'bg-moss-100 text-moss-800',
    Playa: 'bg-cream-200 text-dark-700',
    Naturaleza: 'bg-moss-50 text-moss-700',
    Museo: 'bg-cream-100 text-dark-700',
    Ciudad: 'bg-cream-200 text-dark-700',
    Ciencia: 'bg-moss-100 text-moss-700',
    Aventura: 'bg-sand-100 text-sand-800',
  }

  return (
    <div className="bg-white rounded-[20px] border border-cream-200 p-5 hover:shadow-card hover:border-moss-200 transition-all duration-300">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
          {spot.name}
        </h4>
        {spot.type && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${typeColors[spot.type] || 'bg-cream-100 text-dark-700'}`}>
            {spot.type}
          </span>
        )}
      </div>
      <p className="text-sm text-dark-500 leading-relaxed">{spot.description}</p>
    </div>
  )
}

function RelatedCard({ lugar }) {
  const [imgError, setImgError] = useState(false)
  const imagen = getDestinoImagen(lugar)

  return (
    <Link
      to={`/lugares/${lugar._id || lugar.id}`}
      className="group block rounded-[22px] overflow-hidden border border-cream-200 shadow-card hover:shadow-card-hover transition-all duration-300"
    >
      <div className="aspect-[16/10] bg-cream-100 overflow-hidden">
        {imagen && !imgError ? (
          <img
            src={imagen}
            alt={lugar.nombre}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-cream-200">
            <Trees className="w-8 h-8 text-moss-400" />
          </div>
        )}
      </div>
      <div className="p-4 bg-white">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-moss-700 mb-1">
          <MapPin className="w-3 h-3" />
          <span>{lugar.municipio || lugar.ubicacion || 'Córdoba'}</span>
        </div>
        <h4 className="font-bold text-dark-900 group-hover:text-moss-900 transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
          {lugar.nombre}
        </h4>
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-moss-800">
          <span>Explorar</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

function BusinessCard({ business }) {
  const [imgError, setImgError] = useState(false)
  const portada = business.portada_url && !esImagenDeRelleno(business.portada_url)
    ? business.portada_url
    : null

  return (
    <Link
      to={`/negocios/${business.id}`}
      className="group bg-white rounded-[22px] border border-cream-200 overflow-hidden hover:shadow-card-hover transition-all duration-300"
    >
      <div className="aspect-[16/9] bg-cream-100 overflow-hidden relative">
        {portada && !imgError ? (
          <img
            src={portada}
            alt={business.nombre}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-moss-800 to-moss-950">
            <Store className="w-9 h-9 text-moss-200" />
          </div>
        )}
        {business.categoria && (
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-moss-900 shadow-sm">
            {business.categoria}
          </span>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-bold text-dark-900 group-hover:text-moss-900 transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
          {business.nombre}
        </h4>
        {business.direccion && (
          <div className="flex items-center gap-1 mt-1 text-dark-500 text-xs">
            <MapPin className="w-3 h-3 shrink-0 text-moss-600" />
            <span className="truncate">{business.direccion}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

function InfoCard({ icon: Icon, label, children, accent = 'moss' }) {
  const colors = {
    moss: 'bg-moss-50 border-moss-100 text-moss-800',
    sand: 'bg-sand-50 border-sand-100 text-sand-800',
    cream: 'bg-cream-100 border-cream-200 text-dark-800',
  }
  return (
    <div className={`rounded-[18px] p-5 border ${colors[accent]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <h4 className="font-bold text-sm">{label}</h4>
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}

// ─── Info Viaje Section ──────────────────────────────────────────────────────

function InfoViajeDinamico({ infoViaje }) {
  const [showDetalle, setShowDetalle] = useState(false)

  const detalles = [
    infoViaje.transporte && { icon: Plane, label: 'Transporte', text: infoViaje.transporte },
    infoViaje.alimentacion && { icon: Tag, label: 'Alimentación', text: infoViaje.alimentacion },
    infoViaje.alojamiento && { icon: Info, label: 'Alojamiento', text: infoViaje.alojamiento },
    infoViaje.actividades && { icon: Compass, label: 'Actividades', text: infoViaje.actividades },
    infoViaje.otros_gastos && { icon: DollarSign, label: 'Otros gastos', text: infoViaje.otros_gastos },
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
    .split('\n').map((t) => t.trim()).filter(Boolean)

  return (
    <section>
      <SectionLabel>Planifica tu visita</SectionLabel>
      <SectionTitle>Información para tu viaje</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <InfoCard icon={Calendar} label="Mejor época para visitar" accent="moss">
          {infoViaje.mejor_epoca || '—'}
        </InfoCard>
        <InfoCard icon={Plane} label="Cómo llegar" accent="cream">
          {infoViaje.como_llegar || '—'}
        </InfoCard>
        <InfoCard icon={Clock} label="Duración recomendada" accent="sand">
          {infoViaje.duracion_recomendada || '—'}
        </InfoCard>
        <div className="rounded-[18px] p-5 bg-white border border-cream-200">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-moss-700" />
            <h4 className="font-bold text-sm text-dark-900">Costo estimado por tu cuenta</h4>
          </div>
          {costos.length > 0 ? (
            <>
              <ul className="space-y-1.5 text-sm text-dark-600 mb-3">
                {costos.map((c) => (
                  <li key={c.label} className="flex items-center justify-between">
                    <span className="text-dark-500">{c.label}</span>
                    <span className="font-semibold text-dark-900">{formatMoney(c.value, infoViaje.moneda)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-cream-200 pt-3">
                <span className="text-sm font-semibold text-dark-700">Total estimado</span>
                <span className="text-lg font-bold text-moss-950" style={{ fontFamily: 'var(--font-display)' }}>
                  {formatMoney(subtotal, infoViaje.moneda)}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-dark-500">{infoViaje.transporte || 'Información de costos disponible próximamente.'}</p>
          )}
        </div>
      </div>

      {(detalles.length > 0 || recomendaciones.length > 0) && (
        <div>
          <button
            onClick={() => setShowDetalle(!showDetalle)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss-800 hover:text-moss-950 transition-colors cursor-pointer"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${showDetalle ? 'rotate-90' : ''}`} />
            {showDetalle ? 'Ocultar detalles' : 'Ver más detalles del viaje'}
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
                    <div key={d.label} className="bg-white rounded-[18px] border border-cream-200 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <d.icon className="w-4 h-4 text-moss-700" />
                        <h4 className="font-bold text-sm text-dark-900">{d.label}</h4>
                      </div>
                      <p className="text-sm text-dark-600 leading-relaxed">{d.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {recomendaciones.length > 0 && (
                <div className="bg-moss-50 rounded-[18px] border border-moss-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sprout className="w-4 h-4 text-moss-700" />
                    <h4 className="font-bold text-dark-900">Consejos útiles</h4>
                  </div>
                  <ul className="space-y-3">
                    {recomendaciones.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-dark-700">
                        <span className="w-5 h-5 rounded-full bg-moss-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
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
    </section>
  )
}

// ─── Presupuesto ─────────────────────────────────────────────────────────────

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
    <section>
      <SectionLabel>Planifica tu presupuesto</SectionLabel>
      <SectionTitle>¿Por tu cuenta o con planes?</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By yourself */}
        <div className="bg-white rounded-[22px] border border-cream-200 p-6 shadow-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-full bg-cream-200 flex items-center justify-center">
              <Users className="w-5 h-5 text-moss-800" />
            </div>
            <div>
              <h3 className="font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>Viajar por tu cuenta</h3>
              <p className="text-xs text-dark-400">Organizando todo por separado</p>
            </div>
          </div>
          {costos.length === 0 ? (
            <p className="text-sm text-dark-500">Aún no tenemos una estimación de costos para este destino.</p>
          ) : (
            <>
              <ul className="space-y-2 text-sm text-dark-600 mb-4">
                {costos.map((c) => (
                  <li key={c.label} className="flex items-center justify-between py-1 border-b border-cream-100 last:border-0">
                    <span className="text-dark-500">{c.label}</span>
                    <span className="font-semibold text-dark-900">{formatMoney(c.value, moneda)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between bg-cream-100 rounded-xl px-4 py-3">
                <span className="text-sm font-semibold text-dark-700">Total estimado</span>
                <span className="text-xl font-bold text-moss-950" style={{ fontFamily: 'var(--font-display)' }}>
                  {formatMoney(subtotal, moneda)}
                </span>
              </div>
              {infoViaje?.duracion_recomendada && (
                <p className="text-xs text-dark-400 mt-2">Para: {infoViaje.duracion_recomendada}</p>
              )}
            </>
          )}
        </div>

        {/* Business plans */}
        <div className="bg-white rounded-[22px] border border-cream-200 p-6 shadow-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-full bg-moss-900 flex items-center justify-center">
              <Compass className="w-5 h-5 text-moss-100" />
            </div>
            <div>
              <h3 className="font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>Con planes de negocios</h3>
              <p className="text-xs text-dark-400">Precios reales por persona</p>
            </div>
          </div>
          {planes.length === 0 ? (
            <p className="text-sm text-dark-500">{lugarNombre} todavía no tiene planes publicados por negocios aprobados.</p>
          ) : (
            <div className="space-y-2">
              {planes.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  to={`/planes/${p.slug}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-cream-200 p-3.5 hover:border-moss-300 hover:bg-moss-50/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark-900 truncate">{p.nombre}</p>
                    <p className="text-xs text-dark-400 truncate">{p.negocio}</p>
                    {p.promociones?.length > 0 && (
                      <p className="text-xs font-medium text-moss-700 mt-0.5">{textoPromo(p)}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-moss-900">
                      {formatMoney(p.promociones?.length > 0 ? escribePrecioEfectivo(p) : p.precio, p.moneda)}
                    </p>
                    <p className="text-[11px] text-dark-400 capitalize">
                      {p.tipo_precio === 'por_persona' ? '/persona' : '/grupo'} · {p.duracion_dias}d
                    </p>
                  </div>
                </Link>
              ))}
              {planes.length > 6 && (
                <p className="text-xs text-dark-400 pl-1">Y {planes.length - 6} plan(es) más disponibles.</p>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-dark-400 mt-4 italic">
        Las cifras son estimaciones reales de negocios aprobados. Revisa el detalle de cada plan antes de decidir.
      </p>
    </section>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    async function fetchLugar() {
      setLoading(true)
      setNotFound(false)
      try {
        const res = await lugaresAPI.getById(id)
        if (res.data) setLugar(res.data)
        else setNotFound(true)
      } catch { setNotFound(true) }
      finally { setLoading(false) }
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
      } catch { if (active) setNegocios([]) }
      finally { if (active) setNegociosLoading(false) }
    }
    fetchNegocios()
    return () => { active = false }
  }, [id])

  useEffect(() => {
    let active = true
    async function fetchContenido() {
      try {
        const res = await lugaresAPI.contenido(id)
        if (active && res.data) setContenido(res.data)
      } catch { if (active) setContenido(null) }
    }
    fetchContenido()
    return () => { active = false }
  }, [id])

  useEffect(() => {
    let active = true
    async function fetchPresupuesto() {
      try {
        const res = await lugaresAPI.presupuesto(id)
        if (active && res.data) setPresupuesto(res.data)
      } catch { if (active) setPresupuesto(null) }
    }
    fetchPresupuesto()
    return () => { active = false }
  }, [id])

  useEffect(() => {
    let active = true
    async function fetchRelated() {
      try {
        const res = await lugaresAPI.getAll()
        const todos = Array.isArray(res.data) ? res.data : []
        const otros = todos.filter((l) => String(l.id) !== String(id))
        const ordenado = [...otros].sort((a, b) => {
          const score = (l) => {
            let s = 0
            if (l.municipio) s += l.municipio === lugar?.municipio ? 2 : 0
            if (l.tipo) s += l.tipo === lugar?.tipo ? 1 : 0
            return s
          }
          return score(b) - score(a)
        })
        if (active) setRelatedLugares(ordenado.slice(0, 3))
      } catch { if (active) setRelatedLugares([]) }
    }
    fetchRelated()
    return () => { active = false }
  }, [id, lugar])

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <div className="h-[60vh] bg-cream-200 animate-pulse" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="h-10 bg-cream-200 rounded-full w-1/2 animate-pulse" />
          <div className="h-5 bg-cream-200 rounded-full w-1/3 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-cream-200 rounded-full animate-pulse" style={{ width: `${95 - i * 10}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (notFound || !lugar) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-cream-200 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-moss-500" />
          </div>
          <h1 className="text-2xl font-bold text-dark-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Destino no encontrado
          </h1>
          <p className="text-dark-500 mb-6">El destino que buscas no existe o ha sido removido.</p>
          <Link
            to="/lugares"
            className="inline-flex items-center gap-2 px-6 py-3 bg-moss-900 text-white rounded-full font-semibold hover:bg-moss-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a destinos
          </Link>
        </div>
      </div>
    )
  }

  const heroImage = getDestinoImagen(lugar)

  return (
    <div className="min-h-screen bg-cream-50">

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative w-full h-[62vh] min-h-[480px] max-h-[720px] overflow-hidden bg-moss-950">
        <img
          src={heroImage}
          alt={lugar.nombre}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />

        {/* Content pinned to bottom-left */}
        <div className="absolute inset-0 flex flex-col justify-end max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <Link
            to="/lugares"
            className="inline-flex items-center gap-1.5 text-white/75 hover:text-white text-sm font-medium mb-8 transition-colors w-fit group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver a destinos
          </Link>

          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-bold uppercase tracking-widest border border-white/20">
                <Sprout className="w-3 h-3 text-moss-200" />
                {lugar.tipo || 'Destino turístico'}
              </span>
            </div>

            <div className="flex items-end gap-4 flex-wrap">
              <h1
                className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {lugar.nombre}
              </h1>
              <FavoritoButton tipo="destino" id={lugar.id} withLabel className="mb-2 shadow-lg" />
            </div>

            {lugar.ubicacion && (
              <div className="flex items-center gap-1.5 text-white/70 text-sm mt-3">
                <MapPin className="w-4 h-4" />
                <span>{lugar.ubicacion}</span>
              </div>
            )}

            {lugar.descripcion && (
              <p className="mt-4 text-lg md:text-xl text-white/70 italic max-w-2xl leading-relaxed">
                "{lugar.descripcion}"
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 space-y-20">

        {/* Description block (detailed) */}
        {lugar.descripcion && (
          <section className="max-w-3xl">
            <SectionLabel>Descúbrelo</SectionLabel>
            <SectionTitle>Sobre este destino</SectionTitle>
            <p className="text-dark-600 leading-relaxed text-base md:text-lg">{lugar.descripcion}</p>
          </section>
        )}

        {/* ── Map & Location ─────────────────────────────────────────── */}
        <section>
          <SectionLabel>Cómo llegar</SectionLabel>
          <SectionTitle>Ubicación</SectionTitle>
          <div className="bg-white rounded-[24px] border border-cream-200 shadow-card overflow-hidden">
            <div className="p-6 pb-0 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-moss-900 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-moss-100" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
                  {lugar.nombre}
                </h3>
                <p className="text-dark-500 text-sm mt-0.5">{lugar.ubicacion}</p>
              </div>
            </div>
            <div className="mt-5 mx-6">
              <div className="rounded-[16px] overflow-hidden border border-cream-200">
                <iframe
                  title={`Mapa de ${lugar.nombre}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(`${lugar.nombre}, ${lugar.ubicacion}`)}&z=10&output=embed`}
                  className="w-full h-[300px] border-0 block"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
            <div className="p-6 pt-4">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lugar.nombre}, ${lugar.ubicacion}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-moss-900 text-white text-sm font-semibold hover:bg-moss-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ver ruta en Google Maps
              </a>
            </div>
          </div>
        </section>

        {/* ── Negocios ───────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Operadores locales</SectionLabel>
          <SectionTitle>Negocios en este destino</SectionTitle>
          {negociosLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-[16/9] bg-cream-200 rounded-[22px] animate-pulse" />
              ))}
            </div>
          ) : negocios.length === 0 ? (
            <div className="bg-white rounded-[22px] border border-cream-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cream-100 flex items-center justify-center">
                <Store className="w-7 h-7 text-moss-500" />
              </div>
              <h3 className="text-lg font-bold text-dark-800 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                Aún sin negocios registrados
              </h3>
              <p className="text-sm text-dark-500 max-w-sm mx-auto">
                Cuando un negocio sea aprobado y asociado a este destino, aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {negocios.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          )}
        </section>

        {/* ── Activities ─────────────────────────────────────────────── */}
        {contenido?.actividades?.length > 0 && (
          <section>
            <SectionLabel>Experiencias</SectionLabel>
            <SectionTitle>Qué hacer</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contenido.actividades.map((a) => (
                <ActivityCard key={a.id} activity={{ name: a.nombre, description: a.descripcion }} />
              ))}
            </div>
          </section>
        )}

        {/* ── Spots ──────────────────────────────────────────────────── */}
        {contenido?.puntosInteres?.length > 0 && (
          <section>
            <SectionLabel>Patrimonio</SectionLabel>
            <SectionTitle>Qué visitar</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contenido.puntosInteres.map((p) => (
                <SpotCard key={p.id} spot={{ name: p.nombre, description: p.descripcion, type: p.tipo }} />
              ))}
            </div>
          </section>
        )}

        {/* ── Info Viaje ─────────────────────────────────────────────── */}
        {contenido?.infoViaje && <InfoViajeDinamico infoViaje={contenido.infoViaje} />}

        {/* ── Presupuesto ────────────────────────────────────────────── */}
        <PresupuestoComparacion presupuesto={presupuesto} lugarNombre={lugar.nombre} />

        {/* ── Related Destinations ───────────────────────────────────── */}
        {relatedLugares.length > 0 && (
          <section>
            <SectionLabel>Explora más</SectionLabel>
            <SectionTitle>También te puede interesar</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedLugares.map((l) => (
                <RelatedCard key={l.id || l._id} lugar={l} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
