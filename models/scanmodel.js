const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const scanSchema = new mongoose.Schema({
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
    dateScan: {
        type: Date,
        default: Date.now
    },
    adresseIP: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        default: ''
    },
    localisation: {
        type: String,
        default: ''
    },
    statut: {
        type: String,
        enum: ['Succès', 'Échec', 'En cours'],
        default: 'Succès'
    },
    details: {
        type: String,
        default: ''
    }
}, { 
    timestamps: true 
});

// Index pour optimiser les requêtes
scanSchema.index({ utilisateur: 1, dateScan: -1 });
scanSchema.index({ vehicule: 1, dateScan: -1 });
scanSchema.index({ dateScan: -1 });

// Méthode pour obtenir les statistiques de scan
scanSchema.statics.getScanStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalScans: { $sum: 1 },
                scansAujourdhui: {
                    $sum: {
                        $cond: [
                            {
                                $gte: [
                                    '$dateScan',
                                    new Date(new Date().setHours(0, 0, 0, 0))
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                scansCetteSemaine: {
                    $sum: {
                        $cond: [
                            {
                                $gte: [
                                    '$dateScan',
                                    new Date(new Date().setDate(new Date().getDate() - 7))
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                scansCeMois: {
                    $sum: {
                        $cond: [
                            {
                                $gte: [
                                    '$dateScan',
                                    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);

    return stats[0] || {
        totalScans: 0,
        scansAujourdhui: 0,
        scansCetteSemaine: 0,
        scansCeMois: 0
    };
};

// Méthode pour obtenir les scans par véhicule
scanSchema.statics.getScansByVehicule = async function(vehiculeId) {
    return await this.find({ vehicule: vehiculeId })
        .populate('utilisateur', 'username email')
        .sort({ dateScan: -1 });
};

// Méthode pour obtenir les scans par utilisateur
scanSchema.statics.getScansByUser = async function(userId) {
    return await this.find({ utilisateur: userId })
        .populate('vehicule', 'marque modele annee prix images')
        .sort({ dateScan: -1 });
};

// Pré-hook pour peupler automatiquement les références
scanSchema.pre('find', function() {
    this.populate('utilisateur', 'username email')
        .populate('vehicule', 'marque modele annee prix images');
});

scanSchema.pre('findOne', function() {
    this.populate('utilisateur', 'username email')
        .populate('vehicule', 'marque modele annee prix images');
});

// Ajouter le plugin de pagination
scanSchema.plugin(mongoosePaginate);


// Vérifier si le modèle existe déjà avant de le créer
module.exports = mongoose.models.Scan || mongoose.model('Scan', scanSchema);
