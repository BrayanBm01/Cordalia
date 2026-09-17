import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, ChevronUp, ChevronDown, Loader2,
  Compass, MapPin, Info, Save, ArrowDownToLine,
} from 'lucide-react'
import { toast } from 'sonner'
import Modal from '../../components/Modal'
import ImageUploader from '../../components/ImageUploader'
import LoadingSpinner from '../../components/LoadingSpinner'
import { contenidoAPI, lugaresAPI } from '../../services/api'

const MONEDAS = ['COP', 'USD', 'EUR', 'MXN', 'PEN']

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

const labelClass = 'block text-sm font-medium text-dark-700 mb-1'

function factoryAsignacion(asignadas, setAsignadas, destinoId, kind = 'actividad') {
  const assignApi = kind === 'punto' ? lugaresAPI.assignPunto : lugaresAPI.assignActividad
  const unassignApi = kind === 'punto' ? lugaresAPI.unassignPunto : lugaresAPI.unassignActividad
  const listKey = kind === 'punto' ? 'puntos_asignados' : 'actividades_asignadas'

  async function refresh() {
    const { data } = await lugaresAPI.administrar(destinoId)
    setAsignadas(data[listKey])
  }

  async function assign(itemId) {
    try {
      const orden = asignadas.length
      const res = await assignApi(destinoId, itemId, orden)
      toast.success(res.message || 'Asignado al destino')
      await refresh()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function unassign(itemId) {
    try {
      const res = await unassignApi(destinoId, itemId)
      toast.success(res.message || 'Desasignado del destino')
      await refresh()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function reorder(itemId, dir) {
    const index = asignadas.findIndex((a) => a.id === itemId)
    const target = index + dir
    if (index < 0 || target < 0 || target >= asignadas.length) return
    const next = [...asignadas]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setAsignadas(next)
    try {
      await assignApi(destinoId, itemId, target)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return { assign, unassign, reorder }
}

export default function DestinoContenidoManager({ destino, open, onClose }) {
  const [tab, setTab] = useState('actividades')
  const [loading, setLoading] = useState(true)
  const [cargando, setCargando] = useState(false)

  const [actividadesAsignadas, setActividadesAsignadas] = useState([])
  const [puntosAsignados, setPuntosAsignados] = useState([])
  const [catalogoActividades, setCatalogoActividades] = useState([])
  const [catalogoPuntos, setCatalogoPuntos] = useState([])
  const [infoViaje, setInfoViaje] = useState(null)

  // Formularios "crear en el catálogo"
  const [crearActividad, setCrearActividad] = useState(false)
  const [actForm, setActForm] = useState({ nombre: '', descripcion: '', categoria: '', imagen: '' })
  const [crearPunto, setCrearPunto] = useState(false)
  const [puntoForm, setPuntoForm] = useState({ nombre: '', descripcion: '', tipo: '', imagen: '' })

  // Formulario de información de viaje
  const [infoForm, setInfoForm] = useState({})

  const accionesActividades = useCallback(
    () => factoryAsignacion(actividadesAsignadas, setActividadesAsignadas, destino?.id),
    [actividadesAsignadas, destino?.id]
  )

  const accionesPuntos = useCallback(
    () => factoryAsignacion(puntosAsignados, setPuntosAsignados, destino?.id),
    [puntosAsignados, destino?.id]
  )

  async function loadAll() {
    if (!destino) return
    setLoading(true)
    try {
      const [adminRes, catAct, catPnt] = await Promise.all([
        lugaresAPI.administrar(destino.id),
        contenidoAPI.actividades.list(),
        contenidoAPI.puntos.list(),
      ])
      const { actividades_asignadas, puntos_asignados, contenido } = adminRes.data
      setActividadesAsignadas(actividades_asignadas || [])
      setPuntosAsignados(puntos_asignados || [])
      setCatalogoActividades(catAct.data || [])
      setCatalogoPuntos(catPnt.data || [])
      setInfoViaje(contenido.infoViaje || null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, destino?.id])

  async function crearEnCatalogo(kind) {
    const form = kind === 'actividad' ? actForm : puntoForm
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    setCargando(true)
    try {
      const payload = { ...form }
      if (!payload.imagen) delete payload.imagen
      const res =
        kind === 'actividad'
          ? await contenidoAPI.actividades.create(payload)
          : await contenidoAPI.puntos.create(payload)
      toast.success(res.message || 'Creado en el catálogo')
      if (kind === 'actividad') {
        setActForm({ nombre: '', descripcion: '', categoria: '', imagen: '' })
        setCrearActividad(false)
      } else {
        setPuntoForm({ nombre: '', descripcion: '', tipo: '', imagen: '' })
        setCrearPunto(false)
      }
      await loadAll()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function guardarInfoViaje() {
    setCargando(true)
    try {
      const numeric = ['costo_transporte', 'costo_alimentacion', 'costo_alojamiento', 'costo_actividades', 'costo_otros']
      const payload = {}
      for (const k of Object.keys(infoForm)) {
        let v = infoForm[k]
        if (numeric.includes(k)) {
          v = v === '' ? null : Number(v)
        }
        payload[k] = v
      }
      const res = await lugaresAPI.saveInfoViaje(destino.id, payload)
      toast.success(res.message || 'Información guardada')
      setInfoViaje(res.data)
      setInfoForm(res.data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (infoViaje) setInfoForm(infoViaje)
  }, [infoViaje])

  const tabs = [
    { id: 'actividades', label: 'Qué hacer', icon: Compass },
    { id: 'puntos', label: 'Qué visitar', icon: MapPin },
    { id: 'info', label: 'Información del viaje', icon: Info },
  ]

  const disponiblesActividades = catalogoActividades.filter((a) => a.activo !== false && !actividadesAsignadas.some((x) => x.id === a.id))
  const disponiblesPuntos = catalogoPuntos.filter((a) => a.activo !== false && !puntosAsignados.some((x) => x.id === a.id))

  return (
    <Modal open={open} onClose={onClose} title={`Contenido · ${destino?.nombre || ''}`} size="xl">
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === t.id ? 'bg-primary-600 text-white' : 'bg-dark-50 text-dark-600 hover:bg-dark-100'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {tab === 'actividades' && (
            <TabContenido
              titulo="Actividades asignadas a este destino"
              asignados={actividadesAsignados}
              disponibles={disponiblesActividades}
              factory={accionesActividades}
              crearAbierto={crearActividad}
              setCrearAbierto={setCrearActividad}
              form={actForm}
              setForm={setActForm}
              crearEnCatalogo={() => crearEnCatalogo('actividad')}
              tipoLabel="Categoría"
              ejemploTipo="Naturaleza, Aventura, Cultura..."
              cargando={cargando}
            />
          )}

          {tab === 'puntos' && (
            <TabContenido
              titulo="Puntos de interés asignados a este destino"
              asignados={puntosAsignados}
              disponibles={disponiblesPuntos}
              factory={accionesPuntos}
              crearAbierto={crearPunto}
              setCrearAbierto={setCrearPunto}
              form={puntoForm}
              setForm={setPuntoForm}
              crearEnCatalogo={() => crearEnCatalogo('punto')}
              tipoLabel="Tipo"
              ejemploTipo="Ciénaga, Plaza, Iglesia, Mirador..."
              cargando={cargando}
            />
          )}

          {tab === 'info' && (
            <InfoViajeForm
              form={infoForm}
              setForm={setInfoForm}
              guardar={guardarInfoViaje}
              cargando={cargando}
            />
          )}
        </>
      )}
    </Modal>
  )
}

function TabContenido({
  asignados,
  disponibles,
  factory,
  crearAbierto,
  setCrearAbierto,
  form,
  setForm,
  crearEnCatalogo,
  tipoLabel,
  ejemploTipo,
  cargando,
}) {
  const { assign, unassign, reorder } = factory()

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-dark-200 overflow-hidden">
        <div className="px-4 py-3 bg-dark-50 border-b border-dark-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-dark-800">Asignados</h3>
          <span className="text-xs text-dark-400">{asignados.length} elemento(s)</span>
        </div>
        {asignados.length === 0 ? (
          <p className="px-4 py-6 text-sm text-dark-400 text-center">
            Sin contenido asignado. Usa las tarjetas "Disponibles" para agregar.
          </p>
        ) : (
          <ul className="divide-y divide-dark-100">
            {asignados.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-800 truncate">{item.nombre}</p>
                  {item.categoria && <p className="text-xs text-dark-400">{item.categoria}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => reorder(item.id, -1)}
                    className="p-1 rounded-lg text-dark-400 hover:text-ocean-600 hover:bg-ocean-50 transition-colors cursor-pointer"
                    title="Subir"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => reorder(item.id, 1)}
                    className="p-1 rounded-lg text-dark-400 hover:text-ocean-600 hover:bg-ocean-50 transition-colors cursor-pointer"
                    title="Bajar"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => unassign(item.id)}
                    className="p-1 rounded-lg text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Quitar de este destino"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-dark-800">Disponibles en el catálogo</h3>
          <button
            onClick={() => setCrearAbierto(!crearAbierto)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {crearAbierto ? 'Cerrar creación' : 'Crear nuevo'}
          </button>
        </div>

        <AnimatePresence>
          {crearAbierto && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 space-y-3 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Nuevo elemento del catálogo</p>
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className={inputClass}
                    placeholder="Nombre del elemento"
                  />
                </div>
                <div>
                  <label className={labelClass}>{tipoLabel}</label>
                  <input
                    value={form.tipo || form.categoria || ''}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value, categoria: e.target.value })}
                    className={inputClass}
                    placeholder={ejemploTipo}
                  />
                </div>
                <div>
                  <label className={labelClass}>Descripción</label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    rows={2}
                    className={`${inputClass} resize-none`}
                    placeholder="Descripción breve"
                  />
                </div>
                <div>
                  <label className={labelClass}>Imagen</label>
                  <ImageUploader value={form.imagen} onChange={(v) => setForm({ ...form, imagen: v })} />
                </div>
                <button
                  onClick={crearEnCatalogo}
                  disabled={cargando}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Guardar en catálogo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {disponibles.length === 0 ? (
          <p className="text-sm text-dark-400">No hay elementos disponibles para asignar.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {disponibles.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-dark-100 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-800 truncate">{item.nombre}</p>
                  <p className="text-xs text-dark-400 truncate">
                    {item.categoria || item.tipo || '—'}
                  </p>
                </div>
                <button
                  onClick={() => assign(item.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-ocean-50 text-ocean-700 hover:bg-ocean-100 transition-colors cursor-pointer shrink-0"
                  title="Asignar a este destino"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Asignar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoViajeForm({ form, setForm, guardar, cargando }) {
  const textFields = [
    { key: 'transporte', label: 'Transporte' },
    { key: 'alimentacion', label: 'Alimentación' },
    { key: 'alojamiento', label: 'Alojamiento' },
    { key: 'actividades', label: 'Actividades' },
    { key: 'otros_gastos', label: 'Otros gastos' },
    { key: 'recomendaciones', label: 'Recomendaciones' },
    { key: 'mejor_epoca', label: 'Mejor época' },
    { key: 'como_llegar', label: 'Cómo llegar' },
  ]
  const costFields = [
    { key: 'costo_transporte', label: 'Transporte' },
    { key: 'costo_alimentacion', label: 'Alimentación' },
    { key: 'costo_alojamiento', label: 'Alojamiento' },
    { key: 'costo_actividades', label: 'Actividades' },
    { key: 'costo_otros', label: 'Otros' },
  ]

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Duración recomendada</label>
          <input value={form.duracion_recomendada || ''} onChange={set('duracion_recomendada')} className={inputClass} placeholder="ej. 2-3 días" />
        </div>
        <div>
          <label className={labelClass}>Moneda</label>
          <select value={form.moneda || 'COP'} onChange={set('moneda')} className={inputClass}>
            {MONEDAS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {textFields.map((f) => (
          <div key={f.key}>
            <label className={labelClass}>{f.label}</label>
            <textarea
              value={form[f.key] || ''}
              onChange={set(f.key)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-dark-400 mb-2">
          Costo estimado por viaje (por tu cuenta) · {form.moneda || 'COP'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {costFields.map((f) => (
            <div key={f.key}>
              <label className={labelClass}>{f.label}</label>
              <input
                type="number"
                min="0"
                step="100"
                value={form[f.key] ?? ''}
                onChange={set(f.key)}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={guardar}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar información
        </button>
      </div>
    </div>
  )
}