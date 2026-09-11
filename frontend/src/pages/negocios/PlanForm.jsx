import { useState } from 'react'
import { Plus, Trash2, Loader2, Clock, Save, X } from 'lucide-react'
import { businessPlanesAPI, lugaresAPI } from '../../services/api'
import { toast } from 'sonner'
import MoneyInput from '../../components/MoneyInput'
import { findIncluyeOption, TIPO_PLAN_LABEL, TIPO_PRECIO_LABEL } from './planUtils'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

function newDia(num) {
  return { dia: num, actividades: [] }
}

function emptyActividad() {
  return { hora: '', descripcion: '' }
}

function buildDiasIniciales(duracionDias, itinerario) {
  if (Array.isArray(itinerario) && itinerario.length > 0) {
    return itinerario.map((d) => ({
      dia: Number(d.dia) || 1,
      actividades: (Array.isArray(d.actividades) ? d.actividades : []).map((a) => ({
        hora: a.hora || '',
        descripcion: a.descripcion || '',
      })),
    }))
  }
  const count = Math.max(1, Number(duracionDias) || 1)
  return Array.from({ length: count }, (_, i) => newDia(i + 1))
}

export default function PlanForm({ businessId, plan, onSaved, onCancel }) {
  const editing = Boolean(plan)
  const [lugares, setLugares] = useState([])

  const [nombre, setNombre] = useState(plan?.nombre || '')
  const [descripcion, setDescripcion] = useState(plan?.descripcion || '')
  const [tipoPlan, setTipoPlan] = useState(plan?.tipo_plan || 'plan')
  const [destinationId, setDestinationId] = useState(plan?.destination_id != null ? String(plan.destination_id) : '')
  const [destinoLibre, setDestinoLibre] = useState(plan?.destino || '')
  const [duracionDias, setDuracionDias] = useState(plan?.duracion_dias ? Number(plan.duracion_dias) : 1)
  const [duracionNoches, setDuracionNoches] = useState(plan?.duracion_noches ? Number(plan.duracion_noches) : 0)
  const [precio, setPrecio] = useState(plan?.precio != null ? String(plan.precio) : '')
  const [precioAnterior, setPrecioAnterior] = useState(plan?.precio_anterior != null ? String(plan.precio_anterior) : '')
  const [tipoPrecio, setTipoPrecio] = useState(plan?.tipo_precio || 'por_persona')
  const [capacidadReferencial, setCapacidadReferencial] = useState(plan?.capacidad_referencial != null ? String(plan.capacidad_referencial) : '')
  const [rangos, setRangos] = useState(() =>
    Array.isArray(plan?.descuentos_rango) && plan.descuentos_rango.length > 0
      ? plan.descuentos_rango.map((r) => ({
          min: r.min != null ? String(r.min) : '',
          max: r.max != null ? String(r.max) : '',
          descuento: r.descuento != null ? String(r.descuento) : '0',
        }))
      : [{ min: '', max: '', descuento: '0' }]
  )
  const [incluidosSel, setIncluidosSel] = useState(
    Array.isArray(plan?.incluye)
      ? plan.incluye.filter((i) => findIncluyeOption(i)).map((i) => findIncluyeOption(i).key)
      : []
  )
  const [otrosIncluidos, setOtrosIncluidos] = useState(
    Array.isArray(plan?.incluye) ? plan.incluye.filter((i) => !findIncluyeOption(i)) : []
  )
  const [dias, setDias] = useState(buildDiasIniciales(plan?.duracion_dias || 1, plan?.itinerario))
  const [otrosIncluidosInput, setOtrosIncluidosInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingLugares, setLoadingLugares] = useState(false)

  function cargarLugares() {
    if (lugares.length > 0 || loadingLugares) return
    setLoadingLugares(true)
    lugaresAPI
      .getAll()
      .then((r) => setLugares(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoadingLugares(false))
  }

  function setRango(i, campo, valor) {
    setRangos((prev) => prev.map((r, j) => (i === j ? { ...r, [campo]: valor } : r)))
  }

  function toggleIncluido(key) {
    setIncluidosSel((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function agregarDia() {
    setDias((prev) => {
      const next = Math.max(...prev.map((d) => d.dia), 0) + 1
      return [...prev, newDia(next)]
    })
  }

  function agregarActividad(diaIndex) {
    setDias((prev) => prev.map((d, i) => (i === diaIndex ? { ...d, actividades: [...d.actividades, emptyActividad()] } : d)))
  }

  function cambiarActividad(diaIndex, actIndex, campo, valor) {
    setDias((prev) =>
      prev.map((d, i) =>
        i === diaIndex
          ? {
              ...d,
              actividades: d.actividades.map((a, j) => (j === actIndex ? { ...a, [campo]: valor } : a)),
            }
          : d
      )
    )
  }

  function quitarActividad(diaIndex, actIndex) {
    setDias((prev) => prev.map((d, i) => (i === diaIndex ? { ...d, actividades: d.actividades.filter((_, j) => j !== actIndex) } : d)))
  }

  function quitarDia(diaIndex) {
    setDias((prev) => prev.filter((_, i) => i !== diaIndex))
  }

  async function submit(e) {
    e.preventDefault()

    const incluye = [
      ...incluidosSel.map((key) => findIncluyeOption(key).label),
      ...otrosIncluidos.filter((o) => o.trim()),
    ].slice(0, 50)

    const itinerarioClean = dias
      .filter((d) => d.actividades.length > 0)
      .map((d) => ({
        dia: Number(d.dia) || 1,
        actividades: d.actividades
          .filter((a) => a.descripcion.trim())
          .map((a) => ({
            hora: a.hora ? String(a.hora) : null,
            descripcion: a.descripcion.trim(),
          })),
      }))
      .filter((d) => d.actividades.length > 0)

    const body = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      tipo_plan: tipoPlan,
      destination_id: destinationId ? Number(destinationId) : null,
      destino: destinoLibre.trim() || null,
      duracion_dias: Number(duracionDias) || 0,
      duracion_noches: Number(duracionNoches) || 0,
      precio: precio !== '' ? Number(precio) : null,
      precio_anterior: precioAnterior !== '' ? Number(precioAnterior) : null,
      tipo_precio: tipoPrecio,
      moneda: 'COP',
      capacidad_referencial: capacidadReferencial !== '' ? Number(capacidadReferencial) : null,
      descuentos_rango: rangos
        .filter((r) => r.min !== '' && r.descuento !== '')
        .map((r) => ({
          min: Number(r.min),
          max: r.max !== '' && Number(r.max) > 0 ? Number(r.max) : null,
          descuento: Number(r.descuento),
        })),
      incluye,
      itinerario: itinerarioClean,
    }

    setSaving(true)
    try {
      const res = editing
        ? await businessPlanesAPI.update(businessId, plan.id, body)
        : await businessPlanesAPI.create(businessId, body)
      toast.success(res.message || (editing ? 'Plan actualizado' : 'Plan creado'))
      onSaved?.(res.data)
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
          {editing ? 'Editar plan' : 'Nuevo plan'}
        </h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg text-dark-400 hover:text-dark-700 hover:bg-dark-100 transition-colors cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-dark-700">Información básica</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del plan *" className={inputClass} required />
            <select value={tipoPlan} onChange={(e) => setTipoPlan(e.target.value)} className={`${inputClass} bg-white`} required>
              {Object.entries(TIPO_PLAN_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción del plan *"
            rows={3}
            className={inputClass}
            required
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-dark-700">Destino</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                onFocus={cargarLugares}
                className={`${inputClass} bg-white`}
              >
                <option value="">Destino turístico (opcional)</option>
                {lugares.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>
            <input
              value={destinoLibre}
              onChange={(e) => setDestinoLibre(e.target.value)}
              placeholder="O nombre libre del destino (ej: Guatapé, Antioquia)"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-dark-700">Duración y precio</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-dark-500 mb-1">Días *</label>
              <input type="number" min={1} max={60} value={duracionDias} onChange={(e) => setDuracionDias(Number(e.target.value))} className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">Noches</label>
              <input type="number" min={0} max={59} value={duracionNoches} onChange={(e) => setDuracionNoches(Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">Precio (COP) *</label>
              <MoneyInput value={precio} onChange={(v) => setPrecio(v ?? '')} placeholder="Ej: 132000" className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">Precio anterior</label>
              <MoneyInput value={precioAnterior} onChange={(v) => setPrecioAnterior(v ?? '')} placeholder="Ej: 150000" className={inputClass} />
            </div>
          </div>
          <select value={tipoPrecio} onChange={(e) => setTipoPrecio(e.target.value)} className={`${inputClass} bg-white max-w-sm`} required>
            {Object.entries(TIPO_PRECIO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <p className="text-xs text-dark-500">
            El precio es informativo: los clientes te contactarán por WhatsApp para cotizar. No se realizan pagos por la plataforma.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-dark-700">Precios para grupos y paquetes grupales</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs text-dark-500 mb-1">Capacidad referencial (personas)</label>
              <input
                type="number"
                min={1}
                max={200}
                value={capacidadReferencial}
                onChange={(e) => setCapacidadReferencial(e.target.value)}
                placeholder="Ej: 20"
                className={inputClass}
              />
            </div>
            <p className="text-xs text-dark-500 sm:col-span-2">
              Cantidad máxima de personas que admitiría el paquete. Se usa para sugerir transporte grupal.
            </p>
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Descuento por rango de personas (sobre el precio informativo)</label>
            <div className="space-y-2">
              {rangos.map((r, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-dark-500">Desde</label>
                  <input
                    type="number"
                    min={1}
                    value={r.min}
                    onChange={(e) => setRango(i, 'min', e.target.value)}
                    placeholder="1"
                    className={`${inputClass} max-w-[100px]`}
                  />
                  <label className="text-xs text-dark-500">hasta</label>
                  <input
                    type="number"
                    min={1}
                    value={r.max}
                    onChange={(e) => setRango(i, 'max', e.target.value)}
                    placeholder="Ilimitado"
                    className={`${inputClass} max-w-[100px]`}
                  />
                  <label className="text-xs text-dark-500">descuento %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={r.descuento}
                    onChange={(e) => setRango(i, 'descuento', e.target.value)}
                    placeholder="0"
                    className={`${inputClass} max-w-[100px]`}
                  />
                  <button
                    type="button"
                    onClick={() => setRangos((prev) => prev.filter((_, j) => j !== i))}
                    disabled={rangos.length <= 1}
                    className="p-2 rounded-lg text-dark-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-30"
                    title="Quitar rango"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRangos((prev) => [...prev, { min: '', max: '', descuento: '0' }])}
                disabled={rangos.length >= 20}
                className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-4 h-4" /> Agregar rango
              </button>
            </div>
            <p className="text-xs text-dark-400 mt-1">
              Ejemplo: 1–4 → 0%, 5–9 → 10%, 10+ → 20%. El turista verá el precio total según el número de personas.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-dark-700">¿Qué incluye?</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {[
              ...(['transporte', 'alojamiento', 'desayuno', 'almuerzo', 'cena', 'guia', 'seguros', 'entradas'].map((k) => findIncluyeOption(k))),
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleIncluido(opt.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
                  incluidosSel.includes(opt.key)
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'border-dark-200 text-dark-600 hover:border-primary-300'
                }`}
              >
                <opt.icon className="w-4 h-4 shrink-0" />
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {otrosIncluidos.map((o, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-dark-100 text-dark-700 text-sm">
                {o}
                <button type="button" onClick={() => setOtrosIncluidos((prev) => prev.filter((_, j) => j !== i))} className="text-dark-400 hover:text-red-600 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <input
            value={otrosIncluidosInput}
            onChange={(e) => setOtrosIncluidosInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && otrosIncluidosInput.trim()) {
                e.preventDefault()
                setOtrosIncluidos((prev) => [...prev, otrosIncluidosInput.trim()])
                setOtrosIncluidosInput('')
              }
            }}
            placeholder="Otro incluido y presiona Enter"
            className={inputClass}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-dark-700">Itinerario</h4>
            <p className="text-xs text-dark-400">Opcional. Organiza las actividades por día.</p>
          </div>
          {dias.length === 0 && (
            <p className="text-sm text-dark-500">Sin días definidos.</p>
          )}
          <div className="space-y-4">
            {dias.map((d, di) => (
              <div key={di} className="border border-dark-100 rounded-xl p-4 bg-dark-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-dark-800">Día {d.dia}</span>
                  <button type="button" onClick={() => quitarDia(di)} className="text-dark-400 hover:text-red-600 transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {d.actividades.length === 0 && <p className="text-xs text-dark-400 mb-2">Sin actividades.</p>}
                <div className="space-y-2">
                  {d.actividades.map((a, ai) => (
                    <div key={ai} className="flex items-start gap-2">
                      <div className="flex items-center gap-1 text-dark-400 mt-2 shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <input
                        type="time"
                        value={a.hora}
                        onChange={(e) => cambiarActividad(di, ai, 'hora', e.target.value)}
                        className={`${inputClass} max-w-[120px]`}
                      />
                      <input
                        value={a.descripcion}
                        onChange={(e) => cambiarActividad(di, ai, 'descripcion', e.target.value)}
                        placeholder="Descripción de la actividad *"
                        className={inputClass}
                      />
                      <button type="button" onClick={() => quitarActividad(di, ai)} className="p-2 rounded-lg text-dark-400 hover:text-red-600 transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => agregarActividad(di)}
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium mt-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Actividad
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={agregarDia}
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Agregar día
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-dark-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-dark-600 hover:bg-dark-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !nombre.trim() || !precio}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editing ? 'Guardar cambios' : 'Crear plan'}
          </button>
        </div>
      </form>
    </div>
  )
}