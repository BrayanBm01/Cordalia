import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store, MapPin, ArrowRight, ImageOff, Search } from 'lucide-react'
import { businessesAPI } from '../../services/api'
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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link
        to={`/negocios/${business.id}`}
        className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-dark-100 hover:shadow-xl hover:border-primary-200 transition-all duration-300"
      >
        <div className="aspect-[16/10] overflow-hidden bg-dark-100 relative">
          {portada && !imgError ? (
            <img
              src={portada}
              alt={business.nombre}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-dark-400 gap-2">
              <ImageOff className="w-10 h-10" />
              <span className="text-sm">Sin imagen</span>
            </div>
          )}
          {business.categoria && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-xs font-semibold text-primary-700 shadow-sm">
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
    <div className="min-h-screen bg-dark-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-ocean-900 via-primary-900 to-primary-950">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-sand-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-96 h-96 bg-ocean-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Store className="w-4 h-4 text-sand-300" />
              <span className="text-white/80 text-sm font-medium">Negocios turísticos</span>
            </div>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Explora negocios
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
              Hoteles, restaurantes, tours y experiencias verificadas en Córdoba por Cordalia.
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, categoría o ubicación..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-dark-900 placeholder:text-dark-400 shadow-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-base"
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