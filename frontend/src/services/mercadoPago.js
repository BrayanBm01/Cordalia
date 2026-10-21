/**
 * Mercado Pago — Cordalia (frontend)
 *
 * ARQUITECTURA ACTUAL
 * ------------------------------------------------------------
 * Los planes TURISTICOS de Cordalia NO tienen pagos: la inscripción es
 * gratuita. Mercado Pago se usa EXCLUSIVAMENTE para el plan COMERCIAL
 * mensual del vendedor (suscripción).
 *
 * El cobro lo maneja el BACKEND:
 *   1. El navegador llama `POST /api/vendedor/suscripciones` con el
 *      `plan_id`.
 *   2. El backend valida el plan y su importe, crea la preferencia de
 *      Mercado Pago y devuelve la URL de checkout.
 *   3. El navegador redirige a esa URL.
 *   4. La suscripción se activa SOLO cuando el proveedor notifica el
 *      pago y el backend verifica la firma y consulta el estado real.
 *
 * Por eso el frontend NO necesita la public key ni el access token:
 * nunca se usa el SDK de Mercado Pago en el navegador y nunca se
 * exponen credenciales. Este módulo queda como catálogo informative.
 */

/**
 * Catálogo informativo de la membresía de vendedor.
 * El precio y la vigencia REALES los fija el backend (tabla `plans`):
 * esta lista es solo para textos informativos de la interfaz.
 */
export const VENDOR_MEMBERSHIP_PLAN = {
  id: 'plan_vendedor_cordalia',
  nombre: 'Membresía Vendedor Cordalia',
  precioCOP: 49000,
  moneda: 'COP',
  intervalo: 'mensual',
  caracteristicas: [
    'Publicación ilimitada de planes y experiencias turísticas',
    'Perfil de negocio verificado con sello verde Cordalia',
    'Contacto directo por WhatsApp con turistas y viajeros',
    'Panel de gestión de salidas grupales y cupos en tiempo real',
    'Visibilidad preferencial en el buscador de destinos de Córdoba',
  ],
}

/**
 * El proveedor se decide en el BACKEND (PAYMENT_PROVIDER).
 * El frontend no lo conoce: pregunta al endpoint de estado.
 * @returns {Promise<{proveedor: string, real: boolean, sandbox: boolean}>}
 */
export async function estadoProveedor() {
  const res = await fetch('/api/vendedor/estado', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  return data?.data?.proveedor || { proveedor: 'mock', real: false, sandbox: true }
}
