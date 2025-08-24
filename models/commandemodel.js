const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const commandeSchema = new mongoose.Schema({
    utilisateur: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vehicule: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicule',
        required: true
    },
    promotion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Promotion',
        default: null
    },
    statut: {
        type: String,
        enum: ['En attente', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée', 'Refusée'],
        default: 'En attente'
    },
    prixTotal: {
        type: Number,
        required: true
    },
    prixReduit: {
        type: Number,
        default: 0
    },
    montantReduction: {
        type: Number,
        default: 0
    },
    codePromoUtilise: {
        type: String,
        default: null
    },
    dateCommande: {
        type: Date,
        default: Date.now
    },
    dateLivraisonEstimee: {
        type: Date
    },
    dateLivraisonReelle: {
        type: Date
    },
    adresseLivraison: {
        rue: { type: String, required: true },
        ville: { type: String, required: true },
        codePostal: { type: String, required: true },
        pays: { type: String, required: true }
    },
    informationsContact: {
        nom: { type: String, required: true },
        prenom: { type: String, required: true },
        telephone: { type: String, required: true },
        email: { type: String, required: true }
    },
    modePaiement: {
        type: String,
        enum: ['Carte bancaire', 'Virement bancaire', 'Chèque', 'Espèces'],
        required: true
    },
    statutPaiement: {
        type: String,
        enum: ['En attente', 'Payé', 'Échoué', 'Remboursé'],
        default: 'En attente'
    },
    referencePaiement: {
        type: String
    },
    notes: {
        type: String,
        default: ''
    },
    documents: [{
        nom: String,
        url: String,
        type: String
    }],
    historique: [{
        statut: String,
        date: { type: Date, default: Date.now },
        commentaire: String,
        utilisateur: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }]
}, { 
    timestamps: true 
});

// Index pour optimiser les requêtes
commandeSchema.index({ utilisateur: 1, dateCommande: -1 });
commandeSchema.index({ vehicule: 1, dateCommande: -1 });
commandeSchema.index({ statut: 1 });
commandeSchema.index({ statutPaiement: 1 });
commandeSchema.index({ dateCommande: -1 });

// Méthode pour calculer le prix total
commandeSchema.methods.calculerPrixTotal = function() {
    if (this.prixReduit > 0) {
        return this.prixReduit;
    }
    return this.prixTotal;
};

// Méthode pour calculer l'économie réalisée
commandeSchema.methods.calculerEconomie = function() {
    return this.prixTotal - this.prixReduit;
};

// Méthode pour mettre à jour le statut avec historique
commandeSchema.methods.mettreAJourStatut = function(nouveauStatut, commentaire = '', utilisateurId = null) {
    this.historique.push({
        statut: nouveauStatut,
        date: new Date(),
        commentaire: commentaire,
        utilisateur: utilisateurId
    });
    this.statut = nouveauStatut;
    return this.save();
};

// Méthode pour vérifier si la commande peut être annulée
commandeSchema.methods.peutEtreAnnulee = function() {
    const statutsNonAnnulables = ['Livrée', 'Annulée', 'Refusée'];
    return !statutsNonAnnulables.includes(this.statut);
};

// Méthode pour obtenir les statistiques de commande
commandeSchema.statics.getCommandeStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalCommandes: { $sum: 1 },
                commandesAujourdhui: {
                    $sum: {
                        $cond: [
                            {
                                $gte: [
                                    '$dateCommande',
                                    new Date(new Date().setHours(0, 0, 0, 0))
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                commandesCetteSemaine: {
                    $sum: {
                        $cond: [
                            {
                                $gte: [
                                    '$dateCommande',
                                    new Date(new Date().setDate(new Date().getDate() - 7))
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                commandesCeMois: {
                    $sum: {
                        $cond: [
                            {
                                $gte: [
                                    '$dateCommande',
                                    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                chiffreAffairesTotal: { $sum: '$prixTotal' },
                chiffreAffairesReduit: { $sum: '$prixReduit' },
                economieTotale: { $sum: { $subtract: ['$prixTotal', '$prixReduit'] } }
            }
        }
    ]);

    return stats[0] || {
        totalCommandes: 0,
        commandesAujourdhui: 0,
        commandesCetteSemaine: 0,
        commandesCeMois: 0,
        chiffreAffairesTotal: 0,
        chiffreAffairesReduit: 0,
        economieTotale: 0
    };
};

// Méthode pour obtenir les commandes par véhicule
commandeSchema.statics.getCommandesByVehicule = async function(vehiculeId) {
    return await this.find({ vehicule: vehiculeId })
        .populate('utilisateur', 'username email')
        .populate('promotion', 'nom codePromo')
        .sort({ dateCommande: -1 });
};

// Méthode pour obtenir les commandes par utilisateur
commandeSchema.statics.getCommandesByUser = async function(userId) {
    return await this.find({ utilisateur: userId })
        .populate('vehicule', 'marque modele annee prix images')
        .populate('promotion', 'nom codePromo')
        .sort({ dateCommande: -1 });
};

// Pré-hook pour peupler automatiquement les références
commandeSchema.pre('find', function() {
    this.populate('utilisateur', 'username email')
        .populate('vehicule', 'marque modele annee prix images')
        .populate('promotion', 'nom codePromo pourcentageReduction');
});

commandeSchema.pre('findOne', function() {
    this.populate('utilisateur', 'username email')
        .populate('vehicule', 'marque modele annee prix images')
        .populate('promotion', 'nom codePromo pourcentageReduction');
});

// Middleware pre-save pour calculer automatiquement les prix
commandeSchema.pre('save', function(next) {
    // Si c'est une nouvelle commande et qu'il y a une promotion
    if (this.isNew && this.promotion && this.prixTotal > 0) {
        // Le prix réduit sera calculé dans le contrôleur
        this.montantReduction = this.prixTotal - this.prixReduit;
    }
    next();
});

// Ajouter le plugin de pagination
commandeSchema.plugin(mongoosePaginate);

// Vérifier si le modèle existe déjà avant de le créer
const Commande = mongoose.models.Commande || mongoose.model('Commande', commandeSchema);
module.exports = Commande;
