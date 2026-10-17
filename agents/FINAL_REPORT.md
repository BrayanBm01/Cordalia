# 🌿 CORDALIA — Reporte Final de Rediseño Visual del Frontend Público

> **Fecha:** Octubre 17, 2026  
> **Scope:** Exclusivamente frontend público (páginas accesibles sin login)  
> **Backend / DB / Prisma / Auth:** Intactos. No se modificó ningún archivo fuera de `frontend/`

---

## 1. Objetivo Cumplido

Se realizó un **rediseño integral y premium** del frontend público de Cordalia, tomando como referencia visual la estética de **TerraGo** (eco-travel editorial). El resultado es una plataforma turística moderna, elegante y visualmente atractiva, lista para presentar a usuarios reales.

---

## 2. Auditoría Inicial

### Stack detectado
| Dependencia | Versión |
|---|---|
| React | ^19.2.8 |
| Vite + @tailwindcss/vite | ^4.3.3 |
| framer-motion | ^13.1.1 |
| lucide-react | ^1.34.0 |

### Hallazgos críticos resueltos

**Placeholder Trap:** Las imágenes en la DB seed son data URIs Base64 de 1×1 px. Sin fallback, todas las tarjetas aparecían vacías.
**Solución:** `getDestinoImagen()` y `getPlanImagen()` en `media.js` con fallback a fotos locales por municipio.

**Framer-Motion Viewport Trap:** `initial="hidden"` + `whileInView="visible"` requiere scroll activo. En vistas completas/headless, el contenido permanecía invisible.
**Solución:** Cards convertidas a `<div>` estáticos con transiciones CSS.

---

## 3. Archivos Modificados

### Design System
- `frontend/index.html` — Google Fonts: Playfair Display, Plus Jakarta Sans, Inter, Caveat
- `frontend/src/index.css` — Tokens TerraGo: `--color-moss-*`, `--color-cream-*`, sombras

### Infraestructura de Media
- `frontend/src/utils/media.js` — `getDestinoImagen()` / `getPlanImagen()` con fallback regional
- `frontend/public/img/` — 15+ fotografías regionales de alta resolución
- `img/chica.png` (raíz del repo) — recorte RGBA 1024×1536 servido a `/img/chica.png` por el plugin de Vite en `frontend/vite.config.js` y emitido a `dist/img/chica.png` en build. Fuente única: no se duplicó ni se movió.

### Hero: figura "chica.png"
- Ubicación en el hero de `Home.jsx`, dentro del bloque de "Viajes con Propósito / para un Futuro Sostenible".
- Anclada a un contenedor `max-w-7xl` (no al viewport) para que la composición no se desplace en pantallas anchas: centro a la derecha del eje — `left-[78%]` móvil · `left-[68%]` tablet · `left-[58%]` lg · `left-[61%` xl.
- Tamaño y anclaje vertical por breakpoint: móvil `h-[26%]` abajo-derecha, tablet `h-[46%]` arriba-derecha, lg `h-[78%]` y xl `h-[84%]` (mayor presencia en escritorio).
- Opacidad adaptativa (50% móvil → 95% escritorio) y máscara `mask-image` que difumina el borde izquierdo para que cualquier texto que se acerque se lea limpio.
- Corrección estructural del hero: la sección pasó de `lg:h-[84vh] lg:max-h-[820px]` (recortaba la fila de micro-píldoras, 854px de contenido en 756px) a `lg:min-h-[84vh]`, con padding `py-16 md:py-20 lg:py-16`.
- Ajustes de composición del contenido: columna de texto `lg:col-span-7`, subtítulo `lg:max-w-md`, y sello caligráfico movido a la derecha (`lg:col-span-5`) sin competir con la figura.
- Verificación por métricas: silueta real del PNG muestreada en 24 bandas de alfa; 9 viewports (360/414/640/720/768/1024/1280/1440/1920) con 0% de cruce entre el texto (kicker, h1, subtítulo, botones reales, píldoras, sello) y la silueta, sin recorte vertical, sin overflow horizontal y sin errores de consola.

