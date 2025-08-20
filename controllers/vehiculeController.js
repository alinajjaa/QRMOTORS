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
        const vehiculeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vehicule/${vehicule._id}`;
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