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

    // ---- Planes turisticos y promociones (FASE 7 / POST-FASE 7) ----
    const planesPorEstado = (
      await pool.query(
        "SELECT estado, COUNT(*)::int AS cantidad FROM tour_plans GROUP BY estado ORDER BY estado"
      )
    ).rows;
    const totalPlanes = planesPorEstado.reduce((s, r) => s + r.cantidad, 0);
    const planesActivos =
      planesPorEstado.find((r) => r.estado === "activo")?.cantidad || 0;
    const planesInactivos =
      planesPorEstado.find((r) => r.estado === "inactivo")?.cantidad || 0;

    const planesPorTipo = (
      await pool.query(
        "SELECT tipo_plan, COUNT(*)::int AS cantidad FROM tour_plans GROUP BY tipo_plan ORDER BY tipo_plan"
      )
    ).rows;

    const planesPorDuracion = (
      await pool.query(
        `SELECT CASE
                  WHEN duracion_dias = 1 THEN '1 día'
                  WHEN duracion_dias BETWEEN 2 AND 3 THEN '2-3 días'
                  ELSE '4+ días'
                END AS duracion,
                COUNT(*)::int AS cantidad
         FROM tour_plans
         GROUP BY 1
         ORDER BY duracion`
      )
    ).rows;

    const planesPorDestino = (
      await pool.query(
        `SELECT COALESCE(NULLIF(tp.destino, ''), l.nombre, 'Sin destino') AS destino,
                COUNT(*)::int AS cantidad
         FROM tour_plans tp
         LEFT JOIN lugares l ON l.id = tp.destination_id
         GROUP BY 1
         ORDER BY cantidad DESC, destino ASC`
      )
    ).rows;

    const promociones = (
      await pool.query(
        `SELECT id, nombre, estado, fecha_inicio, fecha_fin
         FROM promotions`
      )
    ).rows;

    const hoy = new Date().toISOString().slice(0, 10);
    let promosVigentes = 0;
    let promosProximas = 0;
    let promosVencidas = 0;
    let promosInactivas = 0;
    for (const p of promociones) {
      const inicio = p.fecha_inicio ? new Date(p.fecha_inicio).toISOString().slice(0, 10) : "";
      const fin = p.fecha_fin ? new Date(p.fecha_fin).toISOString().slice(0, 10) : "";
      if (p.estado !== "activo") {
        promosInactivas += 1;
      } else if (inicio > hoy) {
        promosProximas += 1;
      } else if (fin < hoy) {
        promosVencidas += 1;
      } else {
        promosVigentes += 1;
      }
    }
    const totalPromos = promociones.length;

    const promosPorVigencia = [
      { name: "Vigentes", cantidad: promosVigentes },
      { name: "Próximas", cantidad: promosProximas },
      { name: "Vencidas", cantidad: promosVencidas },
      { name: "Inactivas", cantidad: promosInactivas },
    ].filter((r) => r.cantidad > 0);

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
        totalPlanes,
        planesActivos,
        planesInactivos,
        totalPromos,
        promosVigentes,
        promosProximas,
        promosVencidas,
        promosInactivas,
        promosPorVigencia,
        negociosPorEstado,
        negociosPorDestino,
        negociosPorCategoria,
        usuariosPorRol,
        resenasPorValoracion,
        planesPorTipo,
        planesPorEstado,
        planesPorDuracion,
        planesPorDestino,
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