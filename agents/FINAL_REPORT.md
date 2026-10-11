# FINAL REPORT — Auditoría, vencimiento de viajes, promociones y sesión (Cordalia)

## Resumen del Trabajo
Se implementaron cuatro correcciones de alto impacto sobre Cordalia: (1) la página de inicio y el detalle de destinos muestran exclusivamente contenido de **Córdoba, Colombia** y eliminan los datos hardcodeados antiguos de Colombia general que causaban un mismatch por IDs; (2) las inscripciones pagadas cuya salida ya pasó cambian al estado `vencida` sin liberar cupo; (3) el backend recalcula y almacena el precio vigente al momento de pagar, y el frontend defiende contra payloads desactualizados; (4) un auto-logout por 2 minutos de inactividad humana invalida la sesión en el backend y muestra un aviso claro en `/login`.

---

## Auditoría — Inicio, vencimientos, promociones y seguridad

### PASS
- **Inicio: enfoque Córdoba**
  - Hero de `Home.jsx`: "Explora **Córdoba**", subtítulo "...un departamento lleno de cultura…", badge "Descubre Córdoba con Cordalia", fallback de ubicación "Córdoba, Colombia".
  - `data/destinos.js` eliminado (estaba keyeado por IDs antiguos de Colombia y causaba que Montería mostrara el hero/gallery de Cartagena).
  - `LugarDetalle.jsx` consume el API (`lugar.imagen`, `lugar.descripcion`); la galería y el overview hardcodeados de destinos viejos se eliminaron; la sección "También te puede interesar" ahora consulta `lugaresAPI.getAll()` priorizando el mismo municipio/tipo.
  - `package.json` (raíz) y `backend/package.json` apuntan a Córdoba en `description`/`keywords`.

- **Vencimiento de viajes pagados (estado `vencida`)**
  - Migración `016_estado_viaje_vencido.sql` aplicada: extiende `chk_inscripciones_estado` con `vencida` y crea índices `idx_inscripciones_estado_salida` + `idx_salidas_fecha`.
  - `inscripcionModel.expirarVencidas` ahora también actualiza `pagada` con `s.fecha < CURRENT_DATE` → `vencida` **sin liberar cupo**.
  - `inscripcionController.misInscripciones` agrupa `vencidas` (array adicional); `pagar` rechaza pagos de inscripciones `vencida`.
  - `Perfil.jsx`: badge "Viaje vencido" (rojo), sección "Viajes vencidos (ya ocurrieron)", `InscripcionCard` muestra "Ver plan".
  - `SalidasPanel.jsx` (panel de negocio): badge y label de `vencida`.

- **Promociones: backend como fuente de verdad + recálculo al pagar**
  - `promoVigente()` en `planUtils.js`: compara fechas locales (Bogotá), día completo de `fecha_fin`, y descarta `inactivo`; `planPrecios` lo utiliza para ignorar promos expiradas en payloads desactualizados.
  - Backend `pagar`: invoca `PlanModel.calcularPrecio(plan_id, personas, false)` (usa `CURRENT_DATE` en PostgreSQL) y actualiza el snapshot vía `InscripcionModel.actualizarSnapshotPrecio` si el total cambió, **antes** de llamar a `paymentService.crearPago`. El frontend nunca envía precio.

- **Auto-logout por inactividad (2 min)**
  - `AuthContext.jsx`: `useEffect` escucha `pointermove`, `mousedown`, `keydown`, `touchstart`, `wheel` (solo con sesión activa). NO cuenta renders/fetch/polling. Al expirar: `authAPI.logout()` real → limpieza de storage → `window.location.href = '/login'` con flag en `sessionStorage`.
  - `Login.jsx`: muestra toast "Sesión cerrada por inactividad" con descripción clara.

- **Validación**
  - Frontend: `npx oxlint src` → 0 errores; `npx vite build` → OK.
  - Backend: `npm test` (node tests/run-all.js) → **113 PASS / 0 FAIL** (2 tests nuevos: recálculo de promo vencida + viaje vencido).

### FAIL
- (ninguno)

### WARNINGS
- Pre-existente: `LugarDetalle.jsx` / múltiples archivos — `set-state-in-effect` (patrón React Compiler, no bloqueante).
- Pre-existente: `Perfil.jsx` — import `XCircle` no utilizado.
- Pre-existente: `AuthContext.jsx` — `only-export-components` (hook `useAuth` exportado).
- Pre-existente: build chunk JS > 500 KB (code-splitting pendiente).

### Pendientes (acción futura)
- [ ] Endpoint `GET /api/recomendaciones` y su sección en `LugarDetalle.jsx`.
- [ ] Credenciales reales de MercadoPago en `.env` para producción.
- [ ] Tests E2E (Playwright/Cypress) de flujos críticos: login → pago → vencimiento de viaje.

