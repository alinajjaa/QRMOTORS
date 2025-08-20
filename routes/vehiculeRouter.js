const express = require('express');
const router = express.Router();
const vehiculeController = require('../controllers/vehiculeController');
const uploadfile = require('../middlewares/uploadFile');

router.post('/createVehicule', uploadfile.single("first"), vehiculeController.createVehicule);
router.put('/:id', uploadfile.single("first"), vehiculeController.updateVehicule);

// Routes sans upload
router.get('/', vehiculeController.getAllVehicules);
router.get('/:id', vehiculeController.getVehiculeById);
router.delete('/:id', vehiculeController.deleteVehicule);
router.post('/qr-scan', vehiculeController.getVehiculeByQR);

module.exports = router;
