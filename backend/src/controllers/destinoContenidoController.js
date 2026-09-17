const DestinoContenidoModel = require("../models/destinoContenidoModel");
const LugarModel = require("../models/lugarModel");
const PlanModel = require("../models/planModel");
const { isNonEmptyString, sanitizeString } = require("../utils/validators");

const IMAGEN_MAX_BYTES = 1500 * 1024; // 1.5 MB por imagen
const IMAGENES_PERMITIDAS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const IMAGEN_URL_RE = /^https?:\/\/.+/i;

const MONEDAS_PERMITIDAS = ["COP", "USD", "EUR", "MXN", "PEN"];

function validarImagenDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return "Imagen inválida: formato no reconocido";
  const mime = match[1].toLowerCase();
  if (!IMAGENES_PERMITIDAS.includes(mime)) {
    return `Imagen inválida: solo se permiten ${IMAGENES_PERMITIDAS.join(", ")}`;
  }
  const contenido = match[2];
  if (!contenido) return "Imagen inválida: datos de imagen vacíos";
  const approxBytes = Math.floor((contenido.length * 3) / 4) - (contenido.endsWith("==") ? 2 : contenido.endsWith("=") ? 1 : 0);
  if (approxBytes > IMAGEN_MAX_BYTES) return "Imagen demasiado grande: máximo 1.5 MB";
  return null;
}

function validarImagen(imagen) {
  if (!imagen) return null;
  if (/^data:image\/[^;]+;base64,/i.test(imagen)) return validarImagenDataUrl(imagen);
  if (!IMAGEN_URL_RE.test(imagen)) return "Imagen inválida: debe ser una URL (http/https) o una imagen en base64";
  return null;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseBoolean(val) {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === "1") return true;
  if (val === "false" || val === "0") return false;
  return null;
}

// Devuelve el id del campo asignable (actividad/punto de interés) y su error.
function extraerReferencia(req) {
  const { id } = req.params;
  const { actividad_id, punto_interes_id } = req.body;
  const actividadId = parseInt(actividad_id, 10) || null;
  const puntoId = parseInt(punto_interes_id, 10) || null;
  return { lugarId: id, actividadId, puntoId };
}

// ------------------------------------------------------------
// Contenido público de un destino (página del lugar)
// ------------------------------------------------------------
exports.getContenidoPublico = async (req, res) => {
  try {
    const { id } = req.params;
    const lugar = await LugarModel.findById(id);
    if (!lugar) {
      return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    }
    const contenido = await DestinoContenidoModel.getContenidoPublico(id);
    return res.json({ success: true, data: contenido });
  } catch (error) {
    console.error("Error getContenidoPublico:", error);
    return res.status(500).json({ success: false, message: "Error al obtener contenido del lugar" });
  }
};

// ------------------------------------------------------------
// Comparación de presupuesto: por tu cuenta VS planes reales
// ------------------------------------------------------------
exports.getPresupuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const lugar = await LugarModel.findById(id);
    if (!lugar) {
      return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    }
    const infoViaje = await DestinoContenidoModel.findInfoViaje(id);

    // Planes reales activos de negocios aprobados para este destino.
    const planes = await PlanModel.listWithImages({
      destinationId: id,
      visible: true,
    });

    const planesResumen = (planes || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      slug: p.slug,
      descripcion: p.descripcion,
      negocio: p.negocio_nombre,
      duracion_dias: p.duracion_dias,
      duracion_noches: p.duracion_noches,
      precio: Number(p.precio) || 0,
      moneda: p.moneda || "COP",
      tipo_precio: p.tipo_precio,
      tipo_plan: p.tipo_plan,
      promociones: Array.isArray(p.promociones) ? p.promociones : [],
      plan_imagenes: Array.isArray(p.plan_imagenes) ? p.plan_imagenes : [],
    }));

    return res.json({
      success: true,
      data: {
        info_viaje: infoViaje,
        planes: planesResumen,
      },
    });
  } catch (error) {
    console.error("Error getPresupuesto:", error);
    return res.status(500).json({ success: false, message: "Error al obtener el presupuesto del lugar" });
  }
};

// ------------------------------------------------------------
// Catálogo de actividades (admin)
// ------------------------------------------------------------
exports.listActividades = async (req, res) => {
  try {
    const activo = parseBoolean(req.query.activo);
    const data = await DestinoContenidoModel.listActividades({ activo });
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error listActividades:", error);
    return res.status(500).json({ success: false, message: "Error al obtener actividades" });
  }
};

