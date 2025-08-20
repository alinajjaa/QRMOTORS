const Reclamation = require('../models/reclaimmodel');

// CREATE reclamation
module.exports.createReclamation = async (req, res) => {
    try {
        const { sujet, message } = req.body;

        // Validation des champs requis
        if (!sujet || !message) {
            return res.status(400).json({
                message: 'Les champs "sujet" et "message" sont obligatoires',
                required: ['sujet', 'message']
            });
        }

        // Création de la nouvelle réclamation
        const newReclamation = new Reclamation({
            sujet,
            message
        });

        const savedReclamation = await newReclamation.save();
        res.status(201).json(savedReclamation);
    } catch (error) {
        console.error('Erreur lors de la création de la réclamation:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }

        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// READ all reclamations
module.exports.getAllReclamations = async (req, res) => {
    try {
        const reclamations = await Reclamation.find();
        res.status(200).json(reclamations);
    } catch (error) {
        console.error('Erreur lors de la récupération des réclamations:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// READ one reclamation by ID
module.exports.getReclamationById = async (req, res) => {
    try {
        const reclamation = await Reclamation.findById(req.params.id);
        if (!reclamation) {
            return res.status(404).json({ message: 'Réclamation non trouvée' });
        }
        res.status(200).json(reclamation);
    } catch (error) {
        console.error('Erreur lors de la récupération de la réclamation:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de réclamation invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// UPDATE reclamation
module.exports.updateReclamation = async (req, res) => {
    try {
        const updateData = req.body;

        const updatedReclamation = await Reclamation.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedReclamation) {
            return res.status(404).json({ message: 'Réclamation non trouvée' });
        }

        res.status(200).json(updatedReclamation);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la réclamation:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de réclamation invalide' });
        }

        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// DELETE reclamation
module.exports.deleteReclamation = async (req, res) => {
    try {
        const deletedReclamation = await Reclamation.findByIdAndDelete(req.params.id);
        if (!deletedReclamation) {
            return res.status(404).json({ message: 'Réclamation non trouvée' });
        }

        res.status(200).json({ message: 'Réclamation supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la réclamation:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de réclamation invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};
