import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  Menu,
  X,
  ChevronDown,
  User,
  Shield,
  Store,
  Heart,
  LogOut,
  Ticket,
  Code2,
  ExternalLink,
  Search,
  ArrowRight,
  Sprout,
  MapPin,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navLinkClass = ({ isActive }) =>
  `relative text-sm font-medium transition-colors duration-200 py-1 ${
    isActive
      ? 'text-moss-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-moss-700 after:rounded-full'
      : 'text-dark-600 hover:text-moss-800'
  }`

/* ─────────────────────────────── MOBILE DRAWER (Portal) ─────────────────────────────── */
function MobileDrawer({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    onClose()
    await logout()
    navigate('/', { replace: true })
  }

  const drawerNavClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-moss-900 text-white shadow-sm'
        : 'text-dark-700 hover:bg-cream-200/60'
    }`

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999]" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            aria-hidden="true"
          />

          {/* Panel lateral desde la derecha */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="absolute top-0 right-0 bottom-0 w-[85vw] max-w-[340px] bg-cream-50 shadow-2xl flex flex-col overflow-y-auto border-l border-cream-200"
          >
            {/* ── Cabecera del drawer ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 bg-white/80">
              <Link
                to="/"
                onClick={onClose}
                className="flex items-center gap-2.5"
              >
                <div className="w-9 h-9 rounded-full bg-moss-900 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Sprout className="w-4 h-4 text-moss-200" />
                </div>
                <div className="flex flex-col">
                  <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-moss-950 leading-none">
                    Cordalia
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-moss-700/80 mt-0.5">
                    Turismo Sostenible
                  </span>
                </div>
              </Link>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-cream-200/80 hover:bg-cream-300 text-dark-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar menú lateral"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Contenido scrollable ── */}
            <div className="flex-1 flex flex-col justify-between px-4 py-5">
              {/* Nav Links */}
              <nav className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-moss-800/50 mb-3">
                  Explorar
                </p>
                <NavLink to="/" onClick={onClose} className={drawerNavClass} end>
                  <Compass className="w-4 h-4 text-moss-400 shrink-0" />
                  <span>Inicio</span>
                </NavLink>
                <NavLink to="/lugares" onClick={onClose} className={drawerNavClass}>
                  <MapPin className="w-4 h-4 text-moss-400 shrink-0" />
                  <span>Destinos de Córdoba</span>
                </NavLink>
                <NavLink to="/planes" onClick={onClose} className={drawerNavClass}>
                  <Ticket className="w-4 h-4 text-moss-400 shrink-0" />
                  <span>Planes Turísticos</span>
                </NavLink>
                <NavLink to="/negocios" onClick={onClose} className={drawerNavClass}>
                  <Store className="w-4 h-4 text-moss-400 shrink-0" />
                  <span>Negocios Locales</span>
                </NavLink>
              </nav>

              {/* ── Sección inferior: Auth / Perfil ── */}
              <div className="pt-5 mt-5 border-t border-cream-200 space-y-3">
                {user ? (
                  <>
                    {/* Tarjeta de usuario */}
                    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-cream-200 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-moss-900 text-white flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.nombre}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          user.nombre?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-dark-900 truncate">{user.nombre}</p>
                        <p className="text-xs text-dark-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-moss-50 text-[10px] font-bold text-moss-800">
                          {user.rol === 'ADMIN' ? 'Administrador' : user.rol === 'BUSINESS' ? 'Negocio' : 'Viajero'}
                        </span>
                      </div>
                    </div>

                    {/* Links de cuenta */}
                    <div className="space-y-0.5">
                      <Link to="/perfil" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-dark-700 hover:bg-cream-200/60 rounded-xl transition-colors">
                        <User className="w-4 h-4 text-moss-700" />
                        <span>Mi perfil</span>
                      </Link>
                      <Link to="/favoritos" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-dark-700 hover:bg-cream-200/60 rounded-xl transition-colors">
                        <Heart className="w-4 h-4 text-moss-700" />
                        <span>Mis favoritos</span>
                      </Link>
                      {user.rol === 'BUSINESS' && (
                        <Link to="/mis-negocios" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-dark-700 hover:bg-cream-200/60 rounded-xl transition-colors">
                          <Store className="w-4 h-4 text-moss-700" />
                          <span>Mis negocios</span>
                        </Link>
                      )}
                      {user.rol === 'ADMIN' && (
                        <Link to="/admin" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-dark-700 hover:bg-cream-200/60 rounded-xl transition-colors">
                          <Shield className="w-4 h-4 text-moss-700" />
                          <span>Panel Admin</span>
                        </Link>
                      )}
                    </div>

                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar sesión</span>
                    </button>
                  </>
                ) : (
                  <div className="space-y-2.5">
                    <Link
                      to="/planes"
                      onClick={onClose}
                      className="flex items-center justify-center gap-2 w-full py-3.5 px-4 text-sm font-semibold bg-moss-900 text-white rounded-full hover:bg-moss-800 transition-all shadow-sm"
                    >
                      <span>Planear Viaje</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/login"
                        onClick={onClose}
                        className="block w-full text-center py-2.5 px-3 text-sm font-semibold text-dark-800 border border-cream-300 rounded-full hover:bg-cream-200/60 transition-colors"
                      >
                        Iniciar sesión
                      </Link>
                      <Link
                        to="/registro"
                        onClick={onClose}
                        className="block w-full text-center py-2.5 px-3 text-sm font-semibold text-moss-950 bg-cream-200/70 hover:bg-cream-300 rounded-full transition-colors"
                      >
                        Registrarse
                      </Link>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-cream-200/70 text-center">
                  <p className="text-[10px] font-medium text-dark-400 flex items-center justify-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5 text-moss-600" />
                    <span>Turismo Sostenible • Córdoba</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/* ─────────────────────────────── NAVBAR ─────────────────────────────── */
function Navbar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
  }, [location.pathname, setMobileOpen])

  const handleLogout = async () => {
    setDropdownOpen(false)
    setMobileOpen(false)
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-cream-50/95 backdrop-blur-md border-b border-cream-200 shadow-sm'
          : 'bg-cream-50/80 backdrop-blur-sm border-b border-cream-200/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-moss-900 text-white flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-sm">
              <Sprout className="w-5 h-5 text-moss-200" />
            </div>
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-moss-950 leading-none">
                Cordalia
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-moss-700/80 mt-1">
                Turismo Sostenible • Córdoba
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-9">
            <NavLink to="/" className={navLinkClass} end>
              Inicio
            </NavLink>
            <NavLink to="/lugares" className={navLinkClass}>
              Destinos
            </NavLink>
            <NavLink to="/planes" className={navLinkClass}>
              Planes Turísticos
            </NavLink>
            <NavLink to="/negocios" className={navLinkClass}>
              Negocios Locales
            </NavLink>
          </nav>

          {/* Right CTA (desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/lugares"
              className="p-2.5 rounded-full text-dark-600 hover:text-moss-900 hover:bg-cream-100 transition-colors"
              title="Buscar destinos"
              aria-label="Buscar destinos"
            >
              <Search className="w-4 h-4" />
            </Link>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-cream-100 hover:bg-cream-200/80 border border-cream-200 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-moss-900 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      user.nombre?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-xs font-semibold text-dark-800 max-w-[100px] truncate">
                    {user.nombre}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-dark-500 transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-cream-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-cream-100">
                      <p className="text-sm font-semibold text-dark-900 truncate">
                        {user.nombre}
                      </p>
                      <p className="text-xs text-dark-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/perfil"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-dark-700 hover:bg-cream-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-moss-700" />
                      Mi perfil
                    </Link>
                    <Link
                      to="/favoritos"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-dark-700 hover:bg-cream-50 transition-colors"
                    >
                      <Heart className="w-4 h-4 text-moss-700" />
                      Mis favoritos
                    </Link>
                    {user.rol === 'BUSINESS' && (
                      <Link
                        to="/mis-negocios"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-dark-700 hover:bg-cream-50 transition-colors"
                      >
                        <Store className="w-4 h-4 text-moss-700" />
                        Mis negocios
                      </Link>
                    )}
                    {user.rol === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-dark-700 hover:bg-cream-50 transition-colors"
                      >
                        <Shield className="w-4 h-4 text-moss-700" />
                        Panel Admin
                      </Link>
                    )}
                    <div className="border-t border-cream-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
                  className="text-sm font-semibold text-dark-700 hover:text-moss-900 transition-colors px-3 py-2"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/planes"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-moss-900 hover:bg-moss-800 text-white text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <span>Planear Viaje</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            id="mobile-drawer-toggle"
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2.5 rounded-xl text-dark-700 hover:bg-cream-100 transition-colors cursor-pointer"
            aria-label="Abrir menú lateral"
            aria-expanded={mobileOpen}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────────────── FOOTER ─────────────────────────────── */
function Footer() {
  const { user } = useAuth()

  return (
    <footer className="relative bg-[#11241a] text-stone-300 overflow-hidden">
      {/* Decorative organic top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-moss-500/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-18 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Col 1 & 2: Brand */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-moss-800 border border-moss-600/40 text-moss-300 flex items-center justify-center">
                <Sprout className="w-5 h-5" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-white tracking-tight">
                Cordalia
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-stone-400 max-w-sm">
              Plataforma turística dedicada a exaltar la belleza natural, la cultura ancestral y
              las experiencias auténticas de Córdoba, Colombia. Promovemos un turismo responsable
              que apoya a las familias y negocios de nuestra región.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-moss-400 font-medium">
              <MapPin className="w-3.5 h-3.5" />
              <span>Montería • Lorica • San Antero • Sinú & Caribe</span>
            </div>
          </div>

          {/* Col 3: Navegación */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-moss-300 mb-4">
              Explorar
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/lugares" className="hover:text-white transition-colors">
                  Destinos de Córdoba
                </Link>
              </li>
              <li>
                <Link to="/planes" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-moss-400" />
                  Planes y Paquetes
                </Link>
              </li>
              <li>
                <Link to="/negocios" className="hover:text-white transition-colors">
                  Negocios Locales
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Mi Cuenta */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-moss-300 mb-4">
              Cuenta
            </h3>
            <ul className="space-y-2.5 text-sm">
              {user ? (
                <>
                  <li>
                    <Link to="/perfil" className="hover:text-white transition-colors">
                      Mi Perfil
                    </Link>
                  </li>
                  <li>
                    <Link to="/favoritos" className="hover:text-white transition-colors">
                      Destinos Favoritos
                    </Link>
                  </li>
                  {user.rol === 'BUSINESS' && (
                    <li>
                      <Link to="/mis-negocios" className="hover:text-white transition-colors">
                        Panel de Negocios
                      </Link>
                    </li>
                  )}
                  {user.rol === 'ADMIN' && (
                    <li>
                      <Link to="/admin" className="hover:text-white transition-colors">
                        Panel Administrador
                      </Link>
                    </li>
                  )}
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="hover:text-white transition-colors">
                      Iniciar Sesión
                    </Link>
                  </li>
                  <li>
                    <Link to="/registro" className="hover:text-white transition-colors">
                      Crear Cuenta de Viajero
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Col 5: Información e Impacto */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-moss-300 mb-4">
              Turismo Consciente
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed mb-4">
              Cada plan turístico fomenta la conservación de humedales, manglares y saberes
              artesanales Zenú.
            </p>
            <a
              href="https://github.com/BrayanBm01"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-moss-950/80 border border-moss-800/80 text-xs font-medium text-stone-300 hover:text-white hover:border-moss-600 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-moss-400" />
              <span>Desarrollado por Brayan Borja</span>
              <ExternalLink className="w-3 h-3 text-stone-500" />
            </a>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-14 pt-8 border-t border-moss-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>&copy; {new Date().getFullYear()} Cordalia. Descubre Córdoba de manera responsable.</p>
          <p className="text-stone-400">
            Inspirado en el ecoturismo de naturaleza, ríos y mares de Córdoba.
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────────────── PUBLIC LAYOUT ─────────────────────────────── */
export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      <Navbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
