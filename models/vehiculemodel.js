const mongoose = require("mongoose");

const vehiculeSchema = new mongoose.Schema({
  marque: { type: String, required: true },
  modele: { type: String, required: true },
  annee: { type: Number, required: true },
  prix: { type: Number, required: true },
  kilometrage: { type: Number, required: true },
  carburant: { type: String, enum: ["Essence", "Diesel", "Hybride", "Electrique"], required: true },
  boiteVitesse: { type: String, enum: ["Manuelle", "Automatique"], required: true },
  couleur: { type: String },
  description: { type: String },
  options: [{ type: String }],
  images: [{ type: String }],
  qrCode: { type: String },
  statut: { type: String, enum: ["Disponible", "Réservé", "Vendu"], default: "Disponible" },
}, { timestamps: true });


const Vehicule = mongoose.model('Vehicule', vehiculeSchema);
module.exports = Vehicule;