---

## Qué falta
- Recomendaciones (endpoint + UI) — pendiente desde fases anteriores.
- MercadoPago real en producción.
- Tests E2E automatizados.

## Riesgos
- El `setTimeout` de auto-logout puede ser retardado por el navegador en pestañas de fondo; 2 minutos es el objetivo, no una garantía absoluta.
- Las migraciones se aplican manualmente/psql; el entorno de producción debe ejecutar `016_estado_viaje_vencido.sql` antes del despliegue.
- La eliminación de `data/destinos.js` rompe imports futuros a propósito; cualquier página que lo importara ya no compila (comportamiento deseado).

## Próximos Pasos
1. Agregar tests E2E de los flujos críticos (login, pago, vencimiento de viaje, promo vencida).
2. Configurar MercadoPago real y probar webhook en sandbox.
3. Evaluar `code-splitting` para reducir el chunk JS mayor a 500 KB.
4. Documentar el mecanismo de despliegue de migraciones (si no es psql directo, integrar en CI/CD).

---

# Reforma del sistema de promociones: "precio anterior" eliminado

## Resumen
Se eliminó de raíz el concepto de **"precio anterior" / "precio promocional"** (tanto en `tour_plans` como en `promotions`) y se estableció un modelo único y verificable por los casos de prueba 1–10:

- `plan.precio` = **precio normal permanente** (única fuente de verdad).
- `promotion` = **descuento temporal** (`tipo_descuento` `porcentaje` | `valor` fijo COP) vigente entre `fecha_inicio` y `fecha_fin`, calculado **SIEMPRE** sobre `plan.precio`.
- Ninguna promoción activa puede **solaparse** (mismo plan + rangos que se intersecten + estado activo).
- El **backend es la autoridad**: ignora/rechaza cualquier intento de fijar precio o descuento desde el cliente.

## Auditoría inicial
- **❌ Bug reportado**: con promo 24% y precio normal $132.000, el sistema mostraba/cobraba con un `precio_promocional` desactualizado ($100.000) en vez de $100.320.
- **❌ Defectos ampliados**: existían dos modelos de descuento en paralelo (promo fija y % sobre `precio_anterior`), sin solapamiento controlado, y el cliente podía informar precio.
- **✅ Base limpia para migrar**: inspección de la BD (09/2026) mostró que `promotions.precio_anterior` y `precio_promocional` eran **100% NULL** en datos reales, y `tour_plans.precio_anterior` solo tenía valor en el plan 161 creado por tests → el drop no afecta datos reales.

## Problemas encontrados → Solución
| Problema | Solución |
| --- | --- |
| Columnas redundantes y fuente de inconsistencia | Migración `017_eliminar_precio_anterior.sql` elimina `tour_plans.precio_anterior` y `promotions.precio_anterior` + `promotions.precio_promocional`; índices para búsqueda de vigencia/solapamiento. |
| Campos legado reintroducidos por el payload | Backend rechaza con **400** `precio_anterior`/`precio_promocional` en `plan` y `promotion` ("ya no existen"). |
| Promos activas solapadas por el mismo plan | `PromotionModel.hasActiveOverlap(planId, fechaInicio, fechaFin, excludeId)`; se valida en **crear**, **editar** (valores efectivos) y **activar**. |
| Cálculo de precio ambiguo | `PlanModel.calcularPrecio` solo usa promo vigente `porcentaje`/`valor` sobre `plan.precio`; sin promo → precio normal / rango grupal. |
| Cliente manipulando precios | `pagar` y creación de inscripción usan `calcularPrecio` del backend (CURRENT_DATE PostgreSQL); los flags/montos del cliente se ignoran. |
| "Precio anterior" visual mal derivado | `planUtils.planPrecios` muestra `anterior = plan.precio` SOLO cuando hay promo vigente y el efectivo < precio normal. |

## Cambios

### Backend (`backend/src`)
- `models/planModel.js` — columnas `precio_anterior`/`precio_promocional` fuera de SELECTs/INSERT; `calcularPrecio` sin rama de precio fijo.
- `controllers/planController.js` — `validarPlan` sin `precio_anterior`; rechazo 400 de campos legado.
- `models/promotionModel.js` — columnas fuera; `create()` sin ellas; nuevo `hasActiveOverlap`.
- `controllers/promotionController.js` — `validarPromo` sin campos; rechazo 400 de campos legado; solapamiento en `create`, `update` y `setEstado`.

