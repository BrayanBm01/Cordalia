const app = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

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
  verificarVencidas();
  setInterval(verificarVencidas, 10 * 60 * 1000);
});