# Guía de despliegue y producción — Cordalia

Documento de referencia para desplegar y verificar Cordalia (frontend en
Vercel, backend en Render, base de datos en Supabase/PostgreSQL).

> Nada de lo que hay aquí se aplica automáticamente. Las migraciones y el
> despliegue se ejecutan **de forma manual y revisada**.

---

## 1. Resumen de la arquitectura

| Pieza | Servicio | URL |
|---|---|---|
| Frontend (React + Vite) | Vercel | `https://cordalia.vercel.app` |
| Backend (Express) | Render | `https://cordalia.onrender.com` |
| Base de datos | Supabase / PostgreSQL | (host privado) |

El frontend **no llama al backend por su propio dominio**: `frontend/vercel.json`
reescribe `/api/*` hacia Render y todo lo demás a `index.html` (SPA
fallback). Por eso el navegador siempre habla con el mismo origen y no hay
problemas de CORS en producción.

```jsonc
// frontend/vercel.json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://cordalia.onrender.com/api/:path*" },
    { "source": "/:path*",       "destination": "/index.html" }
  ]
}
```

El **fallback a `index.html` es obligatorio**: sin él, recargar o usar el
botón "atrás" en una ruta interna devuelve la página `404 NOT_FOUND` de
Vercel.

---

## 2. Variables de entorno

### 2.1 Render (backend) — SECRETAS

Se configuran en *Render → Environment* del servicio web del backend.

| Variable | ¿Secreto? | Valor en producción | Para qué sirve |
|---|---|---|---|
| `NODE_ENV` | No | `production` | Modo del servidor |
| `PORT` | No | (lo asigna Render) | Puerto HTTP |
| `DATABASE_URL` | **Sí** | `postgresql://…` | Conexión a Supabase/Postgres |
| `DB_SSL` | No | `true` | Render/Supabase suelen exigir TLS |
| `JWT_SECRET` | **Sí** | clave aleatoria larga | Firma de los JWT |
| `JWT_EXPIRES_IN` | No | `2h` | Vigencia de la sesión |
| `AUTH_RATE_LIMIT_MAX` | No | `30` | Intentos de login por IP cada 15 min |
| `FRONTEND_URL` | No | `https://cordalia.vercel.app` | CORS + enlaces de retorno |
| `BACKEND_URL` | No | `https://cordalia.onrender.com` | CORS + base de la webhook |
| `APP_URL` | No | igual que `BACKEND_URL` | Alternativa a `BACKEND_URL` |
| `GOOGLE_CLIENT_ID` | No (es público) | `…apps.googleusercontent.com` | Audiencia del ID token de Google |
| `PAYMENT_PROVIDER` | No | `mercadopago` | `mock` = sandbox, `mercadopago` = cobros reales |
| `MERCADOPAGO_ACCESS_TOKEN` | **Sí** | token de la app | Crear preferencias y consultar pagos |
| `MERCADOPAGO_WEBHOOK_SECRET` | **Sí** | secreto de la webhook | Verificar la firma `x-signature` |
| `MAIL_PROVIDER` | No | `http` | `log` = solo desarrollo |
| `MAIL_API_URL` | No | endpoint del proveedor de correo | Envío de correos |
| `MAIL_API_KEY` | **Sí** | clave del proveedor | Envío de correos |
| `MAIL_FROM` | No | `Cordalia <no-reply@cordalia.app>` | Remitente |

> `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` **nunca** se
> ponen en el frontend: el bundle es público.

### 2.2 Vercel (frontend) — PÚBLICAS

En *Vercel → Settings → Environment Variables* (marcar **Production**,
**Preview** y **Development**), y volver a desplegar: las variables
`VITE_*` se incrustan en el bundle **en tiempo de build**.

| Variable | ¿Secreto? | Valor |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | No (es público) | El **mismo** `GOOGLE_CLIENT_ID` del backend |

No hay ninguna otra variable `VITE_*`: el frontend no necesita la public
key de Mercado Pago (la preferencia se crea en el backend).

### 2.3 Supabase / PostgreSQL

