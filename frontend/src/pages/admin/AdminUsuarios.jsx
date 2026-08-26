import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, X, Users as UsersIcon, LogOut } from 'lucide-react'
import { usuariosAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import ConfirmModal from '../../components/ConfirmModal'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

const userSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
  rol: z.enum(['ADMIN', 'USER'], { message: 'Selecciona un rol válido' }),
})

const createUserSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z.enum(['ADMIN', 'USER'], { message: 'Selecciona un rol válido' }),
})

const rolBadge = {
  ADMIN: 'bg-primary-100 text-primary-700',
  USER: 'bg-ocean-100 text-ocean-700',
}

export default function AdminUsuarios() {
  const { user: currentUser } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [revokeTarget, setRevokeTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(editingUser ? userSchema : createUserSchema),
  })

  async function fetchUsuarios() {
    try {
      const res = await usuariosAPI.getAll()
      setUsuarios(res.data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  function openCreate() {
    setEditingUser(null)
    reset({ nombre: '', email: '', password: '', rol: 'USER' })
    setModalOpen(true)
  }

  function openEdit(user) {
    setEditingUser(user)
    reset({ nombre: user.nombre, email: user.email, password: '', rol: user.rol })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingUser(null)
    reset()
  }

  async function onSubmit(data) {
    setSubmitting(true)
    try {
      if (editingUser) {
        const payload = { nombre: data.nombre, email: data.email, rol: data.rol }
        if (data.password) payload.password = data.password
        const res = await usuariosAPI.update(editingUser.id, payload)
        toast.success(res.message || 'Usuario actualizado')
      } else {
        const res = await usuariosAPI.create(data)
        toast.success(res.message || 'Usuario creado')
      }
      closeModal()
      await fetchUsuarios()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await usuariosAPI.delete(deleteTarget.id)
      toast.success(res.message || 'Usuario eliminado')
      setDeleteTarget(null)
      await fetchUsuarios()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleRevokeSession() {
    if (!revokeTarget) return
    try {
      const res = await usuariosAPI.revokeSession(revokeTarget.id)
      toast.success(res.message || 'Sesión revocada')
      setRevokeTarget(null)
      await fetchUsuarios()
    } catch (err) {
      toast.error(err.message || 'No se pudo cerrar la sesión')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Usuarios</h1>
          <p className="text-dark-500 mt-1">Gestión de usuarios del sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Crear usuario
        </button>
      </div>

      {usuarios.length === 0 ? (
        <EmptyState
          title="No hay usuarios"
          description="Aún no se han registrado usuarios en el sistema."
          icon={UsersIcon}
        />
      ) : (
        <div className="bg-white rounded-xl border border-dark-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-100 bg-dark-50/60">
                  <th className="text-left px-5 py-3 font-medium text-dark-500">ID</th>
                  <th className="text-left px-5 py-3 font-medium text-dark-500">Nombre</th>
                  <th className="text-left px-5 py-3 font-medium text-dark-500">Email</th>
                  <th className="text-left px-5 py-3 font-medium text-dark-500">Rol</th>
                  <th className="text-left px-5 py-3 font-medium text-dark-500">Sesión</th>
                  <th className="text-right px-5 py-3 font-medium text-dark-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {usuarios.map((u) => {
                  const isCurrentUser = currentUser && u.id === currentUser.id
                  return (
                    <tr key={u.id} className="hover:bg-dark-50/40 transition-colors">
                      <td className="px-5 py-3.5 text-dark-500 font-mono text-xs">{u.id}</td>
                      <td className="px-5 py-3.5 font-medium text-dark-800">
                        {u.nombre}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-dark-400">(tú)</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-dark-600">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${rolBadge[u.rol] || 'bg-dark-100 text-dark-600'}`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.sesion_activa ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-dark-400 bg-dark-50 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-dark-300" />
                            Sin sesión
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isCurrentUser && u.sesion_activa && (
                            <button
                              onClick={() => setRevokeTarget(u)}
                              className="p-1.5 rounded-lg text-dark-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Cerrar sesión"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-dark-400 hover:text-ocean-600 hover:bg-ocean-50 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-lg text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/40 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-md border border-dark-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100">
                <h2 className="text-lg font-semibold text-dark-900">
                  {editingUser ? 'Editar usuario' : 'Crear usuario'}
                </h2>
                <button onClick={closeModal} className="p-1 rounded-lg text-dark-400 hover:text-dark-600 hover:bg-dark-100 transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Nombre</label>
                  <input
                    {...register('nombre')}
                    className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                    placeholder="Nombre completo"
                  />
                  {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                    placeholder="correo@ejemplo.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">
                    Contraseña {editingUser && <span className="text-dark-400 font-normal">(dejar vacío para no cambiar)</span>}
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                    placeholder="••••••••"
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Rol</label>
                  <select
                    {...register('rol')}
                    className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-white"
                  >
                    <option value="USER">Usuario</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                  {errors.rol && <p className="text-red-500 text-xs mt-1">{errors.rol.message}</p>}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-dark-600 hover:bg-dark-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
      />

      <ConfirmModal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeSession}
        title="Cerrar sesión"
        message={`¿Cerrar la sesión de "${revokeTarget?.nombre}"? El usuario deberá iniciar sesión nuevamente.`}
        confirmText="Cerrar sesión"
      />
    </motion.div>
  )
}
