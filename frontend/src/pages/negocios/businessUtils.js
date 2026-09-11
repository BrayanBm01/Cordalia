export const ESTADO_LABEL = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
}

export const ESTADO_BADGE = {
  draft: 'bg-dark-100 text-dark-600',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-red-100 text-red-700',
  inactive: 'bg-dark-100 text-dark-500',
}

export const DIAS_LABEL = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = Math.round(Number(value))
  if (Number.isNaN(num)) return ''
  return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(num)}`
}

// Formato COP en vivo para inputs: 132000 -> "132.000", vacío -> "".
export function formatCOP(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const num = Number(digits)
  if (!Number.isFinite(num)) return ''
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(num)
}

// Parseo de un texto COP a entero puro (o null si está vacío): "1.500.000" -> 1500000.
export function parseCOP(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return null
  const num = Number(digits)
  return Number.isFinite(num) ? num : null
}

export function formatRango(precioMin, precioMax) {
  const min = formatMoney(precioMin)
  const max = formatMoney(precioMax)
  if (min && max) return `${min} - ${max}`
  return min || max || ''
}

// Ocupación visual SIEMPRE entera (Math.round): 1/16 -> 6%, 15/20 -> 75%.
export function ocupacionPct(ocupado, capacidad) {
  const cap = Math.max(0, Number(capacidad) || 0)
  if (cap <= 0) return 0
  const ocu = Math.min(Math.max(0, Number(ocupado) || 0), cap)
  return Math.round((ocu / cap) * 100)
}