| Dato | Dónde |
|---|---|
| `DATABASE_URL` | Render (secreto) + `.env` local |
| `DB_SSL=true` | Render |
| Contraseña del usuario de la app | Solo en Supabase y en Render |

---

## 3. Migraciones

Las migraciones viven en `database/migrations/` y son **idempotentes y no
destructivas**. Orden de aplicación (las nuevas al final):

```
001 … 017   (ya aplicadas en producción)
018_inscripcion_gratuita.sql            ← Sección 6 (inscripciones gratuitas)
019_prueba_gratuita_suscripciones.sql    ← Secciones 4 y 5 (prueba + planes)
020_password_reset_tokens.sql            ← Sección 2 (recuperación de contraseña)
```

### Cómo aplicarlas (con revisión previa)

**Paso 0 — Comprobar si faltan (solo lectura).** Script listo en
`database/COMPROBACIONES-PRODUCCION.sql`; la primera consulta dice qué
migraciones hay:

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
            AND table_name='inscripciones' AND column_name='plan_id')      AS "018_ok",
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
            AND table_name='usuarios' AND column_name='trial_inicio')     AS "019_ok",
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public'
            AND table_name='password_reset_tokens')                        AS "020_ok";
```

Si `018_ok`, `019_ok` o `020_ok` son `false`, hay migraciones pendientes.
Sin ellas, el backend responde **503 `ESQUEMA_INCOMPLETO`** (y lo
detalla en el log de arranque).

```bash
# 1. Revisar el SQL antes de ejecutarlo
less database/migrations/018_inscripcion_gratuita.sql

# 2. Aplicar con psql (o con el editor SQL de Supabase), una a una
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/018_inscripcion_gratuita.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/019_prueba_gratuita_suscripciones.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/020_password_reset_tokens.sql

# 3. Verificar (las tres columnas deben salir en true)
psql "$DATABASE_URL" -f database/COMPROBACIONES-PRODUCCION.sql
```

**Orden obligatorio**: migraciones → reinicio de Render → (frontend).
Si el backend se despliega antes de migrar, el registro de vendedores
responde 503 y la cuenta **no** se crea a medias (la creación de la
cuenta y su prueba de 7 días son una sola transacción).

Qué hace cada una (resumen, sin datos destructivos):

- **018** — añade el estado `'confirmada'` a `inscripciones` (inscripción
  gratuita), la columna `inscripciones.plan_id` (con *backfill* desde el
  JOIN existente) y un índice único parcial que impide la inscripción
  duplicada del mismo usuario a la misma salida. **No borra ni modifica
  filas de pago.**
- **019** — añade a `usuarios` las columnas de prueba y estado comercial
  (`trial_inicio`, `trial_fin`, `estado_cuenta`, …), completa la tabla
  `subscriptions` (que existía sin usarse) y crea `suscripcion_pagos`.
  Los vendedores que ya existían quedan con `estado_cuenta = NULL`: su
  situación comercial **no cambia** hasta que un administrador la defina.
- **020** — crea `password_reset_tokens` (tokens de un solo uso).

> Las migraciones 018–020 ya están aplicadas en la base de datos **local**
> de desarrollo. En producción deben aplicarse **una vez**, revisando el
> SQL.

---

## 4. Google Cloud (OAuth)

1. *console.cloud.google.com* → proyecto → **APIs y servicios** →
   **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**.
2. Tipo de aplicación: **Aplicación web**.
3. **Orígenes de JavaScript autorizados**:
   - `http://localhost:5173` (desarrollo)
   - `https://cordalia.vercel.app` (producción)
4. El flujo usado es el **botón oficial de Google Identity Services + ID
   token**, por lo que **no se agrega URI de redireccion**.
5. Copiar el *Client ID*:
   - `GOOGLE_CLIENT_ID` en Render,
   - `VITE_GOOGLE_CLIENT_ID` en Vercel.
   - Deben ser **exactamente el mismo** valor: el backend valida la
     audiencia del ID token contra `GOOGLE_CLIENT_ID`.

---

