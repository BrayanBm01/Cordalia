import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  Plus,
  Eye,
  LogOut,
  Menu,
  X,
  Mountain,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const sidebarLinks = [
  { to: '/mis-negocios/resumen', icon: LayoutDashboard, label: 'Resumen', end: true },
  { to: '/mis-negocios', icon: Store, label: 'Mis negocios' },
]

const sidebarLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'bg-primary-600 text-white shadow-sm'
      : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
  }`

function SidebarContent({ onNavigate }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    onNavigate?.()
    await logout()
    navigate('/')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-dark-800">
        <Mountain className="w-7 h-7 text-primary-400 flex-shrink-0" />
        <div className="min-w-0">
          <span className="block text-base font-bold text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>
            Panel del negocio
          </span>
          <span className="block text-xs text-dark-400">Explora Turismo</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {sidebarLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={sidebarLinkClass}
          >
            <link.icon className="w-5 h-5 flex-shrink-0" />
            <span>{link.label}</span>
          </NavLink>
        ))}

        <NavLink
          to="/mis-negocios/nuevo"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary-600/90 text-white hover:bg-primary-600 transition-all duration-200"
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          <span>Nuevo negocio</span>
        </NavLink>

        <div className="border-t border-dark-800 my-3" />

        <a
          href="/negocios"
          onClick={(e) => {
            onNavigate?.()
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-dark-400 hover:text-red-400 hover:bg-dark-700/50 transition-all duration-200 w-full"
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
  )
}

export default function BusinessLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-dark-50 flex">
      <aside className="hidden lg:flex flex-col w-64 bg-dark-900">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-dark-950/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-dark-900 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-dark-100 h-16 flex items-center px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-dark-600 hover:bg-dark-50 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 lg:hidden text-right">
            <span className="text-sm font-semibold text-dark-900">Panel del negocio</span>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}