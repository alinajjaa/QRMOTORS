const express = require('express');
const router = express.Router();
const reclamationController = require('../controllers/reclaimController');

// CRUD Routes
router.post('/createReclamation', reclamationController.createReclamation); // CREATE
router.get('/', reclamationController.getAllReclamations);                  // READ all
router.get('/:id', reclamationController.getReclamationById);               // READ one
router.put('/:id', reclamationController.updateReclamation);                // UPDATE
router.delete('/:id', reclamationController.deleteReclamation);             // DELETE

module.exports = router;