exports.createActividad = async (req, res) => {
  try {
    const nombre = sanitizeString(req.body.nombre);
    if (!isNonEmptyString(nombre, 1, 200)) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio (1-200 caracteres)" });
    }
    const descripcion = sanitizeString(req.body.descripcion || "");
    const categoria = sanitizeString(req.body.categoria || "");
    if (categoria && !isNonEmptyString(categoria, 1, 100)) {
      return res.status(400).json({ success: false, message: "Categoría inválida (1-100 caracteres)" });
    }
    let imagen = sanitizeString(req.body.imagen || "");
    if (imagen) {
      const imgError = validarImagen(imagen);
      if (imgError) return res.status(400).json({ success: false, message: imgError });
    } else {
      imagen = null;
    }

    const existe = await DestinoContenidoModel.findActividadByNombre(nombre);
    if (existe) {
      return res.status(409).json({ success: false, message: "Ya existe una actividad con ese nombre" });
    }

    const actividad = await DestinoContenidoModel.createActividad({ nombre, descripcion, imagen, categoria });
    return res.status(201).json({ success: true, message: "Actividad creada", data: actividad });
  } catch (error) {
    console.error("Error createActividad:", error);
    return res.status(500).json({ success: false, message: "Error al crear la actividad" });
  }
};

exports.updateActividad = async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = sanitizeString(req.body.nombre || "");
    if (!isNonEmptyString(nombre, 1, 200)) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio (1-200 caracteres)" });
    }
    const descripcion = sanitizeString(req.body.descripcion || "");
    const categoria = sanitizeString(req.body.categoria || "");
    const imagenRaw = req.body.imagen;
    const activoRaw = req.body.activo;

    const existe = await DestinoContenidoModel.findActividadByNombre(nombre, id);
    if (existe) {
      return res.status(409).json({ success: false, message: "Ya existe otra actividad con ese nombre" });
    }

    const fields = { nombre };
    if (req.body.descripcion !== undefined) fields.descripcion = descripcion;
    if (req.body.categoria !== undefined) fields.categoria = categoria || null;
    if (imagenRaw !== undefined) {
      const imagen = sanitizeString(imagenRaw);
      if (imagen) {
        const imgError = validarImagen(imagen);
        if (imgError) return res.status(400).json({ success: false, message: imgError });
        fields.imagen = imagen;
      } else {
        fields.imagen = null;
      }
    }
    if (activoRaw !== undefined) {
      const activo = parseBoolean(activoRaw);
      if (activo === null) return res.status(400).json({ success: false, message: "activo debe ser booleano" });
      fields.activo = activo;
    }

    const actividad = await DestinoContenidoModel.updateActividad(id, fields);
    if (!actividad) {
      return res.status(404).json({ success: false, message: "Actividad no encontrada" });
    }
    return res.json({ success: true, message: "Actividad actualizada", data: actividad });
  } catch (error) {
    console.error("Error updateActividad:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar la actividad" });
  }
};

exports.deleteActividad = async (req, res) => {
  try {
    const { id } = req.params;
    // Borrado lógico: desactiva para no perder asignaciones existentes.
    const actividad = await DestinoContenidoModel.setActividadEstado(id, false);
    if (!actividad) {
      return res.status(404).json({ success: false, message: "Actividad no encontrada" });
    }
    return res.json({ success: true, message: "Actividad desactivada", data: actividad });
  } catch (error) {
    console.error("Error deleteActividad:", error);
    return res.status(500).json({ success: false, message: "Error al desactivar la actividad" });
  }
};

// ------------------------------------------------------------
// Catálogo de puntos de interés (admin)
// ------------------------------------------------------------
exports.listPuntosInteres = async (req, res) => {
  try {
    const activo = parseBoolean(req.query.activo);
    const data = await DestinoContenidoModel.listPuntosInteres({ activo });
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error listPuntosInteres:", error);
    return res.status(500).json({ success: false, message: "Error al obtener puntos de interés" });
  }
};

