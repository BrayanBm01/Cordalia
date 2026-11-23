import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, MapPin, Phone, Globe, Mail, Star,
  Building2, Clock, Share2, Plus, Trash2, Loader2, Image as ImageIcon,
  CheckCircle2, Map as MapIcon, Ticket, ArrowRight, Store, X,
} from 'lucide-react'
import { businessesAPI, lugaresAPI, businessPlanesAPI, reviewsAPI } from '../../services/api'
import { esImagenDeRelleno, getDestinoImagen } from '../../utils/media'
import { useAuth } from '../../context/AuthContext'
import { ESTADO_LABEL, ESTADO_BADGE, DIAS_LABEL, formatRango } from './businessUtils'
import { formatMoney } from './businessUtils'
import { TIPO_PLAN_LABEL, formatDuracion, planPrecios } from './planUtils'
import LoadingSpinner from '../../components/LoadingSpinner'
import FavoritoButton from '../../components/FavoritoButton'
import ResenasSection from './ResenasSection'
import PlanesNegocio from './PlanesNegocio'
import ImageUploader from '../../components/ImageUploader'
import { toast } from 'sonner'
import { obtenerRuta, rutaCon } from '../../routes/offuscatedRoutes.js'
import './negocioDetalle.css'

function Estrellas({ promedio = 0 }) {
  const llenas = Math.round(Number(promedio) || 0)
  return (
    <span
      className="nd-stars"
      aria-label={promedio > 0 ? `Calificación ${Number(promedio).toFixed(1)} de 5` : 'Sin reseñas todavía'}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`nd-star ${n <= llenas ? 'fill-moss-600 text-moss-600' : 'text-dark-300'}`}
        />
      ))}
    </span>
  )
}

