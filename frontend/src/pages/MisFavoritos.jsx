import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, MapPin, Store, ImageOff, Tag } from 'lucide-react'
import { favoritosAPI } from '../services/api'
import { useFavoritos } from '../hooks/useFavoritos'
import { formatRango } from './negocios/businessUtils'
import LoadingSpinner from '../components/LoadingSpinner'

function DestinoCard({ lugar, onRemove }) {
  const [imgError, setImgError] = useState(false)
  const { ids } = useFavoritos('destino')
  const activo = ids.has(Number(lugar.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group bg-white rounded-2xl border border-dark-100 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <Link to={`/lugares/${lugar.id}`} className="block relative aspect-[16/10] bg-dark-100 overflow-hidden">
        {lugar.imagen && !imgError ? (
          <img
            src={lugar.imagen}
            alt={lugar.nombre}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dark-300">
            <ImageOff className="w-9 h-9" />
          </div>
        )}
      </Link>
      <div className="p-5">
        <h3
          className="font-semibold text-dark-900 group-hover:text-primary-700 transition-colors"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Link to={`/lugares/${lugar.id}`}>{lugar.nombre}</Link>
        </h3>
        {lugar.ubicacion && (
          <p className="flex items-center gap-1.5 text-sm text-dark-500 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{lugar.ubicacion}</span>
          </p>
        )}
        <div className="mt-4 pt-4 border-t border-dark-100 flex items-center justify-between">
          <Link
            to={`/lugares/${lugar.id}`}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Ver destino
          </Link>
          <button
            onClick={() => onRemove(lugar)}
            aria-pressed={activo}
            aria-label={activo ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            title={activo ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            className={`inline-flex items-center justify-center p-2 rounded-full transition-all cursor-pointer ${
              activo
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : 'bg-white text-dark-400 hover:text-red-500 hover:bg-red-50 border border-dark-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${activo ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function NegocioCard({ negocio, onRemove }) {
  const [imgError, setImgError] = useState(false)
  const { ids } = useFavoritos('negocio')
  const activo = ids.has(Number(negocio.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group bg-white rounded-2xl border border-dark-100 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <Link to={`/negocios/${negocio.id}`} className="block relative aspect-[16/10] bg-dark-100 overflow-hidden">
        {negocio.portada_url && !imgError ? (
          <img
            src={negocio.portada_url}
            alt={negocio.nombre}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dark-300">
            <ImageOff className="w-9 h-9" />
          </div>
        )}
        {negocio.categoria && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-xs font-semibold text-primary-700 shadow-sm">
            {negocio.categoria}
          </span>
        )}
      </Link>
      <div className="p-5">
        <h3
          className="font-semibold text-dark-900 group-hover:text-primary-700 transition-colors"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Link to={`/negocios/${negocio.id}`}>{negocio.nombre}</Link>
        </h3>
        {negocio.destino && (
          <p className="flex items-center gap-1.5 text-sm text-primary-600 font-medium mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{negocio.destino}</span>
          </p>
        )}
        {negocio.direccion && (
          <p className="flex items-center gap-1.5 text-sm text-dark-500 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{negocio.direccion}</span>
          </p>
        )}
        <div className="mt-4 pt-4 border-t border-dark-100 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-dark-800">
            <Tag className="w-3.5 h-3.5 text-dark-400" />
            {formatRango(negocio.precio_min, negocio.precio_max) || 'Consultar'}
          </span>
          <button
            onClick={() => onRemove(negocio)}
            aria-pressed={activo}
            aria-label={activo ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            title={activo ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            className={`inline-flex items-center justify-center p-2 rounded-full transition-all cursor-pointer ${
              activo
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : 'bg-white text-dark-400 hover:text-red-500 hover:bg-red-50 border border-dark-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${activo ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function MisFavoritos() {
  const [tab, setTab] = useState('destinos')
  const [destinos, setDestinos] = useState([])
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const { toggle: toggleDestino } = useFavoritos('destino')
  const { toggle: toggleNegocio } = useFavoritos('negocio')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    Promise.allSettled([favoritosAPI.destinos.list(), favoritosAPI.negocios.list()])
      .then(([d, n]) => {
        if (!active) return
        setDestinos(Array.isArray(d.value?.data) ? d.value.data : [])
        setNegocios(Array.isArray(n.value?.data) ? n.value.data : [])
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function removeDestino(lugar) {
    try {
      await toggleDestino(lugar.id)
      setDestinos((prev) => prev.filter((l) => String(l.id) !== String(lugar.id)))
    } catch {
      // El toggle optimista revierte solo; el toast del hook? aquí no hay toast.
    }
  }

  async function removeNegocio(negocio) {
    try {
      await toggleNegocio(negocio.id)
      setNegocios((prev) => prev.filter((n) => String(n.id) !== String(negocio.id)))
    } catch {
      // Reversión optimista ya manejada por el hook
    }
  }

  const total = destinos.length + negocios.length

  const tabs = [
    { id: 'destinos', label: 'Destinos', icon: Store, count: destinos.length },
    { id: 'negocios', label: 'Negocios', icon: MapPin, count: negocios.length },
  ]

  return (
    <div className="min-h-screen bg-dark-50">
      <section className="bg-gradient-to-br from-primary-900 to-ocean-900 py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <Heart className="w-7 h-7 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Mis favoritos
              </h1>
              <p className="text-white/70 mt-1">
                {total > 0
                  ? `Tienes ${total} ${total === 1 ? 'guardado' : 'guardados'}.`
                  : 'Guarda destinos y negocios para volver a ellos cuando quieras.'}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="flex flex-wrap gap-1 bg-white rounded-xl border border-dark-100 p-1 mb-8 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                tab === t.id ? 'bg-primary-600 text-white' : 'text-dark-600 hover:bg-dark-100'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20 text-white' : 'bg-dark-100 text-dark-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner text="Cargando tus favoritos..." />
        ) : error ? (
          <div className="bg-white rounded-2xl border border-dark-100 p-10 text-center">
            <p className="text-sm text-dark-500">No se pudieron cargar tus favoritos.</p>
          </div>
        ) : tab === 'destinos' ? (
          destinos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dark-100">
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-dark-100 flex items-center justify-center mb-4">
                  <Heart className="w-8 h-8 text-dark-400" />
                </div>
                <h3 className="text-lg font-semibold text-dark-800 mb-1">Aún no guardas destinos</h3>
                <p className="text-sm text-dark-500 text-center max-w-sm">
                  Explora los destinos y toca el corazón para guardarlos aquí.
                </p>
                <Link
                  to="/lugares"
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  <Store className="w-4 h-4" />
                  Explorar destinos
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {destinos.map((l) => (
                <DestinoCard key={l.id} lugar={l} onRemove={removeDestino} />
              ))}
            </div>
          )
        ) : negocios.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dark-100">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-dark-100 flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-dark-400" />
              </div>
              <h3 className="text-lg font-semibold text-dark-800 mb-1">Aún no guardas negocios</h3>
              <p className="text-sm text-dark-500 text-center max-w-sm">
                Encuentra hoteles, restaurantes y tours que te interesen y guárdalos aquí.
              </p>
              <Link
                to="/negocios"
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Explorar negocios
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {negocios.map((n) => (
              <NegocioCard key={n.id} negocio={n} onRemove={removeNegocio} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}