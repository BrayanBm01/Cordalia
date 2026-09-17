import {
  Bus, BedDouble, Coffee, UtensilsCrossed, Moon, Compass, ShieldCheck,
  Ticket, Droplets, Camera, Cookie, Tent,
} from 'lucide-react'
import { formatMoney } from './businessUtils'

export const TIPO_PLAN_LABEL = {
  plan: 'Plan',
  paquete: 'Paquete',
  experiencia: 'Experiencia',
}

export const TIPO_PLAN_BADGE = {
  plan: 'bg-primary-100 text-primary-700',
  paquete: 'bg-amber-100 text-amber-700',
  experiencia: 'bg-ocean-100 text-ocean-700',
}

export const TIPO_PRECIO_LABEL = {
  por_persona: 'Por persona',
  por_pareja: 'Por pareja',
  por_grupo: 'Por grupo',
  precio_total: 'Precio total',
}

export const PLAN_ESTADO_LABEL = {
  activo: 'Activo',
  inactivo: 'Inactivo',
}

export const PLAN_ESTADO_BADGE = {
  activo: 'bg-emerald-100 text-emerald-700',
  inactivo: 'bg-dark-100 text-dark-500',
}

export const PROMO_TIPO_LABEL = {
  porcentaje: '% de descuento',
  valor: 'Valor fijo de descuento',
}

// Opciones estandarizadas de "qué incluye"
export const INCLUYE_OPCIONES = [
  { key: 'transporte', label: 'Transporte', icon: Bus },
  { key: 'alojamiento', label: 'Alojamiento', icon: BedDouble },
  { key: 'desayuno', label: 'Desayuno', icon: Coffee },
  { key: 'almuerzo', label: 'Almuerzo', icon: UtensilsCrossed },
  { key: 'cena', label: 'Cena', icon: Moon },
  { key: 'guia', label: 'Guía local', icon: Compass },
  { key: 'seguros', label: 'Seguro de viaje', icon: ShieldCheck },
  { key: 'entradas', label: 'Entradas', icon: Ticket },
  { key: 'hidratacion', label: 'Hidratación', icon: Droplets },
  { key: 'foto', label: 'Fotografía', icon: Camera },
  { key: 'snacks', label: 'Snacks', icon: Cookie },
  { key: 'camping', label: 'Equipo de camping', icon: Tent },
]

export function findIncluyeOption(key) {
  return INCLUYE_OPCIONES.find((o) => o.key === key)
}

export function formatDuracion(dias, noches) {
  const d = Number(dias) || 0
  const n = Number(noches) || 0
  if (d <= 0) return ''
  if (n > 0) return `${d} días · ${n} noches`
  return `${d} día${d !== 1 ? 's' : ''}`
}

export function formatFechas(fechaInicio, fechaFin) {
  const f = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : null)
  const a = f(fechaInicio)
  const b = f(fechaFin)
  if (!a && !b) return 'Sin vigencia definida'
  if (a && b) return `${a} → ${b}`
  return a || b
}

// Normaliza un día de itinerario que puede venir en el formato del editor
// ({ dia, actividades:[{hora,descripcion}] }) o del seed/datos históricos
// ({ dia, titulo, descripcion }).
export function diaActividades(dia) {
  if (Array.isArray(dia?.actividades)) return dia.actividades
  const items = []
  if (dia?.titulo) items.push({ hora: null, descripcion: dia.titulo })
  if (dia?.descripcion) items.push({ hora: null, descripcion: dia.descripcion })
  return items
}

export function presente(fechaInicio, fechaFin) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const desde = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : null
  const hasta = fechaFin ? new Date(fechaFin + 'T00:00:00') : null
  if (desde && desde > hoy) return false
  if (hasta && hasta < hoy) return false
  return true
}

// Precio efectivo del plan considerando su promo activa (si existe).
export function planPrecios(plan) {
  const base = Number(plan?.precio) || 0
  let efectivo = base
  let anterior = plan?.precio_anterior != null ? Number(plan.precio_anterior) : null
  let descuento = 0

  const promo = Array.isArray(plan?.promociones) ? plan.promociones[0] : null
  if (promo) {
    const valor = Number(promo.valor_descuento) || 0
    if (anterior == null) anterior = base
    if (promo.tipo_descuento === 'porcentaje') {
      const pct = Math.max(0, Math.min(Math.round(valor), 100))
      efectivo = Math.round(base * (1 - pct / 100))
      descuento = pct
    } else if (promo.precio_promocional != null) {
      efectivo = Math.max(0, Math.round(Number(promo.precio_promocional) || 0))
    } else if (valor > 0) {
      efectivo = Math.max(0, Math.round(base - valor))
    }
  }

  if (anterior != null && anterior <= efectivo) anterior = null
  if (descuento === 0 && promo && anterior != null && anterior > efectivo) {
    descuento = Math.round((1 - efectivo / anterior) * 100)
  }
  return { efectivo, anterior, descuento }
}

export function planPrecioText(plan) {
  const { efectivo, anterior } = planPrecios(plan)
  if (!efectivo) return 'Consultar'
  const tipo = TIPO_PRECIO_LABEL[plan?.tipo_precio] || ''
  const base = formatMoney(efectivo)
  return anterior ? `${base} (antes ${formatMoney(anterior)})` : `${base}${tipo ? ` · ${tipo}` : ''}`
}

export function buildWhatsAppText(plan, negocio, personas) {
  const nombrePlan = plan?.nombre || 'este plan'
  const precio = planPrecioText(plan)
  const lines = [
    `Hola ${negocio?.negocio_nombre || 'un gusto'} 👋`,
    `Me interesa el ${TIPO_PLAN_LABEL[plan?.tipo_plan]?.toLowerCase() || 'plan'} "${nombrePlan}" en Cordalia.`,
    `Precio: ${precio}.`,
  ]
  if (personas > 0) lines.push(`Seríamos ${personas} persona${personas !== 1 ? 's' : ''}.`)
  lines.push('¿Me das más información?')
  return lines.join('\n')
}

export function whatsappNumber(negocio) {
  const raw = negocio?.negocio_whatsapp || negocio?.whatsapp || negocio?.negocio_telefono || negocio?.telefono
  const digits = String(raw || '').replace(/\D+/g, '')
  return digits || null
}

export function whatsappLink(negocio, text) {
  const digits = whatsappNumber(negocio)
  if (!digits || !text) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function telLink(negocio) {
  const digits = whatsappNumber(negocio)
  return digits ? `tel:+${digits}` : null
}