### Frontend (`frontend/src`)
- `pages/negocios/planUtils.js` — `planPrecios` con `anterior = base` solo con promo vigente (`efectivo < base`).
- `pages/negocios/PlanForm.jsx` — campo "Precio normal (COP)"; eliminado "Precio anterior".
- `pages/negocios/PlanesNegocio.jsx` — PromoForm: sección "Descuento sobre el precio normal" (porcentaje o COP), vista previa "Precio normal · Descuento · Queda en", sin campos de precio legado.
- `pages/LugarDetalle.jsx` — badge de promo por tipo (porcentaje `-X%` o COP `-$X`) y precio efectivo calculado sobre `plan.precio`.

### Base de datos
- `database/migrations/017_eliminar_precio_anterior.sql` (nueva y aplicada).
- `database/migrations/008_seed_planes_promos.sql` y `009_seed_named_planes_promos.sql` — seeds sin las columnas.

### Tests (`backend/tests`)
- `06-planes.test.js` — eliminados casos sobre `precio_anterior`; nuevos casos: rechazo de campos legado y **bloqueo de promos activas solapadas** (400), promo sucesiva válida tras desactivar.
- `10-precio.test.js` — sin `precio_promocional`; sigue validando % sobre precio normal.
- `13-promos-vigencia.test.js` (NUEVO) — cubre los casos 1–10 (sin promo / activa / vencida / antes / durante / después / nueva promo / pago durante / pago después / manipulación de precio), con fechas movidas por SQL relativo a `CURRENT_DATE`.
- `run-all.js` — requiere `13-promos-vigencia.test`.

## Funcionamiento final (PLAN → PROMO → vence)
```
plan.precio = 100.000  (precio normal, permanente)
  + promo 20% activa y vigente → precio efectivo 80.000 (desc. ÚNICO, ordena rango grupal)
  + promo vencida / futura / inactiva → 100.000 (o descuento por rango de personas)
  + pago durante la promo → cobra 80.000 (snapshot promocional)
  + pago después de vencer → cobra 100.000 (el backend recalcula al pagar)
  + cliente envía "monto/precio 1" → el backend cobra 80.000/100.000
```

## Validación
- Backend: `npm test` → **119 PASS / 0 FAIL**.
- Frontend: `npx oxlint src` → 0 errores; `npx vite build` → OK.
- Servidor levantado y verificado contra `GET /api/pagos/estado` (200).

## Riesgos / notas
- La migración 017 **debe** ejecutarse en producción antes del despliegue (se aplica igual que 016).
- Integraciones externas que consuman `precio_anterior`/`precio_promocional` dejarán de ver esas columnas (comportamiento deseado).
- El solapamiento exige que el negocio desactive (o mueva fechas de) la promo vigente antes de crear otra activa en el mismo rango; los estados `inactivo` no bloquean.

---

# Auditoría Responsive + Fondo "Explora Córdoba" (Hero de Home)

## Resumen
Auditoría responsive del frontend React completo (público, paneles usuario/negocio/admin, modales, tablas y gráficos) **sin rediseñar** nada, y despliegue de `img/img1.jpeg` (raíz del repo) como fondo fotográfico del hero "Explora Córdoba" de `Home.jsx`. Validación en navegador real (Brave headless) sobre la matriz mobile/tablet/laptop/desktop: **7 rutas × 12 viewports** (320 → 1920), midiendo `scrollWidth` vs `clientWidth` del documento (sin `overflow-x:hidden` genérico; se corrige la causa real de cada overflow).

## ✅ PASS — Verificado (cambios aplicados)

### Fondo del hero "Explora Córdoba" (`Home.jsx` + `vite.config.js`)
- `backgroundImage: url("/img/img1.jpeg")` con `background-size: cover` y `background-position: center`, sobre el fallback `bg-ocean-950` (sin huecos azules mientras carga la foto).
- Overlay de legibilidad `bg-gradient-to-b from-dark-950/70 via-dark-950/40 to-dark-950/60` sobre toda la sección; blobs decorativos y resto del hero intactos.
- Contenido subido **~20px** con `-mt-5` dentro de la sección (la sección no se mueve: sigue siendo `min-h-screen`).
- Plugin `rootImgPlugin` en `frontend/vite.config.js`: sirve `/img/*` desde `../img` en dev (middleware) y emite el mismo contenido a `dist/img/` en build. **Única fuente**: el archivo no se duplica ni se mueve.
- Dev: `GET /img/img1.jpeg` → **200 `image/jpeg`** (288,7 KB). Build: `dist/img/img1.jpeg` emitido (288,75 KB).

### Sin scroll horizontal (causa real corregida)
- Matriz completa `/, /lugares, /negocios, /planes, /lugares/4, /planes/6, /login` en 320/360/375/390/414/480/768/820/1024/1280/1440/1920 → **ningún elemento excede `clientWidth`** tras las correcciones.

