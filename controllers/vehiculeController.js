const Vehicule = require('../models/vehiculemodel')
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')

// CREATE vehicule
module.exports.createVehicule = async (req, res) => {
    try {
        const { 
            marque, 
            modele, 
            annee, 
            prix, 
            kilometrage, 
            carburant, 
            boiteVitesse, 
            couleur, 
            description, 
            options
                } = req.body;

        // Validation des champs requis
        if (!marque || !modele || !annee || !prix || !kilometrage || !carburant || !boiteVitesse) {
            // Supprimer les fichiers uploadés si validation échoue
            if (req.files) {
                req.files.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (unlinkError) {
                        console.error('Erreur lors de la suppression du fichier:', unlinkError);
                    }
                });
            }
            
            return res.status(400).json({ 
                message: 'Tous les champs requis doivent être remplis',
                required: ['marque', 'modele', 'annee', 'prix', 'kilometrage', 'carburant', 'boiteVitesse']
            });
        }

        // Validation de l'année
        const currentYear = new Date().getFullYear();
        if (annee < 1900 || annee > currentYear + 1) {
            if (req.files) {
                req.files.forEach(file => fs.unlinkSync(file.path));
            }
            return res.status(400).json({ 
                message: `L'année doit être comprise entre 1900 et ${currentYear + 1}` 
            });
        }

        // Validation du prix et kilométrage
        if (prix < 0 || kilometrage < 0) {
            if (req.files) {
                req.files.forEach(file => fs.unlinkSync(file.path));
            }
            return res.status(400).json({ 
                message: 'Le prix et le kilométrage doivent être positifs' 
            });
        }

        // Traiter les images uploadées
        const imagesPaths = req.files ? req.files.map(file => `/images/${file.filename}`) : [];

        // Traiter les options
        let parsedOptions = [];
        if (options) {
            try {
                parsedOptions = Array.isArray(options) ? options : JSON.parse(options);
            } catch (e) {
                parsedOptions = typeof options === 'string' ? [options] : [];
            }
        }

        // Créer le véhicule
        const newVehicule = new Vehicule({
            marque,
            modele,
            annee: parseInt(annee),
            prix: parseFloat(prix),
            kilometrage: parseInt(kilometrage),
            carburant,
            boiteVitesse,
            couleur,
            description,
            options: parsedOptions,
            images: imagesPaths
                });

        const savedVehicule = await newVehicule.save();

        // Générer le QR code avec l'ID du véhicule
        const vehiculeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vehicule/${savedVehicule._id}`;
        const qrCodeDataURL = await QRCode.toDataURL(vehiculeUrl, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Mettre à jour le véhicule avec le QR code
        savedVehicule.qrCode = qrCodeDataURL;
        await savedVehicule.save();

        res.status(201).json({
            message: 'Véhicule créé avec succès',
            vehicule: savedVehicule
        });

    } catch (error) {
        console.error('Erreur lors de la création du véhicule:', error);
        
        // Nettoyer les fichiers en cas d'erreur
        if (req.files) {
            req.files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (unlinkError) {
                    console.error('Erreur lors de la suppression du fichier:', unlinkError);
                }
            });
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }
        
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// READ all vehicules
module.exports.getAllVehicules = async (req, res) => {
    try {
        const {
            marque,
            modele,
            anneeMin,
            anneeMax,
            prixMin,
            prixMax,
            kilometrageMax,
            carburant,
            boiteVitesse,
            couleur,
            statut,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Construction du filtre
        const filter = {};
        
        if (marque) filter.marque = new RegExp(marque, 'i');
        if (modele) filter.modele = new RegExp(modele, 'i');
        if (anneeMin || anneeMax) {
            filter.annee = {};
            if (anneeMin) filter.annee.$gte = parseInt(anneeMin);
            if (anneeMax) filter.annee.$lte = parseInt(anneeMax);
        }
        if (prixMin || prixMax) {
            filter.prix = {};
            if (prixMin) filter.prix.$gte = parseFloat(prixMin);
            if (prixMax) filter.prix.$lte = parseFloat(prixMax);
        }
        if (kilometrageMax) filter.kilometrage = { $lte: parseInt(kilometrageMax) };
        if (carburant) filter.carburant = carburant;
        if (boiteVitesse) filter.boiteVitesse = boiteVitesse;
        if (couleur) filter.couleur = new RegExp(couleur, 'i');
        if (statut) filter.statut = statut;

        // Options de tri
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Exécution de la requête
        const vehicules = await Vehicule.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Compter le total pour la pagination
        const total = await Vehicule.countDocuments(filter);

        res.status(200).json({
            vehicules,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                count: vehicules.length,
                totalVehicules: total
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des véhicules:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// READ one vehicule by ID
module.exports.getVehiculeById = async (req, res) => {
    try {
        const vehicule = await Vehicule.findById(req.params.id);
        if (!vehicule) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }
        res.status(200).json(vehicule);
    } catch (error) {
        console.error('Erreur lors de la récupération du véhicule:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID véhicule invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// UPDATE vehicule
module.exports.updateVehicule = async (req, res) => {
    try {
        const vehiculeId = req.params.id;
        const { removeImages, ...updateData } = req.body;

        // Récupérer le véhicule existant
        const existingVehicule = await Vehicule.findById(vehiculeId);
        if (!existingVehicule) {
            // Nettoyer les nouveaux fichiers uploadés
            if (req.files) {
                req.files.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (unlinkError) {
                        console.error('Erreur lors de la suppression du fichier:', unlinkError);
                    }
                });
            }
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        // Validation des données numériques si présentes
        if (updateData.annee) {
            const currentYear = new Date().getFullYear();
            if (updateData.annee < 1900 || updateData.annee > currentYear + 1) {
                if (req.files) {
                    req.files.forEach(file => fs.unlinkSync(file.path));
                }
                return res.status(400).json({ 
                    message: `L'année doit être comprise entre 1900 et ${currentYear + 1}` 
                });
            }
        }

        if (updateData.prix && updateData.prix < 0) {
            if (req.files) {
                req.files.forEach(file => fs.unlinkSync(file.path));
            }
            return res.status(400).json({ message: 'Le prix doit être positif' });
        }

        if (updateData.kilometrage && updateData.kilometrage < 0) {
            if (req.files) {
                req.files.forEach(file => fs.unlinkSync(file.path));
            }
            return res.status(400).json({ message: 'Le kilométrage doit être positif' });
        }

        // Traiter les nouvelles images
        const newImagesPaths = req.files ? req.files.map(file => `/images/${file.filename}`) : [];

        // Traiter les images à supprimer
        let imagesToRemove = [];
        if (removeImages) {
            try {
                imagesToRemove = Array.isArray(removeImages) ? removeImages : JSON.parse(removeImages);
            } catch (e) {
                imagesToRemove = typeof removeImages === 'string' ? [removeImages] : [];
            }
        }

        // Supprimer les anciennes images du système de fichiers
        if (imagesToRemove.length > 0) {
            imagesToRemove.forEach(imagePath => {
                const fullPath = path.join('public', imagePath);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (error) {
                        console.error(`Erreur suppression image ${fullPath}:`, error);
                    }
                }
            });
        }

        // Mettre à jour la liste des images
        let updatedImages = existingVehicule.images.filter(img => !imagesToRemove.includes(img));
        updatedImages = [...updatedImages, ...newImagesPaths];

        // Traiter les options si présentes
        if (updateData.options) {
            try {
                updateData.options = Array.isArray(updateData.options) 
                    ? updateData.options 
                    : JSON.parse(updateData.options);
            } catch (e) {
                updateData.options = typeof updateData.options === 'string' 
                    ? [updateData.options] 
                    : existingVehicule.options;
            }
        }

        // Mettre à jour le véhicule
        const updatedVehicule = await Vehicule.findByIdAndUpdate(
            vehiculeId,
            { 
                ...updateData, 
                images: updatedImages
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: 'Véhicule mis à jour avec succès',
            vehicule: updatedVehicule
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du véhicule:', error);
        
        // Nettoyer les nouveaux fichiers en cas d'erreur
        if (req.files) {
            req.files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (unlinkError) {
                    console.error('Erreur lors de la suppression du fichier:', unlinkError);
                }
            });
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID véhicule invalide' });
        }
        
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// DELETE vehicule
module.exports.deleteVehicule = async (req, res) => {
    try {
        const vehicule = await Vehicule.findById(req.params.id);
        if (!vehicule) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        // Supprimer toutes les images associées
        if (vehicule.images && vehicule.images.length > 0) {
            vehicule.images.forEach(imagePath => {
                const fullPath = path.join('public', imagePath);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                        console.log(`Image supprimée: ${fullPath}`);
                    } catch (error) {
                        console.error(`Erreur suppression image ${fullPath}:`, error);
                    }
                }
            });
        }

        // Supprimer le véhicule de la base
        const deletedVehicule = await Vehicule.findByIdAndDelete(req.params.id);

        res.status(200).json({ 
            message: 'Véhicule supprimé avec succès',
            deletedVehicule: {
                id: deletedVehicule._id,
                marque: deletedVehicule.marque,
                modele: deletedVehicule.modele,
                imagesDeleted: vehicule.images.length
            }
        });

    } catch (error) {
        console.error('Erreur lors de la suppression du véhicule:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID véhicule invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// READ vehicule by QR code scan (fonctionnalité clé du projet)
module.exports.getVehiculeByQR = async (req, res) => {
    try {
        const { qrData } = req.body;
        
        if (!qrData) {
            return res.status(400).json({ message: 'Données QR code requises' });
        }

        // Extraire l'ID du véhicule depuis l'URL du QR code
        let vehiculeId;
        try {
            const url = new URL(qrData);
            vehiculeId = url.pathname.split('/').pop();
        } catch (e) {
            // Si ce n'est pas une URL, considérer que c'est directement l'ID
            vehiculeId = qrData;
        }

        const vehicule = await Vehicule.findById(vehiculeId);
        if (!vehicule) {
            return res.status(404).json({ message: 'Véhicule non trouvé pour ce QR code' });
        }

        res.status(200).json({
            message: 'Véhicule trouvé via QR code',
            vehicule
        });

    } catch (error) {
        console.error('Erreur lors de la lecture du QR code:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'QR code invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET vehicule with promotions
module.exports.getVehiculeWithPromotions = async (req, res) => {
    try {
        const vehiculeId = req.params.id;
        
        const vehicule = await Vehicule.findById(vehiculeId);
        if (!vehicule) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        // Récupérer les promotions actives pour ce véhicule
        const Promotion = require('../models/promotionmodel');
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

        // Calculer les prix réduits pour chaque promotion
        const promotionsWithPrices = promotions.map(promotion => {
            const prixReduit = promotion.calculerPrixReduit(vehicule.prix);
            return {
                id: promotion._id,
                nom: promotion.nom,
                description: promotion.description,
                codePromo: promotion.codePromo,
                pourcentageReduction: promotion.pourcentageReduction,
                montantReduction: promotion.montantReduction,
                dateFin: promotion.dateFin,
                conditions: promotion.conditions,
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
                prix: vehicule.prix,
                kilometrage: vehicule.kilometrage,
                carburant: vehicule.carburant,
                boiteVitesse: vehicule.boiteVitesse,
                couleur: vehicule.couleur,
                description: vehicule.description,
                options: vehicule.options,
                images: vehicule.images,
                qrCode: vehicule.qrCode,
                statut: vehicule.statut
            },
            promotions: promotionsWithPrices,
            nombrePromotions: promotionsWithPrices.length
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du véhicule avec promotions:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID véhicule invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// UPDATE vehicule status
module.exports.updateVehiculeStatus = async (req, res) => {
    try {
        const { statut } = req.body;
        
        const validStatuts = ['disponible', 'réservé', 'vendu', 'en_maintenance', 'indisponible'];
        if (!validStatuts.includes(statut)) {
            return res.status(400).json({ 
                message: 'Statut invalide',
                validStatuts 
            });
        }

        const updatedVehicule = await Vehicule.findByIdAndUpdate(
            req.params.id,
            { statut },
            { new: true, runValidators: true }
        );

        if (!updatedVehicule) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        res.status(200).json({
            message: `Statut du véhicule mis à jour vers: ${statut}`,
            vehicule: updatedVehicule
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID véhicule invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// REGENERATE QR Code
module.exports.regenerateQRCode = async (req, res) => {
    try {
        const vehicule = await Vehicule.findById(req.params.id);
        if (!vehicule) {
            return res.status(404).json({ message: 'Véhicule non trouvé' });
        }

        // Générer un nouveau QR code
        const vehiculeUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/vehicule/${vehicule._id}`;
        const qrCodeDataURL = await QRCode.toDataURL(vehiculeUrl, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        vehicule.qrCode = qrCodeDataURL;
        await vehicule.save();

        res.status(200).json({
            message: 'QR Code régénéré avec succès',
            
            qrCode: qrCodeDataURL
        });

    } catch (error) {
        console.error('Erreur lors de la régénération du QR code:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID véhicule invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// SEARCH vehicules
module.exports.searchVehicules = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ message: 'Terme de recherche requis' });
        }

        const searchRegex = new RegExp(query, 'i');
        
        const vehicules = await Vehicule.find({
            $or: [
                { marque: searchRegex },
                { modele: searchRegex },
                { description: searchRegex },
                { couleur: searchRegex },
                { options: { $in: [searchRegex] } }
            ]
        }).limit(20);

        res.status(200).json({
            message: `${vehicules.length} véhicule(s) trouvé(s)`,
            vehicules
        });

    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET vehicules by marque
module.exports.getVehiculesByMarque = async (req, res) => {
    try {
        const { marque } = req.params;
        
        const vehicules = await Vehicule.find({ 
            marque: new RegExp(marque, 'i')
        }).sort({ prix: 1 });

        res.status(200).json({
            marque,
            count: vehicules.length,
            vehicules
        });

    } catch (error) {
        console.error('Erreur lors de la récupération par marque:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET featured vehicules
module.exports.getFeaturedVehicules = async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        const vehicules = await Vehicule.find({ 
            statut: 'disponible' 
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

        res.status(200).json({
            message: 'Véhicules mis en avant',
            vehicules
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des véhicules mis en avant:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};
////////////////////////////////



// ANALYTICS - Méthodes d'analyse et statistiques

// GET dashboard analytics - Vue d'ensemble générale
module.exports.getDashboardAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Statistiques générales
        const totalVehicules = await Vehicule.countDocuments();
        const availableVehicules = await Vehicule.countDocuments({ statut: 'disponible' });
        const soldVehicules = await Vehicule.countDocuments({ statut: 'vendu' });
        const reservedVehicules = await Vehicule.countDocuments({ statut: 'réservé' });

        // Véhicules ajoutés ce mois
        const thisMonthVehicules = await Vehicule.countDocuments({
            createdAt: { $gte: startOfMonth }
        });

        // Véhicules vendus ce mois
        const thisMonthSold = await Vehicule.countDocuments({
            statut: 'vendu',
            updatedAt: { $gte: startOfMonth }
        });

        // Véhicules vendus le mois dernier
        const lastMonthSold = await Vehicule.countDocuments({
            statut: 'vendu',
            updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        // Valeur totale de l'inventaire
        const inventoryValue = await Vehicule.aggregate([
            { $match: { statut: { $ne: 'vendu' } } },
            { $group: { _id: null, totalValue: { $sum: '$prix' } } }
        ]);

        // Prix moyen des véhicules disponibles
        const averagePrice = await Vehicule.aggregate([
            { $match: { statut: 'disponible' } },
            { $group: { _id: null, avgPrice: { $avg: '$prix' } } }
        ]);

        // Calcul du taux de conversion
        const conversionRate = totalVehicules > 0 ? ((soldVehicules / totalVehicules) * 100).toFixed(2) : 0;
        const monthlyGrowth = lastMonthSold > 0 ? (((thisMonthSold - lastMonthSold) / lastMonthSold) * 100).toFixed(2) : 0;

        res.status(200).json({
            summary: {
                totalVehicules,
                availableVehicules,
                soldVehicules,
                reservedVehicules,
                thisMonthVehicules,
                thisMonthSold,
                conversionRate: parseFloat(conversionRate),
                monthlyGrowth: parseFloat(monthlyGrowth)
            },
            financial: {
                inventoryValue: inventoryValue[0]?.totalValue || 0,
                averagePrice: averagePrice[0]?.avgPrice || 0
            }
        });

    } catch (error) {
        console.error('Erreur analytics dashboard:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET sales analytics - Analyse des ventes
module.exports.getSalesAnalytics = async (req, res) => {
    try {
        const { period = '6months' } = req.query;
        
        let startDate;
        switch (period) {
            case '1month':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '3months':
                startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1year':
                startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
                break;
            default: // 6months
                startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        }

        // Ventes par mois
        const salesByMonth = await Vehicule.aggregate([
            {
                $match: {
                    statut: 'vendu',
                    updatedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$updatedAt' },
                        month: { $month: '$updatedAt' }
                    },
                    count: { $sum: 1 },
                    totalValue: { $sum: '$prix' },
                    avgPrice: { $avg: '$prix' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Top marques vendues
        const topBrands = await Vehicule.aggregate([
            {
                $match: {
                    statut: 'vendu',
                    updatedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$marque',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$prix' },
                    avgPrice: { $avg: '$prix' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Analyse par tranche de prix
        const priceRanges = await Vehicule.aggregate([
            {
                $match: {
                    statut: 'vendu',
                    updatedAt: { $gte: startDate }
                }
            },
            {
                $bucket: {
                    groupBy: '$prix',
                    boundaries: [0, 10000, 25000, 50000, 75000, 100000, Infinity],
                    default: 'Other',
                    output: {
                        count: { $sum: 1 },
                        totalValue: { $sum: '$prix' }
                    }
                }
            }
        ]);

        res.status(200).json({
            period,
            salesByMonth,
            topBrands,
            priceRanges
        });

    } catch (error) {
        console.error('Erreur analytics ventes:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET inventory analytics - Analyse de l'inventaire
module.exports.getInventoryAnalytics = async (req, res) => {
    try {
        // Distribution par marque
        const brandDistribution = await Vehicule.aggregate([
            { $match: { statut: { $ne: 'vendu' } } },
            {
                $group: {
                    _id: '$marque',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$prix' },
                    minPrice: { $min: '$prix' },
                    maxPrice: { $max: '$prix' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Distribution par carburant
        const fuelDistribution = await Vehicule.aggregate([
            { $match: { statut: { $ne: 'vendu' } } },
            {
                $group: {
                    _id: '$carburant',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$prix' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Distribution par boîte de vitesse
        const transmissionDistribution = await Vehicule.aggregate([
            { $match: { statut: { $ne: 'vendu' } } },
            {
                $group: {
                    _id: '$boiteVitesse',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$prix' }
                }
            }
        ]);

        // Distribution par année
        const yearDistribution = await Vehicule.aggregate([
            { $match: { statut: { $ne: 'vendu' } } },
            {
                $group: {
                    _id: '$annee',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$prix' }
                }
            },
            { $sort: { '_id': -1 } },
            { $limit: 10 }
        ]);

        // Analyse par tranche de kilométrage
        const mileageRanges = await Vehicule.aggregate([
            { $match: { statut: { $ne: 'vendu' } } },
            {
                $bucket: {
                    groupBy: '$kilometrage',
                    boundaries: [0, 50000, 100000, 150000, 200000, Infinity],
                    default: 'Other',
                    output: {
                        count: { $sum: 1 },
                        avgPrice: { $avg: '$prix' }
                    }
                }
            }
        ]);

        // Véhicules par statut
        const statusDistribution = await Vehicule.aggregate([
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$prix' }
                }
            }
        ]);

        res.status(200).json({
            brandDistribution,
            fuelDistribution,
            transmissionDistribution,
            yearDistribution,
            mileageRanges,
            statusDistribution
        });

    } catch (error) {
        console.error('Erreur analytics inventaire:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET performance analytics - Analyse de performance
module.exports.getPerformanceAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Temps moyen avant vente
        const avgTimeToSale = await Vehicule.aggregate([
            {
                $match: {
                    statut: 'vendu',
                    updatedAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $project: {
                    timeToSale: {
                        $divide: [
                            { $subtract: ['$updatedAt', '$createdAt'] },
                            1000 * 60 * 60 * 24 // Convertir en jours
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgDays: { $avg: '$timeToSale' },
                    minDays: { $min: '$timeToSale' },
                    maxDays: { $max: '$timeToSale' }
                }
            }
        ]);

        // Véhicules les plus anciens en stock
        const oldestInventory = await Vehicule.find({
            statut: 'disponible'
        })
        .sort({ createdAt: 1 })
        .limit(10)
        .select('marque modele annee prix createdAt');

        // Véhicules avec le plus d'images (engagement potentiel)
        const mostPhotographed = await Vehicule.aggregate([
            { $match: { statut: 'disponible' } },
            {
                $project: {
                    marque: 1,
                    modele: 1,
                    prix: 1,
                    imageCount: { $size: { $ifNull: ['$images', []] } }
                }
            },
            { $sort: { imageCount: -1 } },
            { $limit: 10 }
        ]);

        // Analyse des prix par rapport à la moyenne du marché
        const priceAnalysis = await Vehicule.aggregate([
            { $match: { statut: 'disponible' } },
            {
                $group: {
                    _id: {
                        marque: '$marque',
                        annee: '$annee'
                    },
                    avgPrice: { $avg: '$prix' },
                    count: { $sum: 1 },
                    minPrice: { $min: '$prix' },
                    maxPrice: { $max: '$prix' }
                }
            },
            { $match: { count: { $gte: 2 } } }, // Au moins 2 véhicules pour comparaison
            { $sort: { '_id.marque': 1, '_id.annee': -1 } }
        ]);

        // Véhicules récemment ajoutés vs vendus
        const recentActivity = await Vehicule.aggregate([
            {
                $match: {
                    $or: [
                        { createdAt: { $gte: thirtyDaysAgo } },
                        { statut: 'vendu', updatedAt: { $gte: thirtyDaysAgo } }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: {
                                $cond: [
                                    { $eq: ['$statut', 'vendu'] },
                                    '$updatedAt',
                                    '$createdAt'
                                ]
                            }
                        }
                    },
                    added: {
                        $sum: {
                            $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0]
                        }
                    },
                    sold: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$statut', 'vendu'] },
                                        { $gte: ['$updatedAt', thirtyDaysAgo] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.status(200).json({
            timeToSale: avgTimeToSale[0] || { avgDays: 0, minDays: 0, maxDays: 0 },
            oldestInventory,
            mostPhotographed,
            priceAnalysis,
            recentActivity
        });

    } catch (error) {
        console.error('Erreur analytics performance:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET financial analytics - Analyse financière
module.exports.getFinancialAnalytics = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59);

        // Revenus mensuels
        const monthlyRevenue = await Vehicule.aggregate([
            {
                $match: {
                    statut: 'vendu',
                    updatedAt: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $group: {
                    _id: { $month: '$updatedAt' },
                    revenue: { $sum: '$prix' },
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$prix' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Valeur totale par statut
        const valueByStatus = await Vehicule.aggregate([
            {
                $group: {
                    _id: '$statut',
                    totalValue: { $sum: '$prix' },
                    count: { $sum: 1 },
                    avgValue: { $avg: '$prix' }
                }
            }
        ]);

        // ROI par marque (en supposant un coût d'achat à 80% du prix de vente)
        const roiByBrand = await Vehicule.aggregate([
            { $match: { statut: 'vendu' } },
            {
                $group: {
                    _id: '$marque',
                    totalRevenue: { $sum: '$prix' },
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$prix' }
                }
            },
            {
                $project: {
                    _id: 1,
                    totalRevenue: 1,
                    count: 1,
                    avgPrice: 1,
                    estimatedCost: { $multiply: ['$totalRevenue', 0.8] },
                    estimatedProfit: { $multiply: ['$totalRevenue', 0.2] },
                    roi: { $multiply: [{ $divide: [{ $multiply: ['$totalRevenue', 0.2] }, { $multiply: ['$totalRevenue', 0.8] }] }, 100] }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Projection des revenus (basée sur les 3 derniers mois)
        const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const recentSalesRate = await Vehicule.aggregate([
            {
                $match: {
                    statut: 'vendu',
                    updatedAt: { $gte: threeMonthsAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$prix' },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    monthlyAvgRevenue: { $divide: ['$totalRevenue', 3] },
                    monthlyAvgCount: { $divide: ['$count', 3] },
                    projectedYearRevenue: { $multiply: [{ $divide: ['$totalRevenue', 3] }, 12] }
                }
            }
        ]);

        res.status(200).json({
            year: parseInt(year),
            monthlyRevenue,
            valueByStatus,
            roiByBrand,
            projection: recentSalesRate[0] || {
                monthlyAvgRevenue: 0,
                monthlyAvgCount: 0,
                projectedYearRevenue: 0
            }
        });

    } catch (error) {
        console.error('Erreur analytics financière:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET market trends - Analyse des tendances du marché
module.exports.getMarketTrends = async (req, res) => {
    try {
        const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

        // Tendances par type de carburant
        const fuelTrends = await Vehicule.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        carburant: '$carburant',
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$prix' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Évolution des prix par marque
        const priceEvolution = await Vehicule.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        marque: '$marque',
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    avgPrice: { $avg: '$prix' },
                    count: { $sum: 1 }
                }
            },
            { $match: { count: { $gte: 2 } } },
            { $sort: { '_id.marque': 1, '_id.year': 1, '_id.month': 1 } }
        ]);

        // Popularité des options
        const popularOptions = await Vehicule.aggregate([
            { $unwind: { path: '$options', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    options: { $exists: true, $ne: null },
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: '$options',
                    count: { $sum: 1 },
                    avgPriceWithOption: { $avg: '$prix' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]);

        // Ratio automatique vs manuel
        const transmissionTrend = await Vehicule.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        boiteVitesse: '$boiteVitesse',
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.month': 1 } }
        ]);

        // Âge moyen des véhicules ajoutés
        const currentYear = new Date().getFullYear();
        const ageDistribution = await Vehicule.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $project: {
                    age: { $subtract: [currentYear, '$annee'] },
                    prix: 1,
                    createdAt: 1
                }
            },
            {
                $bucket: {
                    groupBy: '$age',
                    boundaries: [0, 3, 6, 10, 15, 20, Infinity],
                    default: 'Plus de 20 ans',
                    output: {
                        count: { $sum: 1 },
                        avgPrice: { $avg: '$prix' }
                    }
                }
            }
        ]);

        res.status(200).json({
            period: 'Derniers 6 mois',
            fuelTrends,
            priceEvolution,
            popularOptions,
            transmissionTrend,
            ageDistribution
        });

    } catch (error) {
        console.error('Erreur analytics tendances:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET custom analytics - Rapports personnalisés
module.exports.getCustomAnalytics = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            groupBy = 'month', // month, week, day, brand, fuel, status
            metrics = 'count', // count, revenue, avgPrice, all
            filters = {}
        } = req.body;

        let matchStage = {};
        
        // Application des filtres
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        // Filtres additionnels
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                if (Array.isArray(filters[key])) {
                    matchStage[key] = { $in: filters[key] };
                } else if (typeof filters[key] === 'string') {
                    matchStage[key] = new RegExp(filters[key], 'i');
                } else {
                    matchStage[key] = filters[key];
                }
            }
        });

        // Définition du groupBy
        let groupId;
        switch (groupBy) {
            case 'week':
                groupId = { $week: '$createdAt' };
                break;
            case 'day':
                groupId = { $dayOfYear: '$createdAt' };
                break;
            case 'brand':
                groupId = '$marque';
                break;
            case 'fuel':
                groupId = '$carburant';
                break;
            case 'status':
                groupId = '$statut';
                break;
            default: // month
                groupId = { $month: '$createdAt' };
        }

        // Construction des métriques
        let groupStage = { _id: groupId };
        
        if (metrics === 'all' || metrics === 'count') {
            groupStage.count = { $sum: 1 };
        }
        
        if (metrics === 'all' || metrics === 'revenue') {
            groupStage.totalRevenue = { $sum: '$prix' };
        }
        
        if (metrics === 'all' || metrics === 'avgPrice') {
            groupStage.avgPrice = { $avg: '$prix' };
        }

        if (metrics === 'all') {
            groupStage.minPrice = { $min: '$prix' };
            groupStage.maxPrice = { $max: '$prix' };
            groupStage.avgKilometrage = { $avg: '$kilometrage' };
        }

        const results = await Vehicule.aggregate([
            { $match: matchStage },
            { $group: groupStage },
            { $sort: { '_id': 1 } }
        ]);

        // Statistiques globales pour le contexte
        const globalStats = await Vehicule.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalCount: { $sum: 1 },
                    totalValue: { $sum: '$prix' },
                    avgPrice: { $avg: '$prix' },
                    minPrice: { $min: '$prix' },
                    maxPrice: { $max: '$prix' }
                }
            }
        ]);

        res.status(200).json({
            query: {
                groupBy,
                metrics,
                filters,
                period: { startDate, endDate }
            },
            results,
            globalStats: globalStats[0] || {},
            resultCount: results.length
        });

    } catch (error) {
        console.error('Erreur analytics personnalisées:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};