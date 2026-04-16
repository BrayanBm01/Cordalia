const express = require("express");
const cors = require("cors");
const path = require("path");
const verificarToken = require("./middlewares/jwtMiddleware");
require("dotenv").config();

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ARCHIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, "view")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use("/script", express.static(path.join(__dirname, "script")));

// TEST
app.get("/test-db", (req, res) => {
  res.send("Ruta funcionando ");
});

// LOGIN
app.use("/login", require("./routes/loginRoutes"));

// RUTAS PÚBLICAS
app.use("/api/usuarios", require("./routes/usuariosRoutes"));

// RUTAS PROTEGIDAS
app.use("/api/turismo", verificarToken, require("./routes/turismoRoutes"));

// VISTAS
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "login.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "index-admin.html"));
});

app.get("/usuario", (req, res) => {
  res.sendFile(path.join(__dirname, "view", "index-usuario.html"));
});

// 404
app.use((req, res) => {
  res.status(404).send("Ruta no encontrada ");
});

module.exports = app;