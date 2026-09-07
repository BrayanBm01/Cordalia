const FavoritoModel = require("../models/favoritoModel");
const LugarModel = require("../models/lugarModel");
const BusinessModel = require("../models/businessModel");

function parseId(val) {
  const n = Number(val);
  return Number.isInteger(n) && n > 0 ? n : null;
}

exports.getDestinos = async (req, res) => {
  try {
    const destinos = await FavoritoModel.listDestinosByUser(req.usuario.id);
    return res.json({ success: true, data: destinos });
  } catch (error) {
    console.error("Error listar destinos favoritos:", error);
    return res.status(500).json({ success: false, message: "Error al obtener favoritos" });
  }
};

exports.addDestino = async (req, res) => {
  try {
    const destinationId = parseId(req.params.id);
    if (!destinationId) {
      return res.status(400).json({ success: false, message: "ID de destino inválido" });
    }
    const lugar = await LugarModel.findById(destinationId);
    if (!lugar) {
      return res.status(404).json({ success: false, message: "Destino no encontrado" });
    }
    if (await FavoritoModel.existsDestino(req.usuario.id, destinationId)) {
      return res.status(409).json({ success: false, message: "El destino ya está en tus favoritos" });
    }
    await FavoritoModel.addDestino(req.usuario.id, destinationId);
    return res.status(201).json({ success: true, message: "Destino agregado a favoritos" });
  } catch (error) {
    console.error("Error agregar destino favorito:", error);
    return res.status(500).json({ success: false, message: "Error al guardar favorito" });
  }
};

exports.removeDestino = async (req, res) => {
  try {
    const destinationId = parseId(req.params.id);
    if (!destinationId) {
      return res.status(400).json({ success: false, message: "ID de destino inválido" });
    }
    const removed = await FavoritoModel.removeDestino(req.usuario.id, destinationId);
    if (!removed) {
      return res.status(404).json({ success: false, message: "El destino no está en tus favoritos" });
    }
    return res.json({ success: true, message: "Destino eliminado de favoritos" });
  } catch (error) {
    console.error("Error eliminar destino favorito:", error);
    return res.status(500).json({ success: false, message: "Error al eliminar favorito" });
  }
};

exports.getNegocios = async (req, res) => {
  try {
    const negocios = await FavoritoModel.listNegociosByUser(req.usuario.id);
    return res.json({ success: true, data: negocios });
  } catch (error) {
    console.error("Error listar negocios favoritos:", error);
    return res.status(500).json({ success: false, message: "Error al obtener favoritos" });
  }
};

exports.addNegocio = async (req, res) => {
  try {
    const businessId = parseId(req.params.id);
    if (!businessId) {
      return res.status(400).json({ success: false, message: "ID de negocio inválido" });
    }
    // Solo negocios visiblemente públicos pueden guardarse como favorito.
    const business = await BusinessModel.findById(businessId);
    if (!business || business.estado !== "approved") {
      return res.status(404).json({ success: false, message: "Negocio no encontrado" });
    }
    if (await FavoritoModel.existsNegocio(req.usuario.id, businessId)) {
      return res.status(409).json({ success: false, message: "El negocio ya está en tus favoritos" });
    }
    await FavoritoModel.addNegocio(req.usuario.id, businessId);
    return res.status(201).json({ success: true, message: "Negocio agregado a favoritos" });
  } catch (error) {
    console.error("Error agregar negocio favorito:", error);
    return res.status(500).json({ success: false, message: "Error al guardar favorito" });
  }
};

exports.removeNegocio = async (req, res) => {
  try {
    const businessId = parseId(req.params.id);
    if (!businessId) {
      return res.status(400).json({ success: false, message: "ID de negocio inválido" });
    }
    const removed = await FavoritoModel.removeNegocio(req.usuario.id, businessId);
    if (!removed) {
      return res.status(404).json({ success: false, message: "El negocio no está en tus favoritos" });
    }
    return res.json({ success: true, message: "Negocio eliminado de favoritos" });
  } catch (error) {
    console.error("Error eliminar negocio favorito:", error);
    return res.status(500).json({ success: false, message: "Error al eliminar favorito" });
  }
};