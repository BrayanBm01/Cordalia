import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { History } from 'lucide-react'
import { adminAPI } from '../../services/api'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import SearchInput from '../../components/SearchInput'
import { toast } from 'sonner'

export default function AdminHistorial() {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  const term = search.trim().toLowerCase()
  const filtrados = term
    ? historial.filter((h) =>
        [h.usuario, h.nombre, h.email, h.exito ? 'exitoso' : 'fallido', h.fecha].some((v) =>
          String(v || '').toLowerCase().includes(term)
        )
      )
    : historial

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

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por usuario, email, estado o fecha..."
        className="w-full sm:max-w-sm"
      />

      {historial.length === 0 ? (
        <EmptyState
          title="Sin registros"
          description="Aún no hay intentos de login registrados."
          icon={History}
        />
      ) : filtrados.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description={`No se encontraron registros con "${search}".`}
          icon={History}
        />
      ) : (
        <div className="bg-white rounded-xl border border-dark-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-dark-100 bg-dark-50">
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Usuario</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Email</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Estado</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {filtrados.map((entry, i) => (
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
        </div>
      )}
    </motion.div>
  )
}
