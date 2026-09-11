const LugarModel = require("../models/lugarModel");
const BusinessModel = require("../models/businessModel");
const { isNonEmptyString, sanitizeString } = require("../utils/validators");
const { slugify } = require("../utils/slug");

const IMAGEN_MAX_BYTES = 1500 * 1024; // 1.5 MB por imagen
const IMAGENES_PERMITIDAS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const IMAGEN_URL_RE = /^https?:\/\/.+/i;

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

exports.getAll = async (req, res) => {
  try {
    const search = req.query.search || null;
    const lugares = search
      ? await LugarModel.search(search)
      : await LugarModel.findAll();
    return res.json({ success: true, data: lugares });
  } catch (error) {
    console.error("Error getAll lugares:", error);
    return res.status(500).json({ success: false, message: "Error al obtener lugares" });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const lugar = await LugarModel.findById(id);
    if (!lugar) {
      return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    }
    return res.json({ success: true, data: lugar });
  } catch (error) {
    console.error("Error getById lugar:", error);
    return res.status(500).json({ success: false, message: "Error al obtener lugar" });
  }
};

exports.getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const lugar = await LugarModel.findBySlug(slug);
    if (!lugar) {
      return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    }
    return res.json({ success: true, data: lugar });
  } catch (error) {
    console.error("Error getBySlug lugar:", error);
    return res.status(500).json({ success: false, message: "Error al obtener lugar" });
  }
};

exports.getBusinesses = async (req, res) => {
  try {
    const { id } = req.params;
    const lugar = await LugarModel.findById(id);
    if (!lugar) {
      return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    }
    const rol = req.usuario?.rol || null;
    const userId = req.usuario?.id || null;
    const negocios = await BusinessModel.listByDestination(id, rol, userId);
    return res.json({ success: true, data: negocios });
  } catch (error) {
    console.error("Error getBusinesses lugar:", error);
    return res.status(500).json({ success: false, message: "Error al obtener negocios del lugar" });
  }
};

exports.create = async (req, res) => {
  try {
    let { nombre, descripcion, ubicacion, municipio, tipo, imagen, slug } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
    }

    nombre = sanitizeString(nombre);
    descripcion = sanitizeString(descripcion || "");
    ubicacion = sanitizeString(ubicacion || "");
    municipio = sanitizeString(municipio || "");
    tipo = sanitizeString(tipo || "");
    imagen = sanitizeString(imagen || "");
    slug = slug ? slugify(slug) : slugify(nombre);

    if (!isNonEmptyString(nombre, 1, 150)) {
      return res.status(400).json({ success: false, message: "Nombre inválido (1-150 caracteres)" });
    }
    if (municipio && !isNonEmptyString(municipio, 1, 150)) {
      return res.status(400).json({ success: false, message: "Municipio inválido (1-150 caracteres)" });
    }
    if (tipo && !isNonEmptyString(tipo, 1, 40)) {
      return res.status(400).json({ success: false, message: "Tipo de destino inválido (1-40 caracteres)" });
    }
    const imgError = validarImagen(imagen);
    if (imgError) return res.status(400).json({ success: false, message: imgError });
    if (!slug) {
      return res.status(400).json({ success: false, message: "No se pudo generar un slug válido" });
    }

    const lugar = await LugarModel.create(nombre, slug, descripcion, ubicacion, municipio, tipo, imagen);
    return res.status(201).json({ success: true, message: "Lugar creado", data: lugar });
  } catch (error) {
    console.error("Error create lugar:", error);
    return res.status(500).json({ success: false, message: "Error al crear lugar" });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let { nombre, descripcion, ubicacion, municipio, tipo, imagen, slug } = req.body;

    const fields = {};

    if (nombre) {
      nombre = sanitizeString(nombre);
      fields.nombre = nombre;
    }
    if (descripcion !== undefined) fields.descripcion = sanitizeString(descripcion);
    if (ubicacion !== undefined) fields.ubicacion = sanitizeString(ubicacion);
    if (municipio !== undefined) fields.municipio = sanitizeString(municipio || null);
    if (tipo !== undefined) fields.tipo = sanitizeString(tipo || null);
    if (imagen !== undefined) {
      imagen = sanitizeString(imagen);
      const imgError = validarImagen(imagen);
      if (imgError) return res.status(400).json({ success: false, message: imgError });
      fields.imagen = imagen;
    }
    if (slug !== undefined && slug !== "") {
      fields.slug = slugify(slug);
      if (!fields.slug) {
        return res.status(400).json({ success: false, message: "Slug inválido" });
      }
    } else if (fields.nombre) {
      fields.slug = slugify(fields.nombre);
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }

    const lugar = await LugarModel.update(id, fields);
    if (!lugar) {
      return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    }
    return res.json({ success: true, message: "Lugar actualizado", data: lugar });
  } catch (error) {
    console.error("Error update lugar:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar lugar" });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await LugarModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Lugar no encontrado" });
    }
    return res.json({ success: true, message: "Lugar eliminado" });
  } catch (error) {
    console.error("Error remove lugar:", error);
    return res.status(500).json({ success: false, message: "Error al eliminar lugar" });
  }
};