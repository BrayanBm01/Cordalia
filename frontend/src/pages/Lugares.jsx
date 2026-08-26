import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, MapPin, Compass, ArrowRight, ImageOff } from 'lucide-react'
import { lugaresAPI } from '../services/api'

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-dark-100">
      <div className="aspect-[16/10] bg-dark-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-dark-100 rounded-full w-3/4 animate-pulse" />
        <div className="h-4 bg-dark-100 rounded-full w-1/2 animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 bg-dark-100 rounded-full w-full animate-pulse" />
          <div className="h-3 bg-dark-100 rounded-full w-2/3 animate-pulse" />
        </div>
        <div className="h-10 bg-dark-100 rounded-xl w-full animate-pulse mt-4" />
      </div>
    </div>
  )
}

function DestinationCard({ lugar, index }) {
  const [imgError, setImgError] = useState(false)
  const imagen = lugar.imagen || lugar.foto || lugar.image

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link
        to={`/lugares/${lugar._id || lugar.id}`}
        className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-dark-100 hover:shadow-xl hover:border-primary-200 transition-all duration-300"
      >
        <div className="aspect-[16/10] overflow-hidden bg-dark-100 relative">
          {imagen && !imgError ? (
            <img
              src={imagen}
              alt={lugar.nombre}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-dark-400 gap-2">
              <ImageOff className="w-10 h-10" />
              <span className="text-sm">Sin imagen</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="p-5">
          <h3
            className="text-lg font-semibold text-dark-900 group-hover:text-primary-700 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {lugar.nombre}
          </h3>

          {lugar.ubicacion && (
            <div className="flex items-center gap-1.5 mt-1.5 text-dark-500 text-sm">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{lugar.ubicacion}</span>
            </div>
          )}

          {lugar.descripcion && (
            <p className="mt-3 text-dark-500 text-sm leading-relaxed line-clamp-2">
              {lugar.descripcion}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2 text-primary-600 font-medium text-sm group-hover:text-primary-700 transition-colors">
            <span>Ver destino</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function Lugares() {
  const [lugares, setLugares] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  const debouncedSearch = useDebounce(search, 400)

  const fetchLugares = useCallback(async (term) => {
    setLoading(true)
    setError(null)
    try {
      const res = await lugaresAPI.getAll(term || undefined)
      const items = Array.isArray(res.data) ? res.data : res.data?.lugares || res.data?.lugares || []
      setLugares(items)
    } catch (err) {
      setError(err.message || 'Error al cargar los destinos')
      setLugares([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLugares(debouncedSearch)
  }, [debouncedSearch, fetchLugares])

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-ocean-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-sand-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-ocean-400 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Compass className="w-4 h-4 text-sand-300" />
              <span className="text-white/80 text-sm font-medium">Descubre tesoros escondidos</span>
            </div>

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Explora Colombia
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
              Desde las playas del Caribe hasta las montañas de los Andes, encuentra tu próximo destino de ensueño.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, ubicación..."
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
        ) : lugares.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-100 flex items-center justify-center">
              <Search className="w-8 h-8 text-dark-400" />
            </div>
            <h3
              className="text-xl font-semibold text-dark-700 mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              No se encontraron destinos
            </h3>
            <p className="text-dark-500 max-w-md mx-auto">
              {search
                ? `No hay resultados para "${search}". Intenta con otro término de búsqueda.`
                : 'No hay destinos disponibles en este momento. Intenta más tarde.'}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <p className="text-dark-500 text-sm">
                {lugares.length} destino{lugares.length !== 1 ? 's' : ''} encontrado{lugares.length !== 1 ? 's' : ''}
                {search && <span className="text-dark-700 font-medium"> para "{search}"</span>}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lugares.map((lugar, index) => (
                <DestinationCard key={lugar._id || lugar.id} lugar={lugar} index={index} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
