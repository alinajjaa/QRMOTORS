const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const uploadfile = require('../middlewares/uploadFile');

// ============ ROUTES CRUD DE BASE ============

// Créer une promotion (avec upload d'image)
router.post('/createPromotion', uploadfile.single("imagePromo"), promotionController.createPromotion);

// Récupérer toutes les promotions (avec filtres et pagination)
router.get('/', promotionController.getAllPromotions);

// Récupérer une promotion par ID
router.get('/:id', promotionController.getPromotionById);

// Mettre à jour une promotion (avec upload d'image)
router.put('/:id', uploadfile.single("imagePromo"), promotionController.updatePromotion);

// Supprimer une promotion
router.delete('/:id', promotionController.deletePromotion);

// ============ ROUTES DE GESTION DES CODES PROMO ============

// Valider un code promo
router.post('/validate-code', promotionController.validatePromoCode);

// Appliquer un code promo (incrémente le nombre d'utilisations)
router.post('/apply-code', promotionController.applyPromoCode);

// Régénérer un code promo
router.post('/:id/regenerate-code', promotionController.regeneratePromoCode);

// ============ ROUTES DE RECHERCHE ET FILTRAGE ============

// Récupérer les promotions actives
router.get('/active/list', promotionController.getActivePromotions);

// Récupérer les promotions pour un véhicule spécifique
router.get('/vehicule/:vehiculeId', promotionController.getPromotionsByVehicule);

// ============ ROUTES DE GESTION AVANCÉE ============

// Mettre à jour le statut d'une promotion
router.patch('/:id/status', promotionController.updatePromotionStatus);

// ============ ROUTES ANALYTICS ============

// Analytics des promotions
router.get('/analytics/overview', promotionController.getPromotionAnalytics);

module.exports = router;
