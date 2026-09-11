import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Loader2, Image as ImageIcon, Star, ChevronDown, ChevronRight,
  Power, Ticket, MapPin, Clock, Users, Tag, BadgePercent, CalendarDays,
} from 'lucide-react'
import { businessPlanesAPI, promocionesAPI } from '../../services/api'
import { toast } from 'sonner'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import PlanForm from './PlanForm'
import SalidasPanel from './SalidasPanel'
import TransportePanel from './TransportePanel'
import ImageUploader from '../../components/ImageUploader'
import MoneyInput from '../../components/MoneyInput'
import { formatMoney } from './businessUtils'
import {
  TIPO_PLAN_LABEL, TIPO_PLAN_BADGE, TIPO_PRECIO_LABEL,
  PLAN_ESTADO_LABEL, PLAN_ESTADO_BADGE, formatDuracion, formatFechas, presente, diaActividades,
} from './planUtils'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

function sectionTitle(icon, text) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-dark-400 mb-2 flex items-center gap-1.5">
      {icon} {text}
    </p>
  )
}

function PromoForm({ businessId, planes, promo, onSaved, onCancel }) {
  const editing = Boolean(promo)
  const [planId, setPlanId] = useState(promo?.plan_id != null ? String(promo.plan_id) : planes[0]?.id != null ? String(planes[0].id) : '')
  const [nombre, setNombre] = useState(promo?.nombre || '')
  const [descripcion, setDescripcion] = useState(promo?.descripcion || '')
  const [tipoDescuento, setTipoDescuento] = useState(promo?.tipo_descuento || 'porcentaje')
  const [valorDescuento, setValorDescuento] = useState(promo?.valor_descuento != null ? String(promo.valor_descuento) : '')
  const [precioAnterior, setPrecioAnterior] = useState(promo?.precio_anterior != null ? String(promo.precio_anterior) : '')
  const [precioPromocional, setPrecioPromocional] = useState(promo?.precio_promocional != null ? String(promo.precio_promocional) : '')
  const [imagenUrl, setImagenUrl] = useState(promo?.imagen_url || '')
  const [fechaInicio, setFechaInicio] = useState(promo?.fecha_inicio || '')
  const [fechaFin, setFechaFin] = useState(promo?.fecha_fin || '')
  const [estado, setEstado] = useState(promo?.estado || 'activo')
  const [saving, setSaving] = useState(false)
  const esPorcentaje = tipoDescuento === 'porcentaje'

  function cambiarTipo(e) {
    const t = e.target.value
    setTipoDescuento(t)
    if (t === 'porcentaje') setPrecioPromocional('')
  }

  async function submit(e) {
    e.preventDefault()
    const body = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      plan_id: planId ? Number(planId) : null,
      tipo_descuento: tipoDescuento,
      valor_descuento: valorDescuento != null && valorDescuento !== '' ? Number(valorDescuento) : null,
      precio_anterior: precioAnterior != null && precioAnterior !== '' ? Number(precioAnterior) : null,
      precio_promocional: esPorcentaje ? null : (precioPromocional != null && precioPromocional !== '' ? Number(precioPromocional) : null),
      imagen_url: imagenUrl.trim() || null,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      estado,
    }
    setSaving(true)
    try {
      const res = editing
        ? await promocionesAPI.update(businessId, promo.id, body)
        : await promocionesAPI.create(businessId, body)
      toast.success(res.message || (editing ? 'Promoción actualizada' : 'Promoción creada'))
      onSaved?.()
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar la promoción')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        {sectionTitle(<Tag className="w-3.5 h-3.5" />, 'Información general')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la promoción *" className={inputClass} required />
          <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={`${inputClass} bg-white`} required disabled={planes.length === 0}>
            {planes.length === 0
              ? <option value="">Crea primero un plan</option>
              : planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} placeholder="Descripción (opcional)" className={`${inputClass} mt-3`} />
      </div>

      <div>
        {sectionTitle(<BadgePercent className="w-3.5 h-3.5" />, 'Descuento')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Tipo de descuento</label>
            <select value={tipoDescuento} onChange={cambiarTipo} className={`${inputClass} bg-white`}>
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="valor">Valor fijo (COP)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">{esPorcentaje ? 'Porcentaje de descuento *' : 'Valor del descuento (COP) *'}</label>
            {esPorcentaje ? (
              <input type="number" min={0} max={100} step={1} value={valorDescuento} onChange={(e) => setValorDescuento(e.target.value)} className={inputClass} required />
            ) : (
              <MoneyInput value={valorDescuento} onChange={setValorDescuento} className={inputClass} required placeholder="Ej: 20000" />
            )}
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Precio anterior (referencia)</label>
            <MoneyInput value={precioAnterior} onChange={setPrecioAnterior} className={inputClass} placeholder="Ej: 150000" />
          </div>
          {!esPorcentaje && (
            <div>
              <label className="block text-xs text-dark-500 mb-1">Precio promocional</label>
              <MoneyInput value={precioPromocional} onChange={setPrecioPromocional} className={inputClass} placeholder="Ej: 130000" />
            </div>
          )}
        </div>
      </div>

      <div>
        {sectionTitle(<ImageIcon className="w-3.5 h-3.5" />, 'Imagen de la promoción')}
        <label className="block text-xs text-dark-500 mb-1">URL o seleccionar del dispositivo</label>
        <ImageUploader value={imagenUrl} onChange={setImagenUrl} placeholder="https://..." />
      </div>

      <div>
        {sectionTitle(<CalendarDays className="w-3.5 h-3.5" />, 'Vigencia y estado')}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Vigencia desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Vigencia hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className={`${inputClass} bg-white`}>
              <option value="activo">Activa</option>
              <option value="inactivo">Inactiva</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-dark-400 mt-2 leading-relaxed">
          Solo una promoción <strong>activa y vigente</strong> descuenta del precio por persona y tiene prioridad sobre el descuento por rango grupal. Si está inactiva o fuera de fechas, el precio usará el descuento por grupo (o ninguno).
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-100">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-dark-600 hover:bg-dark-100 transition-colors cursor-pointer">
          Cancelar
        </button>
        <button type="submit" disabled={saving || !nombre.trim() || !valorDescuento || !planId} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {editing ? 'Guardar cambios' : 'Crear promoción'}
        </button>
      </div>
    </form>
  )
}

export default function PlanesNegocio({ businessId }) {
  const [tab, setTab] = useState('planes')
  const [planes, setPlanes] = useState([])
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [promoForm, setPromoForm] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [grupalPlanId, setGrupalPlanId] = useState(null)
  const [img, setImg] = useState({ url: '', alt: '', is_primary: false, planId: null, saving: false })

  const load = useCallback(async () => {
    setLoading(true)
    const [planesRes, promosRes] = await Promise.all([
      businessPlanesAPI.list(businessId).catch((e) => toast.error(e.message || 'Error al cargar planes')),
      promocionesAPI.list(businessId).catch((e) => toast.error(e.message || 'Error al cargar promociones')),
    ])
    setPlanes(Array.isArray(planesRes?.data) ? planesRes.data : [])
    setPromos(Array.isArray(promosRes?.data) ? promosRes.data : [])
    setLoading(false)
  }, [businessId])

  useEffect(() => {
    load()
  }, [load])

  async function toggleEstado(tipo, item) {
    try {
      const nuevo = item.estado === 'activo' ? 'inactivo' : 'activo'
      if (tipo === 'promo') {
        await promocionesAPI.setEstado(businessId, item.id, nuevo)
      } else {
        await businessPlanesAPI.setEstado(businessId, item.id, nuevo)
      }
      toast.success(nuevo === 'activo' ? 'Activado' : 'Inactivado')
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar el estado')
    }
  }

  async function confirmanDelete() {
    if (!deleteTarget) return
    try {
      if (deleteTarget.tipo === 'promo') await promocionesAPI.remove(businessId, deleteTarget.id)
      else await businessPlanesAPI.remove(businessId, deleteTarget.id)
      toast.success(deleteTarget.tipo === 'promo' ? 'Promoción eliminada' : 'Plan eliminado')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar')
    }
  }

  async function addImage(e) {
    e.preventDefault()
    if (!img.url.trim() || !img.planId) return
    setImg((s) => ({ ...s, saving: true }))
    try {
      await businessPlanesAPI.imagenes.add(businessId, img.planId, { url: img.url.trim(), alt_text: img.alt.trim(), is_primary: img.is_primary })
      toast.success('Imagen agregada')
      setImg({ url: '', alt: '', is_primary: false, planId: null, saving: false })
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo agregar la imagen')
      setImg((s) => ({ ...s, saving: false }))
    }
  }

  async function setPrimary(planId, imageId) {
    try {
      await businessPlanesAPI.imagenes.setPrimary(businessId, planId, imageId)
      toast.success('Imagen principal actualizada')
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar')
    }
  }

  async function removeImage(planId, imageId) {
    try {
      await businessPlanesAPI.imagenes.remove(businessId, planId, imageId)
      toast.success('Imagen eliminada')
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la imagen')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-dark-500">
          Publica tus planes turísticos, paquetes y experiencias. Los precios son informativos; el cliente te contacta por WhatsApp.
        </p>
        <button
          onClick={() => setForm({ mode: 'create' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nuevo plan
        </button>
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-dark-100 p-1 mb-5 w-fit">
        <button
          onClick={() => setTab('planes')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === 'planes' ? 'bg-primary-600 text-white' : 'text-dark-600 hover:bg-dark-100'}`}
        >
          <Ticket className="w-4 h-4" /> Planes ({planes.length})
        </button>
        <button
          onClick={() => setTab('promos')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === 'promos' ? 'bg-primary-600 text-white' : 'text-dark-600 hover:bg-dark-100'}`}
        >
          <Star className="w-4 h-4" /> Promociones ({promos.length})
        </button>
        <button
          onClick={() => setTab('grupales')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === 'grupales' ? 'bg-primary-600 text-white' : 'text-dark-600 hover:bg-dark-100'}`}
        >
          <Users className="w-4 h-4" /> Grupales
        </button>
      </div>

      {tab === 'planes' && (
        <div className="space-y-4">
          {planes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dark-100">
              <EmptyState
                icon={Ticket}
                title="Aún no tienes planes"
                description="Crea tu primer plan, paquete o experiencia para que los turistas lo encuentren y te contacten."
              />
            </div>
          ) : (
            planes.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-dark-100 overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-24 h-20 rounded-xl overflow-hidden bg-dark-100 shrink-0">
                      {p.plan_imagenes?.[0] ? (
                        <img src={p.plan_imagenes[0].url} alt={p.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-dark-300">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIPO_PLAN_BADGE[p.tipo_plan] || 'bg-dark-100 text-dark-600'}`}>
                          {TIPO_PLAN_LABEL[p.tipo_plan] || p.tipo_plan}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PLAN_ESTADO_BADGE[p.estado] || 'bg-dark-100 text-dark-600'}`}>
                          {PLAN_ESTADO_LABEL[p.estado] || p.estado}
                        </span>
                      </div>
                      <h3 className="font-semibold text-dark-900 mt-1 truncate" style={{ fontFamily: 'var(--font-display)' }}>{p.nombre}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-500 mt-1">
                        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDuracion(p.duracion_dias, p.duracion_noches)}</span>
                        {p.destino_lugar && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {p.destino_lugar}</span>}
                        <span className="font-semibold text-dark-800">{formatMoney(p.precio)} <span className="text-dark-400 font-normal">· {TIPO_PRECIO_LABEL[p.tipo_precio] || p.tipo_precio}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleEstado('plan', p)}
                        title={p.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${p.estado === 'activo' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-dark-400 hover:bg-dark-100'}`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => setForm({ mode: 'edit', plan: p })} className="p-2 rounded-lg text-dark-500 hover:text-ocean-600 hover:bg-ocean-50 transition-colors cursor-pointer" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget({ tipo: 'plan', id: p.id, nombre: p.nombre })} className="p-2 rounded-lg text-dark-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                        className="p-2 rounded-lg text-dark-500 hover:bg-dark-100 transition-colors cursor-pointer"
                        title="Imágenes"
                      >
                        {expanded === p.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {expanded === p.id && (
                  <div className="px-4 sm:px-5 pb-5 border-t border-dark-100 pt-4">
                    <h4 className="text-sm font-semibold text-dark-700 mb-3 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Imágenes
                    </h4>
                    <div className="flex flex-wrap gap-3 mb-4">
                      {p.plan_imagenes?.length === 0 && <p className="text-sm text-dark-400">Sin imágenes.</p>}
                      {p.plan_imagenes?.map((im) => (
                        <div key={im.id} className="relative group rounded-lg overflow-hidden border border-dark-100">
                          <img src={im.url} alt={im.alt_text || p.nombre} className="w-24 h-20 object-cover" />
                          {im.is_primary && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5" />
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            {!im.is_primary && (
                              <button onClick={() => setPrimary(p.id, im.id)} className="p-1.5 rounded bg-white text-primary-700 cursor-pointer" title="Hacer principal">
                                <Star className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => removeImage(p.id, im.id)} className="p-1.5 rounded bg-white text-red-600 cursor-pointer" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={addImage} className="mt-2 space-y-2">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="w-full max-w-md">
                          <ImageUploader
                            value={img.planId === p.id ? img.url : ''}
                            onChange={(v) => setImg((s) => ({ ...s, url: v, planId: p.id }))}
                            placeholder="URL de la imagen (https://)"
                          />
                        </div>
                        <input
                          value={img.planId === p.id ? img.alt : ''}
                          onChange={(e) => setImg((s) => ({ ...s, alt: e.target.value, planId: p.id }))}
                          placeholder="Texto alternativo"
                          className={`${inputClass} w-40`}
                        />
                        <label className="flex items-center gap-1.5 text-sm text-dark-600 pb-2">
                          <input type="checkbox" checked={img.is_primary} onChange={(e) => setImg((s) => ({ ...s, is_primary: e.target.checked, planId: p.id }))} />
                          Principal
                        </label>
                        <button
                          type="submit"
                          disabled={!img.url.trim() || img.planId !== p.id || img.saving}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer"
                        >
                          {img.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agregar
                        </button>
                      </div>
                    </form>
                    {p.itinerario?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-dark-700 mb-2">Itinerario</h4>
                        <ul className="space-y-1 text-sm text-dark-600">
                          {p.itinerario.map((d) => (
                            <li key={d.dia}>
                              <strong>Día {d.dia}:</strong>{' '}
                              {diaActividades(d).map((a) => `${a.hora ? a.hora + ' — ' : ''}${a.descripcion}`).join(' · ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'promos' && (
        <div className="space-y-3">
          <button
            onClick={() => setPromoForm({ mode: 'create' })}
            disabled={planes.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva promoción
          </button>
          {planes.length === 0 && (
            <p className="text-xs text-dark-400">Crea al menos un plan para poder ofrecer promociones.</p>
          )}
          {promos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dark-100">
              <EmptyState
                icon={Star}
                title="Sin promociones"
                description="Crea descuentos vigentes para atraer más turistas a tus planes."
              />
            </div>
          ) : (
            promos.map((pr) => {
              const vigente = presente(pr.fecha_inicio, pr.fecha_fin) && pr.estado === 'activo'
              return (
                <div key={pr.id} className="bg-white rounded-2xl border border-dark-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${vigente ? 'bg-emerald-100 text-emerald-700' : 'bg-dark-100 text-dark-500'}`}>
                        {pr.estado === 'activo' ? (vigente ? 'Vigente' : 'Fuera de vigencia') : 'Inactiva'}
                      </span>
                      <span className="text-sm font-bold text-primary-700">
                        {pr.tipo_descuento === 'porcentaje' ? `-${Math.round(Number(pr.valor_descuento) || 0)}%` : `-${formatMoney(pr.valor_descuento)}`}
                      </span>
                    </div>
                    <h3 className="font-semibold text-dark-900 mt-1 truncate">{pr.nombre}</h3>
                    <p className="text-sm text-dark-500">
                      {pr.plan_nombre || (pr.plan?.nombre) || 'Plan'}
                      {pr.descripcion ? ` — ${pr.descripcion}` : ''}
                    </p>
                    <p className="text-xs text-dark-400 mt-1">{formatFechas(pr.fecha_inicio, pr.fecha_fin)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleEstado('promo', pr)}
                      title={pr.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${pr.estado === 'activo' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-dark-400 hover:bg-dark-100'}`}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPromoForm({ mode: 'edit', promo: pr })} className="p-2 rounded-lg text-dark-500 hover:text-ocean-600 hover:bg-ocean-50 transition-colors cursor-pointer" title="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget({ tipo: 'promo', id: pr.id, nombre: pr.nombre })} className="p-2 rounded-lg text-dark-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'grupales' && (
        <div className="bg-white rounded-2xl border border-dark-100 p-4 sm:p-5">
          {planes.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin planes para gestionar"
              description="Crea primero un plan para programar salidas con cupo, inscripciones y transporte grupal."
            />
          ) : (
            <>
              <label className="block text-sm font-medium text-dark-700 mb-2">Plan grupal</label>
              <select
                value={grupalPlanId || ''}
                onChange={(e) => setGrupalPlanId(e.target.value ? Number(e.target.value) : null)}
                className="w-full sm:w-96 px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors cursor-pointer"
              >
                <option value="">Selecciona un plan...</option>
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {grupalPlanId ? (
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SalidasPanel businessId={businessId} planId={grupalPlanId} planNombre={planes.find((p) => p.id === grupalPlanId)?.nombre || 'Plan'} />
                  <TransportePanel businessId={businessId} planId={grupalPlanId} />
                </div>
              ) : (
                <p className="text-sm text-dark-400 mt-4">
                  Selecciona un plan para programar salidas con cupo (inscripciones de turistas) y gestionar el transporte según la cantidad de personas.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <Modal open={form !== null} onClose={() => setForm(null)} title={form?.mode === 'edit' ? 'Editar plan' : 'Nuevo plan'} size="xl">
        {form && (
          <PlanForm
            businessId={businessId}
            plan={form.mode === 'edit' ? form.plan : null}
            onSaved={() => { setForm(null); load() }}
            onCancel={() => setForm(null)}
          />
        )}
      </Modal>

      <Modal open={promoForm !== null} onClose={() => setPromoForm(null)} title={promoForm?.mode === 'edit' ? 'Editar promoción' : 'Nueva promoción'} size="lg">
        {promoForm && (
          <PromoForm
            businessId={businessId}
            planes={planes}
            promo={promoForm.mode === 'edit' ? promoForm.promo : null}
            onSaved={() => { setPromoForm(null); load() }}
            onCancel={() => setPromoForm(null)}
          />
        )}
      </Modal>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmanDelete}
        title={deleteTarget?.tipo === 'promo' ? 'Eliminar promoción' : 'Eliminar plan'}
        message={`¿Eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </div>
  )
}