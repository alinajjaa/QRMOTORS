const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true 
  },
  pourcentageReduction: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 100;
      },
      message: 'Le pourcentage de réduction doit être entre 0 et 100'
    }
  },
  montantReduction: { 
    type: Number, 
    min: 0,
    default: 0
  },
  dateDebut: {
  type: Date,
  required: true,
  validate: {
    validator: function (value) {
      return !isNaN(new Date(value).getTime()); // juste vérifier que c'est une date valide
    },
    message: 'La date de début est invalide'
  }
},

  dateFin: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(v) {
        return v > this.dateDebut;
      },
      message: 'La date de fin doit être après la date de début'
    }
  },
  vehicules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicule',
    required: true
  }],
  statut: { 
    type: String, 
    enum: ["Active", "Inactive", "Expirée"], 
    default: "Active" 
  },
  codePromo: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9]{6,10}$/.test(v);
      },
      message: 'Le code promo doit contenir 6 à 10 caractères alphanumériques en majuscules'
    }
  },
  nombreUtilisations: {
    type: Number,
    default: 0
  },
  nombreUtilisationsMax: {
    type: Number,
    default: -1, // -1 = illimité
    min: -1
  },
  conditions: {
    type: String,
    default: "Aucune condition particulière"
  },
  imagePromo: {
    type: String
  }
}, { 
  timestamps: true 
});

// Index pour optimiser les requêtes
promotionSchema.index({ dateDebut: 1, dateFin: 1 });
promotionSchema.index({ statut: 1 });
promotionSchema.index({ codePromo: 1 });

// Méthode pour vérifier si la promotion est active
promotionSchema.methods.isActive = function() {
  const now = new Date();
  return this.statut === "Active" && 
         now >= this.dateDebut && 
         now <= this.dateFin &&
         (this.nombreUtilisationsMax === -1 || this.nombreUtilisations < this.nombreUtilisationsMax);
};

// Méthode pour calculer le prix réduit
promotionSchema.methods.calculerPrixReduit = function(prixOriginal) {
  if (!this.isActive()) {
    return prixOriginal;
  }
  
  let prixReduit = prixOriginal;
  
  // Appliquer la réduction en pourcentage
  if (this.pourcentageReduction > 0) {
    prixReduit = prixReduit * (1 - this.pourcentageReduction / 100);
  }
  
  // Appliquer la réduction en montant fixe
  if (this.montantReduction > 0) {
    prixReduit = Math.max(0, prixReduit - this.montantReduction);
  }
  
  return Math.round(prixReduit * 100) / 100; // Arrondir à 2 décimales
};

// Middleware pre-save pour générer un code promo unique si non fourni
promotionSchema.pre('save', async function(next) {
  if (!this.codePromo) {
    this.codePromo = await this.generateUniqueCode();
  }
  next();
});

// Méthode pour générer un code promo unique
promotionSchema.methods.generateUniqueCode = async function() {
  const Promotion = this.constructor;
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    // Générer un code de 8 caractères
    code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Vérifier l'unicité
    const existingPromo = await Promotion.findOne({ codePromo: code });
    if (!existingPromo) {
      isUnique = true;
    }
  }
  
  return code;
};

// Middleware pour mettre à jour automatiquement le statut
promotionSchema.pre('find', function() {
  this.populate('vehicules', 'marque modele annee prix images');
});

promotionSchema.pre('findOne', function() {
  this.populate('vehicules', 'marque modele annee prix images');
});

// Vérifier si le modèle existe déjà avant de le créer
const Promotion = mongoose.models.Promotion || mongoose.model('Promotion', promotionSchema);
module.exports = Promotion;
