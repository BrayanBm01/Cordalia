import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from 'recharts'
import {
  Users, MapPin, Store, MessageSquare, Heart, Clock, CheckCircle, XCircle,
  Activity, History, Ticket, Sparkles, BadgePercent, Zap, Ban, CalendarX,
  CalendarClock, PauseCircle,
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import PieChartCard from '../../components/PieChartCard'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const statCards = [
  // General
  { group: 'General', key: 'totalUsuarios', label: 'Total Usuarios', icon: Users, iconColor: 'text-ocean-600', iconBg: 'bg-ocean-100' },
  { group: 'General', key: 'totalDestinos', label: 'Total Destinos', icon: MapPin, iconColor: 'text-primary-600', iconBg: 'bg-primary-100' },
  { group: 'General', key: 'totalNegocios', label: 'Total Negocios', icon: Store, iconColor: 'text-sand-600', iconBg: 'bg-sand-100' },
  { group: 'General', key: 'negociosPendientes', label: 'Negocios Pendientes', icon: Clock, iconColor: 'text-sand-700', iconBg: 'bg-sand-50' },
  { group: 'General', key: 'totalResenas', label: 'Total Reseñas', icon: MessageSquare, iconColor: 'text-ocean-600', iconBg: 'bg-ocean-100' },
  { group: 'General', key: 'totalFavoritos', label: 'Total Favoritos', icon: Heart, iconColor: 'text-red-500', iconBg: 'bg-red-50' },
  // Planes
  { group: 'Planes', key: 'totalPlanes', label: 'Total Planes', icon: Ticket, iconColor: 'text-primary-600', iconBg: 'bg-primary-100' },
  { group: 'Planes', key: 'planesActivos', label: 'Planes Activos', icon: Sparkles, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  { group: 'Planes', key: 'planesInactivos', label: 'Planes Inactivos', icon: Ban, iconColor: 'text-slate-600', iconBg: 'bg-slate-100' },
  // Promociones
  { group: 'Promociones', key: 'totalPromos', label: 'Total Promociones', icon: BadgePercent, iconColor: 'text-amber-600', iconBg: 'bg-amber-100' },
  { group: 'Promociones', key: 'promosVigentes', label: 'Promo Vigentes', icon: Zap, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  { group: 'Promociones', key: 'promosProximas', label: 'Promo Próximas', icon: CalendarClock, iconColor: 'text-ocean-600', iconBg: 'bg-ocean-100' },
  { group: 'Promociones', key: 'promosVencidas', label: 'Promo Vencidas', icon: CalendarX, iconColor: 'text-red-500', iconBg: 'bg-red-50' },
  { group: 'Promociones', key: 'promosInactivas', label: 'Promo Inactivas', icon: PauseCircle, iconColor: 'text-slate-600', iconBg: 'bg-slate-100' },
  // Sesiones
  { group: 'Sesiones', key: 'loginsExitosos', label: 'Logins Exitosos', icon: CheckCircle, iconColor: 'text-primary-600', iconBg: 'bg-primary-100' },
  { group: 'Sesiones', key: 'loginsFallidos', label: 'Logins Fallidos', icon: XCircle, iconColor: 'text-red-500', iconBg: 'bg-red-100' },
]

const ESTADO_LABEL = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
  activo: 'Activo',
  inactivo: 'Inactivo',
}

const TIPO_PLAN_LABEL = {
  plan: 'Planes',
  paquete: 'Paquetes',
  experiencia: 'Experiencias',
}

const ROL_LABEL = {
  ADMIN: 'Administradores',
  TOURIST: 'Turistas',
  BUSINESS: 'Propietarios',
}

const RATING_LABEL = {
  1: '1 estrella',
  2: '2 estrellas',
  3: '3 estrellas',
  4: '4 estrellas',
  5: '5 estrellas',
}

const PALETTE = ['#10b981', '#3b9af6', '#eab308', '#a855f7', '#ef4444', '#f97316', '#059669']

function ChartCard({ icon: Icon, title, children, hint }) {
  return (
    <div className="bg-white rounded-xl border border-dark-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-dark-400" />
        <h2 className="text-base font-semibold text-dark-800">{title}</h2>
      </div>
      {hint ? (
        <p className="text-dark-400 text-center py-10">{hint}</p>
      ) : (
        children
      )}
    </div>
  )
}

function tooltipStyle() {
  return {
    contentStyle: {
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
      fontSize: '13px',
    },
    cursor: { fill: '#f1f5f9' },
  }
}

function calcYAxisWidth(data, minWidth = 100, maxWidth = 160) {
  if (!data || data.length === 0) return minWidth
  const maxLen = Math.max(...data.map((d) => (d.name ? String(d.name).length : 0)))
  return Math.min(maxWidth, Math.max(minWidth, Math.round(maxLen * 7.5 + 16)))
}

function calcBarChartHeight(data, minHeight = 260, maxHeight = 420) {
  if (!data || data.length === 0) return minHeight
  return Math.min(maxHeight, Math.max(minHeight, data.length * 36 + 60))
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [s, h] = await Promise.all([adminAPI.stats(), adminAPI.loginHistory()])
        setStats(s.data)
        setHistorial(Array.isArray(h.data) ? h.data.slice(0, 20) : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-dark-600 text-lg">Error al cargar estadísticas</p>
        <p className="text-dark-400 text-sm mt-1">{error}</p>
      </div>
    )
  }

  const negociosPorEstado = (stats?.negociosPorEstado || []).map((r) => ({
    name: ESTADO_LABEL[r.estado] || r.estado,
    cantidad: r.cantidad,
  }))

  const usuariosPorRol = (stats?.usuariosPorRol || []).map((r) => ({
    name: ROL_LABEL[r.rol] || r.rol,
    cantidad: r.cantidad,
  }))

  const resenasPorValoracion = (stats?.resenasPorValoracion || []).map((r) => ({
    name: RATING_LABEL[r.rating] || `${r.rating} estrellas`,
    cantidad: r.cantidad,
  }))

  const negociosPorCategoria = (stats?.negociosPorCategoria || []).map((r) => ({
    name: r.categoria,
    cantidad: r.cantidad,
  }))

  const negociosPorDestino = (stats?.negociosPorDestino || []).map((r) => ({
    name: r.destino,
    cantidad: r.cantidad,
  }))

  const favoritosPorTipo = [
    { name: 'Destinos', cantidad: stats?.favoritosDestinos || 0 },
    { name: 'Negocios', cantidad: stats?.favoritosNegocios || 0 },
  ].filter((r) => r.cantidad > 0)

  const planesPorTipo = (stats?.planesPorTipo || []).map((r) => ({
    name: TIPO_PLAN_LABEL[r.tipo_plan] || r.tipo_plan,
    cantidad: r.cantidad,
  }))

  const planesPorEstado = (stats?.planesPorEstado || []).map((r) => ({
    name: ESTADO_LABEL[r.estado] || r.estado,
    cantidad: r.cantidad,
  }))

  const planesPorDuracion = (stats?.planesPorDuracion || []).map((r) => ({
    name: r.duracion,
    cantidad: r.cantidad,
  }))

  const planesPorDestino = (stats?.planesPorDestino || []).map((r) => ({
    name: r.destino,
    cantidad: r.cantidad,
  }))

  const promosPorVigencia = (stats?.promosPorVigencia || []).map((r) => ({
    name: r.name,
    cantidad: r.cantidad,
  }))

  const loginData = [
    { name: 'Exitosos', cantidad: stats?.loginsExitosos || 0 },
    { name: 'Fallidos', cantidad: stats?.loginsFallidos || 0 },
  ]

  const hasLoginData = loginData.some((r) => r.cantidad > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-2xl font-bold text-dark-900">Dashboard</h1>
        <p className="text-dark-500 mt-1">Resumen general del sistema con datos reales</p>
      </div>

      <div className="space-y-8">
        {Array.from(new Set(statCards.map((c) => c.group))).map((group) => (
          <div key={group}>
            <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wide mb-3">
              {group}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {statCards.filter((c) => c.group === group).map((card, i) => {
                const Icon = card.icon
                return (
                  <motion.div
                    key={card.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="bg-white rounded-xl border border-dark-200 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow min-w-0"
                  >
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${card.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-dark-900 truncate">{stats?.[card.key] ?? 0}</p>
                      <p className="text-xs sm:text-sm text-dark-500 truncate">{card.label}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard icon={Activity} title="Actividad de Login" hint={!hasLoginData ? 'No hay datos de login aún' : undefined}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={loginData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle()} />
              <Legend />
              <Bar dataKey="cantidad" name="Intentos de login" radius={[6, 6, 0, 0]}>
                {loginData.map((_, index) => (
                  <Cell key={index} fill={index === 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={Store} title="Negocios por Estado" hint={negociosPorEstado.length === 0 ? 'No hay negocios registrados' : undefined}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={negociosPorEstado} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle()} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="cantidad" name="Negocios" radius={[6, 6, 0, 0]}>
                {negociosPorEstado.map((_, index) => (
                  <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={Users} title="Usuarios por Rol" hint={usuariosPorRol.length === 0 ? 'No hay usuarios registrados' : undefined}>
          <PieChartCard data={usuariosPorRol} />
        </ChartCard>

        <ChartCard icon={Heart} title="Favoritos por Tipo" hint={favoritosPorTipo.length === 0 ? 'No hay favoritos aún' : undefined}>
          <PieChartCard data={favoritosPorTipo} palette={['#10b981', '#ef4444']} />
        </ChartCard>

        <ChartCard icon={MessageSquare} title="Reseñas por Valoración" hint={resenasPorValoracion.length === 0 ? 'No hay reseñas aún' : undefined}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={resenasPorValoracion} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle()} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="cantidad" name="Reseñas" radius={[6, 6, 0, 0]}>
                {resenasPorValoracion.map((_, index) => (
                  <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={Store} title="Negocios por Categoría" hint={negociosPorCategoria.length === 0 ? 'No hay categorías asignadas' : undefined}>
          <ResponsiveContainer width="100%" height={calcBarChartHeight(negociosPorCategoria)}>
            <BarChart data={negociosPorCategoria} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={calcYAxisWidth(negociosPorCategoria)}
              />
              <Tooltip {...tooltipStyle()} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="cantidad" name="Negocios" radius={[0, 6, 6, 0]}>
                {negociosPorCategoria.map((_, index) => (
                  <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={MapPin} title="Negocios por Destino" hint={negociosPorDestino.length === 0 ? 'No hay negocios asociados a destinos' : undefined}>
          <ResponsiveContainer width="100%" height={calcBarChartHeight(negociosPorDestino)}>
            <BarChart data={negociosPorDestino} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={calcYAxisWidth(negociosPorDestino)}
              />
              <Tooltip {...tooltipStyle()} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="cantidad" name="Negocios" radius={[0, 6, 6, 0]}>
                {negociosPorDestino.map((_, index) => (
                  <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={Ticket} title="Planes por Tipo" hint={planesPorTipo.length === 0 ? 'No hay planes registrados' : undefined}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={planesPorTipo} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle()} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="cantidad" name="Planes" radius={[6, 6, 0, 0]}>
                {planesPorTipo.map((_, index) => (
                  <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={Sparkles} title="Planes por Estado" hint={planesPorEstado.length === 0 ? 'No hay planes registrados' : undefined}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={planesPorEstado} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle()} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="cantidad" name="Planes" radius={[6, 6, 0, 0]}>
                {planesPorEstado.map((_, index) => (
                  <Cell key={index} fill={index === 0 ? '#10b981' : '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={Clock} title="Planes por Duración" hint={planesPorDuracion.length === 0 ? 'No hay planes registrados' : undefined}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={planesPorDuracion} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle()} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="cantidad" name="Planes" radius={[6, 6, 0, 0]}>
                {planesPorDuracion.map((_, index) => (
                  <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={MapPin} title="Planes por Destino" hint={planesPorDestino.length === 0 ? 'No hay planes con destino' : undefined}>
          <ResponsiveContainer width="100%" height={calcBarChartHeight(planesPorDestino)}>
            <BarChart data={planesPorDestino} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={calcYAxisWidth(planesPorDestino)}
              />
              <Tooltip {...tooltipStyle()} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="cantidad" name="Planes" radius={[0, 6, 6, 0]}>
                {planesPorDestino.map((_, index) => (
                  <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={BadgePercent} title="Promociones por Vigencia" hint={promosPorVigencia.length === 0 ? 'No hay promociones aún' : undefined}>
          <PieChartCard data={promosPorVigencia} palette={['#10b981', '#3b9af6', '#ef4444', '#94a3b8']} />
        </ChartCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="bg-white rounded-xl border border-dark-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-dark-100 flex items-center gap-2">
          <History className="w-5 h-5 text-dark-400" />
          <h2 className="text-lg font-semibold text-dark-800">Actividad reciente</h2>
          <span className="ml-auto text-sm text-dark-400">Últimos intentos de acceso</span>
        </div>

        {historial.length === 0 ? (
          <p className="text-dark-400 text-center py-10">No hay intentos de login registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-dark-100 bg-dark-50">
                    <th className="text-left px-6 py-3 font-medium text-dark-500">Usuario</th>
                    <th className="text-left px-6 py-3 font-medium text-dark-500">Email</th>
                    <th className="text-left px-6 py-3 font-medium text-dark-500">Estado</th>
                    <th className="text-left px-6 py-3 font-medium text-dark-500">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {historial.map((entry, i) => (
                    <tr key={entry.id || i} className="hover:bg-dark-50/40 transition-colors">
                      <td className="px-6 py-3 font-medium text-dark-800">
                        {entry.usuario || entry.nombre || '—'}
                      </td>
                      <td className="px-6 py-3 text-dark-600">{entry.email || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          entry.exito ? 'bg-primary-100 text-primary-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.exito ? 'Exitoso' : 'Fallido'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-dark-500">
                        {entry.fecha
                          ? format(new Date(entry.fecha), 'dd/MM/yyyy HH:mm', { locale: es })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}