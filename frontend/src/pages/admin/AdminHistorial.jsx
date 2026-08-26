import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { History } from 'lucide-react'
import { adminAPI } from '../../services/api'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

export default function AdminHistorial() {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistorial() {
      try {
        const res = await adminAPI.loginHistory()
        setHistorial(res.data)
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchHistorial()
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-dark-900">Historial de Login</h1>
        <p className="text-dark-500 mt-1">Registro de intentos de acceso al sistema</p>
      </div>

      {historial.length === 0 ? (
        <EmptyState
          title="Sin registros"
          description="Aún no hay intentos de login registrados."
          icon={History}
        />
      ) : (
        <div className="bg-white rounded-xl border border-dark-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-100 bg-dark-50/60">
                  <th className="text-left px-5 py-3 font-medium text-dark-500">Usuario</th>
                  <th className="text-left px-5 py-3 font-medium text-dark-500">Email</th>
                  <th className="text-left px-5 py-3 font-medium text-dark-500">Estado</th>
                  <th className="text-left px-5 py-3 font-medium text-dark-500">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {historial.map((entry, i) => (
                  <tr key={entry.id || i} className="hover:bg-dark-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-dark-800">
                      {entry.usuario || entry.nombre || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-dark-600">
                      {entry.email || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        entry.exito
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {entry.exito ? 'Exitoso' : 'Fallido'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-dark-500">
                      {entry.fecha
                        ? format(new Date(entry.fecha), "dd/MM/yyyy HH:mm", { locale: es })
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
  )
}
