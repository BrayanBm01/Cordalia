/**
 * Arquitectura de Integración con Mercado Pago — Cordalia
 * 
 * Este módulo centraliza la configuración, estado y métodos para la pasarela de pagos
 * de Mercado Pago, específicamente para:
 * 1. Suscripción y activación de Cuentas de Vendedor (Negocios Turísticos).
 * 2. Pago de reservas e inscripciones a planes turísticos.
 * 
 * Cuando proporciones las variables de entorno:
 * - VITE_MERCADOPAGO_PUBLIC_KEY (frontend)
 * - MERCADOPAGO_ACCESS_TOKEN (backend)
 * El flujo de pago se activará automáticamente sin requerir cambios estructurales.
 */

export const MERCADO_PAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || ''

/**
 * Verifica si las credenciales públicas de Mercado Pago están cargadas
 * @returns {boolean}
 */
export function isMercadoPagoConfigured() {
  return Boolean(MERCADO_PAGO_PUBLIC_KEY && MERCADO_PAGO_PUBLIC_KEY !== 'tu_public_key_aqui')
}

/**
 * Especificación del plan de suscripción de Vendedor
 */
export const VENDOR_MEMBERSHIP_PLAN = {
  id: 'plan_vendedor_cordalia',
  nombre: 'Membresía Vendedor Cordalia',
  precioCOP: 49900,
  moneda: 'COP',
  intervalo: 'mensual',
  caracteristicas: [
    'Publicación ilimitada de planes y experiencias turísticas',
    'Perfil de negocio verificado con sello verde Cordalia',
    'Contacto directo por WhatsApp con turistas y viajeros',
    'Panel de gestión de salidas grupales y cupos en tiempo real',
    'Visibilidad preferencial en el buscador de destinos de Córdoba',
  ],
  estado: isMercadoPagoConfigured() ? 'activo' : 'pendiente_credenciales',
}

/**
 * Placeholder / Arquitectura para iniciar el checkout de Mercado Pago
 * Cuando se pasen las variables de entorno, este método invoca el SDK oficial
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.email
 * @returns {Promise<{ preferenceId: string, initPoint: string }>}
 */
export async function iniciarSuscripcionVendedor({ userId, email }) {
  if (!isMercadoPagoConfigured()) {
    throw new Error(
      'Mercado Pago aún no tiene las variables de entorno configuradas (VITE_MERCADOPAGO_PUBLIC_KEY).'
    )
  }

  // Flujo listo para invocar backend: POST /api/pagos/vendedor/preferencia
  const response = await fetch('/api/pagos/vendedor/preferencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, planId: VENDOR_MEMBERSHIP_PLAN.id }),
  })

  const data = await response.json()
  if (!data.success) {
    throw new Error(data.message || 'No se pudo generar la preferencia de Mercado Pago')
  }

  return data
}
