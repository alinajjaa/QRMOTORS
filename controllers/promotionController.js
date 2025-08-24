const Promotion = require('../models/promotionmodel');
const Vehicule = require('../models/vehiculemodel');
const fs = require('fs');
const path = require('path');

// CREATE promotion
// CREATE promotion
module.exports.createPromotion = async (req, res) => {
    try {
        const { 
            nom, 
            description, 
            pourcentageReduction, 
            montantReduction, 
            dateDebut, 
            dateFin, 
            vehicules, 
            nombreUtilisationsMax, 
            conditions,
            codePromo 
        } = req.body;

        // Validation des champs requis
        if (!nom || !description || !dateDebut || !dateFin || !vehicules) {
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch {}
            }
            return res.status(400).json({
                message: 'Tous les champs requis doivent être remplis',
                required: ['nom', 'description', 'dateDebut', 'dateFin', 'vehicules']
            });
        }

        // Validation des dates
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);
        const maintenant = new Date();

        if (isNaN(debut.getTime())) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                message: 'La date de début est invalide'
            });
        }

        if (isNaN(fin.getTime()) || fin <= maintenant) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                message: 'La date de fin doit être dans le futur'
            });
        }

        if (fin <= debut) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                message: 'La date de fin doit être après la date de début'
            });
        }

        // Validation des véhicules
        let vehiculesIds = [];
        if (Array.isArray(vehicules)) {
            vehiculesIds = vehicules;
        } else if (typeof vehicules === 'string') {
            try {
                vehiculesIds = JSON.parse(vehicules);
            } catch {
                vehiculesIds = [vehicules];
            }
        } else {
            vehiculesIds = [vehicules];
        }

        const vehiculesExistant = await Vehicule.find({ _id: { $in: vehiculesIds } });
        if (vehiculesExistant.length !== vehiculesIds.length) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                message: 'Certains véhicules spécifiés n\'existent pas'
            });
        }

        const imagePath = req.file ? `/images/${req.file.filename}` : null;

        const promotionData = {
            nom,
            description,
            dateDebut: debut,
            dateFin: fin,
            vehicules: vehiculesIds,
            imagePromo: imagePath
        };

        if (pourcentageReduction !== undefined) {
            promotionData.pourcentageReduction = parseFloat(pourcentageReduction);
        }
        if (montantReduction !== undefined) {
            promotionData.montantReduction = parseFloat(montantReduction);
        }
        if (nombreUtilisationsMax !== undefined) {
            promotionData.nombreUtilisationsMax = parseInt(nombreUtilisationsMax);
        }
        if (conditions) {
            promotionData.conditions = conditions;
        }
        if (codePromo) {
            promotionData.codePromo = codePromo.toUpperCase();
        }

        const newPromotion = new Promotion(promotionData);
        const savedPromotion = await newPromotion.save();
        await savedPromotion.populate('vehicules', 'marque modele annee prix images');

        res.status(201).json({
            message: 'Promotion créée avec succès',
            promotion: savedPromotion
        });

    } catch (error) {
        console.error('Erreur lors de la création de la promotion:', error);
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch {}
        }
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ce code promo existe déjà' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};


