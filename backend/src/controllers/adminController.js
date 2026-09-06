const UsuarioModel = require("../models/usuarioModel");
const LugarModel = require("../models/lugarModel");
const LoginModel = require("../models/loginModel");
const pool = require("../config/db");

exports.stats = async (req, res) => {
  try {
    const totalUsuarios = await UsuarioModel.count();
    const totalLugares = await LugarModel.count();
    const loginsExitosos = await LoginModel.contarExitosos();
    const loginsFallidos = await LoginModel.contarFallidos();

    const totalNegocios = (
      await pool.query("SELECT COUNT(*)::int as count FROM businesses")
    ).rows[0].count;
    const negociosPendientes = (
      await pool.query(
        "SELECT COUNT(*)::int as count FROM businesses WHERE estado = 'pending'"
      )
    ).rows[0].count;
    const totalResenas = (
      await pool.query("SELECT COUNT(*)::int as count FROM reviews")
    ).rows[0].count;
    const totalCategorias = (
      await pool.query("SELECT COUNT(*)::int as count FROM business_categories")
    ).rows[0].count;

    return res.json({
      success: true,
      data: {
        totalUsuarios,
        totalLugares,
        loginsExitosos,
        loginsFallidos,
        totalNegocios,
        negociosPendientes,
        totalResenas,
        totalCategorias,
      },
    });
  } catch (error) {
    console.error("Error stats:", error);
    return res.status(500).json({ success: false, message: "Error al obtener estadísticas" });
  }
};

exports.loginHistory = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const historial = await LoginModel.historial(limit);
    return res.json({ success: true, data: historial });
  } catch (error) {
    console.error("Error loginHistory:", error);
    return res.status(500).json({ success: false, message: "Error al obtener historial" });
  }
};