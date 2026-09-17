# FINAL REPORT — Contenido dinámico de destinos & formulario de negocios (Cordalia)

## Resumen del Trabajo
Se implementó el contenido dinámico por destino (Qué hacer / Qué visitar / Información para tu viaje / comparación de presupuesto) administrable desde catálogos reutilizables solo por ADMINs, y se corrigió el formulario de negocios con select de moneda y precios condicionales por categoría.

## Backend
- **Migración 015 aplicada** (`database/migrations/015_contenido_destinos.sql`):
  - Tablas `actividades`, `puntos_interes`, `destino_actividades`, `destino_puntos_interes`, `destino_info_viaje`
  - Seeds: 16 actividades, 24 puntos de interés, 51 asignaciones de actividades (con `orden`), 36 asignaciones de puntos, 16 filas de `destino_info_viaje` (moneda + costos)
- **Nuevos endpoints**:
  - Públicos: `GET /api/lugares/:id/contenido`, `GET /api/lugares/:id/presupuesto`
  - Admin (catálogos): `GET/POST /api/contenido/actividades`, `PUT/DELETE /api/contenido/actividades/:id`, idem `puntos`
  - Admin (gestión por destino): `GET /api/lugares/:id/administrar`, `POST /api/lugares/:id/administrar/contenido/actividades` (y `/puntos`), `DELETE .../:actividadId`, `POST /api/lugares/:id/administrar/info-viaje`
- **Correcciones clave**:
  - `express.Router({ mergeParams: true })` para exponer el `:id` del lugar en rutas anidadas
  - `upsertInfoViaje` usa referencias `EXCLUDED.col` en `ON CONFLICT` (los placeholders posicionales guardaban `1` en los textos)
- **Validaciones de negocios** (`businessController.js`):
  - Whitelist de monedas: COP, USD, EUR, MXN, PEN (reemplaza la regex libre de 3 letras)
  - Categorías sin rango de precios (Bar, Cafe, Tienda, Transporte, Otro) rechazan `precio_min`/`precio_max`
  - Categorías con rango (Restaurante, Hotel, Hostal, Tour, Agencia de viajes, Experiencia turistica, Atraccion turistica): precios opcionales pero validados (mín ≤ máx)
  - Fix: la validación de update usa la categoría actual del negocio aunque el body no la incluya
- **Testing**: nueva suite `12-contenido-destinos.test.js`; suite completa `npm test` → **111 PASS / 0 FAIL**

## Frontend
- `services/api.js`: `lugaresAPI.contenido`, `.presupuesto`, `.administrar`, asignación/desasignación de actividades y puntos, `saveInfoViaje`; grupo `contenidoAPI`
- `pages/admin/DestinoContenidoManager.jsx` (nuevo): modal admin con pestañas para asignar/reordenar/desasignar contenido, crear ítems en catálogo y editar la info de viaje (moneda + costos), conectado en `AdminDestinos.jsx`
- `pages/LugarDetalle.jsx`: "Qué hacer", "Qué visitar" e "Información para tu viaje" ahora provienen del API; nueva sección **"¿Por tu cuenta o con planes?"** que compara los costos reales de `info_viaje` contra los planes de negocios aprobados del destino (sin inventar ahorros). `data/destinos.js` queda como fallback visual (hero/gallery/overview)
- `pages/negocios/NegocioForm.jsx`: moneda como `<select>` (COP/USD/EUR/MXN/PEN); campos `precio_min`/`precio_max` condicionales — obligatorios y visibles en categorías con rango, ocultos y nunca enviados en las demás

## Validación
- Backend: `npm test` → 111 PASS, 0 FAIL
- Frontend: `npx oxlint src` (0 errores) y `npx vite build` (build de producción OK)

## Próximos Pasos (Pendiente)
- Endpoint de Recomendaciones `GET /api/recomendaciones` y su sección en `LugarDetalle.jsx`
- Configurar credenciales reales de MercadoPago en `.env` para producción
- Migración 016: si se decide eliminar la columna `usuarios.pais` (actualmente se oculta en frontend)