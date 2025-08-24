# API Documentation - Système de Promotions QRMOTORS

## Vue d'ensemble

Le système de promotions permet de créer et gérer des offres spéciales sur les véhicules. Chaque promotion peut s'appliquer à un ou plusieurs véhicules et inclut des codes promo uniques.

## Modèle de données

### Promotion
```javascript
{
  nom: String,                    // Nom de la promotion
  description: String,            // Description détaillée
  pourcentageReduction: Number,   // Réduction en % (0-100)
  montantReduction: Number,       // Réduction fixe en euros
  dateDebut: Date,               // Date de début de la promotion
  dateFin: Date,                 // Date de fin de la promotion
  vehicules: [ObjectId],         // IDs des véhicules concernés
  statut: String,                // "Active", "Inactive", "Expirée"
  codePromo: String,             // Code promo unique (6-10 caractères)
  nombreUtilisations: Number,    // Nombre d'utilisations actuelles
  nombreUtilisationsMax: Number, // Limite d'utilisations (-1 = illimité)
  conditions: String,            // Conditions d'utilisation
  imagePromo: String,            // Image de la promotion
  createdAt: Date,
  updatedAt: Date
}
```

## Endpoints API

### 1. Création de Promotion

**POST** `/promotionRoutes/createPromotion`

**Body (multipart/form-data):**
```javascript
{
  nom: "Promotion Été 2024",
  description: "Réduction exceptionnelle sur tous nos véhicules",
  pourcentageReduction: 15,
  montantReduction: 0,
  dateDebut: "2024-06-01T00:00:00.000Z",
  dateFin: "2024-08-31T23:59:59.000Z",
  vehicules: ["64f1a2b3c4d5e6f7g8h9i0j1", "64f1a2b3c4d5e6f7g8h9i0j2"],
  nombreUtilisationsMax: 100,
  conditions: "Valable uniquement en juin, juillet et août 2024",
  codePromo: "ETE2024", // Optionnel, généré automatiquement si non fourni
  imagePromo: [File] // Optionnel
}
```

**Réponse:**
```javascript
{
  "message": "Promotion créée avec succès",
  "promotion": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j3",
    "nom": "Promotion Été 2024",
    "codePromo": "ETE2024",
    "vehicules": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "marque": "Renault",
        "modele": "Clio",
        "annee": 2022,
        "prix": 18000
      }
    ]
  }
}
```

### 2. Récupération des Promotions

**GET** `/promotionRoutes/`

**Query Parameters:**
- `statut`: Filtrer par statut ("Active", "Inactive", "Expirée")
- `dateDebut`: Date de début minimum
- `dateFin`: Date de fin maximum
- `vehiculeId`: ID d'un véhicule spécifique
- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre d'éléments par page (défaut: 10)
- `sortBy`: Champ de tri (défaut: "createdAt")
- `sortOrder`: Ordre de tri ("asc" ou "desc", défaut: "desc")

**Exemple:**
```
GET /promotionRoutes/?statut=Active&page=1&limit=5
```

### 3. Promotion par ID

**GET** `/promotionRoutes/:id`

**Réponse:**
```javascript
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j3",
  "nom": "Promotion Été 2024",
  "description": "Réduction exceptionnelle",
  "pourcentageReduction": 15,
  "vehicules": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "marque": "Renault",
      "modele": "Clio",
      "annee": 2022,
      "prix": 18000,
      "prixReduit": 15300,
      "economie": 2700
    }
  ],
  "isActive": true
}
```

### 4. Validation de Code Promo

**POST** `/promotionRoutes/validate-code`

