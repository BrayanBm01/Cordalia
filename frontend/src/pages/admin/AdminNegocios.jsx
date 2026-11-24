import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Store,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  adminNegociosAPI,
  businessesAPI,
  lugaresAPI,
} from '../../services/api'
import {
  ESTADO_BADGE,
  ESTADO_LABEL,
  PUBLICACION_BADGE,
  PUBLICACION_LABEL,
} from '../negocios/businessUtils'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import SearchInput from '../../components/SearchInput'
import { rutaCon } from '../../routes/offuscatedRoutes.js'
import AdminNegocioForm from './AdminNegocioForm'

const ESTADOS = ['draft', 'pending', 'approved', 'rejected', 'suspended', 'inactive']
const PUBLICACIONES = ['visible', 'oculto_admin', 'oculto_suscripcion']
const FILTROS_INICIALES = {
  search: '',
  estado: '',
  publicacion_estado: '',
  archivados: 'no',
}

const botonAccion =
  'inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer'

/** Diálogo accesible y reutilizable para formulario, detalle y confirmación. */
function Dialog({ title, onClose, children, ancho = 'max-w-4xl' }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6">
      <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${ancho} my-auto bg-white rounded-2xl shadow-2xl border border-dark-100`}
      >
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-dark-100">
          <h2 className="text-lg font-semibold text-dark-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-dark-400 hover:text-dark-700 hover:bg-dark-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5 max-h-[calc(100vh-9rem)] overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  )
}

function CampoDetalle({ label, valor }) {
  return (
    <div>
      <dt className="text-xs font-medium text-dark-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-dark-800 break-words">{valor || '—'}</dd>
    </div>
  )
}

export default function AdminNegocios() {
  const [negocios, setNegocios] = useState([])
  const [lugares, setLugares] = useState([])
  const [categorias, setCategorias] = useState([])
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [loading, setLoading] = useState(true)
  const [accionId, setAccionId] = useState(null)
  const [formModal, setFormModal] = useState(null) // { negocio }
  const [detalle, setDetalle] = useState(null) // { cargando, data }
  const [confirmacion, setConfirmacion] = useState(null) // { tipo, negocio, relaciones }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminNegociosAPI.list(filtros)
      setNegocios(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      toast.error(err.message || 'Error al cargar negocios')
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => {
    const temporizador = setTimeout(cargar, filtros.search ? 250 : 0)
    return () => clearTimeout(temporizador)
  }, [cargar, filtros.search])

  useEffect(() => {
    lugaresAPI.getAll().then((r) => setLugares(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    businessesAPI
      .categories()
      .then((r) => setCategorias((Array.isArray(r.data) ? r.data : []).filter((c) => c.activo !== false)))
      .catch(() => {})
  }, [])

  function actualizarFiltro(clave, valor) {
    setFiltros((actual) => ({ ...actual, [clave]: valor }))
  }

  async function cambiarEstado(negocio, datos, mensaje) {
    setAccionId(negocio.id)
    try {
      const res = await adminNegociosAPI.setEstado(negocio.id, datos)
      toast.success(res.message || mensaje)
      await cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar el estado')
    } finally {
      setAccionId(null)
    }
  }

  async function cambiarDestino(negocio, destinationId) {
    setAccionId(negocio.id)
    try {
      const res = await businessesAPI.destinos.set(
        negocio.id,
        destinationId === '' ? null : Number(destinationId)
      )
      toast.success(res.message || 'Destino actualizado')
      await cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo asociar el destino')
    } finally {
      setAccionId(null)
    }
  }

  async function abrirDetalle(negocio) {
    setDetalle({ cargando: true, data: null })
    try {
      const res = await adminNegociosAPI.getById(negocio.id)
      setDetalle({ cargando: false, data: res.data })
    } catch (err) {
      setDetalle(null)
      toast.error(err.message || 'No se pudo cargar el detalle')
    }
  }

  async function abrirEdicion(negocio) {
    try {
      const res = await adminNegociosAPI.getById(negocio.id)
      setFormModal({ negocio: res.data })
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar el negocio')
    }
  }

  async function abrirEliminacion(negocio) {
    setConfirmacion({ tipo: 'eliminar', negocio, relaciones: null, cargando: true })
    try {
      const res = await adminNegociosAPI.getById(negocio.id)
      setConfirmacion({
        tipo: 'eliminar',
        negocio,
        relaciones: res.data?.relaciones || null,
        cargando: false,
      })
    } catch (err) {
      setConfirmacion({ tipo: 'eliminar', negocio, relaciones: null, cargando: false })
      toast.error(err.message || 'No se pudo consultar las relaciones')
    }
  }

  async function confirmarAccion() {
    if (!confirmacion) return
    const { tipo, negocio } = confirmacion
    setAccionId(negocio.id)
    try {
      if (tipo === 'eliminar') {
        const res = await adminNegociosAPI.remove(negocio.id, 'Eliminado desde el panel administrativo')
        toast.success(res.message || 'Negocio eliminado')
      } else {
        const res = await adminNegociosAPI.restore(negocio.id)
        toast.success(res.message || 'Negocio restaurado')
      }
      setConfirmacion(null)
      await cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo completar la acción')
    } finally {
      setAccionId(null)
    }
  }

  const hayFiltros = Object.entries(filtros).some(([k, v]) => v !== FILTROS_INICIALES[k])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Negocios</h1>
          <p className="text-dark-500 mt-1">
            Crea, edita, aprueba, oculta y elimina negocios de la plataforma. Las eliminaciones se archivan conservando el historial.
          </p>
        </div>
        <button
          onClick={() => setFormModal({ negocio: null })}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo negocio
        </button>
      </div>

      <div className="bg-white rounded-xl border border-dark-200 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <SearchInput
          value={filtros.search}
          onChange={(v) => actualizarFiltro('search', v)}
          placeholder="Buscar por negocio, categoría, dueño o destino..."
          className="w-full lg:max-w-sm"
        />
        <select
          aria-label="Filtrar por moderación"
          value={filtros.estado}
          onChange={(e) => actualizarFiltro('estado', e.target.value)}
          className="w-full lg:w-auto px-3 py-2.5 rounded-lg border border-dark-200 text-sm bg-white text-dark-700"
        >
          <option value="">Todas las moderaciones</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
        <select
          aria-label="Filtrar por publicación"
          value={filtros.publicacion_estado}
          onChange={(e) => actualizarFiltro('publicacion_estado', e.target.value)}
          className="w-full lg:w-auto px-3 py-2.5 rounded-lg border border-dark-200 text-sm bg-white text-dark-700"
        >
          <option value="">Todas las publicaciones</option>
          {PUBLICACIONES.map((p) => <option key={p} value={p}>{PUBLICACION_LABEL[p]}</option>)}
        </select>
        <select
          aria-label="Filtrar archivados"
          value={filtros.archivados}
          onChange={(e) => actualizarFiltro('archivados', e.target.value)}
          className="w-full lg:w-auto px-3 py-2.5 rounded-lg border border-dark-200 text-sm bg-white text-dark-700"
        >
          <option value="no">Vigentes</option>
          <option value="solo">Archivados</option>
          <option value="todos">Todos</option>
        </select>
        {hayFiltros && (
          <button
            onClick={() => setFiltros(FILTROS_INICIALES)}
            className="text-sm text-primary-700 hover:underline whitespace-nowrap"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {loading && negocios.length === 0 ? (
        <LoadingSpinner />
      ) : negocios.length === 0 ? (
        <div className="bg-white rounded-xl border border-dark-200">
          <EmptyState
            icon={Store}
            title={hayFiltros ? 'Sin resultados' : 'No hay negocios'}
            description={
              hayFiltros
                ? 'Prueba con otros filtros o crea un negocio nuevo.'
                : 'Los negocios creados por vendedores y por el administrador aparecerán aquí.'
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dark-200 overflow-hidden">
          {loading && <div className="h-1 bg-primary-100 animate-pulse" />}
          <div className="overflow-x-auto">
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-sm min-w-[980px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-dark-100 bg-dark-50">
                    <th className="text-left px-4 py-3 font-medium text-dark-500">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-500">Negocio</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-500">Categoría / destino</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-500">Propietario</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-500">Moderación</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-500">Publicación</th>
                    <th className="text-right px-4 py-3 font-medium text-dark-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {negocios.map((n) => {
                    const archivado = Boolean(n.eliminado_at)
                    const ocupado = accionId === n.id
                    return (
                      <tr key={n.id} className={archivado ? 'bg-dark-50/60 opacity-75' : 'hover:bg-dark-50/40'}>
                        <td className="px-4 py-3.5 text-dark-500 font-mono text-xs">{n.id}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-dark-800">{n.nombre}</div>
                          {archivado && <span className="text-xs text-red-600">Archivado</span>}
                          <Link
                            to={rutaCon('NEGOCIOS_PUBLICOS', n.id)}
                            className="text-xs text-primary-700 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver ficha pública ↗
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-dark-600">
                          <div>{n.categoria || '—'}</div>
                          {!archivado ? (
                            <select
                              aria-label={`Asociar destino a ${n.nombre}`}
                              value={n.destination_id ? String(n.destination_id) : ''}
                              onChange={(e) => cambiarDestino(n, e.target.value)}
                              disabled={ocupado}
                              className="mt-1.5 block w-full max-w-[170px] px-2 py-1 rounded-lg border border-dark-200 text-xs bg-white text-dark-700"
                            >
                              <option value="">Sin destino</option>
                              {lugares.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                            </select>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-dark-400 mt-1">
                              <MapPin className="w-3 h-3" /> {n.destino || 'Sin destino'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-dark-600">
                          {n.owner_nombre || (n.owner_id ? `#${n.owner_id}` : 'Plataforma (ADMIN)')}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE[n.estado] || 'bg-dark-100 text-dark-600'}`}>
                            {ESTADO_LABEL[n.estado] || n.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${PUBLICACION_BADGE[n.publicacion_estado] || 'bg-dark-100 text-dark-600'}`}>
                            {PUBLICACION_LABEL[n.publicacion_estado] || n.publicacion_estado}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {ocupado && <Loader2 className="w-4 h-4 animate-spin text-primary-600" />}
                            <button onClick={() => abrirDetalle(n)} className={`${botonAccion} text-dark-500 hover:bg-dark-100`} title="Ver detalles">
                              <Eye className="w-3.5 h-3.5" /> Detalles
                            </button>
                            <button onClick={() => abrirEdicion(n)} className={`${botonAccion} text-primary-700 hover:bg-primary-50`} title="Editar negocio">
                              <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                            {!archivado ? (
                              <>
                                <button
                                  onClick={() => cambiarEstado(n, { estado: 'approved', publicacion_estado: 'visible' }, `${n.nombre} aprobado y publicado`)}
                                  disabled={ocupado || n.estado === 'approved'}
                                  className={`${botonAccion} text-emerald-600 hover:bg-emerald-50`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                                </button>
                                <button
                                  onClick={() => cambiarEstado(n, { estado: 'rejected', publicacion_estado: 'oculto_admin' }, `${n.nombre} rechazado`)}
                                  disabled={ocupado || n.estado === 'rejected'}
                                  className={`${botonAccion} text-red-600 hover:bg-red-50`}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Rechazar
                                </button>
                                {n.publicacion_estado === 'visible' ? (
                                  <button
                                    onClick={() => cambiarEstado(n, { publicacion_estado: 'oculto_admin' }, `${n.nombre} oculto`)}
                                    disabled={ocupado}
                                    className={`${botonAccion} text-amber-600 hover:bg-amber-50`}
                                  >
                                    <EyeOff className="w-3.5 h-3.5" /> Ocultar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => cambiarEstado(n, { publicacion_estado: 'visible' }, `${n.nombre} publicado`)}
                                    disabled={ocupado}
                                    className={`${botonAccion} text-emerald-600 hover:bg-emerald-50`}
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Publicar
                                  </button>
                                )}
                                <button
                                  onClick={() => abrirEliminacion(n)}
                                  disabled={ocupado}
                                  className={`${botonAccion} text-red-600 hover:bg-red-50`}
                                  title="Eliminar negocio"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmacion({ tipo: 'restaurar', negocio: n, relaciones: null, cargando: false })}
                                disabled={ocupado}
                                className={`${botonAccion} text-emerald-600 hover:bg-emerald-50`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {formModal && (
        <Dialog
          title={formModal.negocio ? `Editar: ${formModal.negocio.nombre}` : 'Nuevo negocio (plataforma)'}
          onClose={() => setFormModal(null)}
        >
          {!formModal.negocio && (
            <p className="mb-5 text-sm text-dark-500 bg-dark-50 border border-dark-100 rounded-lg p-3">
              El negocio se crea sin vendedor propietario, aprobado y visible. Puedes ajustar la moderación y la publicación en el formulario.
            </p>
          )}
          <AdminNegocioForm
            negocio={formModal.negocio}
            categorias={categorias}
            lugares={lugares}
            onCancelar={() => setFormModal(null)}
            onGuardado={async () => {
              setFormModal(null)
              await cargar()
            }}
          />
        </Dialog>
      )}

      {detalle && (
        <Dialog title="Detalle del negocio" onClose={() => setDetalle(null)} ancho="max-w-3xl">
          {detalle.cargando || !detalle.data ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CampoDetalle label="ID" valor={detalle.data.id} />
                <CampoDetalle label="Nombre" valor={detalle.data.nombre} />
                <CampoDetalle label="Categoría" valor={detalle.data.categoria} />
                <CampoDetalle label="Destino" valor={detalle.data.destino} />
                <CampoDetalle label="Propietario" valor={detalle.data.owner_nombre || (detalle.data.owner_id ? `#${detalle.data.owner_id}` : 'Plataforma (creado por ADMIN)')} />
                <CampoDetalle label="Correo del propietario" valor={detalle.data.owner_email} />
                <CampoDetalle label="Dirección" valor={detalle.data.direccion} />
                <CampoDetalle label="Teléfono / WhatsApp" valor={[detalle.data.telefono, detalle.data.whatsapp].filter(Boolean).join(' / ')} />
                <CampoDetalle label="Correo de contacto" valor={detalle.data.email_contacto} />
                <CampoDetalle label="Sitio web" valor={detalle.data.website} />
                <CampoDetalle label="Moneda y precios" valor={`${detalle.data.moneda || ''} ${detalle.data.precio_min ?? ''} – ${detalle.data.precio_max ?? ''}`} />
                <CampoDetalle label="Moderación" valor={ESTADO_LABEL[detalle.data.estado] || detalle.data.estado} />
                <CampoDetalle label="Publicación" valor={PUBLICACION_LABEL[detalle.data.publicacion_estado] || detalle.data.publicacion_estado} />
                <CampoDetalle label="Registrado" valor={detalle.data.created_at ? new Date(detailFecha(detalle.data.created_at)).toLocaleString('es-CO') : null} />
                {detalle.data.eliminado_at && (
                  <CampoDetalle label="Archivado" valor={new Date(detailFecha(detalle.data.eliminado_at)).toLocaleString('es-CO')} />
                )}
              </dl>
              {detalle.data.descripcion && (
                <div>
                  <dt className="text-xs font-medium text-dark-400 uppercase tracking-wide">Descripción</dt>
                  <dd className="mt-1 text-sm text-dark-700 whitespace-pre-wrap">{detalle.data.descripcion}</dd>
                </div>
              )}
              {detalle.data.relaciones && (
                <div className="bg-dark-50 border border-dark-100 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-dark-800 mb-2">Relaciones conservadas</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <span>Reseñas: <strong>{detalle.data.relaciones.resenas ?? 0}</strong></span>
                    <span>Fotos: <strong>{detalle.data.relaciones.imagenes ?? 0}</strong></span>
                    <span>Favoritos: <strong>{detalle.data.relaciones.favoritos ?? 0}</strong></span>
                    <span>Suscripciones: <strong>{detalle.data.relaciones.suscripciones ?? 0}</strong></span>
                    <span>Pagos: <strong>{detalle.data.relaciones.pagos ?? 0}</strong></span>
                    <span>Planes: <strong>{detalle.data.relaciones.planes ?? 0}</strong></span>
                    <span>Inscripciones: <strong>{detalle.data.relaciones.inscripciones ?? 0}</strong></span>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Link
                  to={rutaCon('NEGOCIOS_PUBLICOS', detalle.data.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dark-200 text-sm font-medium text-dark-700 hover:bg-dark-50"
                >
                  <Eye className="w-4 h-4" /> Ver ficha pública
                </Link>
              </div>
            </div>
          )}
        </Dialog>
      )}

      {confirmacion && (
        <Dialog
          title={confirmacion.tipo === 'eliminar' ? 'Confirmar eliminación' : 'Confirmar restauración'}
          onClose={() => setConfirmacion(null)}
          ancho="max-w-lg"
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${confirmacion.tipo === 'eliminar' ? 'bg-red-100' : 'bg-emerald-100'}`}>
              {confirmacion.tipo === 'eliminar'
                ? <Trash2 className="w-5 h-5 text-red-600" />
                : <RotateCcw className="w-5 h-5 text-emerald-600" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-dark-700">
                {confirmacion.tipo === 'eliminar' ? (
                  <>Vas a eliminar <strong className="text-dark-900">{confirmacion.negocio.nombre}</strong>. El negocio dejará de verse en las páginas públicas.</>
                ) : (
                  <>Vas a restaurar <strong className="text-dark-900">{confirmacion.negocio.nombre}</strong>. Volverá a las consultas administrativas con su estado de moderación original.</>
                )}
              </p>
              {confirmacion.tipo === 'eliminar' && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {confirmacion.cargando ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Consultando relaciones...</span>
                  ) : confirmacion.relaciones ? (
                    <>
                      <p className="font-medium">Se conservarán todas sus relaciones:</p>
                      <p className="mt-1 text-xs">
                        {confirmacion.relaciones.resenas ?? 0} reseñas, {confirmacion.relaciones.imagenes ?? 0} fotos,{' '}
                        {confirmacion.relaciones.favoritos ?? 0} favoritos, {confirmacion.relaciones.suscripciones ?? 0} suscripciones,{' '}
                        {confirmacion.relaciones.pagos ?? 0} pagos, {confirmacion.relaciones.planes ?? 0} planes y{' '}
                        {confirmacion.relaciones.inscripciones ?? 0} inscripciones. No se borrará información financiera ni de auditoría.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs">No se pudieron consultar las relaciones, pero el archivado no destruye ningún dato.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-dark-100">
            <button
              onClick={() => setConfirmacion(null)}
              className="px-4 py-2.5 rounded-lg border border-dark-200 text-sm font-medium text-dark-700 hover:bg-dark-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarAccion}
              disabled={accionId === confirmacion.negocio.id}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${confirmacion.tipo === 'eliminar' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {accionId === confirmacion.negocio.id && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmacion.tipo === 'eliminar' ? 'Eliminar y archivar' : 'Restaurar'}
            </button>
          </div>
        </Dialog>
      )}
    </motion.div>
  )
}

// Las fechas de PostgreSQL llegan como "2026-11-24 14:03:00+00"; reemplazar
// el espacio por "T" las hace interpretables por Date en todos los navegadores.
function detailFecha(valor) {
  return String(valor).replace(' ', 'T')
}
