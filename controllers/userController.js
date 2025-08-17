const User = require('../models/userModel');
const bcrypt = require('bcrypt');

// CREATE user
module.exports.createUser = async (req, res) => {
    try {
        const { username, password, email, role, image_user, dateOfBirth, phone, address } = req.body;

        // Validation des champs requis
        if (!username || !password || !email || !dateOfBirth || !phone || !address) {
            return res.status(400).json({ 
                message: 'Tous les champs requis doivent être remplis',
                required: ['username', 'password', 'email', 'dateOfBirth', 'phone', 'address']
            });
        }

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
        }

        // Créer le nouvel utilisateur (le pre-save middleware s'occupe du hashing)
        const newUser = new User({
            username,
            password, // Le middleware pre-save va hasher automatiquement
            email,
            role,
            image_user,
            dateOfBirth,
            phone,
            address
        });

        const savedUser = await newUser.save();
        
        // Retourner l'utilisateur sans le mot de passe
        const userResponse = savedUser.toObject();
        delete userResponse.password;
        
        res.status(201).json(userResponse);
    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email déjà utilisé' });
        }
        
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// READ all users
module.exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclure les mots de passe
        res.status(200).json(users);
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// READ one user by ID
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

// UPDATE user
module.exports.updateUser = async (req, res) => {
    try {
        const { password, ...updateData } = req.body;

        // Si on veut mettre à jour le password
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
            }
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: 'Erreurs de validation', errors });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID utilisateur invalide' });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email déjà utilisé' });
        }
        
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// DELETE user
module.exports.deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID utilisateur invalide' });
        }
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};