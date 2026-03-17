const express = require("express");
const router = express.Router();

const {
  getLugares,
  getLugarById,
  createLugar,
  updateLugar,
  deleteLugar,
} = require("../controllers/turismoController");

router.get("/lugares", getLugares);
router.get("/lugares/:id", getLugarById);
router.post("/lugares", createLugar);
router.put("/lugares/:id", updateLugar);
router.delete("/lugares/:id", deleteLugar);

module.exports = router;