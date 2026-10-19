import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  Plus,
  Eye,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Mountain,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const principalLinks = [
  { to: '/mis-negocios/resumen', icon: LayoutDashboard, label: 'Dashboard', end: true },
]

const gestionLinks = [
  { to: '/mis-negocios', icon: Store, label: 'Mis negocios', end: true },
  { to: '/mis-negocios/nuevo', icon: Plus, label: 'Nuevo negocio' },
]

const sidebarLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'bg-primary-600 text-white shadow-sm'
      : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
  }`

function SectionLabel({ children }) {
  return (
    <p className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-dark-500">
      {children}
    </p>
  )
}

function SidebarContent({ onNavigate, collapsed }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    onNavigate?.()
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <SectionLabel>Principal</SectionLabel>
      {principalLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onClick={onNavigate}
          className={sidebarLinkClass}
          title={collapsed ? link.label : undefined}
        >
          <link.icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{link.label}</span>}
        </NavLink>
      ))}

      <SectionLabel>Gestión</SectionLabel>
      {gestionLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onClick={onNavigate}
          className={sidebarLinkClass}
          title={collapsed ? link.label : undefined}
        >
          <link.icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{link.label}</span>}
        </NavLink>
      ))}

      <div className="border-t border-dark-800 my-3" />

      <a
        href="/negocios"
        onClick={(e) => {
          onNavigate?.()
          navigate('/negocios')
          e.preventDefault()
        }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-200"
        title={collapsed ? 'Ver sitio público' : undefined}
      >
        <Eye className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>Ver sitio público</span>}
      </a>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 w-full"
        title={collapsed ? 'Cerrar sesión' : undefined}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>Cerrar sesión</span>}
      </button>

      {!collapsed && user && (
        <div className="pt-4">
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
    </nav>
  )
}

function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={`hidden lg:flex flex-col bg-dark-900 transition-all duration-300 h-screen sticky top-0 flex-shrink-0 overflow-y-auto ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-dark-800 flex-shrink-0">
        <Mountain className="w-7 h-7 text-primary-400 flex-shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <span className="block text-base font-bold text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>
              Cordalia
            </span>
            <span className="block text-xs text-dark-400">Panel del negocio</span>
          </div>
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
      <SidebarContent collapsed={collapsed} />
    </aside>
  )
}

function MobileDrawer({ open, onClose }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    onClose()
    await logout()
    navigate('/', { replace: true })
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
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-dark-900 flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-dark-800 shrink-0">
          <div className="flex items-center gap-2">
            <Mountain className="w-6 h-6 text-primary-400" />
            <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Cordalia
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <SectionLabel>Principal</SectionLabel>
            {principalLinks.map((link) => (
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

            <SectionLabel>Gestión</SectionLabel>
            {gestionLinks.map((link) => (
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

            <a
              href="/negocios"
              onClick={(e) => {
                onClose()
                navigate('/negocios')
                e.preventDefault()
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-200"
            >
              <Eye className="w-5 h-5 flex-shrink-0" />
              <span>Ver sitio público</span>
            </a>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 w-full"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </nav>

          {user && (
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
        </div>
      </div>
    </>
  )
}

export default function BusinessLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()

  const pageTitle = (() => {
    if (location.pathname === '/mis-negocios') return 'Mis negocios'
    if (location.pathname === '/mis-negocios/resumen') return 'Dashboard del negocio'
    if (location.pathname === '/mis-negocios/nuevo') return 'Nuevo negocio'
    if (/^\/mis-negocios\/[^/]+\/editar$/.test(location.pathname)) return 'Editar negocio'
    if (/^\/mis-negocios\/[^/]+$/.test(location.pathname)) return 'Detalle del negocio'
    return 'Panel del negocio'
  })()

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
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-dark-900 truncate">
              {pageTitle}
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}