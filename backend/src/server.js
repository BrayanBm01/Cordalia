const app = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// Verificación del esquema al arrancar.
//
// Las migraciones 018/019/020 (inscripciones gratuitas, prueba
// gratuita y suscripciones, tokens de recuperación) deben estar
// aplicadas ANTES de desplegar este código. Si falta alguna, el
// registro de vendedores fallaría con un error 500 ilegible; aquí se
// avisa con claridad en el log de arranque.
//
// Es una comprobación de SOLO LECTURA: no crea ni modifica nada.
// ------------------------------------------------------------
const REQUISITOS_ESQUEMA = [
  { tabla: "usuarios", columna: "trial_inicio" },
  { tabla: "usuarios", columna: "trial_fin" },
  { tabla: "usuarios", columna: "estado_cuenta" },
  { tabla: "subscriptions", columna: "usuario_id" },
  { tabla: "subscriptions", columna: "referencia_externa" },
  { tabla: "inscripciones", columna: "plan_id" },
];

const TABLAS_REQUERIDAS = ["suscripcion_pagos", "password_reset_tokens"];

async function verificarEsquema() {
  try {
    const pool = require("./config/db");
    const faltan = [];

    for (const { tabla, columna } of REQUISITOS_ESQUEMA) {
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [tabla, columna]
      );
      if (rows.length === 0) faltan.push(`${tabla}.${columna}`);
    }

    for (const tabla of TABLAS_REQUERIDAS) {
      const { rows } = await pool.query(
        "SELECT to_regclass($1) AS t",
        [`public.${tabla}`]
      );
      if (!rows[0].t) faltan.push(`tabla ${tabla}`);
    }

    if (faltan.length > 0) {
      console.error(
        "\n[esquema] FALTAN MIGRACIONES: " + faltan.join(", ") +
          "\n[esquema] Aplica las migraciones 018, 019 y 020 antes de usar este despliegue." +
          "\n[esquema] Ver: docs/PRODUCCION.md (sección 3)\n"
      );
    } else {
      console.log("[esquema] Migraciones 018/019/020 aplicadas correctamente");
    }
  } catch (error) {
    console.error("[esquema] No se pudo verificar el esquema:", error.message);
  }
}

// ------------------------------------------------------------
// Expiración automática de inscripciones pendientes de pago.
// La fecha_limite_pago la fija el backend al crear la inscripción;
// al vencer, PENDIENTE/FALLIDA -> EXPIRADA y se libera el cupo.
// Se ejecuta al arrancar y cada 10 minutos (además de la
// expiración perezosa que corren 'pagar' y 'mis-inscripciones').
// ------------------------------------------------------------
const { expirarVencidas } = require("./models/inscripcionModel");

async function verificarVencidas() {
  try {
    const n = await expirarVencidas();
    if (n > 0) console.log(`[pagos] ${n} inscripción(es) expirada(s) por vencimiento de pago`);
  } catch (error) {
    console.error("[pagos] Error al expirar inscripciones:", error.message);
  }
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  verificarEsquema();
  verificarVencidas();
  setInterval(verificarVencidas, 10 * 60 * 1000);
});