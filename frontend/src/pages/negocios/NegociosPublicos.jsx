import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store, MapPin, ArrowRight, Search, RefreshCw, SlidersHorizontal, X } from 'lucide-react'
import { businessesAPI } from '../../services/api'
import { esImagenDeRelleno } from '../../utils/media'
import { formatRango } from './businessUtils'
import { rutaCon } from '../../routes/offuscatedRoutes.js'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[22px] overflow-hidden shadow-card border border-cream-200">
      <div className="card-media card-media-lg bg-cream-200 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-cream-200 rounded-full w-3/4 animate-pulse" />
        <div className="h-4 bg-cream-200 rounded-full w-1/2 animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 bg-cream-200 rounded-full w-full animate-pulse" />
          <div className="h-3 bg-cream-200 rounded-full w-2/3 animate-pulse" />
        </div>
        <div className="h-9 bg-cream-200 rounded-full w-full animate-pulse mt-4" />
      </div>
    </div>
  )
}

function BusinessCard({ business, index }) {
  const [imgError, setImgError] = useState(false)
  const portada = business.portada_url
  const rango = formatRango(business.precio_min, business.precio_max)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link
        to={rutaCon('NEGOCIOS_PUBLICOS', business.id)}
        className="group flex h-full flex-col bg-white rounded-[22px] overflow-hidden shadow-card border border-cream-200 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
      >
        {/* Fotografía grande (4/3): la protagonista de la tarjeta */}
        <div className="card-media card-media-lg">
          {portada && !imgError && !esImagenDeRelleno(portada) ? (
            <img
              src={portada}
              alt={business.nombre}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-moss-800 via-moss-900 to-dark-950 text-white/70">
              <Store className="w-10 h-10 text-moss-300" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80 px-3 text-center line-clamp-1">
                {business.categoria || 'Negocio local'}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
          {business.categoria && (
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-xs font-bold text-moss-900 shadow-sm border border-black/5">
              {business.categoria}
            </span>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <h3 className="font-[family-name:var(--font-display)] card-title font-bold text-dark-900 group-hover:text-moss-900 transition-colors">
            {business.nombre}
          </h3>

          {business.destino && (
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-moss-800">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-moss-700" />
              <span className="truncate">{business.destino}</span>
            </div>
          )}

          {business.direccion && (
            <div className="flex items-center gap-1.5 mt-1 text-dark-500 text-sm">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{business.direccion}</span>
            </div>
          )}

          {business.descripcion && (
            <p className="mt-3 text-dark-500 card-text leading-relaxed line-clamp-2">
              {business.descripcion}
            </p>
          )}

          <div className="mt-auto">
            <div className="mt-4 pt-4 flex items-center justify-between gap-3 border-t border-cream-100">
              {rango ? (
                <span className="card-price font-bold text-moss-950 font-[family-name:var(--font-display)]">
                  {rango}
                  <span className="text-xs font-normal text-dark-500 ml-1">COP</span>
                </span>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-wider text-dark-400">
                  Consultar precios
                </span>
              )}
              <span
                aria-hidden="true"
                className="w-9 h-9 shrink-0 rounded-full bg-moss-900 group-hover:bg-moss-800 text-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
              >
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
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
  const [categoria, setCategoria] = useState('todas')
  const [destino, setDestino] = useState('todos')

  // La carga se puede reintentar sin recargar toda la página. Un fallo
  // del servidor se muestra como error (nunca como lista vacía).
  const cargarNegocios = useCallback(() => {
    setLoading(true)
    setError(null)
    return businessesAPI
      .list()
      .then((res) => setNegocios(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.message || 'Error al cargar los negocios'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // Se difiere a un microtask para no hacer setState sincrónico dentro
    // del efecto (evita renderizados en cascada; el esqueleto ya es el
    // estado inicial).
    let vigente = true
    Promise.resolve().then(() => {
      if (vigente) cargarNegocios()
    })
    return () => {
      vigente = false
    }
  }, [cargarNegocios])

  // Facetas derivadas de los datos reales (solo categorías/destinos presentes).
  const categorias = useMemo(() => {
    const conteo = new Map()
    for (const n of negocios) {
      if (n.categoria) conteo.set(n.categoria, (conteo.get(n.categoria) || 0) + 1)
    }
    return [...conteo.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [negocios])

  const destinos = useMemo(() => {
    const set = new Set()
    for (const n of negocios) if (n.destino) set.add(n.destino)
    return [...set].sort((a, b) => a.localeCompare(b, 'es'))
  }, [negocios])

  const filtrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    return negocios.filter((n) => {
      if (categoria !== 'todas' && n.categoria !== categoria) return false
      if (destino !== 'todos' && n.destino !== destino) return false
      if (!term) return true
      return (
        n.nombre?.toLowerCase().includes(term) ||
        n.categoria?.toLowerCase().includes(term) ||
        n.destino?.toLowerCase().includes(term) ||
        n.direccion?.toLowerCase().includes(term) ||
        n.descripcion?.toLowerCase().includes(term)
      )
    })
  }, [negocios, search, categoria, destino])

  const hayFiltros = search.trim() !== '' || categoria !== 'todas' || destino !== 'todos'

  function limpiarFiltros() {
    setSearch('')
    setCategoria('todas')
    setDestino('todos')
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* ============================================================ */}
      {/* Hero: comercio local de Córdoba (imagen propia, WebP)          */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-moss-950 py-20 md:py-28 text-white">
        <div className="absolute inset-0">
          <img
            src="/img/hero/hero-negocios-1600.webp"
            srcSet="/img/hero/hero-negocios-960.webp 960w, /img/hero/hero-negocios-1600.webp 1600w, /img/hero/hero-negocios-2200.webp 2200w"
            sizes="100vw"
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-cream-50 via-transparent to-black/30" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4 border border-white/15">
              <Store className="w-4 h-4 text-moss-300" />
              <span className="text-white/90 text-xs sm:text-sm font-semibold tracking-wide">NEGOCIOS Y OPERADORES LOCALES</span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
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
                aria-label="Buscar negocios"
                className="w-full pl-12 pr-6 py-4 rounded-full bg-white text-dark-900 placeholder:text-dark-400 shadow-xl border border-cream-200 focus:outline-none focus:ring-2 focus:ring-moss-400 text-sm"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Exploración: filtros + rejilla ancha                           */}
      {/* ============================================================ */}
      <section className="public-shell px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Barra de filtros por categoría (facetas reales de los datos) */}
        {!loading && !error && negocios.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setCategoria('todas')}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  categoria === 'todas'
                    ? 'bg-moss-900 text-white shadow-sm'
                    : 'bg-white hover:bg-cream-100 text-dark-700 border border-cream-200'
                }`}
              >
                <SlidersHorizontal className={`w-4 h-4 ${categoria === 'todas' ? 'text-moss-200' : 'text-moss-700'}`} />
                <span>Todas ({negocios.length})</span>
              </button>
              {categorias.map(([nombre, conteo]) => {
                const active = categoria === nombre
                return (
                  <button
                    key={nombre}
                    onClick={() => setCategoria(active ? 'todas' : nombre)}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      active
                        ? 'bg-moss-900 text-white shadow-sm'
                        : 'bg-white hover:bg-cream-100 text-dark-700 border border-cream-200'
                    }`}
                  >
                    <span>{nombre}</span>
                    <span className={`text-[11px] font-bold ${active ? 'text-moss-200' : 'text-dark-400'}`}>{conteo}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {destinos.length > 0 && (
                <label className="inline-flex items-center gap-2 text-sm text-dark-600">
                  <MapPin className="w-4 h-4 text-moss-700 shrink-0" />
                  <span className="font-medium whitespace-nowrap">Destino:</span>
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="px-3 py-2 rounded-full bg-white border border-cream-200 text-sm text-dark-800 focus:outline-none focus:ring-2 focus:ring-moss-400 cursor-pointer max-w-[16rem]"
                  >
                    <option value="todos">Todos los destinos</option>
                    {destinos.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
              )}
              <p className="text-dark-500 text-sm sm:ml-auto">
                {filtrados.length} negocio{filtrados.length !== 1 ? 's' : ''} disponible{filtrados.length !== 1 ? 's' : ''}
              </p>
              {hayFiltros && (
                <button
                  onClick={limpiarFiltros}
                  className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-full text-xs font-semibold text-moss-900 bg-moss-100 hover:bg-moss-200 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}

        {error ? (
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm text-center max-w-xl mx-auto">
            <p className="font-semibold">No pudimos cargar los negocios.</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={cargarNegocios}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-700 text-white font-medium hover:bg-red-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className="card-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-cream-200 max-w-lg mx-auto p-8">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-moss-100 flex items-center justify-center">
              <Store className="w-7 h-7 text-moss-700" />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-dark-900 mb-2">
              No se encontraron negocios
            </h3>
            <p className="text-dark-500 text-sm mb-6">
              {hayFiltros
                ? 'Ningún negocio coincide con tu búsqueda o filtros. Prueba con otros criterios.'
                : 'Aún no hay negocios aprobados. Vuelve pronto.'}
            </p>
            {hayFiltros && (
              <button
                onClick={limpiarFiltros}
                className="px-6 py-2.5 rounded-full bg-moss-900 text-white text-xs font-semibold hover:bg-moss-800 transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="card-grid">
            {filtrados.map((business, index) => (
              <BusinessCard key={business.id} business={business} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
