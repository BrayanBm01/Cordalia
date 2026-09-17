import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  MapPin,
  Store,
  History,
  MessageSquare,
  LogOut,
  Globe,
  Menu,
  X,
  ChevronLeft,
  Mountain,
  Bell,
  CheckCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { adminAPI } from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const sidebarLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { to: '/admin/lugares', icon: MapPin, label: 'Destinos' },
  { to: '/admin/negocios', icon: Store, label: 'Negocios' },
  { to: '/admin/resenas', icon: MessageSquare, label: 'Reseñas' },
  { to: '/admin/historial', icon: History, label: 'Historial' },
]

const sidebarLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'bg-primary-600 text-white shadow-sm'
      : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
  }`

function Sidebar({ collapsed, onToggle }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <aside
      className={`hidden lg:flex flex-col bg-dark-900 transition-all duration-300 h-screen sticky top-0 flex-shrink-0 overflow-y-auto ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-dark-800">
        <Mountain className="w-7 h-7 text-primary-400 flex-shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold text-white whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
            Cordalia
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${
              collapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {sidebarLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={sidebarLinkClass}
            title={collapsed ? link.label : undefined}
          >
            <link.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}

        <div className="border-t border-dark-800 my-3" />

        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-200"
          title={collapsed ? 'Volver al sitio' : undefined}
        >
          <Globe className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Volver al sitio</span>}
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 w-full"
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </nav>

      {!collapsed && user && (
        <div className="px-3 pb-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dark-800/50">
            <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.nombre} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                user.nombre?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.nombre}</p>
              <p className="text-xs text-dark-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function MobileDrawer({ open, onClose }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    onClose()
    await logout()
    navigate('/')
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-dark-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-dark-900 transform transition-transform duration-300 ease-in-out lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Mountain className="w-6 h-6 text-primary-400" />
            <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Cordalia
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={onClose}
              className={sidebarLinkClass}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          ))}

          <div className="border-t border-dark-800 my-3" />

          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-200 w-full"
          >
            <Globe className="w-5 h-5 flex-shrink-0" />
            <span>Volver al sitio</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </nav>

        {user && (
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-4">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dark-800/50">
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.nombre} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ) : (
                  user.nombre?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.nombre}</p>
                <p className="text-xs text-dark-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const STORAGE_KEY = 'explora_admin_read_notifs'

function getReadIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function saveReadIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

function buildNotifications(history) {
  if (!history || history.length === 0) return []

  return history.slice(0, 20).map((entry, i) => {
    const id = entry.id || `notif-${i}`
    const timeAgo = entry.fecha
      ? formatDistanceToNow(new Date(entry.fecha), { addSuffix: true, locale: es })
      : ''

    if (entry.exito) {
      const name = entry.nombre || entry.email || 'Un usuario'
      return {
        id,
        icon: '👤',
        title: `${name} inició sesión`,
        time: timeAgo,
        fecha: entry.fecha,
      }
    }

    const name = entry.nombre || entry.email || 'Un usuario'
    return {
      id,
      icon: '⚠️',
      title: `Intento fallido de ${name}`,
      time: timeAgo,
      fecha: entry.fecha,
    }
  })
}

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/usuarios': 'Gestion de Usuarios',
  '/admin/lugares': 'Gestion de Destinos',
  '/admin/negocios': 'Gestion de Negocios',
  '/admin/resenas': 'Gestion de Reseñas',
  '/admin/historial': 'Historial de Sesiones',
}

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [readIds, setReadIds] = useState(() => getReadIds())
  const notifRef = useRef(null)
  const location = useLocation()

  const pageTitle = pageTitles[location.pathname] || 'Panel de Admin'
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length

  useEffect(() => {
    let cancelled = false
    adminAPI
      .loginHistory()
      .then((res) => {
        if (!cancelled) setNotifications(buildNotifications(res.data))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setNotifOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setNotifOpen(false)
    }
    if (notifOpen) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [notifOpen])

  const markAllRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id)
    setReadIds(allIds)
    saveReadIds(allIds)
  }, [notifications])

  return (
    <div className="h-screen bg-dark-50 flex overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-dark-100 h-16 flex items-center px-4 sm:px-6 lg:px-8 gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-dark-600 hover:bg-dark-50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-dark-900 truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label="Notificaciones"
              className="relative p-2 rounded-lg text-dark-500 hover:bg-dark-50 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-dark-100 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-dark-100">
                  <h3 className="text-sm font-semibold text-dark-900">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Marcar como leídas
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 text-dark-300 mx-auto mb-2" />
                      <p className="text-sm text-dark-500">No hay notificaciones</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isRead = readIds.includes(notif.id)
                      return (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 border-b border-dark-50 last:border-0 transition-colors ${
                            isRead ? 'bg-white' : 'bg-primary-50/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg flex-shrink-0 mt-0.5">{notif.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm leading-snug ${isRead ? 'text-dark-600' : 'text-dark-900 font-medium'}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-dark-400 mt-0.5">{notif.time}</p>
                            </div>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