exports.createPuntoInteres = async (req, res) => {
  try {
    const nombre = sanitizeString(req.body.nombre);
    if (!isNonEmptyString(nombre, 1, 200)) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio (1-200 caracteres)" });
    }
    const descripcion = sanitizeString(req.body.descripcion || "");
    const tipo = sanitizeString(req.body.tipo || "");
    if (tipo && !isNonEmptyString(tipo, 1, 100)) {
      return res.status(400).json({ success: false, message: "Tipo inválido (1-100 caracteres)" });
    }
    let imagen = sanitizeString(req.body.imagen || "");
    if (imagen) {
      const imgError = validarImagen(imagen);
      if (imgError) return res.status(400).json({ success: false, message: imgError });
    } else {
      imagen = null;
    }

    const existe = await DestinoContenidoModel.findPuntoInteresByNombre(nombre);
    if (existe) {
      return res.status(409).json({ success: false, message: "Ya existe un punto de interés con ese nombre" });
    }

    const punto = await DestinoContenidoModel.createPuntoInteres({ nombre, descripcion, imagen, tipo });
    return res.status(201).json({ success: true, message: "Punto de interés creado", data: punto });
  } catch (error) {
    console.error("Error createPuntoInteres:", error);
    return res.status(500).json({ success: false, message: "Error al crear el punto de interés" });
  }
};

exports.updatePuntoInteres = async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = sanitizeString(req.body.nombre || "");
    if (!isNonEmptyString(nombre, 1, 200)) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio (1-200 caracteres)" });
    }
    const descripcion = sanitizeString(req.body.descripcion || "");
    const tipo = sanitizeString(req.body.tipo || "");
    const imagenRaw = req.body.imagen;
    const activoRaw = req.body.activo;

    const existe = await DestinoContenidoModel.findPuntoInteresByNombre(nombre, id);
    if (existe) {
      return res.status(409).json({ success: false, message: "Ya existe otro punto de interés con ese nombre" });
    }

    const fields = { nombre };
    if (req.body.descripcion !== undefined) fields.descripcion = descripcion;
    if (req.body.tipo !== undefined) fields.tipo = tipo || null;
    if (imagenRaw !== undefined) {
      const imagen = sanitizeString(imagenRaw);
      if (imagen) {
        const imgError = validarImagen(imagen);
        if (imgError) return res.status(400).json({ success: false, message: imgError });
        fields.imagen = imagen;
      } else {
        fields.imagen = null;
      }
    }
    if (activoRaw !== undefined) {
      const activo = parseBoolean(activoRaw);
      if (activo === null) return res.status(400).json({ success: false, message: "activo debe ser booleano" });
      fields.activo = activo;
    }

    const punto = await DestinoContenidoModel.updatePuntoInteres(id, fields);
    if (!punto) {
      return res.status(404).json({ success: false, message: "Punto de interés no encontrado" });
    }
    return res.json({ success: true, message: "Punto de interés actualizado", data: punto });
  } catch (error) {
    console.error("Error updatePuntoInteres:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar el punto de interés" });
  }
};

exports.deletePuntoInteres = async (req, res) => {
  try {
    const { id } = req.params;
    const punto = await DestinoContenidoModel.setPuntoInteresEstado(id, false);
    if (!punto) {
      return res.status(404).json({ success: false, message: "Punto de interés no encontrado" });
    }
    return res.json({ success: true, message: "Punto de interés desactivado", data: punto });
  } catch (error) {
    console.error("Error deletePuntoInteres:", error);
    return res.status(500).json({ success: false, message: "Error al desactivar el punto de interés" });
  }
};

// ------------------------------------------------------------
// Asignación de contenido a un destino (admin)
// ------------------------------------------------------------
exports.getAsignaciones = async (req, res) => {
  try {
    const { id } = req.params;
    const lugar = await LugarModel.findById(id);
    if (!lugar) {
      return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    }
    const [actividades, puntos, contenido] = await Promise.all([
      DestinoContenidoModel.listActividadesByLugar(id),
      DestinoContenidoModel.listPuntosInteresByLugar(id),
      DestinoContenidoModel.getContenidoPublico(id),
    ]);
    return res.json({
      success: true,
      data: {
        actividades_asignadas: actividades,
        puntos_asignados: puntos,
        contenido,
      },
    });
  } catch (error) {
    console.error("Error getAsignaciones:", error);
    return res.status(500).json({ success: false, message: "Error al obtener asignaciones" });
  }
};

exports.assignActividad = async (req, res) => {
  try {
    const { id } = req.params;
    const actividadId = parseInt(req.body.actividad_id, 10);
    if (!actividadId || actividadId <= 0) {
      return res.status(400).json({ success: false, message: "actividad_id es obligatorio" });
    }
    const orden = Number(req.body.orden) || 0;

    const [lugar, actividad] = await Promise.all([
      LugarModel.findById(id),
      DestinoContenidoModel.findActividad(actividadId),
    ]);
    if (!lugar) return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    if (!actividad) return res.status(404).json({ success: false, message: "Actividad no encontrada" });

    const asignacion = await DestinoContenidoModel.assignActividad(id, actividadId, orden);
    return res.status(201).json({ success: true, message: "Actividad asignada", data: asignacion });
  } catch (error) {
    console.error("Error assignActividad:", error);
    return res.status(500).json({ success: false, message: "Error al asignar la actividad" });
  }
};