### 🐛 Bug encontrado y corregido: hero de `LugarDetalle.jsx`
- **Síntoma**: `/lugares/4` desbordaba horizontalmente en TODOS los viewports (`scrollW=933` y `1167`).
- **Causa real**: `aspect-[21/9]` + `min-h-[400px] md:min-h-[500px]` sin ancho definido → el navegador deriva el **ancho mínimo transferido** desde la altura mínima: `400×21/9 = 933px` y `500×21/9 = 1167px` (valores medidos exactos).
- **Fix**: agregar `w-full` a la sección hero (ancho definido = contenedor; la altura sigue siendo `max(ancho/ratio, min-h)`). Desktop intacto (1280×549 en 1280px, ratio 21/9 correcto). Único caso del patrón en todo el frontend (verificado por grep).

### Correcciones menores de tabs y modales
- `AdminResenas.jsx`: tabs de filtro con `flex-wrap` (4 tabs con conteos desbordaban en ~320px).
- `MisFavoritos.jsx`: tabs con `flex-wrap` (mismo patrón, 2 tabs).
- `AdminUsuarios.jsx`: modal custom con `max-h-[85vh] flex flex-col` + form con `overflow-y-auto` + header `shrink-0` (consistente con `Modal.jsx`; evitaba clipping en viewports cortos).

### Confirmado OK sin cambios (ya responsivo)
- Layouts público/admin/negocio con sidebar + drawer móvil (`lg:hidden`).
- `Modal.jsx` / `ConfirmModal.jsx`: `max-h-[85vh]` + scroll interno.
- Tablas admin: `overflow-x-auto` + `max-h-[480px]` + thead sticky.
- `PlanDetalle.jsx`: `flex-col lg:flex-row` + aside `lg:w-80 shrink-0` sticky; `PlanesPublicos.jsx` grid adaptativo.
- `PieChartCard.jsx` y gráficos de `AdminDashboard.jsx`: `ResponsiveContainer`/alturas dinámicas; `ResumenNegocios.jsx` con inline style.

### Validación automatizada
- `npx oxlint src` → **0 errores / 32 warnings** (todos pre-existentes, ninguno nuevo de esta auditoría).
- `npx vite build` → **OK** (`dist/img/img1.jpeg` emitido; único warning = chunk JS > 500 KB, pre-existente).
- `node tests/formatMoney.test.mjs` (frontend) → **25 PASS / 0 FAIL**.
- `node tests/run-all.js` (backend, con API levantada en :3000) → **119 PASS / 0 FAIL** (sin regresión).

## ⚠️ WARNINGS (fuera del alcance responsive, sin cambios)
- `Lugares.jsx` hero aún dice **"Explora Colombia" / "Desde las playas del Caribe… Andes"** (mismatch de contenido con el enfoque Córdoba; pendiente de auditoría de contenido, no bloquea responsive).
- Warnings de lint pre-existentes: `set-state-in-effect`, `exhaustive-deps`, `only-export-components` (AuthContext), `XCircle` sin usar en `Perfil.jsx`, `incompatible-library` (react-hook-form `watch`), `const-comparisons` (`Lugares.jsx:108`).
- Chunk JS > 500 KB (code-splitting pendiente).

## ❌ FAIL
- (ninguno)

## 🐛 Bugs
- Único bug real encontrado: overflow del hero de `LugarDetalle.jsx` (ver arriba) → **corregido y re-verificado** (12/12 viewports OK, desktop idéntico).
- Los FAIL transitorios de "renderiza contenido" del primer pase fueron artefactos del primer render del dev server (re-compilación de módulos); descartados con `networkidle0` + wait largo en el re-check.

## Riesgos / notas
- El plugin asume la carpeta `img/` en la raíz del repo; si se mueve, actualizar `ROOT_IMG_DIR` en `frontend/vite.config.js`.
- `-mt-5` compensa ~20px dentro del padding `py-24` del hero; si se cambia el padding, revisar esa compensación.
- Verificación visual humana pendiente: screenshots generados en `/tmp/opencode/home_{320,375,768,1280}.png` (el navegador headless confirmó estilos computados y ausencia de overflow; revisión pixel a pixel queda para ojos humanos).

---

*Auditoría responsive + hero Córdoba: 18/09/2026 — 7 rutas × 12 viewports sin overflow; oxlint 0 errores, build OK, 25 tests frontend + 119 backend PASS.*

*Auditoría realizada: 17/09/2026 — Cordalia v2.1.0 (017 migraciones, 119 tests backend, frontend build OK).*
