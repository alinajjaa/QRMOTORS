# API Documentation - Système de Scan QR Code

## Vue d'ensemble

Le système de scan QR code permet d'enregistrer et de suivre les scans de QR codes des véhicules par les utilisateurs. Chaque scan enregistre :
- L'utilisateur qui effectue le scan
- Le véhicule scanné
- La date et l'heure du scan
- L'adresse IP de l'appareil
- Le User-Agent du navigateur
- Le statut du scan

## Modèle Scan

### Structure du modèle

```javascript
{
  utilisateur: ObjectId (référence vers User),
  vehicule: ObjectId (référence vers Vehicule),
  dateScan: Date (défaut: maintenant),
  adresseIP: String (requis),
  userAgent: String,
  localisation: String,
  statut: String (enum: ['Succès', 'Échec', 'En cours']),
  details: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Relations

- **Scan → User** : Relation many-to-one
- **Scan → Vehicule** : Relation many-to-one
- **User → Scan** : Relation one-to-many (tableau de scans)
- **Vehicule → Scan** : Relation one-to-many (tableau de scans)

## Endpoints API

### Base URL
```
http://localhost:5000/scanRoutes
```

### 1. Scanner un QR Code (Endpoint Principal)

**POST** `/scan-qr`

Enregistre un nouveau scan lorsqu'un utilisateur scanne un QR code de véhicule.

#### Request Body
```json
{
  "qrCodeData": "QR_CODE_STRING",
  "userId": "USER_ID"
}
```

#### Response (200)
```json
{
  "message": "QR code scanné avec succès",
  "vehicule": {
    "id": "vehicule_id",
    "marque": "Toyota",
    "modele": "Corolla",
    "annee": 2022,
    "prix": 55000,
    "kilometrage": 15000,
    "carburant": "Essence",
    "boiteVitesse": "Automatique",
    "couleur": "Blanc",
    "description": "Véhicule en excellent état",
    "options": ["GPS", "Climatisation"],
    "images": ["image1.jpg", "image2.jpg"],
    "statut": "Disponible"
  },
  "scan": {
    "id": "scan_id",
    "dateScan": "2025-01-27T10:30:00.000Z",
    "adresseIP": "192.168.1.100",
    "statut": "Succès"
  }
}
```

### 2. Créer un Scan Manuel

**POST** `/create`

Crée un scan manuellement (pour les tests ou corrections).

#### Request Body
```json
{
  "vehiculeId": "VEHICULE_ID",
  "userId": "USER_ID"
}
```

#### Response (201)
```json
{
  "message": "Scan enregistré avec succès",
  "scan": {
    "id": "scan_id",
    "utilisateur": {
      "id": "user_id",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "vehicule": {
      "id": "vehicule_id",
      "marque": "Toyota",
      "modele": "Corolla",
      "annee": 2022,
      "prix": 55000,
      "images": ["image1.jpg"]
    },
    "dateScan": "2025-01-27T10:30:00.000Z",
    "adresseIP": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "statut": "Succès",
    "details": "Scan du QR code du véhicule Toyota Corolla"
  }
}
```

### 3. Obtenir Tous les Scans

**GET** `/`

Récupère tous les scans avec pagination.

#### Query Parameters
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre d'éléments par page (défaut: 10)
- `sortBy` (optionnel) : Champ de tri (défaut: 'dateScan')
- `sortOrder` (optionnel) : Ordre de tri 'asc' ou 'desc' (défaut: 'desc')

#### Response (200)
```json
{
  "message": "Scans récupérés avec succès",
  "scans": [
    {
      "id": "scan_id",
      "utilisateur": {
        "id": "user_id",
        "username": "john_doe",
        "email": "john@example.com"
      },
      "vehicule": {
        "id": "vehicule_id",
        "marque": "Toyota",
        "modele": "Corolla",
        "annee": 2022,
        "prix": 55000,
        "images": ["image1.jpg"]
      },
      "dateScan": "2025-01-27T10:30:00.000Z",
      "adresseIP": "192.168.1.100",
      "statut": "Succès"
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

### 4. Obtenir un Scan par ID

**GET** `/:id`

Récupère un scan spécifique par son ID.

#### Response (200)
```json
{
  "message": "Scan récupéré avec succès",
  "scan": {
    "id": "scan_id",
    "utilisateur": {
      "id": "user_id",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "vehicule": {
      "id": "vehicule_id",
      "marque": "Toyota",
      "modele": "Corolla",
      "annee": 2022,
      "prix": 55000,
      "images": ["image1.jpg"]
    },
    "dateScan": "2025-01-27T10:30:00.000Z",
    "adresseIP": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "statut": "Succès",
    "details": "Scan du QR code du véhicule Toyota Corolla"
  }
}
```

### 5. Obtenir les Scans par Véhicule

**GET** `/vehicule/:vehiculeId`

Récupère tous les scans d'un véhicule spécifique.

#### Query Parameters
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre d'éléments par page (défaut: 10)

#### Response (200)
```json
{
  "message": "Scans du véhicule récupérés avec succès",
  "vehicule": {
    "id": "vehicule_id",
    "marque": "Toyota",
    "modele": "Corolla",
    "annee": 2022
  },
  "scans": [
    {
      "id": "scan_id",
      "utilisateur": {
        "id": "user_id",
        "username": "john_doe",
        "email": "john@example.com"
      },
      "dateScan": "2025-01-27T10:30:00.000Z",
      "adresseIP": "192.168.1.100",
      "statut": "Succès"
    }
  ],
  "pagination": {
    "totalDocs": 25,
    "limit": 10,
    "totalPages": 3,
    "page": 1,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  }
}
```

### 6. Obtenir les Scans par Utilisateur

**GET** `/utilisateur/:userId`

Récupère tous les scans d'un utilisateur spécifique.

#### Query Parameters
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre d'éléments par page (défaut: 10)

#### Response (200)
```json
{
  "message": "Scans de l'utilisateur récupérés avec succès",
  "utilisateur": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com"
  },
  "scans": [
    {
      "id": "scan_id",
      "vehicule": {
        "id": "vehicule_id",
        "marque": "Toyota",
        "modele": "Corolla",
        "annee": 2022,
        "prix": 55000,
        "images": ["image1.jpg"]
      },
      "dateScan": "2025-01-27T10:30:00.000Z",
      "adresseIP": "192.168.1.100",
      "statut": "Succès"
    }
  ],
  "pagination": {
    "totalDocs": 15,
    "limit": 10,
    "totalPages": 2,
    "page": 1,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  }
}
```

### 7. Statistiques des Scans

**GET** `/stats/overview`

Récupère les statistiques globales des scans.

#### Response (200)
```json
{
  "message": "Statistiques des scans récupérées avec succès",
  "stats": {
    "totalScans": 1500,
    "scansAujourdhui": 25,
    "scansCetteSemaine": 180,
    "scansCeMois": 750,
    "topVehicules": [
      {
        "vehicule": {
          "id": "vehicule_id_1",
          "marque": "Toyota",
          "modele": "Corolla",
          "annee": 2022
        },
        "nombreScans": 45
      },
      {
        "vehicule": {
          "id": "vehicule_id_2",
          "marque": "Honda",
          "modele": "Civic",
          "annee": 2021
        },
        "nombreScans": 32
      }
    ],
    "topUtilisateurs": [
      {
        "utilisateur": {
          "id": "user_id_1",
          "username": "john_doe",
          "email": "john@example.com"
        },
        "nombreScans": 15
      },
      {
        "utilisateur": {
          "id": "user_id_2",
          "username": "jane_smith",
          "email": "jane@example.com"
        },
        "nombreScans": 12
      }
    ]
  }
}
```

### 8. Supprimer un Scan

**DELETE** `/:id`

Supprime un scan spécifique.

#### Response (200)
```json
{
  "message": "Scan supprimé avec succès"
}
```

## Codes d'Erreur

### 400 - Bad Request
```json
{
  "message": "ID du véhicule et ID de l'utilisateur sont requis"
}
```

### 404 - Not Found
```json
{
  "message": "Véhicule non trouvé pour ce QR code"
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

### 1. Détection Automatique de l'Adresse IP
Le système détecte automatiquement l'adresse IP du client en utilisant plusieurs méthodes :
- `req.ip`
- `req.connection.remoteAddress`
- `req.socket.remoteAddress`
- `req.headers['x-forwarded-for']`

### 2. Enregistrement du User-Agent
Le système enregistre automatiquement le User-Agent du navigateur pour identifier le type d'appareil.

### 3. Relations Bidirectionnelles
Les scans sont automatiquement ajoutés aux tableaux de scans dans les modèles User et Vehicule.

### 4. Statistiques en Temps Réel
Les statistiques incluent :
- Total des scans
- Scans aujourd'hui
- Scans cette semaine
- Scans ce mois
- Top 5 des véhicules les plus scannés
- Top 5 des utilisateurs les plus actifs

### 5. Pagination
Toutes les requêtes de liste supportent la pagination avec :
- Numéro de page
- Limite d'éléments par page
- Tri personnalisable
- Métadonnées de pagination

## Exemples d'Utilisation

### Scanner un QR Code depuis une Application Mobile
```javascript
fetch('http://localhost:5000/scanRoutes/scan-qr', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    qrCodeData: 'QR_CODE_FROM_CAMERA',
    userId: 'CURRENT_USER_ID'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Véhicule scanné:', data.vehicule);
  console.log('Scan enregistré:', data.scan);
});
```

### Obtenir l'Historique des Scans d'un Utilisateur
```javascript
fetch('http://localhost:5000/scanRoutes/utilisateur/USER_ID?page=1&limit=20')
.then(response => response.json())
.then(data => {
  console.log('Scans de l\'utilisateur:', data.scans);
  console.log('Pagination:', data.pagination);
});
```

### Obtenir les Statistiques
```javascript
fetch('http://localhost:5000/scanRoutes/stats/overview')
.then(response => response.json())
.then(data => {
  console.log('Statistiques:', data.stats);
  console.log('Top véhicules:', data.stats.topVehicules);
  console.log('Top utilisateurs:', data.stats.topUtilisateurs);
});
```



68a33dcccc559c44a159ac3b


68ab3cb90a5d88aeeb652535

