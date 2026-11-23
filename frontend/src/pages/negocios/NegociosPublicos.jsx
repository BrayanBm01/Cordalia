import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Store, MapPin, ArrowUpRight, ArrowRight, Search, SearchX, RefreshCw,
  X, Compass, UtensilsCrossed, BedDouble, Palette, Bus, Trees, Star,
  Sparkles, SlidersHorizontal, BadgeCheck,
} from 'lucide-react'
import { businessesAPI, reviewsAPI } from '../../services/api'
import { esImagenDeRelleno } from '../../utils/media'
import { formatRango } from './businessUtils'
import { rutaCon } from '../../routes/offuscatedRoutes.js'
import './negociosPublicos.css'

/* ── Lenguaje visual por categoría ─────────────────────────────────────
   Cada familia tiene icono y color propio. Los colores se inyectan como
   variables CSS (Tailwind no puede generar clases dinámicas en runtime). */
const VISUALES = {
  gastronomia: {
    icono: UtensilsCrossed, etiqueta: 'Gastronomía',
    solido: '#df4f26', relleno: '#b83a1a', brillo: 'rgba(184, 58, 26, 0.42)', suave: '#fff5f0',
  },
  hospedaje: {
    icono: BedDouble, etiqueta: 'Hospedaje',
    solido: '#0d9488', relleno: '#0f766e', brillo: 'rgba(15, 118, 110, 0.42)', suave: '#f0fdfa',
  },
  tours: {
    icono: Compass, etiqueta: 'Tours y viajes',
    solido: '#ee9f1f', relleno: '#8a5604', brillo: 'rgba(138, 86, 4, 0.38)', suave: '#fff3d6',
  },
  artesanias: {
    icono: Palette, etiqueta: 'Artesanías',
    solido: '#4e8561', relleno: '#2f553d', brillo: 'rgba(47, 85, 61, 0.42)', suave: '#f2f7f4',
  },
  transporte: {
    icono: Bus, etiqueta: 'Transporte',
    solido: '#3b6b4c', relleno: '#244331', brillo: 'rgba(36, 67, 49, 0.42)', suave: '#f2f7f4',
  },
  naturaleza: {
    icono: Trees, etiqueta: 'Naturaleza',
    solido: '#0d9488', relleno: '#115e59', brillo: 'rgba(17, 94, 89, 0.42)', suave: '#f0fdfa',
  },
  otro: {
    icono: Store, etiqueta: 'Negocios locales',
    solido: '#3b6b4c', relleno: '#1c3d2f', brillo: 'rgba(28, 61, 47, 0.42)', suave: '#f2f7f4',
  },
}

function visualDe(categoria = '') {
  const texto = categoria.toLowerCase()
  if (/restaurante|bar\b|caf[eé]|cafeter|gastronom|comida|pizzer/i.test(texto)) return VISUALES.gastronomia
  if (/hotel|hostal|alojamiento|posada|hosped|habitacion|caba[nñ]a/i.test(texto)) return VISUALES.hospedaje
  if (/artesan|tienda|mercado|artesan[ií]a|taller/i.test(texto)) return VISUALES.artesanias
  if (/transporte|taxi|bus|colectivo|veh[ií]culo/i.test(texto)) return VISUALES.transporte
  if (/parque|reserva|natural|ecolog|selva|r[ií]o|playa/i.test(texto)) return VISUALES.naturaleza
  if (/tour|agencia|viaje|experiencia|excursi|operador/i.test(texto)) return VISUALES.tours
  return VISUALES.otro
}

/* ── Calificación real (promedio de reseñas) ──────────────────────────
   No se inventan estrellas: se consulta el promedio publicado de cada
   negocio y se cachea durante la sesión para no repetir peticiones. */
const cacheResenas = new Map()

function useResenas(id) {
  const [resenas, setResenas] = useState(() => cacheResenas.get(id) ?? null)
  useEffect(() => {
    if (!id) return undefined
    if (cacheResenas.has(id)) {
      setResenas(cacheResenas.get(id))
      return undefined
    }
    let vigente = true
    reviewsAPI.getByBusiness(id)
      .then((res) => {
        const data = res?.data ?? {}
        const valor = {
          promedio: Number(data.promedio) || 0,
          cantidad: Number(data.cantidad) || 0,
        }
        cacheResenas.set(id, valor)
        if (vigente) setResenas(valor)
      })
      .catch(() => {
        if (vigente) setResenas({ promedio: 0, cantidad: 0 })
      })
    return () => { vigente = false }
  }, [id])
  return resenas
}

