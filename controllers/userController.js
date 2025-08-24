const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// CREATE USER (role = client par défaut)
module.exports.createUser = async (req, res) => {
    try {
        const { username, password, email, dateOfBirth, phone, address } = req.body;

        // Validation des champs requis
        if (!username || !password || !email) {
            // Supprimer l'image uploadée si validation échoue
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Erreur lors de la suppression du fichier:', unlinkError);
                }
            }
            
            return res.status(400).json({
                message: 'Tous les champs requis doivent être remplis',
                required: ['username', 'password', 'email']
            });
        }

        // Vérifier si l'email existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(409).json({
                message: 'Un utilisateur avec cet email existe déjà'
            });
        }

        // Traiter l'image uploadée
        const imagePath = req.file ? `/images/${req.file.filename}` : null;

        // Créer l'utilisateur (role par défaut = client)
        const userData = {
            username,
            password,
            email: email.toLowerCase(),
            role: 'client', // Force le role à client
            image_user: imagePath
        };

        // Ajouter les champs optionnels seulement s'ils sont fournis
        if (dateOfBirth) {
            const parsedDate = new Date(dateOfBirth);
            if (parsedDate.toString() !== 'Invalid Date') {
                userData.dateOfBirth = parsedDate;
            }
        }
        if (phone) userData.phone = phone;
        if (address) userData.address = address;

        const newUser = new User(userData);

        const savedUser = await newUser.save();

        // Retourner l'utilisateur sans le mot de passe
        const userResponse = savedUser.toObject();
        delete userResponse.password;

        res.status(201).json({
            message: 'Utilisateur créé avec succès',
            user: userResponse
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        
        // Nettoyer le fichier en cas d'erreur
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Erreur lors de la suppression du fichier:', unlinkError);
            }
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Email déjà utilisé' });
        }
        
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// CREATE ADMIN (role = admin)
module.exports.createAdmin = async (req, res) => {
    try {
        const { username, password, email, dateOfBirth, phone, address } = req.body;

        // Validation des champs requis
        if (!username || !password || !email) {
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Erreur lors de la suppression du fichier:', unlinkError);
                }
            }
            
            return res.status(400).json({
                message: 'Tous les champs requis doivent être remplis',
                required: ['username', 'password', 'email']
            });
        }

        // Validation mot de passe admin (plus stricte)
        if (password.length < 8) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                message: 'Le mot de passe admin doit contenir au moins 8 caractères'
            });
        }

        // Vérifier si l'email existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(409).json({
                message: 'Un utilisateur avec cet email existe déjà'
            });
        }

        // Traiter l'image uploadée
        const imagePath = req.file ? `/images/${req.file.filename}` : null;

        // Créer l'administrateur
        const adminData = {
            username,
            password,
            email: email.toLowerCase(),
            role: 'admin', // Force le role à admin
            image_user: imagePath
        };

        // Ajouter les champs optionnels seulement s'ils sont fournis
        if (dateOfBirth) {
            const parsedDate = new Date(dateOfBirth);
            if (parsedDate.toString() !== 'Invalid Date') {
                adminData.dateOfBirth = parsedDate;
            }
        }
        if (phone) adminData.phone = phone;
        if (address) adminData.address = address;

        const newAdmin = new User(adminData);

        const savedAdmin = await newAdmin.save();

        // Retourner l'admin sans le mot de passe
        const adminResponse = savedAdmin.toObject();
        delete adminResponse.password;

        res.status(201).json({
            message: 'Administrateur créé avec succès',
            admin: adminResponse
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'administrateur:', error);
        
        // Nettoyer le fichier en cas d'erreur
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Erreur lors de la suppression du fichier:', unlinkError);
            }
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Email déjà utilisé' });
        }
        
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// UPDATE PROFIL USER (role = client)
module.exports.updateProfilUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { removeImage, currentPassword, newPassword, ...updateData } = req.body;

        // Récupérer l'utilisateur existant
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Erreur lors de la suppression du fichier:', unlinkError);
                }
            }
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérifier que c'est bien un client
        if (existingUser.role !== 'client') {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(403).json({ message: 'Cette route est réservée aux clients' });
        }

        // Validation de l'email si modifié
        if (updateData.email && updateData.email !== existingUser.email) {
            const emailExists = await User.findOne({ 
                email: updateData.email.toLowerCase(),
                _id: { $ne: userId }
            });
            if (emailExists) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(409).json({ message: 'Cet email est déjà utilisé' });
            }
            updateData.email = updateData.email.toLowerCase();
        }

        // Gestion du changement de mot de passe
        if (newPassword) {
            if (!currentPassword) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ 
                    message: 'Le mot de passe actuel est requis pour le changer' 
                });
            }

            // Vérifier le mot de passe actuel
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existingUser.password);
            if (!isCurrentPasswordValid) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ 
                    message: 'Mot de passe actuel incorrect' 
                });
            }

            updateData.password = newPassword; // Le pre-hook se chargera du hachage
        }

        // Gestion de la nouvelle image
        let updatedImagePath = existingUser.image_user;
        
        if (req.file) {
            // Supprimer l'ancienne image si elle existe
            if (existingUser.image_user) {
                const oldImagePath = path.join('public', existingUser.image_user);
                if (fs.existsSync(oldImagePath)) {
                    try {
                        fs.unlinkSync(oldImagePath);
                    } catch (error) {
                        console.error('Erreur suppression ancienne image:', error);
                    }
                }
            }
            updatedImagePath = `/images/${req.file.filename}`;
        }

        // Supprimer l'image si demandé
        if (removeImage === 'true' && !req.file) {
            if (existingUser.image_user) {
                const imagePath = path.join('public', existingUser.image_user);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (error) {
                        console.error('Erreur suppression image:', error);
                    }
                }
            }
            updatedImagePath = null;
        }

        // Mettre à jour l'utilisateur
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { 
                ...updateData,
                image_user: updatedImagePath
            },
            { new: true, runValidators: true }
        );

        // Retourner sans le mot de passe
        const userResponse = updatedUser.toObject();
        delete userResponse.password;

        res.status(200).json({
            message: 'Profil utilisateur mis à jour avec succès',
            user: userResponse
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil utilisateur:', error);
        
        // Nettoyer le fichier en cas d'erreur
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Erreur lors de la suppression du fichier:', unlinkError);
            }
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID utilisateur invalide' });
        }
        
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// UPDATE PROFIL ADMIN (role = admin)
module.exports.updateProfilAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;
        const { removeImage, currentPassword, newPassword, ...updateData } = req.body;

        // Récupérer l'administrateur existant
        const existingAdmin = await User.findById(adminId);
        if (!existingAdmin) {
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Erreur lors de la suppression du fichier:', unlinkError);
                }
            }
            return res.status(404).json({ message: 'Administrateur non trouvé' });
        }

        // Vérifier que c'est bien un admin
        if (existingAdmin.role !== 'admin') {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(403).json({ message: 'Cette route est réservée aux administrateurs' });
        }

        // Validation de l'email si modifié
        if (updateData.email && updateData.email !== existingAdmin.email) {
            const emailExists = await User.findOne({ 
                email: updateData.email.toLowerCase(),
                _id: { $ne: adminId }
            });
            if (emailExists) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(409).json({ message: 'Cet email est déjà utilisé' });
            }
            updateData.email = updateData.email.toLowerCase();
        }

        // Gestion du changement de mot de passe admin (plus strict)
        if (newPassword) {
            if (!currentPassword) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ 
                    message: 'Le mot de passe actuel est requis pour le changer' 
                });
            }

            // Vérifier le mot de passe actuel
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existingAdmin.password);
            if (!isCurrentPasswordValid) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ 
                    message: 'Mot de passe actuel incorrect' 
                });
            }

            // Validation plus stricte pour admin
            if (newPassword.length < 8) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ 
                    message: 'Le nouveau mot de passe admin doit contenir au moins 8 caractères' 
                });
            }

            updateData.password = newPassword; // Le pre-hook se chargera du hachage
        }

        // Gestion de la nouvelle image
        let updatedImagePath = existingAdmin.image_user;
        
        if (req.file) {
            // Supprimer l'ancienne image si elle existe
            if (existingAdmin.image_user) {
                const oldImagePath = path.join('public', existingAdmin.image_user);
                if (fs.existsSync(oldImagePath)) {
                    try {
                        fs.unlinkSync(oldImagePath);
                    } catch (error) {
                        console.error('Erreur suppression ancienne image:', error);
                    }
                }
            }
            updatedImagePath = `/images/${req.file.filename}`;
        }

        // Supprimer l'image si demandé
        if (removeImage === 'true' && !req.file) {
            if (existingAdmin.image_user) {
                const imagePath = path.join('public', existingAdmin.image_user);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (error) {
                        console.error('Erreur suppression image:', error);
                    }
                }
            }
            updatedImagePath = null;
        }

        // Mettre à jour l'administrateur
        const updatedAdmin = await User.findByIdAndUpdate(
            adminId,
            { 
                ...updateData,
                image_user: updatedImagePath
            },
            { new: true, runValidators: true }
        );

        // Retourner sans le mot de passe
        const adminResponse = updatedAdmin.toObject();
        delete adminResponse.password;

        res.status(200).json({
            message: 'Profil administrateur mis à jour avec succès',
            admin: adminResponse
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil admin:', error);
        
        // Nettoyer le fichier en cas d'erreur
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Erreur lors de la suppression du fichier:', unlinkError);
            }
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID administrateur invalide' });
        }
        
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// DELETE USER
module.exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Supprimer l'image associée si elle existe
        if (user.image_user) {
            const imagePath = path.join('public', user.image_user);
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log(`Image utilisateur supprimée: ${imagePath}`);
                } catch (error) {
                    console.error(`Erreur suppression image ${imagePath}:`, error);
                }
            }
        }

        // Supprimer l'utilisateur de la base
        const deletedUser = await User.findByIdAndDelete(req.params.id);

        res.status(200).json({ 
            message: 'Utilisateur supprimé avec succès',
            deletedUser: {
                id: deletedUser._id,
                username: deletedUser.username,
                email: deletedUser.email,
                role: deletedUser.role
            }
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID utilisateur invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET ALL USERS
module.exports.getAllUsers = async (req, res) => {
    try {
        const {
            role,
            username,
            email,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Construction du filtre
        const filter = {};
        
        if (role) filter.role = role;
        if (username) filter.username = new RegExp(username, 'i');
        if (email) filter.email = new RegExp(email, 'i');

        // Options de tri
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Exécution de la requête
        const users = await User.find(filter)
            .select('-password') // Exclure les mots de passe
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Compter le total pour la pagination
        const total = await User.countDocuments(filter);

        res.status(200).json({
            users,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                count: users.length,
                totalUsers: total
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// ============ MÉTHODES UTILITAIRES SIMPLES ============

// GET user by ID
module.exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID utilisateur invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET users by role
module.exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.params;
        
        if (!['admin', 'client'].includes(role)) {
            return res.status(400).json({ 
                message: 'Rôle invalide. Utilisez "admin" ou "client"' 
            });
        }

        const users = await User.find({ role }).select('-password').sort({ createdAt: -1 });

        res.status(200).json({
            role,
            count: users.length,
            users
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs par rôle:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// SEARCH users
module.exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ message: 'Terme de recherche requis' });
        }

        const searchRegex = new RegExp(query, 'i');
        
        const users = await User.find({
            $or: [
                { username: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { address: searchRegex }
            ]
        })
        .select('-password')
        .limit(20);

        res.status(200).json({
            message: `${users.length} utilisateur(s) trouvé(s)`,
            users
        });

    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// UPDATE user status (simple activation/désactivation)
module.exports.toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { isActive: isActive !== undefined ? isActive : true },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json({
            message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`,
            user: updatedUser
        });

    } catch (error) {
        console.error('Erreur lors du changement de statut:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID utilisateur invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// GET user statistics (méthode simple)
module.exports.getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const adminCount = await User.countDocuments({ role: 'admin' });
        const clientCount = await User.countDocuments({ role: 'client' });

        // Utilisateurs récents (derniers 30 jours)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentUsers = await User.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        res.status(200).json({
            summary: {
                totalUsers,
                adminCount,
                clientCount,
                recentUsers
            },
            ratios: {
                adminPercentage: totalUsers > 0 ? ((adminCount / totalUsers) * 100).toFixed(2) : 0,
                clientPercentage: totalUsers > 0 ? ((clientCount / totalUsers) * 100).toFixed(2) : 0
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};