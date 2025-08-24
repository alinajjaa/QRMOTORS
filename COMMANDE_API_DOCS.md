# API Documentation - Système de Commande

## Vue d'ensemble

Le système de commande permet aux utilisateurs de passer des commandes sur les véhicules disponibles. Chaque commande inclut :
- L'utilisateur qui passe la commande
- Le véhicule commandé
- Les informations de livraison et de contact
- Le mode de paiement
- La gestion des promotions et réductions
- Le suivi du statut de la commande et du paiement
- L'historique complet des modifications

## Modèle Commande

### Structure du modèle

```javascript
{
  utilisateur: ObjectId (référence vers User),
  vehicule: ObjectId (référence vers Vehicule),
  promotion: ObjectId (référence vers Promotion, optionnel),
  statut: String (enum: ['En attente', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée', 'Refusée']),
  prixTotal: Number (prix original du véhicule),
  prixReduit: Number (prix après réduction),
  montantReduction: Number (économie réalisée),
  codePromoUtilise: String,
  dateCommande: Date,
  dateLivraisonEstimee: Date,
  dateLivraisonReelle: Date,
  adresseLivraison: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: String
  },
  informationsContact: {
    nom: String,
    prenom: String,
    telephone: String,
    email: String
  },
  modePaiement: String (enum: ['Carte bancaire', 'Virement bancaire', 'Chèque', 'Espèces']),
  statutPaiement: String (enum: ['En attente', 'Payé', 'Échoué', 'Remboursé']),
  referencePaiement: String,
  notes: String,
  documents: Array,
  historique: Array
}
```

### Relations

- **Commande → User** : Relation many-to-one
- **Commande → Vehicule** : Relation many-to-one
- **Commande → Promotion** : Relation many-to-one (optionnel)
- **User → Commande** : Relation one-to-many (tableau de commandes)
- **Vehicule → Commande** : Relation one-to-many (tableau de commandes)

## Endpoints API

### Base URL
```
http://localhost:5000/commandeRoutes
```

### 1. Créer une Commande

**POST** `/create`

Crée une nouvelle commande pour un véhicule.

#### Request Body
```json
{
  "vehiculeId": "VEHICULE_ID",
  "userId": "USER_ID",
  "promotionId": "PROMOTION_ID", // Optionnel
  "codePromo": "CODE_PROMO", // Optionnel (alternative à promotionId)
  "adresseLivraison": {
    "rue": "123 Rue de la Paix",
    "ville": "Paris",
    "codePostal": "75001",
    "pays": "France"
  },
  "informationsContact": {
    "nom": "Dupont",
    "prenom": "Jean",
    "telephone": "0123456789",
    "email": "jean.dupont@email.com"
  },
  "modePaiement": "Carte bancaire",
  "notes": "Livraison préférée le matin"
}
```

#### Response (201)
```json
{
  "message": "Commande créée avec succès",
  "commande": {
    "id": "commande_id",
    "utilisateur": {
      "id": "user_id",
      "username": "jean_dupont",
      "email": "jean.dupont@email.com"
    },
    "vehicule": {
      "id": "vehicule_id",
      "marque": "Toyota",
      "modele": "Corolla",
      "annee": 2022,
      "prix": 55000,
      "images": ["image1.jpg"]
    },
    "promotion": {
      "id": "promotion_id",
      "nom": "Promotion Été 2024",
      "codePromo": "ETE2024",
      "pourcentageReduction": 15
    },
    "statut": "En attente",
    "prixTotal": 55000,
    "prixReduit": 46750,
    "montantReduction": 8250,
    "codePromoUtilise": "ETE2024",
    "dateCommande": "2025-01-27T10:30:00.000Z",
    "dateLivraisonEstimee": "2025-02-03T10:30:00.000Z",
    "adresseLivraison": {
      "rue": "123 Rue de la Paix",
      "ville": "Paris",
      "codePostal": "75001",
      "pays": "France"
    },
    "informationsContact": {
      "nom": "Dupont",
      "prenom": "Jean",
      "telephone": "0123456789",
      "email": "jean.dupont@email.com"
    },
    "modePaiement": "Carte bancaire",
    "statutPaiement": "En attente",
    "historique": [
      {
        "statut": "En attente",
        "date": "2025-01-27T10:30:00.000Z",
        "commentaire": "Commande créée"
      }
    ]
  }
}
```

### 2. Obtenir Toutes les Commandes

**GET** `/`

Récupère toutes les commandes avec pagination et filtres.

#### Query Parameters
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre d'éléments par page (défaut: 10)
- `statut` (optionnel) : Filtrer par statut
- `statutPaiement` (optionnel) : Filtrer par statut de paiement
- `sortBy` (optionnel) : Champ de tri (défaut: 'dateCommande')
- `sortOrder` (optionnel) : Ordre de tri 'asc' ou 'desc' (défaut: 'desc')

