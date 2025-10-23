# 🗺️ Guide complet des routes - Time Manager

## 📋 Table des matières
1. [Routes publiques](#routes-publiques)
2. [Routes protégées - Tous utilisateurs](#routes-protégées---tous-utilisateurs)
3. [Routes protégées - Manager/CEO](#routes-protégées---managerceo)
4. [Routes protégées - CEO uniquement](#routes-protégées---ceo-uniquement)
5. [Routes système](#routes-système)
6. [Fonctionnalités par page](#fonctionnalités-par-page)

---

## 🌐 Routes publiques
_Accessibles sans authentification_

### `/login` - Page de connexion
- **Fichier** : `LoginPage.jsx`
- **Description** : Formulaire de connexion
- **Champs** : Email, Mot de passe
- **Action** : Authentification via AuthContext
- **Redirection** : `/dashboard` après connexion réussie

### `/register` - Page d'inscription
- **Fichier** : `RegisterPage.jsx`
- **Description** : Formulaire d'inscription
- **Champs** : Prénom, Nom, Email, Mot de passe, Confirmation mot de passe
- **Statut** : Compte créé avec status `PENDING` (attente approbation CEO)
- **Workflow** : CEO doit approuver l'inscription dans `/users`



- **Description** : Démo des composants UI
- **Utilité** : Développement et tests visuels

---

## 🔒 Routes protégées - Tous utilisateurs
_Accessible à EMPLOYEE, MANAGER, CEO (authentification requise)_

### `/dashboard` - Dashboard personnel
- **Fichier** : `EmployeeDashboard.jsx`
- **Rôles autorisés** : EMPLOYEE, MANAGER, CEO
- **Description** : Dashboard personnel de l'employé

#### Composants inclus :
- **Notification** : Bandeau d'alerte si pas pointé aujourd'hui
- **4 KPIs personnels** :
  - Heures cette semaine
  - Taux de retards ce mois
  - Moyenne hebdomadaire
  - Comparaison avec semaines précédentes
- **Sélecteur de période** : 7J, 30J, 365J (pour l'historique)
- **Actions Clock** : Arrivée (Clock In) / Départ (Clock Out)
- **Historique de pointage** : 
  - Tableau avec Date, Arrivée, Départ, Durée, Retard, Statut
  - Détection automatique des retards (basé sur horaires équipe)
  - Statistiques : nombre à l'heure / retards

#### Navigation sidebar :
- **EMPLOYEE** : Dashboard, Profil (2 liens)
- **MANAGER** : Dashboard, Équipes, Profil (3 liens)
- **CEO** : Dashboard, Équipes, Profil, Utilisateurs (4 liens)

### `/profile` - Profil utilisateur
- **Fichier** : `ProfilePage.jsx`
- **Rôles autorisés** : EMPLOYEE, MANAGER, CEO
- **Description** : Gestion du profil personnel

#### Fonctionnalités :
- **Informations personnelles** :
  - Prénom, Nom
  - Email (lecture seule)
  - Téléphone
  - Rôle (lecture seule)
- **Actions** :
  - Modifier les informations
  - Réinitialiser le mot de passe

---

## 👔 Routes protégées - Manager/CEO
_Accessible uniquement aux MANAGER et CEO_

### `/teams` - Liste des équipes
- **Fichier** : `TeamsList.jsx`
- **Rôles autorisés** : MANAGER, CEO
- **Description** : Vue d'ensemble de toutes les équipes

#### Fonctionnalités :
- **Grille d'équipes** : Affichage en cartes
- **Informations par équipe** :
  - Nom de l'équipe
  - Description
  - Nombre de membres
  - Nom du manager
- **Actions** :
  - Créer une nouvelle équipe (modal)
  - Clic sur une équipe → `/teams/:teamId`

#### Modal création d'équipe :
- Nom de l'équipe
- Description
- Manager (sélection)

### `/teams/:teamId` - Dashboard d'une équipe
**Exemple** : `/teams/1`, `/teams/2`, etc.

- **Fichier** : `TeamDetail.jsx`
- **Rôles autorisés** : MANAGER, CEO
- **Description** : Dashboard complet d'une équipe

#### En-tête :
- **Informations équipe** :
  - Nom et description
  - Manager assigné
  - Nombre de membres
  - Date de création
- **Actions** :
  - Modifier l'équipe (modal)
  - **Export avec menu déroulant** :
    - 📄 Export CSV
    - 📑 Export PDF

#### Sélecteur de période :
- 7 jours
- 30 jours
- 365 jours

#### 4 KPIs de l'équipe :
1. **Total heures** : Somme des heures travaillées (période sélectionnée)
2. **Moyenne** : Moyenne d'heures par membre
3. **Actifs** : Nombre de membres actuellement actifs
4. **En pause** : Nombre de membres en pause

#### Tableau des membres :
- **Colonnes** :
  - Nom
  - Rôle (EMPLOYEE/MANAGER)
  - Date d'arrivée dans l'équipe
  - Heures (période)
  - Statut (Actif/Pause/Hors ligne)
  - Dernier pointage
  - Actions (Retirer du membre)
- **Bouton** : Ajouter un membre (modal)

#### Export de données :
- **CSV** : 
  - ✅ Fonctionnel (avec mock)
  - Colonnes : Nom, Prénom, Rôle, Date arrivée, Heures, Statut, Dernier pointage
  - Nom fichier : `equipe_{nom}_{période}j_{date}.csv`
- **PDF** :
  - 🚧 Simulation (alerte)
  - Backend générera : Infos équipe, KPIs, Liste membres, Graphiques

---

## 👑 Routes protégées - CEO uniquement
_Accessible uniquement au CEO_

### `/users` - Gestion des utilisateurs
- **Fichier** : `UsersListPage.jsx`
- **Rôle autorisé** : CEO
- **Description** : Administration de tous les utilisateurs

#### Statistiques :
- Total utilisateurs
- En attente d'approbation (PENDING)
- Approuvés (APPROVED)

#### Filtres :
- **Par rôle** : Tous, EMPLOYEE, MANAGER, CEO
- **Par statut** : Tous, PENDING, APPROVED, REJECTED

#### Tableau utilisateurs :
- **Colonnes** :
  - Nom complet
  - Email
  - Rôle
  - Statut (badge coloré)
  - Date de création
  - Date d'approbation
  - Actions

#### Actions par utilisateur :
- **Si PENDING** :
  - ✅ Approuver → Statut APPROVED
  - ❌ Rejeter → Statut REJECTED
- **Si APPROVED** :
  - ✏️ Modifier (rôle, informations)
  - 🗑️ Supprimer le compte

#### Workflow d'approbation :
1. Utilisateur s'inscrit → Status PENDING
2. CEO voit la demande dans `/users`
3. CEO approuve → Status APPROVED → Utilisateur peut se connecter
4. CEO rejette → Status REJECTED → Compte désactivé

---

## 🔀 Routes système

### `/` - Redirection racine
- **Action** : Redirection automatique vers `/dashboard`
- **Utilité** : Point d'entrée par défaut

### `*` - Page 404
- **Fichier** : `NotFoundPage.jsx`
- **Description** : Page d'erreur pour routes non trouvées
- **Contenu** : Message d'erreur + lien retour accueil

---

## 🎨 Fonctionnalités par page

### Architecture de navigation

#### Sidebar dynamique selon le rôle :
```
EMPLOYEE:
├── Dashboard
└── Profil

MANAGER:
├── Dashboard
├── Équipes
└── Profil

CEO:
├── Dashboard
├── Équipes
├── Profil
└── Utilisateurs
```

### Protections des routes

#### Dans `App.jsx` :
```jsx
// Route protégée pour tous
<ProtectedRoute>
  <EmployeeDashboard />
</ProtectedRoute>

// Route protégée MANAGER/CEO
<ProtectedRoute allowedRoles={['MANAGER', 'CEO']}>
  <TeamsList />
</ProtectedRoute>

// Route protégée CEO uniquement
<ProtectedRoute allowedRoles={['CEO']}>
  <UsersListPage />
</ProtectedRoute>
```

### Redirections automatiques :
- **Si non authentifié** → `/login`
- **Si authentifié mais mauvais rôle** → `/dashboard`
- **Route inexistante** → `NotFoundPage (404)`

---

## 📊 Données et API

### État actuel (Mock) :
Toutes les pages utilisent des données mockées pour le développement.

### Intégration backend :
Voir `BACKEND_INTEGRATION.md` pour le guide complet.

#### Endpoints attendus :

**Authentification :**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/verify`

**Clocks :**
- `POST /api/clocks/in`
- `POST /api/clocks/out`
- `GET /api/clocks/:userId/history?period={days}`

**Teams :**
- `GET /api/teams`
- `GET /api/teams/:teamId`
- `POST /api/teams`
- `PUT /api/teams/:teamId`
- `POST /api/teams/:teamId/members`
- `DELETE /api/teams/:teamId/members/:userId`
- `GET /api/teams/:teamId/export?period={days}&format={csv|pdf}`

**Users :**
- `GET /api/users`
- `PUT /api/users/:userId/approve`
- `PUT /api/users/:userId/reject`
- `PUT /api/users/:userId`
- `DELETE /api/users/:userId`

---

## 🚀 Commandes de navigation (pour tester)

### En développement :
1. Lancer le serveur : `npm run dev`
2. Ouvrir : `http://localhost:5173`

### Tester les routes :
- Dashboard : `http://localhost:5173/dashboard`
- Liste équipes : `http://localhost:5173/teams`
- Détail équipe 1 : `http://localhost:5173/teams/1`
- Profil : `http://localhost:5173/profile`
- Utilisateurs : `http://localhost:5173/users`

### Tester les rôles :
Dans `AuthContext.jsx`, changer le rôle mock :
```javascript
role: 'EMPLOYEE'  // ou 'MANAGER' ou 'CEO'
```

Ou utiliser la fonction helper :
```javascript
const { changeRole } = useAuth();
changeRole('CEO'); // Change le rôle à la volée
```

---

## 📝 Notes importantes

1. **Mailpit** : Intégration backend uniquement (emails de confirmation, reset password)
2. **Shadcn/UI** : Migration prévue pour les composants (notifications, modals, etc.)
3. **PDF Export** : Nécessite backend (génération serveur)
4. **CSV Export** : Fonctionnel en frontend, sera amélioré avec backend
5. **Authentification** : Actuellement mockée, sera remplacée par JWT/sessions

---

**Document créé le 10 octobre 2025**
**Frontend version : développement avec données mockées**
