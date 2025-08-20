const mongoose = require("mongoose");

const reclamationSchema = new mongoose.Schema({
  sujet: { type: String, required: true },
  message: { type: String, required: true },
  statut: { 
    type: String, 
    enum: ["En attente", "En cours", "Résolue"], 
    default: "En attente" 
  },
}, { timestamps: true });

const Reclamation = mongoose.model('Reclamation', reclamationSchema);
module.exports = Reclamation;
