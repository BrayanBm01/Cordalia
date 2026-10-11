import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, Users, Plus, Trash2, Loader2, X, ChevronDown, ChevronRight, Truck, MapPin, Wallet, User as UserIcon } from 'lucide-react'
import { businessPlanesAPI, businessFlotaAPI } from '../../services/api'
import { toast } from 'sonner'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatMoney, ocupacionPct } from './businessUtils'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

function CuposResumen({ ocupado, maximo, disponible }) {
  const cap = Math.max(0, Number(maximo) || 0)
  const ocu = Math.min(Math.max(0, Number(ocupado) || 0), cap)
  const libres = disponible == null ? Math.max(0, cap - ocu) : Math.max(0, Number(disponible))
  const pct = ocupacionPct(ocu, cap)
  const llena = cap > 0 && libres <= 0
  const casiLlena = !llena && pct >= 75

  return (
    <div className={`mt-3 rounded-xl border p-3 ${llena ? 'border-red-200 bg-red-50/60' : casiLlena ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/60'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-dark-800">
          <Users className="w-4 h-4 text-primary-600" /> Cupos
        </span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${llena ? 'bg-red-100 text-red-700' : casiLlena ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          <Users className="w-3 h-3" />
          {llena ? 'Llena · 100% ocupado' : `${pct}% ocupado`}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="rounded-lg bg-white border border-dark-100 px-2 py-2 text-center">
          <p className="text-[11px] font-medium text-dark-500 uppercase tracking-wide">Ocupados</p>
          <p className="text-xl font-bold text-dark-900 tabular-nums">{ocu}</p>
        </div>
        <div className="rounded-lg bg-white border border-dark-100 px-2 py-2 text-center">
          <p className="text-[11px] font-medium text-dark-500 uppercase tracking-wide">Disponibles</p>
          <p className={`text-xl font-bold tabular-nums ${llena ? 'text-red-600' : 'text-dark-900'}`}>{libres}</p>
        </div>
        <div className="rounded-lg bg-white border border-dark-100 px-2 py-2 text-center">
          <p className="text-[11px] font-medium text-dark-500 uppercase tracking-wide">Capacidad total</p>
          <p className="text-xl font-bold text-dark-900 tabular-nums">{cap}</p>
        </div>
      </div>
      {ocu === 0 && <p className="text-xs text-dark-500 mt-1.5">Sin inscritos todavía: toda la capacidad está disponible.</p>}
      {llena && <p className="text-xs text-red-700 font-medium mt-1.5">Salida llena: los turistas ya no podrán inscribirse.</p>}
    </div>
  )
}

const ESTADO_BADGE = {
  pagada: 'bg-emerald-100 text-emerald-700',
  pendiente: 'bg-amber-100 text-amber-700',
  fallida: 'bg-orange-100 text-orange-700',
  cancelada: 'bg-dark-100 text-dark-500',
  expirada: 'bg-red-100 text-red-600',
  vencida: 'bg-red-100 text-red-600',
}

const ESTADO_LABEL = {
  pagada: 'Pagada',
  pendiente: 'Pendiente',
  fallida: 'Fallida',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
  vencida: 'Viaje vencido',
}

function InscripcionesList({ businessId, planId, salida, valor }) {
  const [open, setOpen] = useState(false)
  const [inscripciones, setInscripciones] = useState([])
  const [loading, setLoading] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const res = await businessPlanesAPI.salidas.inscripciones.list(businessId, planId, salida.id)
      setInscripciones(Array.isArray(res.data) ? res.data : [])
      setOpen(true)
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar las inscripciones')
    } finally {
      setLoading(false)
    }
  }

  async function cancelar(insc) {
    try {
      await businessPlanesAPI.salidas.inscripciones.cancelar(businessId, planId, salida.id, insc.id)
      toast.success('Inscripción cancelada (cupo liberado)')
      cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo cancelar')
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={open ? () => setOpen(false) : cargar}
        className="inline-flex items-center gap-1.5 text-sm text-primary-700 hover:text-primary-800 font-medium cursor-pointer"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        Inscripciones ({salida.cupo_ocupado})
        {valor != null && <span className="text-primary-600">· {formatMoney(valor)}</span>}
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {inscripciones.length === 0 && <p className="text-sm text-dark-400">Sin inscripciones todavía.</p>}
          {inscripciones.map((i) => {
            const estado = i.estado || 'confirmada' // retrocompatibilidad
            return (
              <div key={i.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-dark-100 px-3 py-2 text-sm bg-dark-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-dark-800">{i.nombre || 'Anónimo'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_BADGE[estado] || 'bg-dark-100 text-dark-500'}`}>
                      {ESTADO_LABEL[estado] || estado.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-primary-700">{i.personas} pax</span>
                  </div>
                  {i.email && <span className="text-dark-500 text-xs block truncate mt-0.5">{i.email}</span>}
                  {i.mensaje && <span className="text-dark-500 text-xs block truncate mt-0.5">"{i.mensaje}"</span>}
                  {i.precio_total != null && (
                    <span className="text-dark-500 text-xs block mt-0.5">Valor: {formatMoney(i.precio_total)} {i.pago_referencia ? `(Ref: ${i.pago_referencia})` : ''}</span>
                  )}
                </div>
                {['pagada', 'pendiente', 'confirmada'].includes(estado) && (
                  <button onClick={() => cancelar(i)} className="self-end sm:self-center p-1.5 rounded text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0" title="Cancelar inscripción">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SalidaTransporte({ businessId, planId, salida }) {
  const [vehiculos, setVehiculos] = useState([])
  const [conductores, setConductores] = useState([])
  const [recomendado, setRecomendado] = useState(null)
  const [asignados, setAsignados] = useState([])
  const [loading, setLoading] = useState(true)
  const [asignando, setAsignando] = useState(false)
  const [form, setForm] = useState({ vehiculo_id: '', conductor_id: '' })

  async function cargar() {
    setLoading(true)
    try {
      const [vehRes, conRes, sugRes, asiRes] = await Promise.all([
        businessFlotaAPI.vehiculos.list(businessId).catch(() => null),
        businessFlotaAPI.conductores.list(businessId).catch(() => null),
        businessPlanesAPI.salidas.transporte.sugerir(businessId, planId, salida.id).catch(() => null),
        businessPlanesAPI.salidas.transporte.asignados(businessId, planId, salida.id).catch(() => null),
      ])
      setVehiculos(Array.isArray(vehRes?.data) ? vehRes.data : [])
      setConductores(Array.isArray(conRes?.data) ? conRes.data : [])
      setRecomendado(sugRes?.data && typeof sugRes.data === 'object' ? sugRes.data : null)
      setAsignados(Array.isArray(asiRes?.data) ? asiRes.data : [])
    } catch {
      // sin cambios
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [businessId, planId, salida.id])

  async function asignar(e) {
    e.preventDefault()
    if (!form.vehiculo_id) return
    setAsignando(true)
    try {
      await businessPlanesAPI.salidas.transporte.asignar(businessId, planId, salida.id, {
        vehiculo_id: Number(form.vehiculo_id),
        conductor_id: form.conductor_id ? Number(form.conductor_id) : null,
      })
      toast.success('Transporte asignado a la salida')
      cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo asignar el transporte')
    } finally {
      setAsignando(false)
    }
  }

  async function quitar(t) {
    try {
      await businessPlanesAPI.salidas.transporte.quitar(businessId, planId, salida.id, t.id)
      toast.success('Transporte desasignado')
      cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo desasignar')
    }
  }

  if (loading) {
    return <p className="text-xs text-dark-400 flex items-center gap-1.5 mt-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluando transporte...</p>
  }

  return (
    <div className="mt-2 rounded-lg border border-ocean-100 bg-ocean-50/40 p-3 text-sm space-y-2">
      <p className="text-xs font-semibold text-ocean-800 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Transporte</p>
      {asignados.length > 0 ? (
        asignados.map((t) => (
          <div key={t.id} className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-ocean-600 shrink-0" />
            <span className="font-medium capitalize">{t.vehiculo_tipo || 'Vehículo'}</span>
            <span className="text-dark-600">{t.vehiculo_nombre} · {t.vehiculo_placa || 's/p'} · {t.vehiculo_capacidad} pax</span>
            <span className="text-dark-500">
              <UserIcon className="w-3 h-3 inline" /> {t.conductor_nombre || 'Sin conductor'}
            </span>
            <button onClick={() => quitar(t)} className="ml-auto p-1 rounded text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="Desasignar">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))
      ) : recomendado?.vehiculo ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-dark-600">Recomendado:</span>
          <span className="font-medium capitalize">{recomendado.vehiculo.tipo || 'Vehículo'}</span>
          <span className="text-dark-600">{recomendado.vehiculo.nombre} · {recomendado.vehiculo.placa || 's/p'} · {recomendado.vehiculo.capacidad} pax</span>
          <span className="text-dark-500">
            <UserIcon className="w-3 h-3 inline" /> {recomendado.conductor ? recomendado.conductor.nombre : 'Sin conductor disponible'}
          </span>
        </div>
      ) : (
        <p className="text-sm text-amber-700">{recomendado?.mensaje || 'No hay vehículo disponible con la capacidad necesaria.'}</p>
      )}

      <form onSubmit={asignar} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 pt-2 border-t border-ocean-100">
        <select
          value={form.vehiculo_id}
          onChange={(e) => setForm((s) => ({ ...s, vehiculo_id: e.target.value }))}
          required
          disabled={vehiculos.length === 0}
          className={`${inputClass} ${vehiculos.length === 0 ? 'opacity-60' : 'bg-white'}`}
        >
          <option value="" disabled>{vehiculos.length === 0 ? 'Agrega vehículos' : 'Vehiculo para la salida *'}</option>
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre} ({v.capacidad} pax){v.estado === 'disponible' ? '' : ` — ${v.estado}`}
            </option>
          ))}
        </select>
        <select
          value={form.conductor_id}
          onChange={(e) => setForm((s) => ({ ...s, conductor_id: e.target.value }))}
          className={`${inputClass} bg-white`}
        >
          <option value="">Sin conductor asignado</option>
          {conductores.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}{c.disponible ? '' : ' (inactivo)'}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={asignando || vehiculos.length === 0}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-ocean-600 text-white hover:bg-ocean-700 disabled:opacity-50 cursor-pointer"
        >
          {asignando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />} Asignar
        </button>
      </form>
    </div>
  )
}

export default function SalidasPanel({ businessId, planId, planNombre }) {
  const [salidas, setSalidas] = useState([])
  const [resumenes, setResumenes] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [cupoMaximo, setCupoMaximo] = useState('20')
  const [fechaLimite, setFechaLimite] = useState('')
  const [horaLimite, setHoraLimite] = useState('')
  const [lugarEncuentro, setLugarEncuentro] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await businessPlanesAPI.salidas.list(businessId, planId)
      const lista = Array.isArray(res.data) ? res.data : []
      setSalidas(lista)
      const resSum = {}
      await Promise.all(
        lista.map(async (s) => {
          try {
            const r = await businessPlanesAPI.salidas.inscripciones.resumen(businessId, planId, s.id)
            resSum[s.id] = r?.data
          } catch {
            // resumen no disponible
          }
        })
      )
      setResumenes(resSum)
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar las salidas')
    } finally {
      setLoading(false)
    }
  }, [businessId, planId])

  useEffect(() => {
    load()
  }, [load])

  async function crear(e) {
    e.preventDefault()
    if (!fecha) return
    setSaving(true)
    try {
      await businessPlanesAPI.salidas.create(businessId, planId, {
        fecha,
        hora: hora || null,
        cupo_maximo: Number(cupoMaximo) || 20,
        fecha_limite: fechaLimite || null,
        hora_limite: horaLimite || null,
        lugar_encuentro: lugarEncuentro.trim() || null,
      })
      toast.success('Salida creada')
      setShowForm(false)
      setFecha('')
      setHora('')
      setCupoMaximo('20')
      setFechaLimite('')
      setHoraLimite('')
      setLugarEncuentro('')
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo crear la salida')
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(salida) {
    try {
      await businessPlanesAPI.salidas.remove(businessId, planId, salida.id)
      toast.success('Salida eliminada')
      load()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la salida')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-dark-800">
          <CalendarDays className="w-4 h-4 text-primary-600" />
          Salidas con cupo · {planNombre}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Programar salida
        </button>
      </div>

      {showForm && (
        <form onSubmit={crear} className="mt-3 rounded-xl border border-primary-200 bg-primary-50/40 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <div>
              <label className="block text-xs text-dark-500 mb-1">Fecha de salida *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">Hora de salida</label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">Cupo máx *</label>
              <input type="number" min={1} value={cupoMaximo} onChange={(e) => setCupoMaximo(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">Fecha cierre inscrip.</label>
              <input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">Hora cierre inscrip.</label>
              <input type="time" value={horaLimite} onChange={(e) => setHoraLimite(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <div>
              <label className="block text-xs text-dark-500 mb-1">Lugar de encuentro</label>
              <input value={lugarEncuentro} onChange={(e) => setLugarEncuentro(e.target.value)} placeholder="ej. Parque principal" className={inputClass} />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={saving || !fecha} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Guardar
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="mt-3 space-y-2">
        {salidas.length === 0 && (
          <p className="text-sm text-dark-400">Sin salidas programadas. Los turistas podrán inscribirse cuando exista al menos una fecha disponible.</p>
        )}
        {salidas.map((s) => {
          const llena = s.cupo_disponible <= 0
          const resumen = resumenes[s.id]
          return (
            <div key={s.id} className="rounded-xl border border-dark-100 bg-white px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-dark-800">
                      <CalendarDays className="w-4 h-4 text-primary-600" />
                      {new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {s.hora && <span className="text-xs text-dark-500">· Salida {s.hora}</span>}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${llena ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {llena ? 'Llena' : `${s.cupo_disponible} cupos libres`}
                    </span>
                  </div>
                  <div className="text-xs text-dark-500 mt-1 space-x-2 flex flex-wrap items-center">
                    <span><strong>{s.cupo_ocupado}</strong> / {s.cupo_maximo} personas inscritas · {s.cupo_disponible} disponibles</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-dark-500">
                    {s.lugar_encuentro && (
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-primary-600" /> {s.lugar_encuentro}</span>
                    )}
                    {s.fecha_limite && (
                      <span>Cierre: {new Date(s.fecha_limite + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })}
                        {s.hora_limite ? ` ${s.hora_limite}` : ''}
                      </span>
                    )}
                    {resumen?.valor_total != null && Number(resumen.valor_total) > 0 && (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <Wallet className="w-3 h-3" /> Valor de inscripciones: {formatMoney(resumen.valor_total)}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => eliminar(s)} className="self-end sm:self-center p-2 rounded-lg text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0" title="Eliminar salida">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <CuposResumen ocupado={s.cupo_ocupado} maximo={s.cupo_maximo} disponible={s.cupo_disponible} />
              <InscripcionesList businessId={businessId} planId={planId} salida={s} valor={resumen?.valor_total} />
              <SalidaTransporte businessId={businessId} planId={planId} salida={s} />
            </div>
          )
        })}
      </div>

      <p className="text-xs text-dark-400 mt-3">
        Las inscripciones reflejan las reservas de cupos. Los turistas pueden pagar en línea mediante el sistema integrado. Se muestran los estados de pago de cada inscripción.
      </p>
    </div>
  )
}