// READ all promotions
module.exports.getAllPromotions = async (req, res) => {
    try {
        const {
            statut,
            dateDebut,
            dateFin,
            vehiculeId,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Construction du filtre
        const filter = {};
        
        if (statut) filter.statut = statut;
        if (dateDebut || dateFin) {
            filter.dateDebut = {};
            if (dateDebut) filter.dateDebut.$gte = new Date(dateDebut);
            if (dateFin) filter.dateDebut.$lte = new Date(dateFin);
        }
        if (vehiculeId) filter.vehicules = vehiculeId;

        // Options de tri
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Exécution de la requête
        const promotions = await Promotion.find(filter)
            .populate('vehicules', 'marque modele annee prix images statut')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Compter le total pour la pagination
        const total = await Promotion.countDocuments(filter);

        res.status(200).json({
            promotions,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                count: promotions.length,
                totalPromotions: total
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des promotions:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// READ one promotion by ID
module.exports.getPromotionById = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id)
            .populate('vehicules', 'marque modele annee prix images statut qrCode');
            
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion non trouvée' });
        }

        // Calculer les prix réduits pour chaque véhicule
        const vehiculesAvecPrixReduits = promotion.vehicules.map(vehicule => {
            const prixReduit = promotion.calculerPrixReduit(vehicule.prix);
            return {
                ...vehicule.toObject(),
                prixReduit,
                economie: vehicule.prix - prixReduit
            };
        });

        const promotionResponse = {
            ...promotion.toObject(),
            vehicules: vehiculesAvecPrixReduits,
            isActive: promotion.isActive()
        };

        res.status(200).json(promotionResponse);
    } catch (error) {
        console.error('Erreur lors de la récupération de la promotion:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID promotion invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// UPDATE promotion
module.exports.updatePromotion = async (req, res) => {
    try {
        const promotionId = req.params.id;
        const updateData = req.body;

        const existingPromotion = await Promotion.findById(promotionId);
        if (!existingPromotion) {
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch {}
            }
            return res.status(404).json({ message: 'Promotion non trouvée' });
        }

        // Validation des dates si modifiées
        if (updateData.dateDebut || updateData.dateFin) {
            const debut = updateData.dateDebut ? new Date(updateData.dateDebut) : existingPromotion.dateDebut;
            const fin = updateData.dateFin ? new Date(updateData.dateFin) : existingPromotion.dateFin;
            const maintenant = new Date();

            if (isNaN(debut.getTime())) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    message: 'La date de début est invalide'
                });
            }

            if (isNaN(fin.getTime()) || fin <= maintenant) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    message: 'La date de fin doit être dans le futur'
                });
            }

            if (fin <= debut) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    message: 'La date de fin doit être après la date de début'
                });
            }
        }

        // Validation des véhicules si modifiés
        if (updateData.vehicules) {
            let vehiculesIds = [];
            if (Array.isArray(updateData.vehicules)) {
                vehiculesIds = updateData.vehicules;
            } else if (typeof updateData.vehicules === 'string') {
                try {
                    vehiculesIds = JSON.parse(updateData.vehicules);
                } catch {
                    vehiculesIds = [updateData.vehicules];
                }
            } else {
                vehiculesIds = [updateData.vehicules];
            }

            const vehiculesExistant = await Vehicule.find({ _id: { $in: vehiculesIds } });
            if (vehiculesExistant.length !== vehiculesIds.length) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    message: 'Certains véhicules spécifiés n\'existent pas'
                });
            }
        }

        let updatedImagePath = existingPromotion.imagePromo;
        if (req.file) {
            if (existingPromotion.imagePromo) {
                const oldImagePath = path.join('public', existingPromotion.imagePromo);
                if (fs.existsSync(oldImagePath)) {
                    try { fs.unlinkSync(oldImagePath); } catch {}
                }
            }
            updatedImagePath = `/images/${req.file.filename}`;
        }

        const updatedPromotion = await Promotion.findByIdAndUpdate(
            promotionId,
            { 
                ...updateData,
                imagePromo: updatedImagePath
            },
            { new: true, runValidators: true }
        ).populate('vehicules', 'marque modele annee prix images statut');

        res.status(200).json({
            message: 'Promotion mise à jour avec succès',
            promotion: updatedPromotion
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la promotion:', error);
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch {}
        }
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID promotion invalide' });
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ce code promo existe déjà' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};


// DELETE promotion
module.exports.deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion non trouvée' });
        }

        // Supprimer l'image associée si elle existe
        if (promotion.imagePromo) {
            const imagePath = path.join('public', promotion.imagePromo);
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log(`Image promotion supprimée: ${imagePath}`);
                } catch (error) {
                    console.error(`Erreur suppression image ${imagePath}:`, error);
                }
            }
        }

        // Supprimer la promotion de la base
        const deletedPromotion = await Promotion.findByIdAndDelete(req.params.id);

        res.status(200).json({ 
            message: 'Promotion supprimée avec succès',
            deletedPromotion: {
                id: deletedPromotion._id,
                nom: deletedPromotion.nom,
                codePromo: deletedPromotion.codePromo
            }
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de la promotion:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID promotion invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// VALIDATE promo code
module.exports.validatePromoCode = async (req, res) => {
    try {
        const { codePromo, vehiculeId } = req.body;

        if (!codePromo || !vehiculeId) {
            return res.status(400).json({
                message: 'Le code promo et l\'ID du véhicule sont requis'
            });
        }

        // Trouver la promotion par code
        const promotion = await Promotion.findOne({ 
            codePromo: codePromo.toUpperCase() 
        }).populate('vehicules', 'marque modele annee prix images statut');

        if (!promotion) {
            return res.status(404).json({
                message: 'Code promo invalide'
            });
        }

        // Vérifier si la promotion est active
        if (!promotion.isActive()) {
            return res.status(400).json({
                message: 'Cette promotion n\'est plus active',
                reason: promotion.statut === 'Expirée' ? 'Promotion expirée' : 'Promotion inactive'
            });
        }

        // Vérifier si le véhicule est inclus dans la promotion
        const vehiculeInclus = promotion.vehicules.some(v => v._id.toString() === vehiculeId);
        if (!vehiculeInclus) {
            return res.status(400).json({
                message: 'Ce code promo ne s\'applique pas à ce véhicule'
            });
        }

        // Vérifier si le véhicule est disponible
        const vehicule = promotion.vehicules.find(v => v._id.toString() === vehiculeId);
        if (vehicule.statut !== 'Disponible') {
            return res.status(400).json({
                message: 'Ce véhicule n\'est pas disponible à la vente'
            });
        }

        // Calculer le prix réduit
        const prixReduit = promotion.calculerPrixReduit(vehicule.prix);
        const economie = vehicule.prix - prixReduit;

        res.status(200).json({
            message: 'Code promo valide',
            promotion: {
                id: promotion._id,
                nom: promotion.nom,
                description: promotion.description,
                codePromo: promotion.codePromo,
                conditions: promotion.conditions
            },
            vehicule: {
                id: vehicule._id,
                marque: vehicule.marque,
                modele: vehicule.modele,
                annee: vehicule.annee,
                prixOriginal: vehicule.prix,
                prixReduit: prixReduit,
                economie: economie
            }
        });

    } catch (error) {
        console.error('Erreur lors de la validation du code promo:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// APPLY promo code (incrémente le nombre d'utilisations)
module.exports.applyPromoCode = async (req, res) => {
    try {
        const { codePromo, vehiculeId } = req.body;

        if (!codePromo || !vehiculeId) {
            return res.status(400).json({
                message: 'Le code promo et l\'ID du véhicule sont requis'
            });
        }

        // Trouver et mettre à jour la promotion
        const promotion = await Promotion.findOneAndUpdate(
            { 
                codePromo: codePromo.toUpperCase(),
                statut: 'Active',
                $or: [
                    { nombreUtilisationsMax: -1 },
                    { $expr: { $lt: ['$nombreUtilisations', '$nombreUtilisationsMax'] } }
                ]
            },
            { $inc: { nombreUtilisations: 1 } },
            { new: true }
        ).populate('vehicules', 'marque modele annee prix images statut');

        if (!promotion) {
            return res.status(404).json({
                message: 'Code promo invalide ou limite d\'utilisation atteinte'
            });
        }

        // Vérifier si le véhicule est inclus
        const vehicule = promotion.vehicules.find(v => v._id.toString() === vehiculeId);
        if (!vehicule) {
            return res.status(400).json({
                message: 'Ce code promo ne s\'applique pas à ce véhicule'
            });
        }

        // Calculer le prix réduit
        const prixReduit = promotion.calculerPrixReduit(vehicule.prix);
        const economie = vehicule.prix - prixReduit;

        res.status(200).json({
            message: 'Code promo appliqué avec succès',
            promotion: {
                id: promotion._id,
                nom: promotion.nom,
                codePromo: promotion.codePromo,
                nombreUtilisations: promotion.nombreUtilisations,
                nombreUtilisationsMax: promotion.nombreUtilisationsMax
            },
            vehicule: {
                id: vehicule._id,
                marque: vehicule.marque,
                modele: vehicule.modele,
                annee: vehicule.annee,
                prixOriginal: vehicule.prix,
                prixReduit: prixReduit,
                economie: economie
            }
        });

    } catch (error) {
        console.error('Erreur lors de l\'application du code promo:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET active promotions
module.exports.getActivePromotions = async (req, res) => {
    try {
        const now = new Date();
        
        const activePromotions = await Promotion.find({
            statut: 'Active',
            dateDebut: { $lte: now },
            dateFin: { $gte: now },
            $or: [
                { nombreUtilisationsMax: -1 },
                { $expr: { $lt: ['$nombreUtilisations', '$nombreUtilisationsMax'] } }
            ]
        }).populate('vehicules', 'marque modele annee prix images statut');

        // Calculer les prix réduits pour chaque promotion
        const promotionsWithReducedPrices = activePromotions.map(promotion => {
            const vehiculesAvecPrixReduits = promotion.vehicules.map(vehicule => {
                const prixReduit = promotion.calculerPrixReduit(vehicule.prix);
                return {
                    ...vehicule.toObject(),
                    prixReduit,
                    economie: vehicule.prix - prixReduit
                };
            });

            return {
                ...promotion.toObject(),
                vehicules: vehiculesAvecPrixReduits
            };
        });

        res.status(200).json({
            message: 'Promotions actives récupérées',
            count: promotionsWithReducedPrices.length,
            promotions: promotionsWithReducedPrices
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des promotions actives:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET promotions by vehicule
module.exports.getPromotionsByVehicule = async (req, res) => {
    try {
        const { vehiculeId } = req.params;
        
        // Vérifier que le véhicule existe
        const vehicule = await Vehicule.findById(vehiculeId);
        if (!vehicule) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        const now = new Date();
        
        const promotions = await Promotion.find({
            vehicules: vehiculeId,
            statut: 'Active',
            dateDebut: { $lte: now },
            dateFin: { $gte: now },
            $or: [
                { nombreUtilisationsMax: -1 },
                { $expr: { $lt: ['$nombreUtilisations', '$nombreUtilisationsMax'] } }
            ]
        });

        // Calculer les prix réduits
        const promotionsWithPrices = promotions.map(promotion => {
            const prixReduit = promotion.calculerPrixReduit(vehicule.prix);
            return {
                ...promotion.toObject(),
                prixOriginal: vehicule.prix,
                prixReduit: prixReduit,
                economie: vehicule.prix - prixReduit
            };
        });

        res.status(200).json({
            vehicule: {
                id: vehicule._id,
                marque: vehicule.marque,
                modele: vehicule.modele,
                annee: vehicule.annee,
                prix: vehicule.prix
            },
            promotions: promotionsWithPrices,
            count: promotionsWithPrices.length
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des promotions par véhicule:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID véhicule invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// UPDATE promotion status
module.exports.updatePromotionStatus = async (req, res) => {
    try {
        const { statut } = req.body;
        
        const validStatuts = ['Active', 'Inactive', 'Expirée'];
        if (!validStatuts.includes(statut)) {
            return res.status(400).json({ 
                message: 'Statut invalide',
                validStatuts 
            });
        }

        const updatedPromotion = await Promotion.findByIdAndUpdate(
            req.params.id,
            { statut },
            { new: true, runValidators: true }
        ).populate('vehicules', 'marque modele annee prix images statut');

        if (!updatedPromotion) {
            return res.status(404).json({ message: 'Promotion non trouvée' });
        }

        res.status(200).json({
            message: `Statut de la promotion mis à jour vers: ${statut}`,
            promotion: updatedPromotion
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID promotion invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// REGENERATE promo code
module.exports.regeneratePromoCode = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion non trouvée' });
        }

        // Générer un nouveau code promo
        const newCodePromo = await promotion.generateUniqueCode();
        promotion.codePromo = newCodePromo;
        await promotion.save();

        res.status(200).json({
            message: 'Code promo régénéré avec succès',
            codePromo: newCodePromo
        });

    } catch (error) {
        console.error('Erreur lors de la régénération du code promo:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID promotion invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET promotion analytics
module.exports.getPromotionAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Statistiques générales
        const totalPromotions = await Promotion.countDocuments();
        const activePromotions = await Promotion.countDocuments({
            statut: 'Active',
            dateDebut: { $lte: now },
            dateFin: { $gte: now }
        });
        const expiredPromotions = await Promotion.countDocuments({
            statut: 'Expirée'
        });

        // Promotions créées ce mois
        const thisMonthPromotions = await Promotion.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Top promotions les plus utilisées
        const topPromotions = await Promotion.find()
            .sort({ nombreUtilisations: -1 })
            .limit(10)
            .populate('vehicules', 'marque modele prix');

        // Répartition par statut
        const statusDistribution = await Promotion.aggregate([
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 },
                    avgUtilisations: { $avg: '$nombreUtilisations' }
                }
            }
        ]);

        // Promotions par mois
        const promotionsByMonth = await Promotion.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.status(200).json({
            summary: {
                totalPromotions,
                activePromotions,
                expiredPromotions,
                thisMonthPromotions
            },
            topPromotions,
            statusDistribution,
            promotionsByMonth
        });

    } catch (error) {
        console.error('Erreur analytics promotions:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};
