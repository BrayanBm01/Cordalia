const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static(path.join(__dirname, "view")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/img", express.static(path.join(__dirname, "img"))); // 🔥 para imágenes

// Ruta de prueba
app.get("/test-db", async (req, res) => {
  res.send("Ruta funcionando ✅");
});

// Rutas API
app.use("/api", require("./routes/turismoRoutes"));
app.use("/api", require("./routes/usuariosRoutes"));
app.use("/api", require("./routes/loginRoutes"));



// Ruta principal → LOGIN
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "login.html"));
});

module.exports = app;