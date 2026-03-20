const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/test-db", async (req, res) => {
  res.send("Ruta funcionando ✅");
});

// Rutas de la API
app.use("/api", require("./routes/turismoRoutes"));
app.use("/api", require("./routes/usuariosRoutes"));

// Ruta raíz
app.get("/", (req, res) => {
  res.send("API de Turismo funcionando 🚀");
});

module.exports = app;