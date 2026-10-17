import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store, MapPin, ArrowRight, Search } from 'lucide-react'
import { businessesAPI } from '../../services/api'
import { esImagenDeRelleno } from '../../utils/media'
import { formatRango } from './businessUtils'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-dark-100">
      <div className="aspect-[16/10] bg-dark-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-dark-100 rounded-full w-3/4 animate-pulse" />
        <div className="h-4 bg-dark-100 rounded-full w-1/2 animate-pulse" />
        <div className="h-3 bg-dark-100 rounded-full w-full animate-pulse" />
        <div className="h-10 bg-dark-100 rounded-xl w-full animate-pulse mt-4" />
      </div>
    </div>
  )
}

function BusinessCard({ business, index }) {
  const [imgError, setImgError] = useState(false)
  const portada = business.portada_url

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/negocios/${business.id}`}
        className="group block bg-white rounded-[22px] overflow-hidden shadow-card border border-cream-200 hover:shadow-card-hover transition-all duration-300"
      >
        <div className="aspect-[16/10] overflow-hidden bg-cream-200 relative">
          {portada && !imgError && !esImagenDeRelleno(portada) ? (
            <img
              src={portada}
              alt={business.nombre}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-moss-800 via-moss-900 to-dark-950 text-white/70">
              <Store className="w-9 h-9 text-moss-300" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80 px-3 text-center line-clamp-1">
                {business.categoria || 'Negocio'}
              </span>
            </div>
          )}
          {business.categoria && (
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 text-xs font-bold text-moss-900 shadow-sm border border-black/5">
              {business.categoria}
            </span>
          )}
        </div>

        <div className="p-5">
          <h3
            className="text-lg font-semibold text-dark-900 group-hover:text-primary-700 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {business.nombre}
          </h3>

          {business.direccion && (
            <div className="flex items-center gap-1.5 mt-1.5 text-dark-500 text-sm">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{business.direccion}</span>
            </div>
          )}

          {business.destino && (
            <div className="flex items-center gap-1.5 mt-1 text-dark-500 text-sm">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span
                className="truncate text-primary-600 font-medium"
              >{business.destino}</span>
            </div>
          )}

          {business.descripcion && (
            <p className="mt-3 text-dark-500 text-sm leading-relaxed line-clamp-2">
              {business.descripcion}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-dark-800">
              {formatRango(business.precio_min, business.precio_max)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-primary-600 font-medium text-sm group-hover:text-primary-700 transition-colors">
              Ver negocio
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function NegociosPublicos() {
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    businessesAPI
      .list()
      .then((res) => setNegocios(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.message || 'Error al cargar los negocios'))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = negotiosInner()

  function negotiosInner() {
    const term = search.trim().toLowerCase()
    if (!term) return negocios
    return negocios.filter(
      (n) =>
        n.nombre?.toLowerCase().includes(term) ||
        n.categoria?.toLowerCase().includes(term) ||
        n.direccion?.toLowerCase().includes(term) ||
        n.descripcion?.toLowerCase().includes(term)
    )
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <section className="relative overflow-hidden bg-moss-950 py-20 md:py-28 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("/img/hero/hero-nature.jpg")',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-cream-50 via-transparent to-black/30" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4 border border-white/15">
              <Store className="w-4 h-4 text-moss-300" />
              <span className="text-white/90 text-xs sm:text-sm font-semibold tracking-wide">NEGOCIOS Y OPERADORES LOCALES</span>
            </div>
            <h1
              className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight"
            >
              Explora Negocios de Córdoba
            </h1>
            <p className="text-base sm:text-lg text-stone-200 max-w-2xl mx-auto mb-8 leading-relaxed">
              Alojamientos ecológicos, restaurantes típicos, transporte y experiencias verificadas por Cordalia.
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-moss-700 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, categoría o municipio..."
                className="w-full pl-12 pr-6 py-4 rounded-full bg-white text-dark-900 placeholder:text-dark-400 shadow-xl border border-cream-200 focus:outline-none focus:ring-2 focus:ring-moss-400 text-sm"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
            {error}
          </div>
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
              <Store className="w-8 h-8 text-dark-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-700 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              No se encontraron negocios
            </h3>
            <p className="text-dark-500 max-w-md mx-auto">
              {search
                ? `No hay resultados para "${search}". Intenta con otro término.`
                : 'Aún no hay negocios aprobados. Vuelve pronto.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-dark-500 text-sm mb-8">
              {filtrados.length} negocio{filtrados.length !== 1 ? 's' : ''} disponible{filtrados.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtrados.map((business, index) => (
                <BusinessCard key={business.id} business={business} index={index} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}