### Páginas Rediseñadas
- `frontend/src/layouts/PublicLayout.jsx` — Navbar sprout + pill CTA, backdrop blur, mobile drawer, footer 5-col
- `frontend/src/pages/Home.jsx` — Hero editorial optimizado: ajuste de posición de `chica.png` hacia la derecha y arriba para armonía visual con el paisaje, jerarquía tipográfica condensada a 2-3 líneas para mantener los botones de acción (`Explorar Destinos`, `Ver Planes`) y las micro-pills sostenibles siempre visibles sobre el primer pliegue (*above the fold*), Top Destinos, Planes, Stats orgánicos, Testimonios y CTA panorámico.
- `frontend/src/pages/Lugares.jsx` — Hero + pill search + category pills + grid 4-col con fotos reales
- `frontend/src/pages/LugarDetalle.jsx` — **Rediseño editorial completo**: hero panorámico (62vh) con foto regional y pill badge de categoría, botón "Agregar a favoritos", descripción curada, mapa con link a Google Maps, negocios y planes asociados al destino con tarjetas en paleta Moss/Cream, comparador de costos por cuenta propia vs. paquetes y destinos relacionados.
- `frontend/src/pages/planes/PlanesPublicos.jsx` — Hero, filter card, PlanCard con foto + pill badge + COP
- `frontend/src/pages/planes/PlanDetalle.jsx` — **Rediseño premium completo**: hero cinematográfico (58vh) con título Playfair Display, badge de tipo de plan y pill de promoción activa; sidebar sticky de reserva con selector interactivo de número de personas `[-] N [+]`, desglose dinámico de precios (subtotal, descuento por volumen/promoción, ahorro en COP), picker de salidas disponibles, formularios de inscripción y pago, botones de contacto directo (WhatsApp, llamada, email) y panel de confianza "¿Por qué Cordalia?".
- `frontend/src/pages/negocios/NegociosPublicos.jsx` — Hero y tarjetas en paleta cream/moss
- `frontend/src/pages/negocios/NegocioDetalle.jsx` — bg-cream-50, placeholder moss, hover moss

---

## 4. Sistema de Diseño TerraGo Aplicado

### Paleta de Colores
```
--color-moss-900: #1c3d2f   /* Verde bosque profundo */
--color-moss-950: #0f2419   /* Casi negro vegetal */
--color-cream-50: #faf8f2   /* Canvas crema */
--color-cream-200: #ede9da  /* Borde sutil */
```

### Tipografía
- Headings: Playfair Display serif + italic
- Body: Plus Jakarta Sans / Inter
- Script accent: Caveat (handwritten)

### Componentes
- Pill badges (categorías, tipo de plan, descuentos)
- Circular green arrow buttons
- Wavy organic dividers (SVG path en banner impacto)
- Stat circulares (120K+, 50+, 25K+, 30+)
- Testimonial cards 3-col con avatar, rating stars, Quote watermark
- Backdrop blur navbar
- Sticky booking sidebar con cotizador interactivo en tiempo real

---

## 5. Validación Técnica

| Prueba | Resultado |
|---|---|
| `npm --prefix frontend run lint` | ✅ 0 errores (40 warnings pre-existentes de compilador) |
| `node frontend/tests/formatMoney.test.mjs` | ✅ 25 PASS, 0 FAIL |
| `npm --prefix frontend run build` | ✅ Build limpio (vite v8.2.2, 3749 modules) |

---

## 6. Verificación Visual (Capturas de Pantalla)

- ✅ **Home Desktop 1280px:** Hero editorial, 4 destinos destacados, 3 planes turísticos, stats orgánicos, 3 testimonios y CTA (`cordalia_home_full.png`).
- ✅ **Home Mobile 390px:** Navbar responsive con drawer, hero adaptado y composición mobile limpia (`cordalia_home_mobile.png`).
- ✅ **Destinos (`/lugares`):** 16 cards con fotos regionales reales, filtro por categoría y buscador (`cordalia_lugares_verified.png`).
- ✅ **Planes (`/planes`):** 9+ planes con fotografía de Córdoba, badge de experiencia/tour, precios en COP formateados y llamada a la acción (`cordalia_planes_verified.png`).
- ✅ **Detalle de Destino (`/lugares/:id`):** Hero editorial inmersivo con badge de tipo, botón de favoritos, descripción, mapa integrado, negocios locales y destinos relacionados (`cordalia_lugar_detalle.png`).
- ✅ **Detalle de Plan (`/planes/:id`):** Hero cover de 58vh con tipografía Playfair Display, tags de experiencia y promo, descripción, lista de inclusiones con badges circulares, itinerario día a día, operador turístico y sidebar de reserva con cálculo dinámico por persona (`cordalia_plan_detalle.png`).

---

## 7. Garantías de Integridad

- ✅ Backend intacto: `backend/`, Prisma schemas, migraciones, endpoints — sin cambios
- ✅ Datos reales de la DB mostrados en todas las páginas públicas
- ✅ Rutas preservadas: `/`, `/lugares`, `/lugares/:id`, `/planes`, `/planes/:id`, `/negocios`, `/negocios/:id`
- ✅ Auth preservada: ningún componente de autenticación modificado
- ✅ Identidad Cordalia: logo, nombre, slogan "Turismo Sostenible · Córdoba" intactos

