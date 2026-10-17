import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sprout,
  Trees,
  Compass,
  Waves,
  MapPin,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Ticket,
  Sparkles,
  Star,
  Users,
  Quote,
} from 'lucide-react'
import { lugaresAPI, planesAPI } from '../services/api'
import { getDestinoImagen, getPlanImagen } from '../utils/media'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const viewport = { once: true, margin: '-80px' }

// Testimonios de viajeros reales (diseño editorial inspirado en TerraGo)
const testimonials = [
  {
    quote:
      'Navegar por el río Sinú al atardecer y aprender del tejido de caña flecha con artesanos Zenú fue una experiencia inolvidable. Córdoba es mágica y acogedora.',
    name: 'Camila Restrepo',
    location: 'Medellín, Colombia',
    role: 'Viajera de Naturaleza',
    avatar: '/img/avatars/avatar1.jpg',
    rating: 5,
  },
  {
    quote:
      'El equilibrio perfecto entre aventura ecológica, descanso en Playa Blanca y respeto por los manglares de Cispatá. La atención de los guías locales fue excepcional.',
    name: 'Alejandro Valdés',
    location: 'Bogotá, Colombia',
    role: 'Ecoturista',
    avatar: '/img/avatars/avatar2.jpg',
    rating: 5,
  },
  {
    quote:
      'Más que unas vacaciones, fue conectar con la biodiversidad y las historias de Lorica y Montería. Volveré a Córdoba con mi familia sin dudarlo.',
    name: 'Sofía Morales',
    location: 'Bucaramanga, Colombia',
    role: 'Fotógrafa de Viajes',
    avatar: '/img/avatars/avatar3.jpg',
    rating: 5,
  },
]

// Fallback de 4 destinos emblemáticos de Córdoba si la base de datos está cargando
const defaultDestinos = [
  {
    id: 3,
    nombre: 'San Antero',
    municipio: 'San Antero',
    ubicacion: 'Golfo de Morrosquillo, Córdoba',
    descripcion: 'Playas serenas de aguas cálidas, manglares de la Bahía de Cispatá y avistamiento de fauna costera.',
  },
  {
    id: 2,
    nombre: 'Santa Cruz de Lorica',
    municipio: 'Santa Cruz de Lorica',
    ubicacion: 'Bajo Sinú, Córdoba',
    descripcion: 'Pueblo Patrimonio con arquitectura republicana árabe y el icónico Mercado Público sobre el río Sinú.',
  },
  {
    id: 1,
    nombre: 'Montería',
    municipio: 'Montería',
    ubicacion: 'Ronda del Sinú, Córdoba',
    descripcion: 'La capital verde de Colombia, con su extenso malecón ecológico, monos aulladores, iguanas y brisa ribereña.',
  },
  {
    id: 7,
    nombre: 'Tierralta & Paramillo',
    municipio: 'Tierralta',
    ubicacion: 'Alto Sinú, Córdoba',
    descripcion: 'Puerta de entrada a los bosques y cascadas del Parque Nacional Paramillo y la majestuosa represa de Urrá.',
  },
]

// Fallback de 3 planes sostenibles emblemáticos
const defaultPlanes = [
  {
    id: 101,
    nombre: 'Expedición Manglares de Cispatá',
    precio: 140000,
    duracion: '1 Día',
    tag: 'Bajo Impacto',
    destino: { nombre: 'San Antero' },
    incluye: ['Lancha ecológica', 'Guía local', 'Almuerzo tradicional'],
  },
  {
    id: 102,
    nombre: 'Travesía Río Sinú y Ronda Verde',
    precio: 95000,
    duracion: '4 Horas',
    tag: 'Ecoturismo',
    destino: { nombre: 'Montería' },
    incluye: ['Paseo en planchón', 'Avistamiento de aves', 'Refrigerio típico'],
  },
  {
    id: 103,
    nombre: 'Ruta Artesanal y Memoria Zenú',
    precio: 160000,
    duracion: '1 Día',
    tag: 'Comunitario',
    destino: { nombre: 'Tuchín & Lorica' },
    incluye: ['Taller de caña flecha', 'Visita a mercado histórico', 'Guía artesano'],
  },
]

