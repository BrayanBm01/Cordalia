const LugarModel = require("../models/lugarModel");
const { isNonEmptyString, sanitizeString } = require("../utils/validators");
const { slugify } = require("../utils/slug");

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

exports.create = async (req, res) => {
  try {
    let { nombre, descripcion, ubicacion, imagen, slug } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
    }

    nombre = sanitizeString(nombre);
    descripcion = sanitizeString(descripcion || "");
    ubicacion = sanitizeString(ubicacion || "");
    imagen = sanitizeString(imagen || "");
    slug = slug ? slugify(slug) : slugify(nombre);

    if (!isNonEmptyString(nombre, 1, 150)) {
      return res.status(400).json({ success: false, message: "Nombre inválido (1-150 caracteres)" });
    }
    if (!slug) {
      return res.status(400).json({ success: false, message: "No se pudo generar un slug válido" });
    }

    const lugar = await LugarModel.create(nombre, slug, descripcion, ubicacion, imagen);
    return res.status(201).json({ success: true, message: "Lugar creado", data: lugar });
  } catch (error) {
    console.error("Error create lugar:", error);
    return res.status(500).json({ success: false, message: "Error al crear lugar" });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let { nombre, descripcion, ubicacion, imagen, slug } = req.body;

    const fields = {};

    if (nombre) {
      nombre = sanitizeString(nombre);
      fields.nombre = nombre;
    }
    if (descripcion !== undefined) fields.descripcion = sanitizeString(descripcion);
    if (ubicacion !== undefined) fields.ubicacion = sanitizeString(ubicacion);
    if (imagen !== undefined) fields.imagen = sanitizeString(imagen);
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