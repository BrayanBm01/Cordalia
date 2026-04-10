const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ARCHIVOS ESTÁTICOS (IMPORTANTE ORDEN)
app.use(express.static(path.join(__dirname, "view")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use("/script", express.static(path.join(__dirname, "script")));

// 🧪 TEST
app.get("/test-db", (req, res) => {
  res.send("Ruta funcionando ");
});

// LOGIN
app.use("/login", require("./routes/loginRoutes"));

// API
app.use("/api", require("./routes/usuariosRoutes"));
app.use("/api", require("./routes/turismoRoutes"));

// RUTAS VISTAS (CONTROLADAS)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "login.html"));
});

// IMPORTANTE: estas rutas NO deben ser públicas directamente
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "index-admin.html"));
});

app.get("/usuario", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "index-usuario.html"));
});

// ELIMINADO: evitar rutas duplicadas o confusas
// app.get("/index.html", ...)

// MANEJO DE RUTAS NO ENCONTRADAS
app.use((req, res) => {
  res.status(404).send("Ruta no encontrada ");
});

module.exports = app;