import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Pencil, ImageOff, MapPin, Phone, Globe, Mail, Star,
  Building2, Clock, Share2, Plus, Trash2, Loader2, Image as ImageIcon,
  CheckCircle2, Map as MapIcon, Ticket, ArrowRight, ImageOff as PlanImgOff,
} from 'lucide-react'
import { businessesAPI, lugaresAPI, businessPlanesAPI } from '../../services/api'
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
    <Section title="Planes y experiencias">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {planes.map((plan) => {
          const portada = plan.plan_imagenes?.find((i) => i.is_primary) || plan.plan_imagenes?.[0]
          const { efectivo, anterior } = planPrecios(plan)
          return (
            <Link
              key={plan.id}
              to={`/planes/${plan.id}`}
              className="group flex gap-4 rounded-xl border border-dark-100 p-3 hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="w-28 h-24 shrink-0 rounded-lg overflow-hidden bg-dark-100">
                {portada ? (
                  <img src={portada.url} alt={plan.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-dark-300">
                    <PlanImgOff className="w-7 h-7" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                  {TIPO_PLAN_LABEL[plan.tipo_plan] || plan.tipo_plan}
                </p>
                <h4 className="font-semibold text-dark-900 truncate group-hover:text-primary-700 transition-colors">
                  {plan.nombre}
                </h4>
                <p className="text-xs text-dark-500">{formatDuracion(plan.duracion_dias, plan.duracion_noches)}</p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-dark-900">
                    {anterior && <span className="text-xs text-dark-400 line-through mr-1">{formatMoney(anterior)}</span>}
                    {efectivo ? formatMoney(efectivo) : 'Consultar'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-primary-600 group-hover:translate-x-0.5 transition-transform">
                    Ver <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </Section>
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
      navigate(manage ? '/mis-negocios' : '/negocios')
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={manage ? 'bg-dark-50' : 'bg-dark-50 min-h-screen'}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <button
          onClick={() => navigate(manage ? '/mis-negocios' : '/negocios')}
          className="inline-flex items-center gap-2 text-sm text-dark-600 hover:text-primary-700 mb-5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {manage ? 'Volver a mis negocios' : 'Volver a negocios'}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-6">
          <div className="w-full sm:w-56 h-40 rounded-2xl overflow-hidden bg-dark-100 flex-shrink-0">
            {business.portada_url ? (
              <img src={business.portada_url} alt={business.nombre} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-dark-300">
                <ImageOff className="w-10 h-10" />
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
                  to={`/mis-negocios/${business.id}/editar`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Editar
                </Link>
              </div>
            )}
          </div>
        </div>

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
                <ResenasSection businessId={business.id} businessOwnerId={business.owner_id || user?.id} />
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
                    <Link to={`/lugares/${destinos[0].id}`} className="flex-1 text-primary-700 hover:underline">
                      {destinos[0].nombre}
                    </Link>
                  </div>
                )}
              </Section>
            )}
          </div>
        ) : (
          <>
            <PublicInfo business={business} horarios={horarios} redes={redes} servicios={servicios} imagenes={imagenes} destinos={destinos} />
            <PublicPlanesSection businessId={business.id} />
            <div className="mt-6">
              <ResenasSection businessId={business.id} businessOwnerId={business.owner_id || user?.id} />
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

function PublicInfo({ business, horarios, redes, servicios, imagenes, destinos }) {
  return (
    <div className="space-y-6">
      {imagenes && imagenes.length > 0 && (
        <Section title="Galería">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {imagenes.map((img) => (
              <div key={img.id} className="rounded-xl overflow-hidden border border-dark-100">
                <img src={img.url} alt={img.alt_text || business.nombre} className="w-full h-36 object-cover" />
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(business.telefono || business.whatsapp || business.email_contacto || business.website) && (
          <Section title="Contacto">
            <div className="space-y-3 text-sm">
              {business.telefono && (
                <p className="flex items-center gap-2 text-dark-700"><Phone className="w-4 h-4 text-dark-400" /> {business.telefono}</p>
              )}
              {business.whatsapp && (
                <p className="flex items-center gap-2 text-dark-700"><Share2 className="w-4 h-4 text-dark-400" /> WhatsApp: {business.whatsapp}</p>
              )}
              {business.email_contacto && (
                <p className="flex items-center gap-2 text-dark-700"><Mail className="w-4 h-4 text-dark-400" /> {business.email_contacto}</p>
              )}
              {business.website && (
                <a href={business.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline">
                  <Globe className="w-4 h-4" /> {business.website}
                </a>
              )}
            </div>
          </Section>
        )}

        {horarios && horarios.length > 0 && (
          <Section title="Horarios">
            <ul className="space-y-2 text-sm">
              {horarios.map((h) => (
                <li key={h.id} className="flex justify-between gap-3">
                  <span className="text-dark-600 font-medium">{DIAS_LABEL[h.day_of_week]}</span>
                  {h.is_closed ? (
                    <span className="text-red-600 font-medium">Cerrado</span>
                  ) : (
                    <span className="text-dark-700">{h.open_time} - {h.close_time}</span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {servicios && servicios.length > 0 && (
        <Section title="Servicios">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {servicios.map((s) => (
              <li key={s.id} className="flex items-start gap-2 text-sm text-dark-700">
                <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                <span>{s.descripcion ? `${s.nombre} — ${s.descripcion}` : s.nombre}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {redes && redes.length > 0 && (
        <Section title="Redes sociales">
          <div className="flex flex-wrap gap-3">
            {redes.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-50 text-dark-700 text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors capitalize"
              >
                <Share2 className="w-4 h-4" />
                {r.plataforma}
              </a>
            ))}
          </div>
        </Section>
      )}

      {destinos && destinos.length > 0 ? (
        <Section title="Destinos">
          <Link
            to={`/lugares/${destinos[0].id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            {destinos[0].nombre}
          </Link>
        </Section>
      ) : (
        <Section title="Destinos">
          <p className="text-sm text-dark-500">
            Este negocio todavía no está asociado a ningún destino.
          </p>
        </Section>
      )}
    </div>
  )
}