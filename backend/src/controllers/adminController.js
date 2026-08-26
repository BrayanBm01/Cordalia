const UsuarioModel = require("../models/usuarioModel");
const LugarModel = require("../models/lugarModel");
const LoginModel = require("../models/loginModel");

exports.stats = async (req, res) => {
  try {
    const totalUsuarios = await UsuarioModel.count();
    const totalLugares = await LugarModel.count();
    const loginsExitosos = await LoginModel.contarExitosos();
    const loginsFallidos = await LoginModel.contarFallidos();

    return res.json({
      success: true,
      data: {
        totalUsuarios,
        totalLugares,
        loginsExitosos,
        loginsFallidos,
      },
    });
  } catch (error) {
    console.error("Error stats:", error);
    return res.status(500).json({ success: false, message: "Error al obtener estadísticas" });
  }
};

exports.loginHistory = async (req, res) => {
  try {
    const historial = await LoginModel.historial(100);
    return res.json({ success: true, data: historial });
  } catch (error) {
    console.error("Error loginHistory:", error);
    return res.status(500).json({ success: false, message: "Error al obtener historial" });
  }
};
