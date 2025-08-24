const express = require('express');
const router = express.Router();
const commandeController = require('../controllers/commandeController');

// POST - Créer une nouvelle commande
router.post('/create', commandeController.createCommande);

// GET - Obtenir toutes les commandes
router.get('/', commandeController.getAllCommandes);

// GET - Obtenir une commande par ID
router.get('/:id', commandeController.getCommandeById);

// GET - Obtenir les commandes par utilisateur
router.get('/utilisateur/:userId', commandeController.getCommandesByUser);

// GET - Obtenir les commandes par véhicule
router.get('/vehicule/:vehiculeId', commandeController.getCommandesByVehicule);

// PUT - Mettre à jour le statut d'une commande
router.put('/:id/status', commandeController.updateCommandeStatus);

// PUT - Mettre à jour le statut de paiement
router.put('/:id/paiement', commandeController.updatePaiementStatus);

// DELETE - Annuler une commande
router.delete('/:id/cancel', commandeController.cancelCommande);

// GET - Statistiques des commandes
router.get('/stats/overview', commandeController.getCommandeStats);

module.exports = router;
