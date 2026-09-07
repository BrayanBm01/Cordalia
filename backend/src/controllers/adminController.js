const UsuarioModel = require("../models/usuarioModel");
const LugarModel = require("../models/lugarModel");
const LoginModel = require("../models/loginModel");
const pool = require("../config/db");

exports.stats = async (req, res) => {
  try {
    const totalUsuarios = await UsuarioModel.count();
    const totalDestinos = await LugarModel.count();
    const loginsExitosos = await LoginModel.contarExitosos();
    const loginsFallidos = await LoginModel.contarFallidos();

    const negociosPorEstado = (
      await pool.query(
        "SELECT estado, COUNT(*)::int AS cantidad FROM businesses GROUP BY estado ORDER BY estado"
      )
    ).rows;
    const totalNegocios = negociosPorEstado.reduce((s, r) => s + r.cantidad, 0);
    const negociosAprobados =
      negociosPorEstado.find((r) => r.estado === "approved")?.cantidad || 0;
    const negociosPendientes =
      negociosPorEstado.find((r) => r.estado === "pending")?.cantidad || 0;

    const negociosPorDestino = (
      await pool.query(
        `SELECT COALESCE(l.nombre, 'Sin destino') AS destino, COUNT(*)::int AS cantidad
         FROM businesses b
         LEFT JOIN lugares l ON l.id = b.destination_id
         GROUP BY l.nombre
         ORDER BY cantidad DESC, destino ASC`
      )
    ).rows;

    const negociosPorCategoria = (
      await pool.query(
        `SELECT COALESCE(c.nombre, 'Sin categoría') AS categoria, COUNT(*)::int AS cantidad
         FROM businesses b
         LEFT JOIN business_categories c ON c.id = b.category_id
         GROUP BY c.nombre
         ORDER BY cantidad DESC, categoria ASC`
      )
    ).rows;

    const usuariosPorRol = (
      await pool.query(
        `SELECT CASE rol_id WHEN 0 THEN 'ADMIN' WHEN 2 THEN 'BUSINESS' ELSE 'TOURIST' END AS rol,
                COUNT(*)::int AS cantidad
         FROM usuarios
         GROUP BY rol_id
         ORDER BY rol`
      )
    ).rows;
    const totalAdmins =
      usuariosPorRol.find((r) => r.rol === "ADMIN")?.cantidad || 0;
    const totalTuristas =
      usuariosPorRol.find((r) => r.rol === "TOURIST")?.cantidad || 0;
    const totalBusiness =
      usuariosPorRol.find((r) => r.rol === "BUSINESS")?.cantidad || 0;

    const resenasPorEstado = (
      await pool.query(
        "SELECT estado, COUNT(*)::int AS cantidad FROM reviews GROUP BY estado ORDER BY estado"
      )
    ).rows;
    const totalResenas = resenasPorEstado.reduce((s, r) => s + r.cantidad, 0);
    const resenasActivas =
      resenasPorEstado.find((r) => r.estado === "active")?.cantidad || 0;
    const resenasOcultas =
      resenasPorEstado.find((r) => r.estado === "hidden")?.cantidad || 0;

    const resenasPorValoracion = (
      await pool.query(
        "SELECT rating, COUNT(*)::int AS cantidad FROM reviews GROUP BY rating ORDER BY rating"
      )
    ).rows;

    const favoritosDestinos = (
      await pool.query("SELECT COUNT(*)::int AS cantidad FROM favorite_destinos")
    ).rows[0].cantidad;
    const favoritosNegocios = (
      await pool.query("SELECT COUNT(*)::int AS cantidad FROM favorite_negocios")
    ).rows[0].cantidad;
    const totalFavoritos = favoritosDestinos + favoritosNegocios;

    const totalCategorias = (
      await pool.query("SELECT COUNT(*)::int as count FROM business_categories")
    ).rows[0].count;

    return res.json({
      success: true,
      data: {
        totalUsuarios,
        totalDestinos,
        loginsExitosos,
        loginsFallidos,
        totalNegocios,
        negociosAprobados,
        negociosPendientes,
        totalResenas,
        resenasActivas,
        resenasOcultas,
        totalFavoritos,
        favoritosDestinos,
        favoritosNegocios,
        totalAdmins,
        totalTuristas,
        totalBusiness,
        totalCategorias,
        negociosPorEstado,
        negociosPorDestino,
        negociosPorCategoria,
        usuariosPorRol,
        resenasPorValoracion,
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