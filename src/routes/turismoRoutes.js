const express = require('express');
const router = express.Router();

const turismoController = require('../controllers/turismoController');

router.get('/', turismoController.obtenerSitios);
router.get('/:id', turismoController.obtenerSitio);
router.post('/', turismoController.crearSitio);
router.put('/:id', turismoController.actualizarSitio);
router.delete('/:id', turismoController.eliminarSitio);

module.exports = router;