export default function Home() {
  const [destinos, setDestinos] = useState(defaultDestinos)
  const [planes, setPlanes] = useState(defaultPlanes)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  useEffect(() => {
    lugaresAPI
      .getAll()
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : []
        if (items.length > 0) {
          setDestinos(items.slice(0, 4))
        } else {
          setDestinos(defaultDestinos)
        }
      })
      .catch(() => {
        setDestinos(defaultDestinos)
      })
  }, [])

  useEffect(() => {
    planesAPI
      .list({})
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : []
        if (items.length > 0) {
          setPlanes(items.slice(0, 3))
        } else {
          setPlanes(defaultPlanes)
        }
      })
      .catch(() => {
        setPlanes(defaultPlanes)
      })
  }, [])

  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const displayedDestinos = destinos.length >= 4 ? destinos.slice(0, 4) : defaultDestinos
  const displayedPlanes = planes.length >= 3 ? planes.slice(0, 3) : defaultPlanes
  const displayedTestimonials = testimonials.map((_, i) =>
    testimonials[(activeTestimonial + i) % testimonials.length]
  )

  return (
    <div className="min-h-screen bg-cream-50 text-dark-900 overflow-x-hidden selection:bg-moss-700 selection:text-white">
      {/* ============================================================ */}
      {/* 1. HERO PRINCIPAL — Inspirado en TerraGo                      */}
      {/* ============================================================ */}
      <section className="relative min-h-[580px] md:min-h-[660px] lg:min-h-[84vh] flex items-center justify-center overflow-hidden bg-moss-950">
        {/* Background Image: Panorámica de naturaleza exuberante */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-100"
          style={{
            backgroundImage: 'url("/img/hero/hero-nature.jpg")',
          }}
        >
          {/* Overlay gradiente editorial: asegura perfecta legibilidad preservando la belleza fotográfica */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-cream-50 via-transparent to-black/40" />
        </div>

        {/* Decorative Nature Light Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-moss-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Chica: recorte transparente anclado al contenedor (max-w-7xl)
            Posicionada más arriba y a la derecha (golden ratio) para armonía perfecta con el texto */}
        <div className="pointer-events-none absolute inset-0 z-[1] flex justify-center">
          <div className="relative w-full max-w-7xl h-full">
            <img
              src="/img/chica.png"
              alt="Viajera admirando la naturaleza y el agua de Córdoba"
              className="absolute top-[2%] sm:top-[2%] md:top-[1%] lg:top-[1%] xl:top-0 left-[84%] sm:left-[78%] md:left-[74%] lg:left-[70%] xl:left-[71%] -translate-x-1/2 h-[64%] sm:h-[75%] md:h-[85%] lg:h-[94%] xl:h-[97%] w-auto object-contain object-top select-none opacity-60 md:opacity-75 lg:opacity-95"
              style={{
                // Borde izquierdo suave para fundir con el fondo y la composición
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 16%)',
                maskImage: 'linear-gradient(to right, transparent 0%, #000 16%)',
              }}
              loading="eager"
              decoding="async"
            />
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 md:pt-10 lg:pt-8 pb-12 lg:pb-14 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Columna Izquierda: Título y llamadas a la acción */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="lg:col-span-7 text-left"
            >
              {/* Kicker all-caps con hojas */}
              <motion.div variants={fadeUp} custom={0} className="mb-3">
                <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-moss-200">
                  <Sprout className="w-4 h-4 text-moss-300" />
                  EXPLORA • PRESERVA • VIVE CÓRDOBA
                </span>
              </motion.div>

              {/* Título Principal Editorial Serif */}
              <motion.h1
                variants={fadeUp}
                custom={1}
                className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl md:text-[52px] lg:text-[54px] xl:text-6xl font-bold text-white leading-[1.12] tracking-tight mb-4"
              >
                Viajes con Propósito <br />
                <span className="font-serif italic font-normal text-moss-200">
                  para un Futuro Sostenible
                </span>
              </motion.h1>

              {/* Subtítulo descriptivo */}
              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-sm sm:text-base md:text-lg text-stone-200 font-normal leading-relaxed max-w-xl lg:max-w-lg mb-6"
              >
                Descubre rincones fascinantes en Córdoba, apoya a las comunidades
                locales y ayuda a proteger nuestros ríos, ciénagas y playas a través del turismo
                consciente.
              </motion.p>

              {/* Acciones principales tipo Pill */}
              <motion.div
                variants={fadeUp}
                custom={3}
                className="flex flex-wrap items-center gap-3.5 mb-6"
              >
                <Link
                  to="/lugares"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#1b3d2f] hover:bg-[#254f3e] text-white font-semibold text-sm sm:text-base transition-all duration-300 shadow-pill hover:shadow-xl hover:-translate-y-0.5"
                >
                  <span>Explorar Destinos</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/planes"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold text-sm sm:text-base backdrop-blur-md border border-white/25 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Ticket className="w-4 h-4 text-moss-200" />
                  <span>Ver Planes</span>
                </Link>
              </motion.div>

              {/* Micro-pills inferiores con valores ecológicos */}
              <motion.div
                variants={fadeUp}
                custom={4}
                className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-medium text-stone-100"
              >
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-sm border border-white/10">
                  <Trees className="w-3.5 h-3.5 text-moss-300" />
                  Menor Huella
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-sm border border-white/10">
                  <Users className="w-3.5 h-3.5 text-moss-300" />
                  Comunidades Fuertes
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-sm border border-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-moss-300" />
                  Futuro Sostenible
                </span>
              </motion.div>
            </motion.div>

            {/* Columna Derecha: Sello caligráfico manuscrito TerraGo style
                (arriba a la derecha, para no competir con la figura central) */}
            <div className="lg:col-span-5 hidden lg:flex justify-end items-start pr-2 pt-2 xl:pt-4">
              <motion.div
                initial={{ opacity: 0, rotate: -8, scale: 0.9 }}
                animate={{ opacity: 1, rotate: -5, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-right select-none"
              >
                <p className="font-[family-name:var(--font-script)] text-2xl xl:text-3xl text-moss-200/90 leading-tight">
                  Lugares Mágicos,
                  <br />
                  Gente Auténtica
                </p>
                <div className="flex justify-end mt-1.5">
                  <Sprout className="w-5 h-5 text-moss-300/80 -rotate-12" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. TOP ECO DESTINATIONS — Destinos Destacados de Córdoba     */}
      {/* ============================================================ */}
      <section className="relative py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-cream-50 overflow-hidden">
        {/* Subtle organic leaves background accent */}
        <div className="absolute -left-12 top-24 w-32 h-64 opacity-25 pointer-events-none text-moss-400">
          <svg viewBox="0 0 100 200" fill="currentColor">
            <path d="M10,50 Q40,10 80,40 T90,120 Q50,150 20,100 Z" opacity="0.6" />
            <path d="M0,120 Q30,80 70,110 T80,180 Q40,190 10,150 Z" opacity="0.4" />
          </svg>
        </div>
        <div className="absolute -right-12 bottom-12 w-32 h-64 opacity-25 pointer-events-none text-moss-400 rotate-180">
          <svg viewBox="0 0 100 200" fill="currentColor">
            <path d="M10,50 Q40,10 80,40 T90,120 Q50,150 20,100 Z" opacity="0.6" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header de sección con botón de acción lateral */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-dark-900 tracking-tight">
                Top Destinos de Córdoba
              </h2>
              <p className="text-dark-500 text-base sm:text-lg mt-2">
                Rincones fascinantes. Naturaleza y cultura viva.
              </p>
            </div>
            <Link
              to="/lugares"
              className="inline-flex items-center gap-2 self-start md:self-auto px-5 py-2.5 rounded-full border border-cream-300 bg-white hover:bg-cream-100 text-dark-800 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow"
            >
              <span>Ver Todos los Destinos</span>
              <ArrowRight className="w-4 h-4 text-moss-800" />
            </Link>
          </div>

          {/* Grid de 4 tarjetas estilo TerraGo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedDestinos.map((dest, idx) => {
              const imgUrl = getDestinoImagen(dest)
              return (
                <div
                  key={dest.id || idx}
                  className="group bg-white rounded-[22px] border border-cream-200 overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col"
                >
                  <Link
                    to={`/lugares/${dest.id || dest._id}`}
                    className="relative block aspect-[16/11] overflow-hidden bg-cream-200"
                  >
                    <img
                      src={imgUrl}
                      alt={dest.nombre}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  </Link>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-moss-800 font-semibold mb-1">
                        <MapPin className="w-3.5 h-3.5 text-moss-700" />
                        <span>{dest.municipio || dest.ubicacion || 'Córdoba, Colombia'}</span>
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-dark-900 group-hover:text-moss-900 transition-colors">
                        <Link to={`/lugares/${dest.id || dest._id}`}>{dest.nombre}</Link>
                      </h3>
                      <p className="text-dark-500 text-xs sm:text-sm mt-2 line-clamp-2 leading-relaxed">
                        {dest.descripcion || 'Explora este destino emblemático de Córdoba y sus atractivos naturales.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-cream-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-moss-900 group-hover:underline">
                        Descubrir lugar
                      </span>
                      <Link
                        to={`/lugares/${dest.id || dest._id}`}
                        aria-label={`Ver detalles de ${dest.nombre}`}
                        className="w-9 h-9 rounded-full bg-moss-900 group-hover:bg-moss-800 text-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. SUSTAINABLE TOUR PACKAGES — Planes y Paquetes Turísticos   */}
      {/* ============================================================ */}
      <section className="relative py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-cream-100/60 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Header de sección */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-dark-900 tracking-tight">
                Planes y Paquetes Turísticos
              </h2>
              <p className="text-dark-500 text-base sm:text-lg mt-2">
                Experiencias auténticas organizadas con impacto positivo.
              </p>
            </div>
            <Link
              to="/planes"
              className="inline-flex items-center gap-2 self-start md:self-auto px-5 py-2.5 rounded-full border border-cream-300 bg-white hover:bg-cream-100 text-dark-800 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow"
            >
              <span>Ver Todos los Planes</span>
              <ArrowRight className="w-4 h-4 text-moss-800" />
            </Link>
          </div>

          {/* Grid de 3 tarjetas estilo TerraGo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {displayedPlanes.map((plan, idx) => {
              const imgUrl = getPlanImagen(plan, idx)
              const badgeTag =
                idx === 0 ? 'Bajo Impacto' : idx === 1 ? 'Ecoturismo' : 'Comunidad Local'

              return (
                <div
                  key={plan.id || idx}
                  className="group bg-white rounded-[24px] p-4 border border-cream-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col"
                >
                  {/* Photo Container with rounded-[18px] */}
                  <div className="relative aspect-[16/10] rounded-[18px] overflow-hidden bg-cream-200">
                    <img
                      src={imgUrl}
                      alt={plan.nombre}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />

                    {/* Floating pill badge on top right */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-moss-900 shadow-sm border border-black/5">
                        <Sprout className="w-3.5 h-3.5 text-moss-600" />
                        {plan.tag || badgeTag}
                      </span>
                    </div>
                  </div>

                  {/* Body content */}
                  <div className="p-3 pt-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-dark-900 group-hover:text-moss-900 transition-colors leading-snug">
                        <Link to={`/planes/${plan.id}`}>{plan.nombre}</Link>
                      </h3>

                      {/* Meta info tags */}
                      <div className="flex items-center gap-4 text-xs text-dark-500 font-medium mt-3">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-moss-700" />
                          {plan.destino?.nombre || 'Córdoba'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-moss-700" />
                          {plan.duracion || 'Grupos pequeños'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-cream-100 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-dark-400 font-semibold block">
                          Desde
                        </span>
                        <span className="text-lg font-bold text-moss-950 font-[family-name:var(--font-display)]">
                          ${' '}
                          {Number(plan.precio || 120000).toLocaleString('es-CO', {
                            maximumFractionDigits: 0,
                          })}{' '}
                          <span className="text-xs font-normal text-dark-500">COP</span>
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
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. TRAVEL THAT MAKES A DIFFERENCE — Stats de Impacto y Sostenibilidad */}
      {/* ============================================================ */}
      <section className="relative bg-[#1c3d2f] text-white py-24 md:py-28 overflow-hidden">
        {/* Wavy organic top border SVG */}
        <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none pointer-events-none">
          <svg
            className="relative block w-full h-8 md:h-12 text-cream-100/60"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 C150,90 350,-40 500,50 C650,140 900,10 1200,40 L1200,0 L0,0 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-moss-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer}
            className="max-w-3xl mx-auto mb-16"
          >
            <motion.h2
              variants={fadeUp}
              className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4"
            >
              Turismo que Transforma y Protege
            </motion.h2>
            <motion.p variants={fadeUp} className="text-moss-100/80 text-base sm:text-lg leading-relaxed">
              Impacto real en nuestras comunidades, humedales y patrimonio cultural de Córdoba.
            </motion.p>
          </motion.div>

          {/* 4 Circled Stats como en TerraGo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border border-moss-300/40 bg-moss-800/40 flex items-center justify-center mb-4">
                <Sprout className="w-7 h-7 text-moss-300" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-white tracking-tight">
                120K+
              </span>
              <span className="text-xs sm:text-sm text-moss-200/80 mt-1 max-w-[170px]">
                Hectáreas de Humedales y Selvas Protegidas
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border border-moss-300/40 bg-moss-800/40 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-moss-300" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-white tracking-tight">
                50+
              </span>
              <span className="text-xs sm:text-sm text-moss-200/80 mt-1 max-w-[170px]">
                Comunidades y Familias Locales Apoyadas
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border border-moss-300/40 bg-moss-800/40 flex items-center justify-center mb-4">
                <Compass className="w-7 h-7 text-moss-300" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-white tracking-tight">
                25K+
              </span>
              <span className="text-xs sm:text-sm text-moss-200/80 mt-1 max-w-[170px]">
                Viajeros Conscientes Inspirados
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border border-moss-300/40 bg-moss-800/40 flex items-center justify-center mb-4">
                <Waves className="w-7 h-7 text-moss-300" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-white tracking-tight">
                30+
              </span>
              <span className="text-xs sm:text-sm text-moss-200/80 mt-1 max-w-[170px]">
                Rutas de Conservación y Aventura
              </span>
            </div>
          </div>
        </div>

        {/* Wavy organic bottom border SVG */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none pointer-events-none">
          <svg
            className="relative block w-full h-8 md:h-12 text-cream-50"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 C300,100 600,-40 850,70 C1050,150 1150,50 1200,90 L1200,120 L0,120 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. WHAT OUR TRAVELERS SAY — Testimonios y Comunidad           */}
      {/* ============================================================ */}
      <section className="relative py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-cream-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Header con flechas de navegación */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-dark-900 tracking-tight">
                  Lo Que Cuentan Quienes Nos Visitan
                </h2>
                <Sprout className="w-5 h-5 text-moss-600 hidden sm:inline" />
              </div>
              <p className="text-dark-500 text-base sm:text-lg mt-2">
                Historias reales de personas que han conectado con Córdoba.
              </p>
            </div>

            {/* Navigation carousel buttons */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={prevTestimonial}
                className="w-10 h-10 rounded-full border border-cream-300 bg-white hover:bg-cream-100 text-dark-800 flex items-center justify-center transition-colors shadow-sm"
                aria-label="Testimonio anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextTestimonial}
                className="w-10 h-10 rounded-full border border-cream-300 bg-white hover:bg-cream-100 text-dark-800 flex items-center justify-center transition-colors shadow-sm"
                aria-label="Siguiente testimonio"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cards de testimonios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayedTestimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-[22px] p-6 border border-cream-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Subtle quotation background watermark */}
                <Quote className="absolute right-4 bottom-4 w-16 h-16 text-moss-100/40 pointer-events-none" />

                <div>
                  <p className="text-dark-700 text-sm md:text-base leading-relaxed italic mb-6">
                    "{t.quote}"
                  </p>
                </div>

                <div className="pt-4 border-t border-cream-100 flex items-center gap-3 relative z-10">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-11 h-11 rounded-full object-cover border border-moss-300/40"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-dark-900 truncate">{t.name}</h4>
                    <p className="text-xs text-dark-500 truncate">{t.role}</p>
                    <div className="flex items-center gap-1 mt-1 text-amber-500">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. READY TO TRAVEL WITH PURPOSE? — Final CTA Banner           */}
      {/* ============================================================ */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-cream-50">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-[28px] overflow-hidden bg-moss-950 min-h-[380px] md:min-h-[420px] flex items-center shadow-xl">
            {/* Background panoramic photo */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: 'url("/img/hero/cta-nature.jpg")',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30" />
            </div>

            <div className="relative z-10 p-8 sm:p-12 md:p-16 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-moss-300 block mb-3">
                SÉ PARTE DE UN TURISMO CONSCIENTE
              </span>

              <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold text-white tracking-tight leading-[1.15] mb-4">
                ¿Listo para Viajar <br />
                <span className="font-serif italic font-normal text-moss-200">
                  con Propósito?
                </span>
              </h2>

              <p className="text-stone-300 text-base sm:text-lg mb-8 leading-relaxed">
                Reserva tu próxima aventura, apoya la economía local y crea recuerdos imborrables
                en el corazón de Córdoba, Colombia.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/planes"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-moss-800 hover:bg-moss-700 text-white font-semibold text-sm sm:text-base transition-all duration-300 shadow-pill hover:shadow-xl hover:-translate-y-0.5"
                >
                  <span>Planear Mi Viaje</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/lugares"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base backdrop-blur-md border border-white/20 transition-all duration-300"
                >
                  <span>Ver Destinos</span>
                </Link>
              </div>
            </div>

            {/* Sello caligráfico en la esquina derecha del banner CTA */}
            <div className="absolute right-8 bottom-8 hidden lg:block text-right select-none opacity-90">
              <p className="font-[family-name:var(--font-script)] text-3xl text-moss-200/90 leading-tight rotate-[-4deg]">
                Experiencias Reales,
                <br />
                Recuerdos Eternos
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
