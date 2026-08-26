import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="relative mb-8">
          <span
            className="text-[10rem] md:text-[14rem] font-bold leading-none text-transparent bg-clip-text bg-gradient-to-br from-dark-100 to-dark-200 select-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-5xl md:text-7xl font-bold text-dark-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              404
            </span>
          </div>
        </div>

        <h1
          className="text-2xl md:text-3xl font-bold text-dark-900 mb-3"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Página no encontrada
        </h1>

        <p className="text-dark-500 max-w-md mx-auto mb-8 leading-relaxed">
          Lo sentimos, la página que buscas no existe o ha sido movida a otra ubicación. Verifica la URL o vuelve al inicio.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Volver al inicio
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-dark-100 text-dark-700 rounded-xl font-medium hover:bg-dark-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Ir atrás
          </button>
        </div>
      </motion.div>
    </div>
  )
}
