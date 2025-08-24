const express = require('express');
const router = express.Router();
const vehiculeController = require('../controllers/vehiculeController');
const uploadfile = require('../middlewares/uploadFile');

// ============ ROUTES EXISTANTES ============

// Routes avec upload de fichiers
router.post('/createVehicule', uploadfile.single("first"), vehiculeController.createVehicule);
router.put('/:id', uploadfile.single("first"), vehiculeController.updateVehicule);

// Routes CRUD de base
router.get('/', vehiculeController.getAllVehicules);
router.get('/:id', vehiculeController.getVehiculeById);
router.get('/:id/with-promotions', vehiculeController.getVehiculeWithPromotions);
router.delete('/:id', vehiculeController.deleteVehicule);

// Route QR Code
router.post('/qr-scan', vehiculeController.getVehiculeByQR);

// ============ NOUVELLES ROUTES ============

// Routes de gestion avancée
router.patch('/:id/status', vehiculeController.updateVehiculeStatus);
router.post('/:id/regenerate-qr', vehiculeController.regenerateQRCode);

// Routes de recherche et filtrage
router.get('/search/query', vehiculeController.searchVehicules);
router.get('/marque/:marque', vehiculeController.getVehiculesByMarque);
router.get('/featured/list', vehiculeController.getFeaturedVehicules);

// ============ ROUTES ANALYTICS ============

// Analytics principales
router.get('/analytics/dashboard', vehiculeController.getDashboardAnalytics);
router.get('/analytics/sales', vehiculeController.getSalesAnalytics);
router.get('/analytics/inventory', vehiculeController.getInventoryAnalytics);
router.get('/analytics/performance', vehiculeController.getPerformanceAnalytics);
router.get('/analytics/financial', vehiculeController.getFinancialAnalytics);
router.get('/analytics/trends', vehiculeController.getMarketTrends);

// Analytics personnalisées (POST pour les filtres complexes)
router.post('/analytics/custom', vehiculeController.getCustomAnalytics);

module.exports = router;