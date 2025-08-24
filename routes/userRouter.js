const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const uploadfile = require('../middlewares/uploadFile');

// ============ ROUTES DE CRÉATION ============

// Créer un utilisateur (role = client automatique)
router.post('/createUser', uploadfile.single("image_user"), userController.createUser);

// Créer un administrateur (role = admin automatique)
router.post('/createAdmin', uploadfile.single("image_user"), userController.createAdmin);

// ============ ROUTES DE MISE À JOUR PROFIL ============

// Mettre à jour le profil utilisateur (clients seulement)
router.put('/profil-user/:id', uploadfile.single("image_user"), userController.updateProfilUser);

// Mettre à jour le profil admin (admins seulement)
router.put('/profil-admin/:id', uploadfile.single("image_user"), userController.updateProfilAdmin);

// ============ ROUTES CRUD DE BASE ============

// Récupérer tous les utilisateurs (avec pagination et filtres)
router.get('/', userController.getAllUsers);

// Récupérer un utilisateur par ID
router.get('/:id', userController.getUserById);

// Supprimer un utilisateur
router.delete('/:id', userController.deleteUser);

// ============ ROUTES DE RECHERCHE ET FILTRAGE ============

// Recherche d'utilisateurs
router.get('/search/query', userController.searchUsers);

// Utilisateurs par rôle
router.get('/role/:role', userController.getUsersByRole);

// ============ ROUTES UTILITAIRES ============

// Changer le statut d'un utilisateur (actif/inactif)
router.patch('/:userId/status', userController.toggleUserStatus);

// Statistiques des utilisateurs
router.get('/stats/overview', userController.getUserStats);

module.exports = router;