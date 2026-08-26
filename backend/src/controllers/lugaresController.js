const LugarModel = require("../models/lugarModel");
const { isNonEmptyString, sanitizeString } = require("../utils/validators");

exports.getAll = async (req, res) => {
  try {
    const search = req.query.search || null;
    const lugares = await LugarModel.findAll(search);
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

exports.create = async (req, res) => {
  try {
    let { nombre, descripcion, ubicacion, imagen } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
    }

    nombre = sanitizeString(nombre);
    descripcion = sanitizeString(descripcion || "");
    ubicacion = sanitizeString(ubicacion || "");
    imagen = sanitizeString(imagen || "");

    if (!isNonEmptyString(nombre, 1, 150)) {
      return res.status(400).json({ success: false, message: "Nombre inválido (1-150 caracteres)" });
    }

    const lugar = await LugarModel.create(nombre, descripcion, ubicacion, imagen);
    return res.status(201).json({ success: true, message: "Lugar creado", data: lugar });
  } catch (error) {
    console.error("Error create lugar:", error);
    return res.status(500).json({ success: false, message: "Error al crear lugar" });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let { nombre, descripcion, ubicacion, imagen } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
    }

    nombre = sanitizeString(nombre);
    descripcion = sanitizeString(descripcion || "");
    ubicacion = sanitizeString(ubicacion || "");
    imagen = sanitizeString(imagen || "");

    const lugar = await LugarModel.update(id, nombre, descripcion, ubicacion, imagen);
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
