import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, MapPin, Compass, ArrowRight, Sprout, Trees, Waves, Landmark } from 'lucide-react'
import { lugaresAPI } from '../services/api'
import { getDestinoImagen } from '../utils/media'

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
    <div className="bg-white rounded-[22px] overflow-hidden shadow-card border border-cream-200">
      <div className="aspect-[16/11] bg-cream-200 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-cream-200 rounded-full w-3/4 animate-pulse" />
        <div className="h-4 bg-cream-200 rounded-full w-1/2 animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 bg-cream-200 rounded-full w-full animate-pulse" />
          <div className="h-3 bg-cream-200 rounded-full w-2/3 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function DestinationCard({ lugar, index }) {
  const imagen = getDestinoImagen(lugar)

  return (
    <div className="group bg-white rounded-[22px] border border-cream-200/90 overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between">
      <div>
        <Link
          to={`/lugares/${lugar._id || lugar.id}`}
          className="relative block aspect-[16/11] overflow-hidden bg-cream-200"
        >
          <img
            src={imagen}
            alt={lugar.nombre}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
        </Link>

        <div className="p-5">
          <div className="flex items-center gap-1.5 text-xs text-moss-800 font-semibold mb-1">
            <MapPin className="w-3.5 h-3.5 text-moss-700" />
            <span>{lugar.municipio || lugar.ubicacion || 'Córdoba, Colombia'}</span>
          </div>

          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-dark-900 group-hover:text-moss-900 transition-colors">
            <Link to={`/lugares/${lugar._id || lugar.id}`}>{lugar.nombre}</Link>
          </h3>

          {lugar.descripcion && (
            <p className="mt-2 text-dark-500 text-xs sm:text-sm leading-relaxed line-clamp-2">
              {lugar.descripcion}
            </p>
          )}
        </div>
      </div>

      <div className="p-5 pt-0">
        <div className="pt-3 border-t border-cream-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-moss-900 group-hover:underline">
            Explorar destino
          </span>
          <Link
            to={`/lugares/${lugar._id || lugar.id}`}
            aria-label={`Ver detalles de ${lugar.nombre}`}
            className="w-9 h-9 rounded-full bg-moss-900 group-hover:bg-moss-800 text-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

const CATEGORIAS = [
  { id: 'todos', label: 'Todos los Destinos', icon: Compass },
  { id: 'playa', label: 'Playas y Mar', icon: Waves },
  { id: 'cultura', label: 'Pueblos y Cultura', icon: Landmark },
  { id: 'naturaleza', label: 'Ríos y Selvas', icon: Trees },
]

export default function Lugares() {
  const [lugares, setLugares] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('todos')
  const [error, setError] = useState(null)

  const debouncedSearch = useDebounce(search, 300)

  const fetchLugares = useCallback(async (term) => {
    setLoading(true)
    setError(null)
    try {
      const res = await lugaresAPI.getAll(term || undefined)
      const items = Array.isArray(res.data) ? res.data : res.data?.lugares || []
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

  const filteredLugares = useMemo(() => {
    if (categoria === 'todos') return lugares
    return lugares.filter((l) => {
      const tipo = (l.tipo || '').toLowerCase()
      const desc = (l.descripcion || '').toLowerCase()
      const nom = (l.nombre || '').toLowerCase()
      if (categoria === 'playa') {
        return tipo.includes('playa') || desc.includes('playa') || desc.includes('mar') || nom.includes('antero') || nom.includes('bernardo') || nom.includes('moñitos')
      }
      if (categoria === 'cultura') {
        return tipo.includes('patrimonio') || tipo.includes('cultura') || desc.includes('patrimonio') || nom.includes('lorica') || nom.includes('tuch')
      }
      if (categoria === 'naturaleza') {
        return tipo.includes('montaña') || tipo.includes('rio') || desc.includes('sinú') || desc.includes('paramillo') || nom.includes('monter') || nom.includes('tierralta')
      }
      return true
    })
  }, [lugares, categoria])

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Editorial Hero Banner */}
      <section className="relative bg-moss-950 text-white py-20 md:py-28 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("/img/hero/hero-nature.jpg")',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-cream-50 via-transparent to-black/30" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-moss-200 mb-3">
              <Sprout className="w-4 h-4 text-moss-300" />
              DESTINOS TURÍSTICOS DE CÓRDOBA
            </span>

            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-5">
              Explora la Magia del Sinú y el Caribe
            </h1>

            <p className="text-stone-200 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Playas cálidas, manglares vírgenes, pueblos coloniales de memoria viva y las riberas del
              majestuoso río Sinú.
            </p>

            {/* Search Bar TerraGo style pill */}
            <div className="max-w-xl mx-auto">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por municipio, playa o atractivo (ej: San Antero, Lorica)..."
                  className="w-full pl-12 pr-6 py-4 rounded-full bg-white text-dark-900 placeholder-dark-400 text-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-moss-400 border border-cream-200"
                />
                <Search className="absolute left-4 w-5 h-5 text-moss-700 pointer-events-none" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon
            const active = categoria === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCategoria(cat.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-moss-900 text-white shadow-sm'
                    : 'bg-white hover:bg-cream-100 text-dark-700 border border-cream-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-moss-200' : 'text-moss-700'}`} />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="p-4 mb-8 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredLugares.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-cream-200 max-w-lg mx-auto p-8">
            <Compass className="w-12 h-12 text-moss-500 mx-auto mb-4" />
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-dark-900 mb-2">
              No se encontraron destinos
            </h3>
            <p className="text-dark-500 text-sm mb-6">
              Intenta con otro término de búsqueda o selecciona otra categoría.
            </p>
            <button
              onClick={() => {
                setSearch('')
                setCategoria('todos')
              }}
              className="px-6 py-2.5 rounded-full bg-moss-900 text-white text-xs font-semibold hover:bg-moss-800 transition-colors"
            >
              Ver todos los destinos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredLugares.map((lugar, index) => (
              <DestinationCard key={lugar.id || lugar._id || index} lugar={lugar} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