/** Lightbox mínimo: una imagen ampliada, cierre con Escape y foco devuelto. */
function Lightbox({ foto, onClose }) {
  const cerrarRef = useRef(null)

  useEffect(() => {
    const anterior = document.activeElement
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cerrarRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowPrevio
      if (anterior instanceof HTMLElement) anterior.focus()
    }
  }, [onClose])

  return (
    <div className="nd-lightbox" role="dialog" aria-modal="true" aria-label="Imagen ampliada" onClick={onClose}>
      <button ref={cerrarRef} type="button" className="nd-lightbox-close" onClick={onClose} aria-label="Cerrar imagen">
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <img src={foto.src} alt={foto.alt} className="nd-lightbox-img" onClick={(e) => e.stopPropagation()} />
      <p className="nd-lightbox-caption">{foto.alt}</p>
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-dark-100 p-6">
      <h3 className="font-semibold text-dark-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function ManageImageForm({ businessId, onAdded }) {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [saving, setSaving] = useState(false)

  async function add(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await businessesAPI.imagenes.add(businessId, { url, alt_text: alt, is_primary: isPrimary })
      toast.success(res.message || 'Imagen agregada')
      setUrl('')
      setAlt('')
      setIsPrimary(false)
      onAdded()
    } catch (err) {
      toast.error(err.message || 'Error al agregar imagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={add} className="space-y-3 p-4 bg-dark-50 rounded-xl">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
        <ImageUploader value={url} onChange={setUrl} placeholder="URL (https://) o selecciona del dispositivo" />
        <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Texto alternativo" className={inputClass} />
        <label className="flex items-center gap-2 text-sm text-dark-700">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
          Imagen principal
        </label>
      </div>
      <button
        type="submit"
        disabled={!url || saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Agregar
      </button>
    </form>
  )
}

function ManageServiceForm({ businessId, onAdded }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saving, setSaving] = useState(false)

  async function add(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await businessesAPI.servicios.add(businessId, { nombre, descripcion })
      toast.success(res.message || 'Servicio agregado')
      setNombre('')
      setDescripcion('')
      onAdded()
    } catch (err) {
      toast.error(err.message || 'Error al agregar servicio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={add} className="space-y-3 p-4 bg-dark-50 rounded-xl">
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del servicio" className={inputClass} />
      <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción (opcional)" className={inputClass} />
      <button
        type="submit"
        disabled={!nombre || saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Agregar servicio
      </button>
    </form>
  )
}

function ManageHourForm({ businessId, onAdded }) {
  const [day, setDay] = useState('1')
  const [isClosed, setIsClosed] = useState(false)
  const [open, setOpen] = useState('09:00')
  const [close, setClose] = useState('18:00')
  const [saving, setSaving] = useState(false)

  async function add(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { day_of_week: Number(day), is_closed: isClosed }
      if (!isClosed) {
        payload.open_time = open
        payload.close_time = close
      }
      const res = await businessesAPI.horarios.add(businessId, payload)
      toast.success(res.message || 'Horario agregado')
      onAdded()
    } catch (err) {
      toast.error(err.message || 'Error al agregar horario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={add} className="space-y-3 p-4 bg-dark-50 rounded-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}>
          {DIAS_LABEL.map((d, i) => (
            <option key={i} value={i}>{d}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-dark-700">
          <input type="checkbox" checked={isClosed} onChange={(e) => setIsClosed(e.target.checked)} />
          Cerrado este día
        </label>
      </div>
      {!isClosed && (
        <div className="grid grid-cols-2 gap-3">
          <input type="time" value={open} onChange={(e) => setOpen(e.target.value)} className={inputClass} />
          <input type="time" value={close} onChange={(e) => setClose(e.target.value)} className={inputClass} />
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Agregar horario
      </button>
    </form>
  )
}

function ManageSocialForm({ businessId, onAdded }) {
  const [plataforma, setPlataforma] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function add(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await businessesAPI.redes.add(businessId, { plataforma, url })
      toast.success(res.message || 'Red social agregada')
      setPlataforma('')
      setUrl('')
      onAdded()
    } catch (err) {
      toast.error(err.message || 'Error al agregar la red social')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={add} className="space-y-3 p-4 bg-dark-50 rounded-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={plataforma} onChange={(e) => setPlataforma(e.target.value)} placeholder="Plataforma (ej: instagram)" className={inputClass} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={!plataforma || !url || saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Agregar red social
      </button>
    </form>
  )
}

function PublicPlanesSection({ businessId }) {
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    businessPlanesAPI
      .list(businessId)
      .then((r) => setPlanes(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [businessId])

  if (loading || planes.length === 0) return null

  return (
    <section className="nd-section">
      <h2 className="nd-h2">Planes y experiencias</h2>
      <div className="nd-planes">
        {planes.map((plan) => {
          const portada = plan.plan_imagenes?.find((i) => i.is_primary) || plan.plan_imagenes?.[0]
          const { efectivo, anterior } = planPrecios(plan)
          return (
            <Link
              key={plan.id}
              to={rutaCon('PLANES_PUBLICOS', plan.id)}
              className="nd-plan group"
            >
              <div className="nd-plan-photo">
                {portada?.url && !esImagenDeRelleno(portada.url) ? (
                  <img src={portada.url} alt={plan.nombre} loading="lazy" />
                ) : (
                  <div className="nd-plan-fallback"><Ticket className="h-7 w-7" aria-hidden="true" /></div>
                )}
              </div>
              <div className="nd-plan-body">
                <p className="nd-plan-tipo">{TIPO_PLAN_LABEL[plan.tipo_plan] || plan.tipo_plan}</p>
                <h3 className="nd-plan-nombre">{plan.nombre}</h3>
                <p className="nd-plan-duracion">
                  {formatDuracion(plan.duracion_dias, plan.duracion_noches)}
                  {' · '}
                  {anterior && <s>{formatMoney(anterior)}</s>}
                  {efectivo ? formatMoney(efectivo) : 'Consultar'}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default function NegocioDetalle({ manage = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('resumen')
  const [imagenes, setImagenes] = useState([])
  const [servicios, setServicios] = useState([])
  const [horarios, setHorarios] = useState([])
  const [redes, setRedes] = useState([])
  const [destinos, setDestinos] = useState([])
  const [lugares, setLugares] = useState([])
  const [rating, setRating] = useState(null)

  const isAdmin = user?.rol === 'ADMIN'

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await businessesAPI.getById(id)
      setBusiness(res.data)
      businessesAPI.destinos.list(id).then((r) => setDestinos(Array.isArray(r.data) ? r.data : [])).catch(() => {})
      fetchChildren(res.data.id)
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar el negocio')
      navigate(manage ? obtenerRuta('MIS_NEGOCIOS') : obtenerRuta('NEGOCIOS_PUBLICOS'))
    } finally {
      setLoading(false)
    }
  }, [id, manage, navigate])

  function fetchChildren(businessId) {
    businessesAPI.imagenes.list(businessId).then((r) => setImagenes(r.data || [])).catch(() => {})
    businessesAPI.servicios.list(businessId).then((r) => setServicios(r.data || [])).catch(() => {})
    businessesAPI.horarios.list(businessId).then((r) => setHorarios(r.data || [])).catch(() => {})
    businessesAPI.redes.list(businessId).then((r) => setRedes(r.data || [])).catch(() => {})
  }

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // Calificación real del negocio (promedio de reseñas publicadas).
  useEffect(() => {
    if (!id || manage) return undefined
    let vigente = true
    reviewsAPI.getByBusiness(id)
      .then((res) => {
        const data = res?.data || {}
        if (vigente) setRating({
          promedio: Number(data.promedio) || 0,
          cantidad: Number(data.cantidad) || 0,
        })
      })
      .catch(() => { if (vigente) setRating({ promedio: 0, cantidad: 0 }) })
    return () => { vigente = false }
  }, [id, manage])

  async function removeImage(imageId) {
    try {
      await businessesAPI.imagenes.remove(id, imageId)
      toast.success('Imagen eliminada')
      fetchChildren(id)
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la imagen')
    }
  }

  async function setPrimary(imageId) {
    try {
      await businessesAPI.imagenes.setPrimary(id, imageId)
      toast.success('Imagen principal actualizada')
      fetchChildren(id)
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar')
    }
  }

  async function removeService(serviceId) {
    try {
      await businessesAPI.servicios.remove(id, serviceId)
      toast.success('Servicio eliminado')
      fetchChildren(id)
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el servicio')
    }
  }

  async function removeHour(hourId) {
    try {
      await businessesAPI.horarios.remove(id, hourId)
      toast.success('Horario eliminado')
      fetchChildren(id)
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el horario')
    }
  }

  async function removeSocial(linkId) {
    try {
      await businessesAPI.redes.remove(id, linkId)
      toast.success('Red social eliminada')
      fetchChildren(id)
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la red social')
    }
  }

  useEffect(() => {
    if (!manage || activeTab !== 'destino' || lugares.length > 0) return
    lugaresAPI.getAll().then((r) => setLugares(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [manage, activeTab, lugares.length])

  async function saveDestino(destinationId) {
    try {
      const res = await businessesAPI.destinos.set(id, destinationId === '' ? null : Number(destinationId))
      toast.success(res.message || 'Destino actualizado')
      setDestinos(destinationId === '' ? [] : lugares.filter((l) => String(l.id) === String(destinationId)))
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el destino')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!business) return null

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: Building2 },
    ...(manage
      ? [
          { id: 'imagenes', label: 'Imágenes', icon: ImageIcon },
          { id: 'servicios', label: 'Servicios', icon: CheckCircle2 },
          { id: 'horarios', label: 'Horarios', icon: Clock },
          { id: 'redes', label: 'Redes', icon: Share2 },
          { id: 'destino', label: 'Destino', icon: MapIcon },
          { id: 'planes', label: 'Planes y promociones', icon: Ticket },
        ]
      : []),
  ]

  const portadaReal = business.portada_url && !esImagenDeRelleno(business.portada_url)
  const imagenHero = portadaReal
    ? business.portada_url
    : (destinos[0] ? getDestinoImagen(destinos[0]) : '/img/hero/hero-negocios-1600.webp')
  const rango = formatRango(business.precio_min, business.precio_max)
  const contactoPrincipal = business.whatsapp
    ? `https://wa.me/${String(business.whatsapp).replace(/\D/g, '')}`
    : business.telefono
      ? `tel:${String(business.telefono).replace(/[^\d+]/g, '')}`
      : business.email_contacto
        ? `mailto:${business.email_contacto}`
        : business.website || null

  return (
    <div className={manage ? 'bg-dark-50 min-h-screen' : 'nd-page min-h-screen'}>
      {!manage && (
        <>
          <div className="public-shell nd-hero-shell px-4 pt-6 sm:px-6 lg:px-8">
            <Link to={obtenerRuta('NEGOCIOS_PUBLICOS')} className="nd-back">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a negocios
            </Link>
            <figure className="nd-hero-photo">
              <img
                src={imagenHero}
                alt={`Fotografía de ${business.nombre}`}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="nd-hero-img"
              />
            </figure>
          </div>
          <header className="public-shell nd-intro px-4 pt-7 sm:px-6 lg:px-8">
            {business.categoria && <p className="nd-category">{business.categoria}</p>}
            <h1 className="nd-title">{business.nombre}</h1>
            <div className="nd-meta-line">
              <Estrellas promedio={rating?.promedio || 0} />
              <span className="nd-rating-text">
                {rating?.cantidad
                  ? `${Number(rating.promedio).toFixed(1)} · ${rating.cantidad} reseña${rating.cantidad !== 1 ? 's' : ''}`
                  : 'Sin reseñas aún'}
              </span>
              {business.direccion && (
                <>
                  <span className="nd-sep" aria-hidden="true">·</span>
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  <span>{business.direccion}</span>
                </>
              )}
            </div>
            {business.descripcion && <p className="nd-lede">{business.descripcion}</p>}
          </header>
        </>
      )}
      <div className={manage
        ? 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12'
        : 'public-shell nd-content px-4 pb-20 sm:px-6 lg:px-8'}>
        {manage && (
        <>
        <button
          onClick={() => navigate(manage ? obtenerRuta('MIS_NEGOCIOS') : obtenerRuta('NEGOCIOS_PUBLICOS'))}
          className="inline-flex items-center gap-2 text-sm text-dark-600 hover:text-moss-700 mb-5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {manage ? 'Volver a mis negocios' : 'Volver a negocios'}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-6">
          <div className="w-full sm:w-56 h-40 rounded-2xl overflow-hidden bg-cream-100 flex-shrink-0 border border-cream-200">
            {business.portada_url && !esImagenDeRelleno(business.portada_url) ? (
              <img src={business.portada_url} alt={business.nombre} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-moss-900 text-moss-200">
                <Store className="w-10 h-10" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
                {business.nombre}
              </h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_BADGE[business.estado] || 'bg-dark-100 text-dark-600'}`}>
                {ESTADO_LABEL[business.estado] || business.estado}
              </span>
              {!manage && <FavoritoButton tipo="negocio" id={business.id} withLabel className="mt-1" />}
            </div>
            {business.categoria && <p className="text-primary-600 font-medium mt-1">{business.categoria}</p>}
            {business.descripcion && <p className="text-dark-600 mt-3 leading-relaxed">{business.descripcion}</p>}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-dark-600">
              {business.direccion && (
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-dark-400" />{business.direccion}</span>
              )}
              {formatRango(business.precio_min, business.precio_max) && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-dark-800">
                  {formatRango(business.precio_min, business.precio_max)}
                </span>
              )}
              {isAdmin && <span className="text-dark-400">Dueño: {business.owner_nombre}</span>}
            </div>
            {manage && (
              <div className="mt-4 flex items-center gap-2">
                <Link
                  to={rutaCon('MIS_NEGOCIOS', business.id, 'editar')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Editar
                </Link>
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {manage ? (
          <div className="space-y-6">
            <div className="flex gap-1 bg-white rounded-xl border border-dark-100 p-1 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === t.id ? 'bg-primary-600 text-white' : 'text-dark-600 hover:bg-dark-100'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'resumen' && (
              <>
                <PublicInfo business={business} horarios={horarios} redes={redes} servicios={servicios} imagenes={imagenes} />
                <PublicPlanesSection businessId={business.id} />
                <ResenasSection businessId={business.id} businessOwnerId={business.owner_id || user?.id} businessEstado={business.estado} />
              </>
            )}

            {activeTab === 'planes' && (
              <PlanesNegocio businessId={business.id} />
            )}

            {activeTab === 'imagenes' && (
              <Section title="Galería de imágenes">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                  {imagenes.map((img) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-dark-100">
                      <img src={img.url} alt={img.alt_text || business.nombre} className="w-full h-36 object-cover" />
                      {img.is_primary && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3" /> Principal
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {!img.is_primary && (
                          <button onClick={() => setPrimary(img.id)} className="p-2 rounded-lg bg-white text-primary-700 hover:bg-primary-50 cursor-pointer" title="Hacer principal">
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => removeImage(img.id)} className="p-2 rounded-lg bg-white text-red-600 hover:bg-red-50 cursor-pointer" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <ManageImageForm businessId={business.id} onAdded={() => fetchChildren(business.id)} />
              </Section>
            )}

            {activeTab === 'servicios' && (
              <Section title="Servicios">
                <ManageServiceForm businessId={business.id} onAdded={() => fetchChildren(business.id)} />
                <ul className="mt-4 space-y-2">
                  {servicios.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-dark-100">
                      <div>
                        <p className="text-sm font-medium text-dark-800">{s.nombre}</p>
                        {s.descripcion && <p className="text-sm text-dark-500 mt-0.5">{s.descripcion}</p>}
                      </div>
                      <button onClick={() => removeService(s.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {activeTab === 'horarios' && (
              <Section title="Horarios">
                <ManageHourForm businessId={business.id} onAdded={() => fetchChildren(business.id)} />
                <ul className="mt-4 space-y-2">
                  {horarios.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-dark-100">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span className="w-24 text-sm font-medium text-dark-800">{DIAS_LABEL[h.day_of_week]}</span>
                        {h.is_closed ? (
                          <span className="text-sm text-red-600 font-medium">Cerrado</span>
                        ) : (
                          <span className="text-sm text-dark-600">{h.open_time} - {h.close_time}</span>
                        )}
                      </div>
                      <button onClick={() => removeHour(h.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {activeTab === 'redes' && (
              <Section title="Redes sociales">
                <ManageSocialForm businessId={business.id} onAdded={() => fetchChildren(business.id)} />
                <ul className="mt-4 space-y-2">
                  {redes.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-dark-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-800 capitalize">{r.plataforma}</p>
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline truncate block">
                          {r.url}
                        </a>
                      </div>
                      <button onClick={() => removeSocial(r.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          {activeTab === 'destino' && (
              <Section title="Destino">
                <p className="text-sm text-dark-500 mb-4">
                  Asocia este negocio a un destino turístico. Si no eliges ninguno, el negocio no aparecerá en la página pública de ningún destino.
                </p>
                <select
                  className={`${inputClass} bg-white max-w-md`}
                  value={destinos[0]?.id != null ? String(destinos[0].id) : ''}
                  onChange={(e) => saveDestino(e.target.value)}
                >
                  <option value="">Sin destino</option>
                  {lugares.map((l) => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
                {destinos.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-dark-700 bg-primary-50 border border-primary-100 rounded-xl p-3">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    <Link to={rutaCon('LUGARES', destinos[0].id)} className="flex-1 text-primary-700 hover:underline">
                      {destinos[0].nombre}
                    </Link>
                  </div>
                )}
              </Section>
            )}
          </div>
        ) : (
          <div className="nd-layout">
            <main className="nd-main min-w-0">
              <PublicInfo
                business={business}
                horarios={horarios}
                redes={redes}
                servicios={servicios}
                imagenes={imagenes}
                destinos={destinos}
                rango={rango}
              />
              <PublicPlanesSection businessId={business.id} />
              <section className="nd-section nd-section-resenas">
                <h2 className="nd-h2">Reseñas</h2>
                <ResenasSection
                  businessId={business.id}
                  businessOwnerId={business.owner_id || user?.id}
                  businessEstado={business.estado}
                />
              </section>
            </main>

            <aside className="nd-aside" aria-label="Contacto del negocio">
              <div className="nd-contact">
                <h2 className="nd-h2">Contacto</h2>
                {(business.telefono || business.whatsapp || business.email_contacto || business.website) ? (
                  <ul className="nd-contact-list">
                    {business.telefono && (
                      <li>
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        <a href={`tel:${String(business.telefono).replace(/[^\d+]/g, '')}`}>{business.telefono}</a>
                      </li>
                    )}
                    {business.whatsapp && (
                      <li>
                        <Share2 className="h-4 w-4" aria-hidden="true" />
                        <a
                          href={`https://wa.me/${String(business.whatsapp).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp: {business.whatsapp}
                        </a>
                      </li>
                    )}
                    {business.email_contacto && (
                      <li>
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        <a href={`mailto:${business.email_contacto}`} className="break-all">{business.email_contacto}</a>
                      </li>
                    )}
                    {business.website && (
                      <li>
                        <Globe className="h-4 w-4" aria-hidden="true" />
                        <a href={business.website} target="_blank" rel="noreferrer" className="break-all">
                          {business.website}
                        </a>
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="nd-muted">Este negocio todavía no ha publicado datos de contacto.</p>
                )}
                {contactoPrincipal && (
                  <a
                    className="nd-contact-primary"
                    href={contactoPrincipal}
                    target={contactoPrincipal.startsWith('http') ? '_blank' : undefined}
                    rel={contactoPrincipal.startsWith('http') ? 'noreferrer' : undefined}
                  >
                    Contactar
                  </a>
                )}
                <div className="nd-contact-foot">
                  <FavoritoButton tipo="negocio" id={business.id} withLabel />
                  {destinos[0] && (
                    <Link to={rutaCon('LUGARES', destinos[0].id)} className="nd-text-link">
                      Ver {destinos[0].nombre} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

function PublicInfo({ business, horarios, redes, servicios, imagenes, destinos, rango }) {
  const destino = destinos?.[0]
  const galeria = Array.isArray(imagenes) ? imagenes : []
  const fotos = galeria.length > 0
    ? galeria.map((img, i) => ({
        src: img.url,
        alt: img.alt_text || `${business.nombre} — foto ${i + 1}`,
      }))
    : [
        {
          src: destino ? getDestinoImagen(destino) : '/img/hero/hero-negocios-1600.webp',
          alt: `Paisaje de ${business.destino || 'Córdoba'}`,
        },
        { src: '/img/hero/hero-negocios-1600.webp', alt: 'Turismo en Córdoba, Colombia' },
      ]
  const [ampliar, setAmpliar] = useState(null)

  return (
    <>
      <section className="nd-section">
        <h2 className="nd-h2">Galería</h2>
        <div className="nd-gallery">
          {fotos.slice(0, 4).map((foto, i) => (
            <button
              type="button"
              key={`${foto.src}-${i}`}
              className="nd-gallery-item"
              onClick={() => setAmpliar(foto)}
              aria-label={`Ampliar imagen: ${foto.alt}`}
            >
              <img src={foto.src} alt={foto.alt} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      </section>

      <section className="nd-section">
        <h2 className="nd-h2">Ficha del negocio</h2>
        <dl className="nd-facts">
          {business.categoria && (
            <div className="nd-fact"><dt>Tipo</dt><dd>{business.categoria}</dd></div>
          )}
          {business.direccion && (
            <div className="nd-fact"><dt>Dirección</dt><dd>{business.direccion}</dd></div>
          )}
          {destino && (
            <div className="nd-fact">
              <dt>Destino</dt>
              <dd><Link to={rutaCon('LUGARES', destino.id)} className="nd-text-link">{destino.nombre}</Link></dd>
            </div>
          )}
          {rango && (
            <div className="nd-fact"><dt>Precio orientativo</dt><dd>{rango} COP</dd></div>
          )}
          {!destino && (
            <div className="nd-fact"><dt>Destino</dt><dd className="nd-muted">Sin asociar</dd></div>
          )}
        </dl>
      </section>

      {horarios?.length > 0 && (
        <section className="nd-section">
          <h2 className="nd-h2">Horarios</h2>
          <ul className="nd-list">
            {horarios.map((h) => (
              <li key={h.id}>
                <span>{DIAS_LABEL[h.day_of_week]}</span>
                {h.is_closed
                  ? <span className="nd-muted">Cerrado</span>
                  : <span>{h.open_time} – {h.close_time}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {servicios?.length > 0 && (
        <section className="nd-section">
          <h2 className="nd-h2">Servicios</h2>
          <ul className="nd-simple-list">
            {servicios.map((s) => (
              <li key={s.id}>
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong>{s.nombre}</strong>
                  {s.descripcion && <> — {s.descripcion}</>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {redes?.length > 0 && (
        <section className="nd-section">
          <h2 className="nd-h2">Redes sociales</h2>
          <ul className="nd-socials">
            {redes.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer" className="nd-text-link">
                  <span className="capitalize">{r.plataforma}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ampliar && <Lightbox foto={ampliar} onClose={() => setAmpliar(null)} />}
    </>
  )
}