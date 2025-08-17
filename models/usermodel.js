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
    dateOfBirth: { // Correction: 'doateOfBirth' → 'dateOfBirth'
        type: Date,
        required: true
    },
    phone: {
        type: String,
        required: true,
        match: [/^\d{8,15}$/, 'Please fill a valid phone number'] // Plus flexible pour différents pays
    },
    address: {
        type: String,
        required: true
    }
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

const User = mongoose.model('User', userSchema);
module.exports = User;