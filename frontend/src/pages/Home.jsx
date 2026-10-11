import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Trees,
  Compass,
  Waves,
  Landmark,
  Clock,
  UtensilsCrossed,
  MapPin,
  ArrowRight,
  Star,
  Globe,
  Shield,
  ChevronRight,
  Feather,
  Heart,
} from 'lucide-react'
import { lugaresAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const experiences = [
  { label: 'Naturaleza', icon: Trees, color: 'bg-primary-100 text-primary-700' },
  { label: 'Aventura', icon: Compass, color: 'bg-ocean-100 text-ocean-700' },
  { label: 'Playa', icon: Waves, color: 'bg-sky-100 text-sky-700' },
  { label: 'Cultura', icon: Landmark, color: 'bg-amber-100 text-amber-700' },
  { label: 'Historia', icon: Clock, color: 'bg-rose-100 text-rose-700' },
  { label: 'Gastronomía', icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-700' },
]

const stats = [
  { value: '30+', label: 'municipios en Córdoba', icon: MapPin },
  { value: '100%', label: 'enfocado en Córdoba', icon: Shield },
  { value: '2.5M', label: 'habitantes en el dpto.', icon: Globe },
  { value: 'Turismo', label: 'auténtico y local', icon: Feather },
]

export default function Home() {
  const { user } = useAuth()
  const [destinos, setDestinos] = useState([])
  const [loadingDestinos, setLoadingDestinos] = useState(true)

  useEffect(() => {
    lugaresAPI
      .getAll()
      .then((res) => {
        setDestinos(res.data.slice(0, 3))
      })
      .catch(() => {
        setDestinos([])
      })
      .finally(() => setLoadingDestinos(false))
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-ocean-950"
        style={{
          backgroundImage: 'url("/img/img1.jpeg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay de legibilidad: oscurece la foto manteniendo el texto blanco legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-dark-950/70 via-dark-950/40 to-dark-950/60" />
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary-500/10 blur-3xl" />
          <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-ocean-400/10 blur-3xl" />
          <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-sand-400/8 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 text-center -mt-5">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-sm font-medium tracking-wide mb-8 backdrop-blur-sm border border-white/10">
                Descubre Córdoba con Cordalia
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] tracking-tight mb-6"
            >
              Explora{' '}
              <span className="bg-gradient-to-r from-primary-300 via-ocean-300 to-sand-300 bg-clip-text text-transparent">
                Córdoba
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="max-w-2xl mx-auto text-lg sm:text-xl text-white/70 leading-relaxed mb-10"
            >
              Descubre destinos únicos, vive experiencias inolvidables y conecta con la magia de
              un departamento lleno de cultura, naturaleza y aventura.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Link
                to="/lugares"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
              >
                Explorar destinos
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              {user ? (
                <Link
                  to="/perfil"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 backdrop-blur-sm"
                >
                  Ver mi perfil
                </Link>
              ) : (
                <Link
                  to="/registro"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 backdrop-blur-sm"
                >
                  Crear cuenta
                </Link>
              )}
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={4}
              className="flex items-center justify-center gap-8 sm:gap-12 text-white/60"
            >
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">30+</p>
                <p className="text-sm mt-0.5">Municipios</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">100%</p>
                <p className="text-sm mt-0.5">Córdoba</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white flex items-center justify-center gap-1">
                  5<Star className="w-5 h-5 fill-sand-400 text-sand-400" />
                </p>
                <p className="text-sm mt-0.5">Calidad</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Destinos Destacados */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.span
              variants={fadeUp}
              className="inline-block px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold tracking-wide mb-4"
            >
              Destinos Destacados
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-dark-900"
            >
              Destinos que debes conocer
            </motion.h2>
          </motion.div>

          {loadingDestinos ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`${i === 0 ? 'md:col-span-2 md:row-span-2' : ''} rounded-2xl bg-dark-100 animate-pulse h-64 md:h-full min-h-[280px]`}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {destinos.map((destino, i) => (
                <motion.div
                  key={destino.id || i}
                  variants={fadeUp}
                  custom={i}
                  className={`group relative overflow-hidden rounded-2xl ${
                    i === 0 ? 'md:col-span-2 md:row-span-2' : ''
                  }`}
                >
                  <Link
                    to={`/lugares/${destino.id}`}
                    className="block relative h-full min-h-[280px] md:min-h-0"
                  >
                    <div className="absolute inset-0">
                      <img
                        src={
                          destino.imagen ||
                          destino.imagen_url ||
                          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
                        }
                        alt={destino.nombre}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-dark-950/20 to-transparent" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8">
                      <div className="flex items-center gap-1.5 text-white/70 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{destino.ubicacion || destino.ciudad || 'Córdoba, Colombia'}</span>
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold text-white mb-2">
                        {destino.nombre}
                      </h3>
                      <p className="text-white/70 text-sm md:text-base line-clamp-2 mb-4 max-w-lg">
                        {destino.descripcion}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-primary-300 font-semibold text-sm group-hover:text-primary-200 transition-colors">
                        Explorar
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-12"
          >
            <Link
              to="/lugares"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-dark-900 hover:bg-dark-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Ver todos los destinos
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Experiencias */}
      <section id="experiencias" className="py-24 px-6 bg-dark-50 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.span
              variants={fadeUp}
              className="inline-block px-4 py-1.5 rounded-full bg-ocean-50 text-ocean-700 text-sm font-semibold tracking-wide mb-4"
            >
              Experiencias
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-dark-900"
            >
              Encuentra tu experiencia
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-4 text-lg text-dark-500 max-w-2xl mx-auto"
            >
              Córdoba ofrece todo tipo de experiencias para cada tipo de viajero.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {experiences.map((exp) => {
              const Icon = exp.icon
              return (
                <motion.div
                  key={exp.label}
                  variants={fadeUp}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Link
                    to="/lugares"
                    className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-white border border-dark-100 hover:border-dark-200 hover:shadow-lg transition-all duration-300"
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${exp.color} transition-transform group-hover:scale-110`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="font-semibold text-dark-800 text-sm text-center">
                      {exp.label}
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Por qué Colombia */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={staggerContainer}
            >
              <motion.span
                variants={fadeUp}
                className="inline-block px-4 py-1.5 rounded-full bg-sand-50 text-sand-700 text-sm font-semibold tracking-wide mb-4"
              >
                ¿Por qué Córdoba?
              </motion.span>
              <motion.h2
                variants={fadeUp}
                className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-dark-900 mb-6"
              >
                Un departamento sin igual
              </motion.h2>
              <motion.p variants={fadeUp} className="text-lg text-dark-500 leading-relaxed mb-8">
                Córdoba es un destino que lo tiene todo: desde las playas del golfo de Morrosquillo
                hasta las sabanas y ciénagas del interior, pasando por ecosistemas únicos, gastronomía
                auténtica y una cultura costeña vibrante. Con una biodiversidad impresionante y
                municipios llenos de historia, Córdoba es el destino ideal para el viajero curioso.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Link
                  to="/lugares"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-dark-900 hover:bg-dark-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Ver todos los destinos
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={staggerContainer}
              className="grid grid-cols-2 gap-6"
            >
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <motion.div
                    key={stat.label}
                    variants={fadeUp}
                    whileHover={{ scale: 1.02 }}
                    className="p-6 rounded-2xl bg-gradient-to-br from-dark-50 to-white border border-dark-100"
                  >
                    <Icon className="w-8 h-8 text-primary-500 mb-3" />
                    <p className="text-3xl sm:text-4xl font-bold text-dark-900 font-[family-name:var(--font-display)]">
                      {stat.value}
                    </p>
                    <p className="text-dark-500 mt-1">{stat.label}</p>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sobre nosotros */}
      <section className="py-24 px-6 bg-dark-50">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-6">
              <Heart className="w-8 h-8 text-primary-600" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-dark-900 mb-6"
            >
              Sobre Cordalia
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-dark-500 leading-relaxed max-w-2xl mx-auto mb-4">
              Somos una plataforma especializada en el turismo de Córdoba, Colombia.
              Nuestro objetivo es ayudarte a descubrir los mejores destinos del departamento,
              conectarte con negocios turísticos locales y encontrar planes que se ajusten
              a lo que buscas.
            </motion.p>
            <motion.p variants={fadeUp} className="text-lg text-dark-500 leading-relaxed max-w-2xl mx-auto">
              Cordalia nació con la misión de hacer el turismo en Córdoba más accesible,
              transparente y memorable para todos los viajeros.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ocean-900 via-primary-900 to-ocean-950 p-12 sm:p-16 text-center"
          >
            <div className="absolute inset-0">
              <div className="absolute top-[-30%] right-[-10%] w-[400px] h-[400px] rounded-full bg-primary-500/10 blur-3xl" />
              <div className="absolute bottom-[-20%] left-[-5%] w-[300px] h-[300px] rounded-full bg-ocean-400/10 blur-3xl" />
            </div>
            <div className="relative z-10">
              <motion.h2
                variants={fadeUp}
                className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6"
              >
                Tu próxima aventura comienza aquí
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="text-lg text-white/70 mb-10 max-w-2xl mx-auto"
              >
                Únete a los viajeros que ya descubrieron la mejor forma de explorar Córdoba
                y encontrar planes que se ajustan a su presupuesto.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Link
                  to="/lugares"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-dark-900 font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Comenzar ahora
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
