const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express(); // 👈 ESTO DEBE IR ANTES DE USAR app

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/test-db", async (req, res) => {
  res.send("Ruta funcionando ✅");
});

// Rutas de la API
app.use("/api", require("./routes/turismoRoutes"));

app.get("/", (req, res) => {
  res.send("API de Turismo funcionando 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});