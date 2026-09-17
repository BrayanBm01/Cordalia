# OPENCODE — Backend de Cordalia

## Rol
OpenCode es el agente responsable del **backend** de Cordalia.

## Stack
- Node.js + Express 5
- PostgreSQL (pg)
- JWT para autenticación
- bcryptjs para contraseñas

## Estructura de archivos
```
backend/
├── src/
│   ├── app.js                  ← Configuración Express
│   ├── server.js               ← Entrada del servidor
│   ├── config/db.js            ← Conexión PostgreSQL
│   ├── controllers/            ← Lógica de negocio
│   ├── models/                 ← Consultas SQL
│   ├── routes/                 ← Definición de rutas
│   ├── middlewares/            ← Auth, admin, errores
│   ├── services/               ← Servicios externos
│   └── utils/                  ← JWT, password, validators
├── tests/                      ← Tests
└── .env                        ← Variables de entorno (no versionar)
```

## Bases de datos — Estado actual de tablas relevantes

### `inscripciones`
Estado actual: solo `'confirmada' | 'cancelada'`

**PENDIENTE DE IMPLEMENTAR**: cambiar a sistema con pagos:
```sql
-- Estado requerido para sistema de pagos
'pending' | 'paid' | 'failed' | 'cancelled' | 'expired'
```

### `usuarios`
Tiene columna `pais` (no eliminar de BD — solo se ocultó del frontend).

## APIs pendientes que Antigravity necesita

### 1. Recomendaciones (Parte 20)
```
GET /api/recomendaciones
Authorization: Bearer <token>
// Usar preferencias_viaje e intereses_turisticos del usuario
// Sistema determinístico de coincidencias, sin IA
Response: {
  destinos: Array<Lugar>,
  planes: Array<TourPlan>,
  razon: string   // ej: "Basado en tus intereses de naturaleza"
}
```

### 2. Información de destino administrable (Partes 8-10)
```
GET /api/lugares/:id/actividades
GET /api/lugares/:id/lugares-visitar  
GET /api/lugares/:id/info-viaje        // incluye comparación de presupuesto
```

## Migraciones pendientes

### 015 — Tablas para información de destino
```sql
CREATE TABLE IF NOT EXISTS destino_actividades (
  id SERIAL PRIMARY KEY,
  lugar_id INTEGER NOT NULL REFERENCES lugares(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50),  -- 'qué hacer' | 'qué visitar'
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS destino_info_viaje (
  id SERIAL PRIMARY KEY,
  lugar_id INTEGER NOT NULL UNIQUE REFERENCES lugares(id) ON DELETE CASCADE,
  transporte TEXT,
  alimentacion TEXT,
  alojamiento TEXT,
  costo_propio_min INTEGER,
  costo_propio_max INTEGER,
  costo_cordalia_min INTEGER,
  costo_cordalia_max INTEGER,
  duracion_recomendada VARCHAR(100),
  recomendaciones TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Seguridad — Reglas críticas

- Un usuario solo puede ver SUS inscripciones
- No confiar en `paymentSuccess=true` enviado desde frontend
- El backend debe confirmar el pago directamente con MercadoPago
- Prevenir IDOR en todos los endpoints de inscripciones y comprobantes

## Tests requeridos (Parte 25)
Ver `SHARED_CONTEXT.md` sección "Tests pendientes".