**Body:**
```javascript
{
  "codePromo": "ETE2024",
  "vehiculeId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

**Réponse:**
```javascript
{
  "message": "Code promo valide",
  "promotion": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j3",
    "nom": "Promotion Été 2024",
    "description": "Réduction exceptionnelle",
    "codePromo": "ETE2024",
    "conditions": "Valable uniquement en été"
  },
  "vehicule": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "marque": "Renault",
    "modele": "Clio",
    "annee": 2022,
    "prixOriginal": 18000,
    "prixReduit": 15300,
    "economie": 2700
  }
}
```

### 5. Application de Code Promo

**POST** `/promotionRoutes/apply-code`

**Body:**
```javascript
{
  "codePromo": "ETE2024",
  "vehiculeId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

**Réponse:**
```javascript
{
  "message": "Code promo appliqué avec succès",
  "promotion": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j3",
    "nom": "Promotion Été 2024",
    "codePromo": "ETE2024",
    "nombreUtilisations": 1,
    "nombreUtilisationsMax": 100
  },
  "vehicule": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "marque": "Renault",
    "modele": "Clio",
    "annee": 2022,
    "prixOriginal": 18000,
    "prixReduit": 15300,
    "economie": 2700
  }
}
```

### 6. Promotions Actives

**GET** `/promotionRoutes/active/list`

**Réponse:**
```javascript
{
  "message": "Promotions actives récupérées",
  "count": 2,
  "promotions": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j3",
      "nom": "Promotion Été 2024",
      "vehicules": [
        {
          "prixReduit": 15300,
          "economie": 2700
        }
      ]
    }
  ]
}
```

### 7. Promotions par Véhicule

**GET** `/promotionRoutes/vehicule/:vehiculeId`

**Réponse:**
```javascript
{
  "vehicule": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "marque": "Renault",
    "modele": "Clio",
    "annee": 2022,
    "prix": 18000
  },
  "promotions": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j3",
      "nom": "Promotion Été 2024",
      "prixOriginal": 18000,
      "prixReduit": 15300,
      "economie": 2700
    }
  ],
  "count": 1
}
```

### 8. Véhicule avec Promotions

**GET** `/vehiculeRoutes/:id/with-promotions`

**Réponse:**
```javascript
{
  "vehicule": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "marque": "Renault",
    "modele": "Clio",
    "annee": 2022,
    "prix": 18000,
    "statut": "Disponible"
  },
  "promotions": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j3",
      "nom": "Promotion Été 2024",
      "codePromo": "ETE2024",
      "prixOriginal": 18000,
      "prixReduit": 15300,
      "economie": 2700
    }
  ],
  "nombrePromotions": 1
}
```

### 9. Mise à Jour de Promotion

**PUT** `/promotionRoutes/:id`

**Body (multipart/form-data):**
```javascript
{
  "nom": "Promotion Été 2024 - Mise à jour",
  "pourcentageReduction": 20,
  "imagePromo": [File] // Optionnel
}
```

### 10. Gestion du Statut

**PATCH** `/promotionRoutes/:id/status`

**Body:**
```javascript
{
  "statut": "Inactive"
}
```

### 11. Régénération de Code Promo

**POST** `/promotionRoutes/:id/regenerate-code`

**Réponse:**
```javascript
{
  "message": "Code promo régénéré avec succès",
  "codePromo": "ABC123XY"
}
```

### 12. Analytics des Promotions

**GET** `/promotionRoutes/analytics/overview`

**Réponse:**
```javascript
{
  "summary": {
    "totalPromotions": 25,
    "activePromotions": 8,
    "expiredPromotions": 12,
    "thisMonthPromotions": 5
  },
  "topPromotions": [
    {
      "nom": "Promotion Été 2024",
      "nombreUtilisations": 45
    }
  ],
  "statusDistribution": [
    {
      "_id": "Active",
      "count": 8,
      "avgUtilisations": 12.5
    }
  ]
}
```

## Codes d'erreur

- **400**: Données invalides ou validation échouée
- **404**: Promotion ou véhicule non trouvé
- **409**: Code promo déjà existant
- **500**: Erreur interne du serveur

## Exemples d'utilisation

### Créer une promotion pour plusieurs véhicules
```javascript
const formData = new FormData();
formData.append('nom', 'Promotion Hiver 2024');
formData.append('description', 'Réduction sur les véhicules 4x4');
formData.append('pourcentageReduction', '10');
formData.append('dateDebut', '2024-12-01T00:00:00.000Z');
formData.append('dateFin', '2024-02-28T23:59:59.000Z');
formData.append('vehicules', JSON.stringify(['id1', 'id2', 'id3']));
formData.append('nombreUtilisationsMax', '50');

fetch('/promotionRoutes/createPromotion', {
  method: 'POST',
  body: formData
});
```

### Valider et appliquer un code promo
```javascript
// 1. Valider le code
const validation = await fetch('/promotionRoutes/validate-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    codePromo: 'ETE2024',
    vehiculeId: '64f1a2b3c4d5e6f7g8h9i0j1'
  })
});

// 2. Appliquer le code
const application = await fetch('/promotionRoutes/apply-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    codePromo: 'ETE2024',
    vehiculeId: '64f1a2b3c4d5e6f7g8h9i0j1'
  })
});
```

## Fonctionnalités avancées

### Calcul automatique des prix réduits
Le système calcule automatiquement les prix réduits en combinant :
- Réduction en pourcentage
- Réduction en montant fixe
- Vérification de la validité de la promotion

### Gestion des limites d'utilisation
- Limite par nombre d'utilisations
- Limite par date de validité
- Suivi automatique des utilisations

### Génération automatique de codes promo
- Codes uniques de 6-10 caractères
- Format alphanumérique en majuscules
- Validation automatique de l'unicité

### Jointure avec les véhicules
- Relation many-to-many entre promotions et véhicules
- Récupération automatique des informations véhicules
- Calcul des prix réduits en temps réel