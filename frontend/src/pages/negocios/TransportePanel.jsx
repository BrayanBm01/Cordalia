import { useState, useEffect, useCallback } from 'react'
import { Truck, Users, Plus, Trash2, Loader2, X, Car, User as UserIcon, Sparkles, Pencil } from 'lucide-react'
import { businessFlotaAPI, businessPlanesAPI } from '../../services/api'
import { toast } from 'sonner'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

const TIPOS = ['camioneta', 'minivan', 'bus', 'buseta', 'colectivo', 'auto', 'otro']
const ESTADOS_VEHICULO = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'mantenimiento', label: 'En mantenimiento' },
  { value: 'inactivo', label: 'Inactivo' },
]

function sectionTitle(icon, text) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-dark-400 mb-2 flex items-center gap-1.5">
      {icon} {text}
    </p>
  )
}

function VehiculoForm({ conductores, inicial, onGuardar, onCancelar, saving }) {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    tipo: inicial?.tipo || 'minivan',
    marca: inicial?.marca || '',
    modelo: inicial?.modelo || '',
    anio: inicial?.anio || '',
    placa: inicial?.placa || '',
    capacidad: inicial?.capacidad || '18',
    estado: inicial?.estado || 'disponible',
    descripcion: inicial?.descripcion || '',
    conductor_id: inicial?.conductor_id ? String(inicial.conductor_id) : '',
  })
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }))
  return (
    <form onSubmit={(e) => { e.preventDefault(); onGuardar(form) }} className="space-y-5">
      <div>
        {sectionTitle(<Car className="w-3.5 h-3.5" />, 'Datos del vehículo')}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={set('nombre')} placeholder="ej. Van ABC-123" className={inputClass} required />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Tipo</label>
            <select value={form.tipo} onChange={set('tipo')} className={`${inputClass} bg-white capitalize`}>
              {TIPOS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Capacidad (personas) *</label>
            <input type="number" min={1} max={200} value={form.capacidad} onChange={set('capacidad')} className={inputClass} required />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Marca</label>
            <input value={form.marca} onChange={set('marca')} placeholder="ej. Toyota" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Modelo</label>
            <input value={form.modelo} onChange={set('modelo')} placeholder="ej. Hiace" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Año</label>
            <input type="number" min={1960} max={2100} value={form.anio} onChange={set('anio')} placeholder="ej. 2023" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Placa</label>
            <input value={form.placa} onChange={set('placa')} placeholder="ej. ABC-123" className={inputClass} />
          </div>
        </div>
      </div>
      <div>
        {sectionTitle(<Users className="w-3.5 h-3.5" />, 'Estado y asignación')}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Estado</label>
            <select value={form.estado} onChange={set('estado')} className={`${inputClass} bg-white`}>
              {ESTADOS_VEHICULO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-dark-500 mb-1">Conductor asignado</label>
            <select value={form.conductor_id} onChange={set('conductor_id')} className={`${inputClass} bg-white`}>
              <option value="">Sin conductor asignado</option>
              {conductores.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.disponible ? '' : ' (ocupado)'}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="block text-xs text-dark-500 mb-1">Descripción / observaciones</label>
            <input value={form.descripcion} onChange={set('descripcion')} placeholder="Opcional" className={inputClass} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-dark-100 pt-3">
        <button type="button" onClick={onCancelar} className="px-4 py-2 rounded-lg text-sm font-medium text-dark-600 hover:bg-dark-100 transition-colors cursor-pointer">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {inicial ? 'Guardar cambios' : 'Agregar vehículo'}
        </button>
      </div>
    </form>
  )
}

function ConductorForm({ inicial, onGuardar, onCancelar, saving }) {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    email: inicial?.email || '',
    telefono: inicial?.telefono || '',
    licencia: inicial?.licencia || '',
    licencia_categoria: inicial?.licencia_categoria || '',
    licencia_vencimiento: inicial?.licencia_vencimiento || '',
    experiencia: inicial?.experiencia || '',
    disponible: inicial ? Boolean(inicial.disponible) : true,
  })
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }))
  return (
    <form onSubmit={(e) => { e.preventDefault(); onGuardar(form) }} className="space-y-5">
      <div>
        {sectionTitle(<UserIcon className="w-3.5 h-3.5" />, 'Información personal')}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Nombre completo *</label>
            <input value={form.nombre} onChange={set('nombre')} placeholder="ej. Carlos Rodríguez" className={inputClass} required />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Teléfono</label>
            <input value={form.telefono} onChange={set('telefono')} placeholder="ej. 300 123 4567" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Correo electrónico</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="opcional" className={inputClass} />
          </div>
        </div>
      </div>
      <div>
        {sectionTitle(<Sparkles className="w-3.5 h-3.5" />, 'Información profesional')}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Número / licencia</label>
            <input value={form.licencia} onChange={set('licencia')} placeholder="opcional" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Categoría de licencia</label>
            <input value={form.licencia_categoria} onChange={set('licencia_categoria')} placeholder="ej. C2" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Vencimiento de licencia</label>
            <input type="date" value={form.licencia_vencimiento} onChange={set('licencia_vencimiento')} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-dark-500 mb-1">Experiencia / observaciones</label>
            <textarea value={form.experiencia} onChange={set('experiencia')} rows={2} placeholder="Opcional" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Estado</label>
            <select value={form.disponible ? '1' : '0'} onChange={(e) => setForm((s) => ({ ...s, disponible: e.target.value === '1' }))} className={`${inputClass} bg-white`}>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-dark-100 pt-3">
        <button type="button" onClick={onCancelar} className="px-4 py-2 rounded-lg text-sm font-medium text-dark-600 hover:bg-dark-100 transition-colors cursor-pointer">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {inicial ? 'Guardar cambios' : 'Agregar conductor'}
        </button>
      </div>
    </form>
  )
}