#### Response (200)
```json
{
  "message": "Commandes récupérées avec succès",
  "commandes": [
    {
      "id": "commande_id",
      "utilisateur": {
        "id": "user_id",
        "username": "jean_dupont",
        "email": "jean.dupont@email.com"
      },
      "vehicule": {
        "id": "vehicule_id",
        "marque": "Toyota",
        "modele": "Corolla",
        "annee": 2022,
        "prix": 55000,
        "images": ["image1.jpg"]
      },
      "statut": "En attente",
      "prixTotal": 55000,
      "prixReduit": 46750,
      "dateCommande": "2025-01-27T10:30:00.000Z",
      "statutPaiement": "En attente"
    }
  ],
  "pagination": {
    "totalDocs": 150,
    "limit": 10,
    "totalPages": 15,
    "page": 1,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  }
}
```

### 3. Obtenir une Commande par ID

**GET** `/:id`

Récupère une commande spécifique par son ID.

#### Response (200)
```json
{
  "message": "Commande récupérée avec succès",
  "commande": {
    "id": "commande_id",
    "utilisateur": {
      "id": "user_id",
      "username": "jean_dupont",
      "email": "jean.dupont@email.com"
    },
    "vehicule": {
      "id": "vehicule_id",
      "marque": "Toyota",
      "modele": "Corolla",
      "annee": 2022,
      "prix": 55000,
      "images": ["image1.jpg"]
    },
    "promotion": {
      "id": "promotion_id",
      "nom": "Promotion Été 2024",
      "codePromo": "ETE2024",
      "pourcentageReduction": 15
    },
    "statut": "En attente",
    "prixTotal": 55000,
    "prixReduit": 46750,
    "montantReduction": 8250,
    "codePromoUtilise": "ETE2024",
    "dateCommande": "2025-01-27T10:30:00.000Z",
    "dateLivraisonEstimee": "2025-02-03T10:30:00.000Z",
    "adresseLivraison": {
      "rue": "123 Rue de la Paix",
      "ville": "Paris",
      "codePostal": "75001",
      "pays": "France"
    },
    "informationsContact": {
      "nom": "Dupont",
      "prenom": "Jean",
      "telephone": "0123456789",
      "email": "jean.dupont@email.com"
    },
    "modePaiement": "Carte bancaire",
    "statutPaiement": "En attente",
    "historique": [
      {
        "statut": "En attente",
        "date": "2025-01-27T10:30:00.000Z",
        "commentaire": "Commande créée"
      }
    ]
  }
}
```

### 4. Obtenir les Commandes par Utilisateur

**GET** `/utilisateur/:userId`

Récupère toutes les commandes d'un utilisateur spécifique.

#### Query Parameters
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre d'éléments par page (défaut: 10)

#### Response (200)
```json
{
  "message": "Commandes de l'utilisateur récupérées avec succès",
  "utilisateur": {
    "id": "user_id",
    "username": "jean_dupont",
    "email": "jean.dupont@email.com"
  },
  "commandes": [
    {
      "id": "commande_id",
      "vehicule": {
        "id": "vehicule_id",
        "marque": "Toyota",
        "modele": "Corolla",
        "annee": 2022,
        "prix": 55000,
        "images": ["image1.jpg"]
      },
      "statut": "En attente",
      "prixTotal": 55000,
      "prixReduit": 46750,
      "dateCommande": "2025-01-27T10:30:00.000Z"
    }
  ],
  "pagination": {
    "totalDocs": 5,
    "limit": 10,
    "totalPages": 1,
    "page": 1,
    "hasNextPage": false,
    "hasPrevPage": false,
    "nextPage": null,
    "prevPage": null
  }
}
```

### 5. Obtenir les Commandes par Véhicule

**GET** `/vehicule/:vehiculeId`

Récupère toutes les commandes d'un véhicule spécifique.

#### Query Parameters
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre d'éléments par page (défaut: 10)

#### Response (200)
```json
{
  "message": "Commandes du véhicule récupérées avec succès",
  "vehicule": {
    "id": "vehicule_id",
    "marque": "Toyota",
    "modele": "Corolla",
    "annee": 2022
  },
  "commandes": [
    {
      "id": "commande_id",
      "utilisateur": {
        "id": "user_id",
        "username": "jean_dupont",
        "email": "jean.dupont@email.com"
      },
      "statut": "En attente",
      "prixTotal": 55000,
      "prixReduit": 46750,
      "dateCommande": "2025-01-27T10:30:00.000Z"
    }
  ],
  "pagination": {
    "totalDocs": 3,
    "limit": 10,
    "totalPages": 1,
    "page": 1,
    "hasNextPage": false,
    "hasPrevPage": false,
    "nextPage": null,
    "prevPage": null
  }
}
```

### 6. Mettre à Jour le Statut d'une Commande

**PUT** `/:id/status`

Met à jour le statut d'une commande avec historique.

#### Request Body
```json
{
  "nouveauStatut": "Confirmée",
  "commentaire": "Commande confirmée par l'administrateur",
  "utilisateurId": "ADMIN_USER_ID"
}
```

