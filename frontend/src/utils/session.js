// Constantes de sesión (cliente). El auto-logout por inactividad
// solo cuenta interacción humana real (no renders/fetch/polling).
export const SESION_INACTIVIDAD_MS = 2 * 60 * 1000
export const SESION_INACTIVIDAD_FLAG = 'cordalia_sesion_inactividad'