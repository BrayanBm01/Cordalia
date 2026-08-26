import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { Users, MapPin, CheckCircle, XCircle, Activity } from 'lucide-react'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'

const statCards = [
  { key: 'totalUsuarios', label: 'Total Usuarios', icon: Users, iconColor: 'text-ocean-600', iconBg: 'bg-ocean-100' },
  { key: 'totalDestinos', label: 'Total Destinos', icon: MapPin, iconColor: 'text-primary-600', iconBg: 'bg-primary-100' },
  { key: 'loginsExitosos', label: 'Logins Exitosos', icon: CheckCircle, iconColor: 'text-primary-600', iconBg: 'bg-primary-100' },
  { key: 'loginsFallidos', label: 'Logins Fallidos', icon: XCircle, iconColor: 'text-red-600', iconBg: 'bg-red-100' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await adminAPI.stats()
        setStats(res.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
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

  const chartData = [
    { name: 'Exitosos', cantidad: stats?.loginsExitosos || 0 },
    { name: 'Fallidos', cantidad: stats?.loginsFallidos || 0 },
  ]

  const CHART_COLORS = ['#10b981', '#ef4444']

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-2xl font-bold text-dark-900">Dashboard</h1>
        <p className="text-dark-500 mt-1">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.07 }}
              className="bg-white rounded-xl border border-dark-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-dark-900">{stats?.[card.key] ?? 0}</p>
                <p className="text-sm text-dark-500">{card.label}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="bg-white rounded-xl border border-dark-200 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-dark-400" />
          <h2 className="text-lg font-semibold text-dark-800">Actividad de Login</h2>
        </div>
        {stats?.loginsExitosos === 0 && stats?.loginsFallidos === 0 ? (
          <p className="text-dark-400 text-center py-10">No hay datos de login aún</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Legend />
              <Bar dataKey="cantidad" name="Inicios de sesión" radius={[6, 6, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </motion.div>
  )
}
