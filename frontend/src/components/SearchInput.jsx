import { Search, X } from 'lucide-react'

export default function SearchInput({ value, onChange, placeholder = 'Buscar...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-white"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-dark-400 hover:text-dark-600 hover:bg-dark-100 transition-colors cursor-pointer"
          aria-label="Limpiar búsqueda"
          title="Limpiar búsqueda"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}