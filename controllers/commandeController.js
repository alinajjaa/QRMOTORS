const Commande = require('../models/commandemodel');
const Vehicule = require('../models/vehiculemodel');
const User = require('../models/usermodel');
const Promotion = require('../models/promotionmodel');

// POST - Créer une nouvelle commande
module.exports.createCommande = async (req, res) => {
    try {
        const {
            vehiculeId,
            userId,
            promotionId,
            codePromo,
            adresseLivraison,
            informationsContact,
            modePaiement,
            notes
        } = req.body;

        // Validation des données requises
        if (!vehiculeId || !userId || !adresseLivraison || !informationsContact || !modePaiement) {
            return res.status(400).json({
                message: 'Toutes les informations de commande sont requises'
            });
        }

        // Vérifier que le véhicule existe et est disponible
        const vehicule = await Vehicule.findById(vehiculeId);
        if (!vehicule) {
            return res.status(404).json({
                message: 'Véhicule non trouvé'
            });
        }

        if (vehicule.statut !== 'Disponible') {
            return res.status(400).json({
                message: 'Ce véhicule n\'est pas disponible à la vente'
            });
        }

        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: 'Utilisateur non trouvé'
            });
        }

        // Traitement de la promotion
        let promotion = null;
        let prixReduit = vehicule.prix;
        let codePromoUtilise = null;

        if (promotionId) {
            promotion = await Promotion.findById(promotionId);
            if (promotion && promotion.isActive()) {
                prixReduit = promotion.calculerPrixReduit(vehicule.prix);
                codePromoUtilise = promotion.codePromo;
            }
        } else if (codePromo) {
            // Rechercher la promotion par code promo
            promotion = await Promotion.findOne({ 
                codePromo: codePromo.toUpperCase(),
                vehicules: vehiculeId
            });
            
            if (promotion && promotion.isActive()) {
                prixReduit = promotion.calculerPrixReduit(vehicule.prix);
                codePromoUtilise = promotion.codePromo;
                
                // Incrémenter le nombre d'utilisations
                promotion.nombreUtilisations += 1;
                await promotion.save();
            }
        }

        // Créer la commande
        const commande = new Commande({
            utilisateur: userId,
            vehicule: vehiculeId,
            promotion: promotion ? promotion._id : null,
            prixTotal: vehicule.prix,
            prixReduit: prixReduit,
            montantReduction: vehicule.prix - prixReduit,
            codePromoUtilise: codePromoUtilise,
            adresseLivraison,
            informationsContact,
            modePaiement,
            notes: notes || '',
            dateLivraisonEstimee: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
            historique: [{
                statut: 'En attente',
                date: new Date(),
                commentaire: 'Commande créée'
            }]
        });

        await commande.save();

        // Mettre à jour le statut du véhicule
        await Vehicule.findByIdAndUpdate(vehiculeId, {
            statut: 'Réservé'
        });

        // Mettre à jour les relations dans User et Vehicule
        await User.findByIdAndUpdate(userId, {
            $push: { commandes: commande._id }
        });

        await Vehicule.findByIdAndUpdate(vehiculeId, {
            $push: { commandes: commande._id }
        });

        // Retourner la commande avec les données peuplées
        const commandePopulated = await Commande.findById(commande._id)
            .populate('utilisateur', 'username email')
            .populate('vehicule', 'marque modele annee prix images')
            .populate('promotion', 'nom codePromo pourcentageReduction');

        res.status(201).json({
            message: 'Commande créée avec succès',
            commande: commandePopulated
        });

    } catch (error) {
        console.error('Erreur lors de la création de la commande:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID invalide'
            });
        }
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// GET - Obtenir toutes les commandes
module.exports.getAllCommandes = async (req, res) => {
    try {
        const { page = 1, limit = 10, statut, statutPaiement, sortBy = 'dateCommande', sortOrder = 'desc' } = req.query;
        
        const filter = {};
        if (statut) filter.statut = statut;
        if (statutPaiement) filter.statutPaiement = statutPaiement;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
        };

        const commandes = await Commande.paginate(filter, options);
        
        res.status(200).json({
            message: 'Commandes récupérées avec succès',
            commandes: commandes.docs,
            pagination: {
                totalDocs: commandes.totalDocs,
                limit: commandes.limit,
                totalPages: commandes.totalPages,
                page: commandes.page,
                hasPrevPage: commandes.hasPrevPage,
                hasNextPage: commandes.hasNextPage,
                prevPage: commandes.prevPage,
                nextPage: commandes.nextPage
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// GET - Obtenir une commande par ID
module.exports.getCommandeById = async (req, res) => {
    try {
        const commandeId = req.params.id;
        
        const commande = await Commande.findById(commandeId);
        if (!commande) {
            return res.status(404).json({
                message: 'Commande non trouvée'
            });
        }

        res.status(200).json({
            message: 'Commande récupérée avec succès',
            commande: commande
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la commande:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID de commande invalide'
            });
        }
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// GET - Obtenir les commandes par utilisateur
module.exports.getCommandesByUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { page = 1, limit = 10 } = req.query;

        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: 'Utilisateur non trouvé'
            });
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { dateCommande: -1 }
        };

        const commandes = await Commande.paginate({ utilisateur: userId }, options);

        res.status(200).json({
            message: 'Commandes de l\'utilisateur récupérées avec succès',
            utilisateur: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            commandes: commandes.docs,
            pagination: {
                totalDocs: commandes.totalDocs,
                limit: commandes.limit,
                totalPages: commandes.totalPages,
                page: commandes.page,
                hasPrevPage: commandes.hasPrevPage,
                hasNextPage: commandes.hasNextPage,
                prevPage: commandes.prevPage,
                nextPage: commandes.nextPage
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des commandes de l\'utilisateur:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID d\'utilisateur invalide'
            });
        }
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// GET - Obtenir les commandes par véhicule
module.exports.getCommandesByVehicule = async (req, res) => {
    try {
        const vehiculeId = req.params.vehiculeId;
        const { page = 1, limit = 10 } = req.query;

        // Vérifier que le véhicule existe
        const vehicule = await Vehicule.findById(vehiculeId);
        if (!vehicule) {
            return res.status(404).json({
                message: 'Véhicule non trouvé'
            });
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { dateCommande: -1 }
        };

        const commandes = await Commande.paginate({ vehicule: vehiculeId }, options);

        res.status(200).json({
            message: 'Commandes du véhicule récupérées avec succès',
            vehicule: {
                id: vehicule._id,
                marque: vehicule.marque,
                modele: vehicule.modele,
                annee: vehicule.annee
            },
            commandes: commandes.docs,
            pagination: {
                totalDocs: commandes.totalDocs,
                limit: commandes.limit,
                totalPages: commandes.totalPages,
                page: commandes.page,
                hasPrevPage: commandes.hasPrevPage,
                hasNextPage: commandes.hasNextPage,
                prevPage: commandes.prevPage,
                nextPage: commandes.nextPage
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des commandes du véhicule:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID de véhicule invalide'
            });
        }
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// PUT - Mettre à jour le statut d'une commande
module.exports.updateCommandeStatus = async (req, res) => {
    try {
        const commandeId = req.params.id;
        const { nouveauStatut, commentaire, utilisateurId } = req.body;

        if (!nouveauStatut) {
            return res.status(400).json({
                message: 'Nouveau statut requis'
            });
        }

        const commande = await Commande.findById(commandeId);
        if (!commande) {
            return res.status(404).json({
                message: 'Commande non trouvée'
            });
        }

        // Mettre à jour le statut avec historique
        await commande.mettreAJourStatut(nouveauStatut, commentaire, utilisateurId);

        // Si la commande est annulée, remettre le véhicule en disponible
        if (nouveauStatut === 'Annulée') {
            await Vehicule.findByIdAndUpdate(commande.vehicule, {
                statut: 'Disponible'
            });
        }

        // Si la commande est livrée, mettre le véhicule en vendu
        if (nouveauStatut === 'Livrée') {
            await Vehicule.findByIdAndUpdate(commande.vehicule, {
                statut: 'Vendu'
            });
        }

        const commandeUpdated = await Commande.findById(commandeId)
            .populate('utilisateur', 'username email')
            .populate('vehicule', 'marque modele annee prix images')
            .populate('promotion', 'nom codePromo');

        res.status(200).json({
            message: 'Statut de la commande mis à jour avec succès',
            commande: commandeUpdated
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID de commande invalide'
            });
        }
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// PUT - Mettre à jour le statut de paiement
module.exports.updatePaiementStatus = async (req, res) => {
    try {
        const commandeId = req.params.id;
        const { statutPaiement, referencePaiement } = req.body;

        if (!statutPaiement) {
            return res.status(400).json({
                message: 'Statut de paiement requis'
            });
        }

        const commande = await Commande.findById(commandeId);
        if (!commande) {
            return res.status(404).json({
                message: 'Commande non trouvée'
            });
        }

        commande.statutPaiement = statutPaiement;
        if (referencePaiement) {
            commande.referencePaiement = referencePaiement;
        }

        await commande.save();

        res.status(200).json({
            message: 'Statut de paiement mis à jour avec succès',
            commande: commande
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut de paiement:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID de commande invalide'
            });
        }
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// DELETE - Annuler une commande
module.exports.cancelCommande = async (req, res) => {
    try {
        const commandeId = req.params.id;
        const { raison } = req.body;

        const commande = await Commande.findById(commandeId);
        if (!commande) {
            return res.status(404).json({
                message: 'Commande non trouvée'
            });
        }

        if (!commande.peutEtreAnnulee()) {
            return res.status(400).json({
                message: 'Cette commande ne peut pas être annulée'
            });
        }

        // Mettre à jour le statut
        await commande.mettreAJourStatut('Annulée', raison || 'Annulation par l\'utilisateur');

        // Remettre le véhicule en disponible
        await Vehicule.findByIdAndUpdate(commande.vehicule, {
            statut: 'Disponible'
        });

        // Si une promotion était utilisée, décrémenter le nombre d'utilisations
        if (commande.promotion) {
            const promotion = await Promotion.findById(commande.promotion);
            if (promotion && promotion.nombreUtilisations > 0) {
                promotion.nombreUtilisations -= 1;
                await promotion.save();
            }
        }

        res.status(200).json({
            message: 'Commande annulée avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de l\'annulation de la commande:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID de commande invalide'
            });
        }
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// GET - Statistiques des commandes
module.exports.getCommandeStats = async (req, res) => {
    try {
        const stats = await Commande.getCommandeStats();

        // Statistiques par statut
        const statsParStatut = await Commande.aggregate([
            {
                $group: {
                    _id: '$statut',
                    nombre: { $sum: 1 }
                }
            },
            {
                $sort: { nombre: -1 }
            }
        ]);

        // Top 5 des véhicules les plus commandés
        const topVehicules = await Commande.aggregate([
            {
                $group: {
                    _id: '$vehicule',
                    nombreCommandes: { $sum: 1 },
                    chiffreAffaires: { $sum: '$prixReduit' }
                }
            },
            {
                $sort: { nombreCommandes: -1 }
            },
            {
                $limit: 5
            },
            {
                $lookup: {
                    from: 'vehicules',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'vehicule'
                }
            },
            {
                $unwind: '$vehicule'
            },
            {
                $project: {
                    vehicule: {
                        _id: 1,
                        marque: 1,
                        modele: 1,
                        annee: 1
                    },
                    nombreCommandes: 1,
                    chiffreAffaires: 1
                }
            }
        ]);

        res.status(200).json({
            message: 'Statistiques des commandes récupérées avec succès',
            stats: {
                ...stats,
                statsParStatut,
                topVehicules
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