## 5. Mercado Pago (suscripciones comerciales)

> Los **planes turísticos no tienen pagos**. Mercado Pago se usa
> **exclusivamente** para el plan comercial mensual del vendedor.

### 5.1 Crear la aplicación

1. Panel de Mercado Pago → **Aplicaciones** → **Crear aplicación**.
2. Tipo: **Checkout Pro** (o **Preferencias**).
3. Copiar el **Access Token** de producción → `MERCADOPAGO_ACCESS_TOKEN`
   en Render.
4. Copiar el **secreto de la firma (signing secret)** de la sección
   *Notificaciones* → `MERCADOPAGO_WEBHOOK_SECRET` en Render.

### 5.2 Configurar la webhook

- **URL de notificación**:
  `https://cordalia.onrender.com/api/suscripciones/webhook/mercadopago`
- **Eventos**: *Pagos* (y *Suscripciones* si se activan en el futuro).
- El backend **verifica la firma `x-signature`** (HMAC-SHA256 de
  `id:timestamp:body`) y **rechaza** la petición si la firma no es válida,
  si falta o si el timestamp está fuera de una ventana de 5 minutos.
  Si `MERCADOPAGO_WEBHOOK_SECRET` no está configurado, la webhook
  responde **401** y no procesa nada (*fail closed*).

### 5.3 Activar los cobros reales

1. En Render: `PAYMENT_PROVIDER=mercadopago` y las credenciales de arriba.
2. Reiniciar el servicio.
3. Verificar:
   ```bash
   curl -s https://cordalia.onrender.com/api/health
   ```
4. Probar con **credenciales de prueba** de Mercado Pago antes de usar
   dinero real. El backend no expone el estado del proveedor en un
   endpoint público; el vendedor lo ve en *Mi plan y pagos*.

### 5.4 Cómo se activa una suscripción (y por qué es segura)

```
Navegador            Backend                 Mercado Pago
    |  POST /api/vendedor/suscripciones      |
    |---------------------------------------->|
    |              valida plan + importe      |
    |              crea suscripción 'pending' |
    |              crea la preferencia ------->
    |<------------- url de checkout -----------|
    |  redirige al checkout                    |
    |                                           | (el usuario paga)
    |                                           |--> webhook (con firma)
    |              verifica la firma           |<-
    |              CONSULTA el estado real      |
    |              activa (idempotente) --------|
```

La suscripción **no** se activa por abrir la página de pago ni por
volver de la redirección: solo un evento verificado la activa. Un evento
repetido no la activa dos veces (clave de idempotencia única en
`suscripcion_pagos.idempotency_key`).

---

## 6. CORS

El backend acepta únicamente:

- `http://localhost:5173` (desarrollo),
- `http://localhost:3000`,
- `FRONTEND_URL`,
- `BACKEND_URL`.

`FRONTEND_URL` admite varios orígenes separados por coma (previews de
Vercel). **No** se permiten orígenes arbitrarios. La barra final y las
mayúsculas se normalizan (`https://x.com/` ≡ `https://x.com`).

> En producción el navegador llama a `/api/*` del **mismo origen** de
> Vercel, así que CORS ni siquiera llega a activarse; sigue siendo
> necesario para llamadas directas al backend.

---

## 7. Verificación paso a paso

### 7.1 Backend

```bash
curl -s https://cordalia.onrender.com/api/health
# {"success":true,"message":"API funcionando"}
```

### 7.2 Frontend (SPA + proxy)

```bash
curl -s https://cordalia.vercel.app/api/health
# {"success":true,"message":"API funcionando"}   <- el proxy /api funciona

curl -s -o /dev/null -w "%{http_code}\n" https://cordalia.vercel.app/planes/1
# 200   <- fallback SPA: una ruta interna NO debe devolver 404 de Vercel
```

### 7.3 Funcional (con sesion)

1. **Registro de turista** → entra a `/perfil` → *Mis inscripciones* está
   vacío.
2. **Inscripción gratuita** → abrir un plan → elegir fecha → *Inscribirme*
   → debe aparecer *¡Inscripción confirmada!* con **Costo: Gratis** y sin
   ningún botón de pago. El cupo disponible baja en 1.
