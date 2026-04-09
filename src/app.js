const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// 🔧 Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📁 Archivos estáticos
app.use(express.static(path.join(__dirname, "view")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/img", express.static(path.join(__dirname, "img")));

// 🧪 Ruta de prueba
app.get("/test-db", async (req, res) => {
  res.send("Ruta funcionando ✅");
});

// 🔐 RUTA LOGIN (FUERA DE /api)
app.use("/", require("./routes/loginRoutes"));

// 🌍 RUTAS API
app.use("/api", require("./routes/usuariosRoutes"));
app.use("/api", require("./routes/turismoRoutes"));

// 🏠 Rutas de vistas principales
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "login.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "index-admin.html"));
});

app.get("/usuario", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "index-usuario.html"));
});

module.exports = app;