function Estrellas({ promedio = 0 }) {
  const llenas = Math.round(Number(promedio) || 0)
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={promedio > 0 ? `Calificación ${Number(promedio).toFixed(1)} de 5` : 'Sin reseñas todavía'}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`nb-star ${n <= llenas ? 'fill-saffron-400 text-saffron-500' : 'text-dark-300'}`}
        />
      ))}
    </span>
  )
}

function Calificacion({ id }) {
  const resenas = useResenas(id)
  if (!resenas) return <span className="text-xs text-dark-400">Cargando reseñas…</span>
  if (!resenas.cantidad) {
    return (
      <span className="inline-flex items-center gap-2">
        <Estrellas />
        <span className="text-xs text-dark-500">Sin reseñas aún</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Estrellas promedio={resenas.promedio} />
      <span className="text-xs font-extrabold text-dark-900">{resenas.promedio.toFixed(1)}</span>
      <span className="text-xs text-dark-400">({resenas.cantidad})</span>
    </span>
  )
}

/* ── Esqueleto con brillo (estado de carga) ─────────────────────────── */
function SkeletonCard() {
  return (
    <div className="nb-card" aria-hidden="true">
      <div className="card-media card-media-lg nb-skeleton-shine" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-5 w-3/4 rounded-full nb-skeleton-shine" />
        <div className="h-3 w-1/2 rounded-full nb-skeleton-shine" />
        <div className="h-3 w-2/3 rounded-full nb-skeleton-shine" />
        <div className="mt-auto h-10 w-full rounded-xl nb-skeleton-shine" />
      </div>
    </div>
  )
}

/* ── Fotografía con respaldo ────────────────────────────────────────── */
function FotoNegocio({ business, visual, className = '' }) {
  const [error, setError] = useState(false)
  const portada = business.portada_url
  const Icono = visual.icono
  if (portada && !error && !esImagenDeRelleno(portada)) {
    return (
      <img
        src={portada}
        alt={`${business.nombre}${business.categoria ? ` — ${business.categoria}` : ''}`}
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
        className={className}
      />
    )
  }
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-moss-700 via-moss-900 to-dark-950 ${className}`}>
      <Icono className="h-10 w-10 text-saffron-300" aria-hidden="true" />
      <span className="px-3 text-center text-[0.65rem] font-extrabold uppercase tracking-[0.22em] text-white/85">
        {business.categoria || 'Negocio local'}
      </span>
    </div>
  )
}

/* ── Tarjeta de la rejilla general ──────────────────────────────────── */
function BusinessCard({ business, index, reduceMotion }) {
  const visual = visualDe(business.categoria)
  const Icono = visual.icono
  const rango = formatRango(business.precio_min, business.precio_max)
  const ubicacion = [business.destino, business.direccion].filter(Boolean).join(' · ')

  return (
    <motion.div
      className="h-full"
      initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={rutaCon('NEGOCIOS_PUBLICOS', business.id)}
        className="nb-card group"
        style={{ '--cat-color': visual.solido, '--cat-color-2': '#f6b73c' }}
      >
        <div className="card-media card-media-lg">
          <FotoNegocio business={business} visual={visual} />
          <div className="nb-card-sheen absolute inset-0" aria-hidden="true" />
          {business.categoria && (
            <span className="nb-badge absolute left-4 top-5 inline-flex max-w-[80%] items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[0.7rem] font-extrabold text-moss-900 backdrop-blur-md">
              <Icono className="h-3.5 w-3.5" style={{ color: visual.relleno }} aria-hidden="true" />
              <span className="truncate">{business.categoria}</span>
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="nb-card-title card-title line-clamp-2 text-dark-900 group-hover:text-moss-900">
              {business.nombre}
            </h3>
            <BadgeCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-moss-600"
              aria-label="Negocio aprobado por Cordalia"
            />
          </div>

          {ubicacion && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-dark-600">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: visual.relleno }} aria-hidden="true" />
              <span className="truncate">{ubicacion}</span>
            </p>
          )}

          <div className="mt-3"><Calificacion id={business.id} /></div>

          {business.descripcion && (
            <p className="card-text mt-3 line-clamp-2 leading-relaxed text-dark-500">
              {business.descripcion}
            </p>
          )}

          <div className="mt-auto pt-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              {rango ? (
                <span className="nb-price-chip inline-flex items-baseline gap-1 rounded-full px-3 py-1.5">
                  <span className="card-price font-[family-name:var(--font-bazaar)] text-sm font-black">{rango}</span>
                  <span className="text-[0.65rem] font-bold">COP</span>
                </span>
              ) : (
                <span className="text-xs font-bold uppercase tracking-wider text-dark-400">Consultar precios</span>
              )}
              <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-moss-700">
                {visual.etiqueta}
              </span>
            </div>
            <span className="nb-cta">
              <span>Ver negocio</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Tarjeta destacada (composición editorial asimétrica) ───────────── */
function FeatureCard({ business, numero, destacada = false, reduceMotion }) {
  const visual = visualDe(business.categoria)
  const Icono = visual.icono

  return (
    <motion.div
      className="h-full"
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.18 + numero * 0.09, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={rutaCon('NEGOCIOS_PUBLICOS', business.id)}
        className={`nb-feature ${destacada ? 'nb-feature-featured' : ''}`}
      >
        <FotoNegocio business={business} visual={visual} />
        <div className="nb-feature-shade absolute inset-0" aria-hidden="true" />
        <span className={`nb-feature-number absolute right-4 top-3 ${destacada ? 'md:right-8 md:top-5' : ''}`} aria-hidden="true">
          0{numero + 1}
        </span>
        <div className="relative z-10">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-white"
            style={{ backgroundColor: visual.relleno }}
          >
            <Icono className="h-3 w-3" aria-hidden="true" />
            {business.categoria || 'Negocio local'}
          </span>
          <h3 className={`nb-feature-title mt-3 text-balance ${destacada ? 'text-3xl md:text-5xl' : 'text-xl md:text-2xl'}`}>
            {business.nombre}
          </h3>
          {business.destino && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {business.destino}
            </p>
          )}
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-saffron-300">
            Ver negocio <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Estado vacío ilustrado ─────────────────────────────────────────── */
function EmptyState({ hayFiltros, limpiarFiltros, reduceMotion }) {
  return (
    <motion.div
      className="nb-empty mx-auto max-w-2xl px-6 py-14 text-center text-white md:py-20"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className="nb-empty-ring absolute -left-16 -top-20 h-64 w-64" aria-hidden="true" />
      <div className="nb-empty-ring absolute -bottom-24 -right-10 h-80 w-80" aria-hidden="true" />
      <div className="relative z-10">
        <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[2rem] bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
          <div className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full bg-saffron-400 text-moss-950">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <SearchX className="h-11 w-11 text-saffron-300" aria-hidden="true" />
        </div>
        <h3 className="font-[family-name:var(--font-bazaar)] text-3xl font-black tracking-tight md:text-4xl">
          No se encontraron negocios
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/80 md:text-base">
          {hayFiltros
            ? 'Ningún negocio coincide con tu búsqueda o filtros. Prueba con otros criterios.'
            : 'Aún no hay negocios aprobados. Vuelve pronto.'}
        </p>
        {hayFiltros && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="nb-empty-btn mt-7 inline-flex items-center gap-2 rounded-full bg-saffron-400 px-7 py-3 text-sm font-extrabold text-moss-950"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Limpiar filtros
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ── Página ─────────────────────────────────────────────────────────── */
export default function NegociosPublicos() {
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [destino, setDestino] = useState('todos')
  const resultadosRef = useRef(null)
  const reduceMotion = useReducedMotion()

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
    let vigente = true
    Promise.resolve().then(() => {
      if (vigente) cargarNegocios()
    })
    return () => { vigente = false }
  }, [cargarNegocios])

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
  const destacados = useMemo(() => (hayFiltros ? [] : negocios.slice(0, 3)), [negocios, hayFiltros])

  function limpiarFiltros() {
    setSearch('')
    setCategoria('todas')
    setDestino('todos')
  }

  function irAResultados() {
    resultadosRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className="nb-page min-h-screen">
      {/* ══ HERO: feriante, asimétrico, con sello y buscador flotante ══ */}
      <section className="nb-hero relative isolate text-white">
        <img
          src="/img/hero/hero-negocios-1600.webp"
          srcSet="/img/hero/hero-negocios-960.webp 960w, /img/hero/hero-negocios-1600.webp 1600w, /img/hero/hero-negocios-2200.webp 2200w"
          sizes="100vw"
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="nb-hero-veil absolute inset-0" aria-hidden="true" />
        <div className="nb-hero-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="nb-hero-glow absolute -right-24 -top-32 h-96 w-96 rounded-full opacity-60" aria-hidden="true" />

        <motion.div
          className="public-shell relative z-10 px-4 pb-32 pt-20 sm:px-6 md:pb-40 md:pt-28"
          initial={reduceMotion ? false : { opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-saffron-300" aria-hidden="true" />
              <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.22em] text-white/95">
                Córdoba, Colombia · Guía local
              </span>
            </div>
            <h1 className="nb-title text-5xl sm:text-6xl md:text-7xl xl:text-[5.5rem]">
              Lo mejor de<br />
              <span className="nb-title-accent">Córdoba</span> está<br />
              aquí cerca.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/90 md:text-lg">
              Restaurantes, alojamientos, tours y artesanías verificadas. Encuentra tu próximo
              plan en un solo lugar.
            </p>
          </div>

          {/* Sello asimétrico (solo en pantallas grandes) */}
          <div className="pointer-events-none absolute right-6 top-24 hidden h-40 w-40 rounded-full border border-dashed border-saffron-300/60 xl:grid xl:place-items-center" aria-hidden="true">
            <div className="nb-stamp grid h-32 w-32 place-items-center rounded-full bg-saffron-400 text-center text-moss-950 shadow-2xl">
              <span className="px-3 text-[0.7rem] font-black uppercase leading-tight tracking-[0.12em]">
                100%<br />cordobés<br />✓ verificado
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══ BUSCADOR FLOTANTE (rompe el borde del hero) ═══════════════ */}
      <div className="relative z-20 -mt-20 md:-mt-24">
        <div className="public-shell px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={(e) => { e.preventDefault(); irAResultados() }}
            className="nb-search mx-auto flex max-w-5xl flex-col gap-2 rounded-[1.5rem] border border-cream-200 bg-white p-2.5 sm:flex-row sm:items-center md:rounded-[1.75rem] md:p-3"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-moss-700" aria-hidden="true" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busca un negocio, un municipio, una experiencia…"
                aria-label="Buscar negocios"
                className="w-full bg-transparent py-3 pl-12 pr-3 text-sm text-dark-900 placeholder:text-dark-400 md:text-base"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-coral-700 px-7 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-coral-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-saffron-400"
            >
              Explorar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          {!loading && !error && categorias.length > 0 && (
            <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-dark-500">Popular ahora:</span>
              {categorias.slice(0, 4).map(([nombre]) => (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => { setCategoria(nombre); setSearch(''); irAResultados() }}
                  className="nb-quick rounded-full border border-cream-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-moss-900 shadow-sm hover:bg-moss-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-700"
                >
                  {nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ IMPRESCINDIBLES ═══════════════════════════════════════════ */}
      {!loading && !error && destacados.length > 0 && (
        <section className="public-shell px-4 pb-4 pt-16 md:px-6 md:pt-24 lg:px-8" aria-labelledby="nb-destacados">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-coral-700">
                <span className="h-px w-8 bg-coral-500" aria-hidden="true" />
                Selección de la temporada
              </p>
              <h2
                id="nb-destacados"
                className="font-[family-name:var(--font-bazaar)] text-3xl font-black tracking-tight text-moss-950 md:text-5xl"
              >
                Imprescindibles <span className="italic text-coral-700">para conocer</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={irAResultados}
              className="inline-flex items-center gap-1.5 rounded-full border border-moss-200 bg-white px-5 py-2.5 text-sm font-extrabold text-moss-900 shadow-sm transition-colors hover:bg-moss-900 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-saffron-400"
            >
              Ver todos <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="nb-featured-grid">
            <FeatureCard business={destacados[0]} numero={0} destacada reduceMotion={reduceMotion} />
            <div className="nb-featured-side">
              {destacados.slice(1).map((negocio, i) => (
                <FeatureCard key={negocio.id} business={negocio} numero={i + 1} reduceMotion={reduceMotion} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ EXPLORACIÓN: riel sticky + rejilla ════════════════════════ */}
      <section ref={resultadosRef} className="public-shell px-4 pb-20 pt-10 md:px-6 md:pt-16 lg:px-8" aria-label="Explorar negocios">
        {!loading && !error && negocios.length > 0 && (
          <div className="nb-rail mb-8 p-3 md:p-4">
            <div className="nb-rail-scroll" role="group" aria-label="Filtrar por categoría">
              <button
                type="button"
                onClick={() => setCategoria('todas')}
                aria-pressed={categoria === 'todas'}
                className={`nb-pill ${categoria === 'todas' ? 'is-active' : ''}`}
                style={{ '--pill-bg': '#1c3d2f', '--pill-ink': '#ffffff', '--pill-glow': 'rgba(28,61,47,.4)' }}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Todas
                <span className="nb-pill-count">{negocios.length}</span>
              </button>
              {categorias.map(([nombre, conteo]) => {
                const visual = visualDe(nombre)
                const Icono = visual.icono
                const active = categoria === nombre
                return (
                  <button
                    key={nombre}
                    type="button"
                    onClick={() => setCategoria(active ? 'todas' : nombre)}
                    aria-pressed={active}
                    className={`nb-pill ${active ? 'is-active' : ''}`}
                    style={{
                      '--pill-bg': visual.relleno,
                      '--pill-ink': '#ffffff',
                      '--pill-glow': visual.brillo,
                    }}
                  >
                    <span className="nb-pill-dot" style={{ backgroundColor: visual.solido }} aria-hidden="true" />
                    <Icono className="h-4 w-4" style={{ color: active ? '#ffffff' : visual.relleno }} aria-hidden="true" />
                    <span>{nombre}</span>
                    <span className="nb-pill-count">{conteo}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-cream-100 pt-3">
              {destinos.length > 0 && (
                <label className="inline-flex min-h-[2.6rem] items-center gap-2 rounded-full border border-cream-200 bg-cream-50 px-4 text-sm text-dark-700">
                  <MapPin className="h-4 w-4 shrink-0 text-moss-700" aria-hidden="true" />
                  <span className="font-bold">Destino:</span>
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="max-w-[12rem] cursor-pointer bg-transparent font-semibold text-dark-900 focus:outline-none"
                  >
                    <option value="todos">Todos los destinos</option>
                    {destinos.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
              )}
              <p className="text-sm font-semibold text-dark-600">
                <span className="font-black text-moss-900">{filtrados.length}</span> negocio{filtrados.length !== 1 ? 's' : ''} para descubrir
              </p>
              {hayFiltros && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-4 py-2 text-xs font-extrabold text-coral-700 transition-colors hover:bg-coral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}

        {error ? (
          <div className="mx-auto max-w-xl rounded-[1.75rem] border border-coral-200 bg-coral-50 p-8 text-center text-coral-800">
            <p className="font-[family-name:var(--font-bazaar)] text-2xl font-black">No pudimos cargar los negocios.</p>
            <p className="mt-2 text-sm">{error}</p>
            <button
              type="button"
              onClick={cargarNegocios}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-coral-700 px-6 py-3 text-sm font-extrabold text-white hover:bg-coral-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-saffron-400"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className="card-grid nb-grid">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState hayFiltros={hayFiltros} limpiarFiltros={limpiarFiltros} reduceMotion={reduceMotion} />
        ) : (
          <div className="card-grid nb-grid">
            {filtrados.map((business, index) => (
              <BusinessCard key={business.id} business={business} index={index} reduceMotion={reduceMotion} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