3. **Registro de vendedor** → registrarse como *Vendedor* → el registro
   **inicia la sesión** y el usuario entra **directo a
   `/panel-vendedor`** (sin volver a escribir su contraseña) → debe
   mostrar el bloque *Tu prueba gratuita está activa*, **7 días
   restantes**, la fecha real de inicio y la de finalización, y el
   catálogo de planes con su precio mensual.
4. **Expiración de la prueba** → en la base de datos:
   ```sql
   UPDATE usuarios SET trial_fin = NOW() - interval '1 minute'
    WHERE email = 'correo@del-vendedor.com';
   ```
   → recargar `/panel-vendedor` → *Tu prueba gratuita de 7 días terminó*;
   → al intentar crear un plan: **403** con el mensaje de la prueba vencida;
   → el perfil, el panel y el catálogo de planes siguen accesibles;
   → el botón *Contratar* sigue disponible.
5. **Contratar plan** → *Contratar* → en sandbox la suscripción queda
   `active` y aparece en el historial; el plan actual y la fecha de fin se
   muestran en el panel.
6. **Cerrar sesión y volver a entrar** → el vendedor vuelve a
   `/panel-vendedor` y **la prueba no se reinicia** (mismas fechas).
6b. **Administrador** → inicia sesión → llega a la **página pública**
   (`/`) como cualquier visitante; su sesión y sus permisos siguen
   intactos y abre `/admin` cuando lo necesita (la ruta sigue protegida
   por rol ADMIN).
7. **Administración** → `/admin/vendedores` → ver el estado comercial de
   cada vendedor → *Suspender cuenta* → el vendedor recibe **403** en las
   escrituras comerciales → *Reactivar cuenta* → recupera el acceso.
8. **Google** → *Continuar con Google* → debe entrar y, si es una cuenta
   nueva de vendedor, arrancar con la prueba de 7 días (y llegar a
   `/panel-vendedor`).
9. **Expiración de sesión** → dejar 8 minutos sin actividad → la app
   vuelve a `/` (no a una página 404) con el aviso *Tu sesión se cerró por
   inactividad*.
10. **Contraseña de una cuenta de Google** → *Establece tu contraseña* (en
   `/login`) → se recibe el enlace (en `MAIL_PROVIDER=log` aparece en el
   log del backend) → al abrirlo, la contraseña nueva funciona y el enlace
   no sirve por segunda vez.

### 7.4 Comprobación de que no se filtran secretos

```bash
# El bundle del frontend NO debe contener el access token ni el secreto
curl -s https://cordalia.vercel.app/ | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' \
  | head -1 | xargs -I{} curl -s "https://cordalia.vercel.app{}" \
  | grep -E "MERCADOPAGO_ACCESS_TOKEN|MERCADOPAGO_WEBHOOK_SECRET|JWT_SECRET" \
  && echo "!!! REVISAR !!!" || echo "OK: sin secretos en el bundle"
```

---

## 8. Limitaciones conocidas

1. **Mercado Pago real no está verificado con dinero real.** La
   integración (preferencias, webhook con verificación de firma, consulta
   del estado real, idempotencia) está implementada y probada en modo
   `mock`. Activarla requiere credenciales de producción y una prueba
   autorizada con un pago real.
2. **El envío de correos no está configurado.** La recuperación de
   contraseña genera un token seguro (un solo uso, 1 h, hash SHA-256) pero
   sin un proveedor de correo el endpoint responde **503** con un mensaje
   claro. En `MAIL_PROVIDER=log` el enlace se escribe en el log.
3. **La prueba gratuita de 7 días solo se aplica a cuentas nuevas.** Los
   vendedores anteriores quedan con `estado_cuenta = NULL` (sin política
   aplicada) hasta que un administrador defina su situación.
4. **Los planes turísticos no tienen pagos.** Las suscripciones y las
   inscripciones son flujos separados: `subscriptions` (con pago) vs
   `inscripciones` (gratuitas).