#### Response (200)
```json
{
  "message": "Statut de la commande mis à jour avec succès",
  "commande": {
    "id": "commande_id",
    "statut": "Confirmée",
    "historique": [
      {
        "statut": "En attente",
        "date": "2025-01-27T10:30:00.000Z",
        "commentaire": "Commande créée"
      },
      {
        "statut": "Confirmée",
        "date": "2025-01-27T11:00:00.000Z",
        "commentaire": "Commande confirmée par l'administrateur",
        "utilisateur": "admin_user_id"
      }
    ]
  }
}
```

### 7. Mettre à Jour le Statut de Paiement

**PUT** `/:id/paiement`

Met à jour le statut de paiement d'une commande.

#### Request Body
```json
{
  "statutPaiement": "Payé",
  "referencePaiement": "PAY_123456789"
}
```

#### Response (200)
```json
{
  "message": "Statut de paiement mis à jour avec succès",
  "commande": {
    "id": "commande_id",
    "statutPaiement": "Payé",
    "referencePaiement": "PAY_123456789"
  }
}
```

### 8. Annuler une Commande

**DELETE** `/:id/cancel`

Annule une commande et remet le véhicule en disponible.

#### Request Body
```json
{
  "raison": "Changement de projet"
}
```

#### Response (200)
```json
{
  "message": "Commande annulée avec succès"
}
```

### 9. Statistiques des Commandes

**GET** `/stats/overview`

Récupère les statistiques globales des commandes.

#### Response (200)
```json
{
  "message": "Statistiques des commandes récupérées avec succès",
  "stats": {
    "totalCommandes": 1500,
    "commandesAujourdhui": 25,
    "commandesCetteSemaine": 180,
    "commandesCeMois": 750,
    "chiffreAffairesTotal": 82500000,
    "chiffreAffairesReduit": 70125000,
    "economieTotale": 12375000,
    "statsParStatut": [
      {
        "_id": "En attente",
        "nombre": 45
      },
      {
        "_id": "Confirmée",
        "nombre": 120
      },
      {
        "_id": "Livrée",
        "nombre": 1100
      }
    ],
    "topVehicules": [
      {
        "vehicule": {
          "id": "vehicule_id_1",
          "marque": "Toyota",
          "modele": "Corolla",
          "annee": 2022
        },
        "nombreCommandes": 45,
        "chiffreAffaires": 2475000
      },
      {
        "vehicule": {
          "id": "vehicule_id_2",
          "marque": "Honda",
          "modele": "Civic",
          "annee": 2021
        },
        "nombreCommandes": 32,
        "chiffreAffaires": 1760000
      }
    ]
  }
}
```

## Codes d'Erreur

### 400 - Bad Request
```json
{
  "message": "Toutes les informations de commande sont requises"
}
```

### 404 - Not Found
```json
{
  "message": "Véhicule non trouvé"
}
```

### 500 - Internal Server Error
```json
{
  "message": "Erreur interne du serveur",
  "error": "Description de l'erreur"
}
```

## Fonctionnalités Avancées

### 1. Gestion Automatique des Promotions
- Application automatique des réductions lors de la création
- Incrémentation du compteur d'utilisations
- Validation de la disponibilité des promotions

### 2. Gestion des Statuts de Véhicule
- Automatique : Véhicule → Réservé lors de la commande
- Automatique : Véhicule → Vendu lors de la livraison
- Automatique : Véhicule → Disponible lors de l'annulation

### 3. Historique Complet
- Toutes les modifications de statut sont enregistrées
- Commentaires et utilisateurs responsables
- Horodatage précis de chaque action

### 4. Calculs Automatiques
- Prix réduit basé sur les promotions actives
- Montant d'économie réalisée
- Chiffre d'affaires total et réduit

### 5. Validation des Données
- Vérification de la disponibilité du véhicule
- Validation des informations de contact
- Contrôle des modes de paiement autorisés

## Exemples d'Utilisation

### Créer une Commande avec Promotion
```javascript
fetch('http://localhost:5000/commandeRoutes/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    vehiculeId: 'VEHICULE_ID',
    userId: 'USER_ID',
    codePromo: 'ETE2024',
    adresseLivraison: {
      rue: '123 Rue de la Paix',
      ville: 'Paris',
      codePostal: '75001',
      pays: 'France'
    },
    informationsContact: {
      nom: 'Dupont',
      prenom: 'Jean',
      telephone: '0123456789',
      email: 'jean.dupont@email.com'
    },
    modePaiement: 'Carte bancaire'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Commande créée:', data.commande);
  console.log('Économie réalisée:', data.commande.montantReduction);
});
```

### Suivre l'Historique d'une Commande
```javascript
fetch('http://localhost:5000/commandeRoutes/COMMANDE_ID')
.then(response => response.json())
.then(data => {
  console.log('Statut actuel:', data.commande.statut);
  console.log('Historique:', data.commande.historique);
});
```

### Obtenir les Statistiques
```javascript
fetch('http://localhost:5000/commandeRoutes/stats/overview')
.then(response => response.json())
.then(data => {
  console.log('Chiffre d\'affaires total:', data.stats.chiffreAffairesTotal);
  console.log('Économie totale:', data.stats.economieTotale);
  console.log('Top véhicules:', data.stats.topVehicules);
});
```
