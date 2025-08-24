const Scan = require('../models/scanmodel');
const Vehicule = require('../models/vehiculemodel');
const User = require('../models/usermodel');

// POST - Enregistrer un nouveau scan
module.exports.createScan = async (req, res) => {
    try {
        const { vehiculeId, userId } = req.body;
        
        // Validation des données
        if (!vehiculeId || !userId) {
            return res.status(400).json({
                message: 'ID du véhicule et ID de l\'utilisateur sont requis'
            });
        }

        // Vérifier que le véhicule existe
        const vehicule = await Vehicule.findById(vehiculeId);
        if (!vehicule) {
            return res.status(404).json({
                message: 'Véhicule non trouvé'
            });
        }

        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: 'Utilisateur non trouvé'
            });
        }

        // Récupérer l'adresse IP du client
        const adresseIP = req.ip || 
                         req.connection.remoteAddress || 
                         req.socket.remoteAddress ||
                         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                         req.headers['x-forwarded-for'] ||
                         '127.0.0.1';

        // Récupérer le User-Agent
        const userAgent = req.headers['user-agent'] || '';

        // Créer le scan
        const scan = new Scan({
            utilisateur: userId,
            vehicule: vehiculeId,
            adresseIP: adresseIP,
            userAgent: userAgent,
            statut: 'Succès',
            details: `Scan du QR code du véhicule ${vehicule.marque} ${vehicule.modele}`
        });

        await scan.save();

        // Mettre à jour les relations dans User et Vehicule
        await User.findByIdAndUpdate(userId, {
            $push: { scans: scan._id }
        });

        await Vehicule.findByIdAndUpdate(vehiculeId, {
            $push: { scans: scan._id }
        });

        // Retourner les informations du scan avec les données peuplées
        const scanPopulated = await Scan.findById(scan._id)
            .populate('utilisateur', 'username email')
            .populate('vehicule', 'marque modele annee prix images');

        res.status(201).json({
            message: 'Scan enregistré avec succès',
            scan: scanPopulated
        });

    } catch (error) {
        console.error('Erreur lors de la création du scan:', error);
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

// GET - Obtenir tous les scans
module.exports.getAllScans = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'dateScan', sortOrder = 'desc' } = req.query;
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
        };

        const scans = await Scan.paginate({}, options);
        
        res.status(200).json({
            message: 'Scans récupérés avec succès',
            scans: scans.docs,
            pagination: {
                totalDocs: scans.totalDocs,
                limit: scans.limit,
                totalPages: scans.totalPages,
                page: scans.page,
                pagingCounter: scans.pagingCounter,
                hasPrevPage: scans.hasPrevPage,
                hasNextPage: scans.hasNextPage,
                prevPage: scans.prevPage,
                nextPage: scans.nextPage
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des scans:', error);
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// GET - Obtenir un scan par ID
module.exports.getScanById = async (req, res) => {
    try {
        const scanId = req.params.id;
        
        const scan = await Scan.findById(scanId);
        if (!scan) {
            return res.status(404).json({
                message: 'Scan non trouvé'
            });
        }

        res.status(200).json({
            message: 'Scan récupéré avec succès',
            scan: scan
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du scan:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID de scan invalide'
            });
        }
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// GET - Obtenir les scans par véhicule
module.exports.getScansByVehicule = async (req, res) => {
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
            sort: { dateScan: -1 }
        };

        const scans = await Scan.paginate({ vehicule: vehiculeId }, options);

        res.status(200).json({
            message: 'Scans du véhicule récupérés avec succès',
            vehicule: {
                id: vehicule._id,
                marque: vehicule.marque,
                modele: vehicule.modele,
                annee: vehicule.annee
            },
            scans: scans.docs,
            pagination: {
                totalDocs: scans.totalDocs,
                limit: scans.limit,
                totalPages: scans.totalPages,
                page: scans.page,
                hasPrevPage: scans.hasPrevPage,
                hasNextPage: scans.hasNextPage,
                prevPage: scans.prevPage,
                nextPage: scans.nextPage
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des scans du véhicule:', error);
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

// GET - Obtenir les scans par utilisateur
module.exports.getScansByUser = async (req, res) => {
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
            sort: { dateScan: -1 }
        };

        const scans = await Scan.paginate({ utilisateur: userId }, options);

        res.status(200).json({
            message: 'Scans de l\'utilisateur récupérés avec succès',
            utilisateur: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            scans: scans.docs,
            pagination: {
                totalDocs: scans.totalDocs,
                limit: scans.limit,
                totalPages: scans.totalPages,
                page: scans.page,
                hasPrevPage: scans.hasPrevPage,
                hasNextPage: scans.hasNextPage,
                prevPage: scans.prevPage,
                nextPage: scans.nextPage
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des scans de l\'utilisateur:', error);
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

// GET - Statistiques des scans
module.exports.getScanStats = async (req, res) => {
    try {
        const stats = await Scan.getScanStats();

        // Statistiques par véhicule (top 5)
        const topVehicules = await Scan.aggregate([
            {
                $group: {
                    _id: '$vehicule',
                    nombreScans: { $sum: 1 }
                }
            },
            {
                $sort: { nombreScans: -1 }
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
                    nombreScans: 1
                }
            }
        ]);

        // Statistiques par utilisateur (top 5)
        const topUtilisateurs = await Scan.aggregate([
            {
                $group: {
                    _id: '$utilisateur',
                    nombreScans: { $sum: 1 }
                }
            },
            {
                $sort: { nombreScans: -1 }
            },
            {
                $limit: 5
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'utilisateur'
                }
            },
            {
                $unwind: '$utilisateur'
            },
            {
                $project: {
                    utilisateur: {
                        _id: 1,
                        username: 1,
                        email: 1
                    },
                    nombreScans: 1
                }
            }
        ]);

        res.status(200).json({
            message: 'Statistiques des scans récupérées avec succès',
            stats: {
                ...stats,
                topVehicules,
                topUtilisateurs
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

// DELETE - Supprimer un scan
module.exports.deleteScan = async (req, res) => {
    try {
        const scanId = req.params.id;
        
        const scan = await Scan.findByIdAndDelete(scanId);
        if (!scan) {
            return res.status(404).json({
                message: 'Scan non trouvé'
            });
        }

        res.status(200).json({
            message: 'Scan supprimé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression du scan:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'ID de scan invalide'
            });
        }
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};

// POST - Scanner un QR code (endpoint principal pour le scan)
module.exports.scanQRCode = async (req, res) => {
    try {
        const { qrCodeData, userId } = req.body;
        
        if (!qrCodeData || !userId) {
            return res.status(400).json({
                message: 'Données QR code et ID utilisateur sont requis'
            });
        }

        // Rechercher le véhicule par QR code
        const vehicule = await Vehicule.findOne({ qrCode: qrCodeData });
        if (!vehicule) {
            return res.status(404).json({
                message: 'Véhicule non trouvé pour ce QR code'
            });
        }

        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: 'Utilisateur non trouvé'
            });
        }

        // Récupérer l'adresse IP
        const adresseIP = req.ip || 
                         req.connection.remoteAddress || 
                         req.socket.remoteAddress ||
                         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                         req.headers['x-forwarded-for'] ||
                         '127.0.0.1';

        // Créer le scan
        const scan = new Scan({
            utilisateur: userId,
            vehicule: vehicule._id,
            adresseIP: adresseIP,
            userAgent: req.headers['user-agent'] || '',
            statut: 'Succès',
            details: `Scan QR code du véhicule ${vehicule.marque} ${vehicule.modele}`
        });

        await scan.save();

        // Mettre à jour les relations dans User et Vehicule
        await User.findByIdAndUpdate(userId, {
            $push: { scans: scan._id }
        });

        await Vehicule.findByIdAndUpdate(vehicule._id, {
            $push: { scans: scan._id }
        });

        // Retourner les informations du véhicule et du scan
        res.status(200).json({
            message: 'QR code scanné avec succès',
            vehicule: {
                id: vehicule._id,
                marque: vehicule.marque,
                modele: vehicule.modele,
                annee: vehicule.annee,
                prix: vehicule.prix,
                kilometrage: vehicule.kilometrage,
                carburant: vehicule.carburant,
                boiteVitesse: vehicule.boiteVitesse,
                couleur: vehicule.couleur,
                description: vehicule.description,
                options: vehicule.options,
                images: vehicule.images,
                statut: vehicule.statut
            },
            scan: {
                id: scan._id,
                dateScan: scan.dateScan,
                adresseIP: scan.adresseIP,
                statut: scan.statut
            }
        });

    } catch (error) {
        console.error('Erreur lors du scan du QR code:', error);
        res.status(500).json({
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
};
