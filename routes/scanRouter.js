const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');

// POST - Enregistrer un nouveau scan
router.post('/create', scanController.createScan);

// POST - Scanner un QR code (endpoint principal)
router.post('/scan-qr', scanController.scanQRCode);

// GET - Obtenir tous les scans
router.get('/', scanController.getAllScans);

// GET - Obtenir un scan par ID
router.get('/:id', scanController.getScanById);


// GET - Obtenir les scans par véhicule
router.get('/vehicule/:vehiculeId', scanController.getScansByVehicule);

// GET - Obtenir les scans par utilisateur
router.get('/utilisateur/:userId', scanController.getScansByUser);

// GET - Statistiques des scans
router.get('/stats/overview', scanController.getScanStats);

// DELETE - Supprimer un scan
router.delete('/:id', scanController.deleteScan);

module.exports = router;
