import { useState, useRef, useEffect, useCallback } from 'react'
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Mountain, Menu, X, ChevronDown, User, Shield, Store, Heart, LogOut, Ticket, Code2, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors duration-200 ${
    isActive ? 'text-primary-600' : 'text-dark-600 hover:text-primary-600'
  }`

function Navbar() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    setDropdownOpen(false)
    setMobileOpen(false)
    await logout()
    navigate('/')
  }

  const handleExperienciasClick = useCallback((e) => {
    setMobileOpen(false)
    if (location.pathname === '/') {
      e.preventDefault()
      document.getElementById('experiencias')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [location.pathname])

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-dark-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <Mountain className="w-7 h-7 text-primary-600 group-hover:text-primary-700 transition-colors" />
            <span className="font-[family-name:var(--font-display)] text-xl font-bold text-dark-900">
              Explora Turismo
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/" className={navLinkClass} end>
              Inicio
            </NavLink>
            <NavLink to="/lugares" className={navLinkClass}>
              Destinos
            </NavLink>
            <NavLink to="/negocios" className={navLinkClass}>
              Negocios
            </NavLink>
            <NavLink to="/planes" className={navLinkClass}>
              Planes
            </NavLink>
            {location.pathname === '/' ? (
              <a
                href="#experiencias"
                onClick={handleExperienciasClick}
                className="text-sm font-medium text-dark-600 hover:text-primary-600 transition-colors duration-200"
              >
                Experiencias
              </a>
            ) : (
              <Link
                to="/#experiencias"
                className="text-sm font-medium text-dark-600 hover:text-primary-600 transition-colors duration-200"
              >
                Experiencias
              </Link>
            )}
            <NavLink to="/lugares" className={navLinkClass}>
              Explorar
            </NavLink>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-dark-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.nombre} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    ) : (
                      user.nombre?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-medium text-dark-700 max-w-[120px] truncate">
                    {user.nombre}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-dark-400 transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-dark-100 py-1 z-50">
                    <div className="px-4 py-3 border-b border-dark-100">
                      <p className="text-sm font-semibold text-dark-900 truncate">
                        {user.nombre}
                      </p>
                      <p className="text-xs text-dark-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/perfil"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Mi perfil
                    </Link>
                    <Link
                      to="/favoritos"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                      Mis favoritos
                    </Link>
                    {user.rol === 'BUSINESS' && (
                      <Link
                        to="/mis-negocios"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                      >
                        <Store className="w-4 h-4" />
                        Mis negocios
                      </Link>
                    )}
                    {user.rol === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        Panel Admin
                      </Link>
                    )}
                    <div className="border-t border-dark-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-dark-700 hover:text-primary-600 transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-dark-600 hover:bg-dark-50 transition-colors"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-dark-100 bg-white">
          <div className="px-4 py-4 space-y-2">
            <NavLink
              to="/"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-dark-700 hover:bg-dark-50'
                }`
              }
              end
            >
              Inicio
            </NavLink>
            <NavLink
              to="/lugares"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-dark-700 hover:bg-dark-50'
                }`
              }
            >
              Destinos
            </NavLink>
            <NavLink
              to="/negocios"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-dark-700 hover:bg-dark-50'
                }`
              }
            >
              Negocios
            </NavLink>
            <NavLink
              to="/planes"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-dark-700 hover:bg-dark-50'
                }`
              }
            >
              Planes
            </NavLink>
            {location.pathname === '/' ? (
              <a
                href="#experiencias"
                onClick={(e) => {
                  setMobileOpen(false)
                  e.preventDefault()
                  document.getElementById('experiencias')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-dark-700 hover:bg-dark-50 transition-colors"
              >
                Experiencias
              </a>
            ) : (
              <Link
                to="/#experiencias"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-dark-700 hover:bg-dark-50 transition-colors"
              >
                Experiencias
              </Link>
            )}
            <NavLink
              to="/lugares"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-dark-700 hover:bg-dark-50 transition-colors"
            >
              Explorar
            </NavLink>

            <div className="border-t border-dark-100 pt-3 mt-3">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.nombre} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        user.nombre?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark-900 truncate">
                        {user.nombre}
                      </p>
                      <p className="text-xs text-dark-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    to="/perfil"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Mi perfil
                  </Link>
                  <Link
                    to="/favoritos"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    Mis favoritos
                  </Link>
                  {user.rol === 'BUSINESS' && (
                    <Link
                      to="/mis-negocios"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                    >
                      <Store className="w-4 h-4" />
                      Mis negocios
                    </Link>
                  )}
                  {user.rol === 'ADMIN' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Panel Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 text-sm font-medium text-dark-700 border border-dark-200 rounded-lg hover:bg-dark-50 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    to="/registro"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Crear cuenta
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

function Footer() {
  const { user } = useAuth()

  return (
    <footer className="bg-dark-900 text-dark-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Mountain className="w-7 h-7 text-primary-400" />
              <span className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
                Explora Turismo
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-dark-400 max-w-xs">
              Descubre la magia de Colombia. Desde las costas del Caribe hasta la
              selva amazónica, encuentra tu próximo destino inolvidable.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Navegación
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/lugares" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                  Destinos
                </Link>
              </li>
              <li>
                <Link to="/negocios" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                  Negocios
                </Link>
              </li>
              <li>
                <Link to="/planes" className="text-sm text-dark-400 hover:text-primary-400 transition-colors inline-flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5" />
                  Planes y experiencias
                </Link>
              </li>
              <li>
                <Link to="/lugares" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                  Explorar
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Cuenta
            </h3>
            <ul className="space-y-3">
              {user ? (
                <>
                  <li>
                    <Link to="/perfil" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                      Mi perfil
                    </Link>
                  </li>
                  {user.rol === 'BUSINESS' && (
                    <li>
                      <Link to="/mis-negocios" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                        Mis negocios
                      </Link>
                    </li>
                  )}
                  {user.rol === 'ADMIN' && (
                    <li>
                      <Link to="/admin" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                        Panel Admin
                      </Link>
                    </li>
                  )}
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                      Iniciar sesión
                    </Link>
                  </li>
                  <li>
                    <Link to="/registro" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                      Crear cuenta
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Desarrollador
            </h3>
            <p className="text-sm text-dark-400 mb-3">Hecho con dedicación para el turismo colombiano.</p>
            <a
              href="https://github.com/BrayanBm01"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800/60 border border-dark-700 text-sm font-medium text-dark-200 hover:text-white hover:border-primary-500 hover:bg-dark-700/50 transition-colors"
              title="Ver perfil de Brayan Borja en GitHub"
            >
              <Code2 className="w-4 h-4" />
              Brayan Borja
              <ExternalLink className="w-3.5 h-3.5 text-dark-400" />
            </a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-dark-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-dark-500">
            &copy; {new Date().getFullYear()} Explora Turismo. Todos los derechos reservados.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-dark-500">
            <p className="inline-flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-primary-500" />
              Hecho con amor en Colombia
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