export default function TransportePanel({ businessId, planId }) {
  const [vehiculos, setVehiculos] = useState([])
  const [conductores, setConductores] = useState([])
  const [transportes, setTransportes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vehModal, setVehModal] = useState({ open: false, vehiculo: null })
  const [conModal, setConModal] = useState({ open: false, conductor: null })
  const [personas, setPersonas] = useState('10')
  const [sugerencia, setSugerencia] = useState(null)
  const [sugerirLoading, setSugerirLoading] = useState(false)
  const [asignando, setAsignando] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [vehRes, conRes, traRes] = await Promise.all([
      businessFlotaAPI.vehiculos.list(businessId).catch((e) => toast.error(e.message || 'Error al cargar vehículos')),
      businessFlotaAPI.conductores.list(businessId).catch((e) => toast.error(e.message || 'Error al cargar conductores')),
      businessPlanesAPI.transporte.list(businessId, planId).catch((e) => toast.error(e.message || 'Error al cargar transporte')),
    ])
    setVehiculos(Array.isArray(vehRes?.data) ? vehRes.data : [])
    setConductores(Array.isArray(conRes?.data) ? conRes.data : [])
    setTransportes(Array.isArray(traRes?.data) ? traRes.data : [])
    setLoading(false)
  }, [businessId, planId])

  useEffect(() => {
    load()
  }, [load])

  async function guardarVehiculo(form) {
    if (!form.nombre.trim() || !Number(form.capacidad)) return
    setSaving(true)
    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      anio: form.anio ? Number(form.anio) : null,
      placa: form.placa.trim() || null,
      capacidad: Number(form.capacidad),
      estado: form.estado,
      descripcion: form.descripcion.trim() || null,
      conductor_id: form.conductor_id ? Number(form.conductor_id) : null,
    }
    try {
      if (vehModal.vehiculo) {
        await businessFlotaAPI.vehiculos.update(businessId, vehModal.vehiculo.id, payload)
        toast.success('Vehículo actualizado')
      } else {
        await businessFlotaAPI.vehiculos.add(businessId, payload)
        toast.success('Vehículo agregado')
      }
      setVehModal({ open: false, vehiculo: null })
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el vehículo')
    } finally {
      setSaving(false)
    }
  }

  function editarVehiculo(v) {
    setVehModal({ open: true, vehiculo: v })
  }

  async function eliminarVehiculo(v) {
    try {
      await businessFlotaAPI.vehiculos.remove(businessId, v.id)
      toast.success('Vehículo eliminado')
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el vehículo')
    }
  }

  async function guardarConductor(form) {
    if (!form.nombre.trim()) return
    setSaving(true)
    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      licencia: form.licencia.trim() || null,
      licencia_categoria: form.licencia_categoria.trim() || null,
      licencia_vencimiento: form.licencia_vencimiento || null,
      experiencia: form.experiencia.trim() || null,
      disponible: form.disponible,
    }
    try {
      if (conModal.conductor) {
        await businessFlotaAPI.conductores.update(businessId, conModal.conductor.id, payload)
        toast.success('Conductor actualizado')
      } else {
        await businessFlotaAPI.conductores.add(businessId, payload)
        toast.success('Conductor agregado')
      }
      setConModal({ open: false, conductor: null })
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el conductor')
    } finally {
      setSaving(false)
    }
  }

  function editarConductor(c) {
    setConModal({ open: true, conductor: c })
  }

  async function eliminarConductor(c) {
    try {
      await businessFlotaAPI.conductores.remove(businessId, c.id)
      toast.success('Conductor eliminado')
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el conductor')
    }
  }

  async function asignarTransporte(e) {
    e.preventDefault()
    const vehiculoId = e.target.vehiculo_id.value
    if (!vehiculoId) return
    setAsignando(true)
    try {
      await businessPlanesAPI.transporte.add(businessId, planId, {
        vehiculo_id: Number(vehiculoId),
        conductor_id: e.target.conductor_id.value ? Number(e.target.conductor_id.value) : null,
        orden: transportes.length,
        notas: null,
      })
      toast.success('Asignado al plan')
      e.target.reset()
      setSugerencia(null)
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo asignar')
    } finally {
      setAsignando(false)
    }
  }

  async function quitarTransporte(t) {
    try {
      await businessPlanesAPI.transporte.remove(businessId, planId, t.id)
      toast.success('Asignación eliminada')
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la asignación')
    }
  }

  async function calcularSugerencia(e) {
    e.preventDefault()
    setSugerirLoading(true)
    try {
      const res = await businessPlanesAPI.transporte.sugerir(businessId, planId, Number(personas))
      setSugerencia(res.data && typeof res.data === 'object' ? res.data : res)
      if (res.data?.sugerencia) setSugerencia(res.data)
    } catch (err) {
      toast.error(err.message || 'No se pudo sugerir')
    } finally {
      setSugerirLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-dark-800">
        <Truck className="w-4 h-4 text-primary-600" />
        Transporte del plan
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h5 className="text-sm font-medium text-dark-700 flex items-center gap-1.5"><UserIcon className="w-4 h-4" /> Conductores</h5>
          <button
            type="button"
            onClick={() => setConModal({ open: true, conductor: null })}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Conductor
          </button>
        </div>
        {conductores.length === 0 && (
          <p className="text-sm text-dark-400 mb-2">Sin conductores registrados.</p>
        )}
        <div className="space-y-1.5">
          {conductores.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-dark-100 px-3 py-2 text-sm">
              <UserIcon className="w-4 h-4 text-dark-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-dark-800">{c.nombre}</span>
                <span className="text-dark-500 text-xs ml-2">
                  {c.telefono ? `${c.telefono}` : ''}
                  {c.email ? ` · ${c.email}` : ''}
                  {c.licencia ? ` · Lic. ${c.licencia}` : ''}
                  {c.licencia_categoria ? ` (${c.licencia_categoria})` : ''}
                </span>
                {c.experiencia && <span className="text-dark-500 text-xs block truncate mt-0.5">{c.experiencia}</span>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.disponible ? 'bg-emerald-100 text-emerald-700' : 'bg-dark-100 text-dark-500'}`}>
                {c.disponible ? 'Activo' : 'Inactivo'}
              </span>
              <button onClick={() => editarConductor(c)} className="p-1.5 rounded text-dark-400 hover:text-primary-700 hover:bg-primary-50 transition-colors cursor-pointer" title="Editar conductor">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => eliminarConductor(c)} className="p-1.5 rounded text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="Eliminar conductor">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h5 className="text-sm font-medium text-dark-700 flex items-center gap-1.5"><Car className="w-4 h-4" /> Vehículos</h5>
          <button
            type="button"
            onClick={() => setVehModal({ open: true, vehiculo: null })}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Vehículo
          </button>
        </div>
        {vehiculos.length === 0 && (
          <p className="text-sm text-dark-400 mb-2">Sin vehículos registrados.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {vehiculos.map((v) => (
            <div key={v.id} className="flex items-center gap-2 rounded-xl border border-dark-100 px-3 py-2">
              <Car className="w-4 h-4 text-dark-400 shrink-0" />
              <div className="flex-1 min-w-0 text-sm">
                <span className="font-medium text-dark-800">{v.nombre}</span>
                <span className="text-dark-500 text-xs ml-2 capitalize">{v.tipo}{v.placa ? ` · ${v.placa}` : ''}</span>
                {v.marca && <span className="text-dark-500 text-xs ml-1">{v.marca}{v.modelo ? ` ${v.modelo}` : ''}</span>}
                <div className="flex items-center gap-1 text-xs text-dark-500"><Users className="w-3 h-3" /> {v.capacidad} pax</div>
                {v.conductor_nombre ? (
                  <span className="text-xs text-dark-500 block">Conductor: {v.conductor_nombre}</span>
                ) : (
                  <span className="text-xs text-dark-400 block">Sin conductor asignado</span>
                )}
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${v.estado === 'mantenimiento' ? 'bg-amber-100 text-amber-700' : v.estado === 'inactivo' ? 'bg-dark-100 text-dark-500' : 'bg-emerald-100 text-emerald-700'}`}>
                  {v.estado === 'mantenimiento' ? 'Mantenimiento' : v.estado === 'inactivo' ? 'Inactivo' : 'Disponible'}
                </span>
              </div>
              <button onClick={() => editarVehiculo(v)} className="p-1.5 rounded text-dark-400 hover:text-primary-700 hover:bg-primary-50 transition-colors cursor-pointer" title="Editar vehículo">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => eliminarVehiculo(v)} className="p-1.5 rounded text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="Eliminar vehículo">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h5 className="text-sm font-medium text-dark-700 mb-2">Vehículos asignados al plan</h5>
        <form onSubmit={asignarTransporte} className="mb-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 rounded-xl border border-primary-200 bg-primary-50/40 p-3">
          <select name="vehiculo_id" required className={`${inputClass} ${vehiculos.length === 0 ? 'opacity-60' : 'bg-white'}`} disabled={vehiculos.length === 0} defaultValue="">
            <option value="" disabled>{vehiculos.length === 0 ? 'Agrega vehículos primero' : 'Selecciona vehículo *'}</option>
            {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.nombre} ({v.capacidad} pax){v.estado === 'disponible' ? '' : ' — ' + v.estado}</option>)}
          </select>
          <select name="conductor_id" className={`${inputClass} bg-white`} defaultValue="">
            <option value="">Sin conductor asignado</option>
            {conductores.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.disponible ? '' : ' (inactivo)'}</option>)}
          </select>
          <button type="submit" disabled={asignando || vehiculos.length === 0} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer">
            {asignando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Asignar
          </button>
        </form>
        {transportes.length === 0 && <p className="text-sm text-dark-400">Sin asignaciones. Un plan puede tener varios vehículos.</p>}
        <div className="space-y-1.5">
          {transportes.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-dark-100 px-3 py-2 text-sm">
              <Truck className="w-4 h-4 text-dark-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-dark-800">{t.vehiculo_nombre || `Vehículo ${t.vehiculo_id}`}</span>
                <span className="text-dark-500 text-xs ml-2">
                  {t.vehiculo_tipo || ''}{t.vehiculo_capacidad ? ` · ${t.vehiculo_capacidad} pax` : ''}
                  {t.conductor_nombre ? ` · Conductor: ${t.conductor_nombre}` : ''}
                </span>
              </div>
              <button onClick={() => quitarTransporte(t)} className="p-1.5 rounded text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="Quitar asignación">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h5 className="text-sm font-medium text-dark-700 flex items-center gap-1.5 mb-2"><Sparkles className="w-4 h-4" /> Sugerencia según capacidad de la flota</h5>
        <form onSubmit={calcularSugerencia} className="flex flex-wrap items-end gap-2 rounded-xl border border-primary-200 bg-primary-50/40 p-3">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Nº de personas</label>
            <input type="number" min={1} max={200} value={personas} onChange={(e) => setPersonas(e.target.value)} className={inputClass} />
          </div>
          <button type="submit" disabled={sugerirLoading} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-ocean-600 text-white hover:bg-ocean-700 disabled:opacity-50 transition-colors cursor-pointer">
            {sugerirLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Sugerir
          </button>
        </form>
        {sugerencia && (
          <div className="mt-3 rounded-xl border border-ocean-100 bg-ocean-50/50 p-4 text-sm space-y-2">
            {sugerencia.sugeridos?.length === 0 && (
              <p className="text-dark-600">No hay vehículos disponibles para sugerir. Agrega vehículos a tu flota.</p>
            )}
            <div className="space-y-1.5">
              {(sugerencia.sugeridos || []).map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-ocean-600 shrink-0" />
                  <span className="font-medium">{a.vehiculo.nombre}</span>
                  <span className="text-dark-500 text-xs capitalize">({a.vehiculo.tipo}, {a.vehiculo.capacidad} pax)</span>
                  {typeof a.cantidad === 'number' && (
                    <span className="ml-auto text-xs text-dark-500">{a.cantidad} vehículo(s)</span>
                  )}
                  {a.conductor && <span className="ml-auto text-xs text-dark-500">Conductor: {a.conductor.nombre}</span>}
                </div>
              ))}
              <p className="text-xs text-dark-500 pt-1 border-t border-ocean-100">
                Total sugerido: {sugerencia.total_vehiculos} vehículo(s) para {sugerencia.personas} persona(s).
                {transportes.length > 0 ? ' Se priorizan los vehículos asignados al plan.' : ' Según la capacidad de tu flota.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={conModal.open}
        onClose={() => setConModal({ open: false, conductor: null })}
        title={conModal.conductor ? 'Editar conductor' : 'Nuevo conductor'}
        size="lg"
      >
        <ConductorForm
          inicial={conModal.conductor || null}
          onGuardar={guardarConductor}
          onCancelar={() => setConModal({ open: false, conductor: null })}
          saving={saving}
        />
      </Modal>

      <Modal
        open={vehModal.open}
        onClose={() => setVehModal({ open: false, vehiculo: null })}
        title={vehModal.vehiculo ? 'Editar vehículo' : 'Nuevo vehículo'}
        size="lg"
      >
        <VehiculoForm
          conductores={conductores}
          inicial={vehModal.vehiculo || null}
          onGuardar={guardarVehiculo}
          onCancelar={() => setVehModal({ open: false, vehiculo: null })}
          saving={saving}
        />
      </Modal>
    </div>
  )
}