exports.unassignActividad = async (req, res) => {
  try {
    const { id, actividadId } = req.params;
    const parsed = parseInt(actividadId, 10);
    if (!parsed) return res.status(400).json({ success: false, message: "actividad_id inválido" });
    const ok = await DestinoContenidoModel.unassignActividad(id, parsed);
    if (!ok) {
      return res.status(404).json({ success: false, message: "La actividad no está asignada a este lugar" });
    }
    return res.json({ success: true, message: "Actividad desasignada" });
  } catch (error) {
    console.error("Error unassignActividad:", error);
    return res.status(500).json({ success: false, message: "Error al desasignar la actividad" });
  }
};

exports.assignPuntoInteres = async (req, res) => {
  try {
    const { id } = req.params;
    const puntoInteresId = parseInt(req.body.punto_interes_id, 10);
    if (!puntoInteresId || puntoInteresId <= 0) {
      return res.status(400).json({ success: false, message: "punto_interes_id es obligatorio" });
    }
    const orden = Number(req.body.orden) || 0;

    const [lugar, punto] = await Promise.all([
      LugarModel.findById(id),
      DestinoContenidoModel.findPuntoInteres(puntoInteresId),
    ]);
    if (!lugar) return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    if (!punto) return res.status(404).json({ success: false, message: "Punto de interés no encontrado" });

    const asignacion = await DestinoContenidoModel.assignPuntoInteres(id, puntoInteresId, orden);
    return res.status(201).json({ success: true, message: "Punto de interés asignado", data: asignacion });
  } catch (error) {
    console.error("Error assignPuntoInteres:", error);
    return res.status(500).json({ success: false, message: "Error al asignar el punto de interés" });
  }
};

exports.unassignPuntoInteres = async (req, res) => {
  try {
    const { id, puntoId } = req.params;
    const parsed = parseInt(puntoId, 10);
    if (!parsed) return res.status(400).json({ success: false, message: "punto_interes_id inválido" });
    const ok = await DestinoContenidoModel.unassignPuntoInteres(id, parsed);
    if (!ok) {
      return res.status(404).json({ success: false, message: "El punto de interés no está asignado a este lugar" });
    }
    return res.json({ success: true, message: "Punto de interés desasignado" });
  } catch (error) {
    console.error("Error unassignPuntoInteres:", error);
    return res.status(500).json({ success: false, message: "Error al desasignar el punto de interés" });
  }
};

// ------------------------------------------------------------
// Información para tu viaje (admin, upsert)
// ------------------------------------------------------------
exports.upsertInfoViaje = async (req, res) => {
  try {
    const { id } = req.params;
    const lugar = await LugarModel.findById(id);
    if (!lugar) {
      return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    }

    const fields = {};
    const textKeys = [
      "transporte", "alimentacion", "alojamiento", "actividades", "otros_gastos",
      "recomendaciones", "duracion_recomendada", "mejor_epoca", "como_llegar",
    ];
    for (const k of textKeys) {
      if (req.body[k] !== undefined) {
        const val = sanitizeString(req.body[k]);
        fields[k] = val || null;
      }
    }

    if (req.body.moneda !== undefined) {
      const moneda = sanitizeString(req.body.moneda).toUpperCase();
      if (!MONEDAS_PERMITIDAS.includes(moneda)) {
        return res.status(400).json({
          success: false,
          message: `Moneda inválida: permitidas ${MONEDAS_PERMITIDAS.join(", ")}`,
        });
      }
      fields.moneda = moneda;
    }

    const numKeys = [
      "costo_transporte", "costo_alimentacion", "costo_alojamiento",
      "costo_actividades", "costo_otros",
    ];
    for (const k of numKeys) {
      if (req.body[k] !== undefined) {
        const n = parseNumber(req.body[k]);
        if (n === null && req.body[k] !== null && req.body[k] !== "") {
          return res.status(400).json({ success: false, message: `${k} debe ser un número no negativo` });
        }
        fields[k] = n;
      }
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para guardar" });
    }

    const info = await DestinoContenidoModel.upsertInfoViaje(id, fields);
    return res.json({ success: true, message: "Información de viaje guardada", data: info });
  } catch (error) {
    console.error("Error upsertInfoViaje:", error);
    return res.status(500).json({ success: false, message: "Error al guardar la información de viaje" });
  }
};