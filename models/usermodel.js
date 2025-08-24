const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // Correction: 'bcypt' → 'bcrypt'

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true // Ajout de required pour username
    },
    password: {
        type: String,
        required: true,
        
        minlength: 6
    },
    email: {
        type: String, 
        unique: true, 
        required: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    role: {
        type: String,
        enum: ['admin', 'client'],
        default: 'client'
    },
    image_user: {
        type: String,
    },
    dateOfBirth: {
        type: Date
    },
    phone: {
        type: String,
        match: [/^\d{8,15}$/, 'Please fill a valid phone number'] // Plus flexible pour différents pays
    },
    address: {
        type: String
    },
    scans: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scan'
    }],
    commandes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Commande'
    }]
}, {
    timestamps: true
});
 
userSchema.pre('save', async function(next) {
    try {
        // Vérifier si le mot de passe a été modifié
        if (!this.isModified('password')) return next();
        
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Vérifier si le modèle existe déjà avant de le créer
const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;