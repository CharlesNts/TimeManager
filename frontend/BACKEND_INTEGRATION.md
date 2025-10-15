# Guide d'intégration Backend

Ce document explique comment remplacer les données mockées par les vrais appels API backend.

## 📦 Structure actuelle

Le frontend est prêt pour l'intégration backend avec :
- **AuthContext** : Gestion de l'authentification avec localStorage pour dev
- **ProtectedRoute** : Protection des routes selon les rôles (EMPLOYEE, MANAGER, CEO)
- **Navigation dynamique** : Sidebar adaptée au rôle utilisateur
- **Composants prêts** : Toutes les pages et modals sont fonctionnels avec mock data
- **Actions CRUD** : Création, modification, suppression implémentées
- **Export de données** : CSV fonctionnel, PDF placeholder

---

## 🎯 Fonctionnalités implémentées

### Pages complètes
1. **EmployeeDashboard** - Pointage et statistiques personnelles
2. **TeamsList** - Liste et gestion des équipes (avec edit/delete pour CEO)
3. **TeamDetail** - Détails d'une équipe avec gestion des membres
4. **ProfilePage** - Profil utilisateur
5. **UsersListPage** - Gestion des utilisateurs (CEO uniquement)

### Modals
1. **EditUserModal** - Modification d'utilisateur (prénom, nom, email, rôle)
2. **TeamFormModal** - Création/modification d'équipe (nom, description, manager)
3. **AddMemberModal** - Ajout de membre à une équipe

### Composants réutilisables
1. **PeriodSelector** - Sélecteur de période (7J, 30J, 365J)
2. **TeamCard** - Carte d'équipe avec actions (edit/delete)
3. **ClockActions** - Boutons de pointage (In/Out/Break)
4. **ClockHistory** - Historique de pointage avec détection retards

---

## 🔄 Étapes d'intégration

### 1. Créer les services API

Dans `src/services/`, créer les fichiers suivants :

#### `authService.js`
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const authService = {
  // Connexion
  login: async (credentials) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  },

  // Inscription
  register: async (userData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  },

  // Déconnexion
  logout: async () => {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST'
    });
    return response.json();
  },

  // Vérifier le token
  verifyToken: async () => {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      credentials: 'include' // Pour les cookies
    });
    return response.json();
  }
};
```

#### `clockService.js`
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const clockService = {
  // Clock In
  clockIn: async () => {
    const response = await fetch(`${API_URL}/clocks/in`, {
      method: 'POST',
      credentials: 'include'
    });
    return response.json();
  },

  // Clock Out
  clockOut: async () => {
    const response = await fetch(`${API_URL}/clocks/out`, {
      method: 'POST',
      credentials: 'include'
    });
    return response.json();
  },

  // Historique
  getHistory: async (userId, period = 7) => {
    const response = await fetch(
      `${API_URL}/clocks/${userId}/history?period=${period}`,
      { credentials: 'include' }
    );
    return response.json();
  }
};
```

#### `teamService.js`
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const teamService = {
  // Liste des équipes
  getTeams: async () => {
    const response = await fetch(`${API_URL}/teams`, {
      credentials: 'include'
    });
    return response.json();
  },

  // Détails d'une équipe
  getTeam: async (teamId) => {
    const response = await fetch(`${API_URL}/teams/${teamId}`, {
      credentials: 'include'
    });
    return response.json();
  },

  // Créer une équipe
  createTeam: async (teamData) => {
    const response = await fetch(`${API_URL}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(teamData)
    });
    return response.json();
  },

  // Modifier une équipe
  updateTeam: async (teamId, teamData) => {
    const response = await fetch(`${API_URL}/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(teamData)
    });
    return response.json();
  },

  // Supprimer une équipe (CEO uniquement)
  deleteTeam: async (teamId) => {
    const response = await fetch(`${API_URL}/teams/${teamId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return response.json();
  },

  // Ajouter un membre
  addMember: async (teamId, userId) => {
    const response = await fetch(`${API_URL}/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId })
    });
    return response.json();
  },

  // Retirer un membre
  removeMember: async (teamId, userId) => {
    const response = await fetch(`${API_URL}/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return response.json();
  },

  // Exporter les données (CSV)
  exportCSV: async (teamId, period) => {
    const response = await fetch(
      `${API_URL}/teams/${teamId}/export/csv?period=${period}`,
      { credentials: 'include' }
    );
    return response.blob();
  },

  // Exporter les données (PDF)
  exportPDF: async (teamId, period) => {
    const response = await fetch(
      `${API_URL}/teams/${teamId}/export/pdf?period=${period}`,
      { credentials: 'include' }
    );
    return response.blob();
  }
};
```

#### `userService.js`
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const userService = {
  // Liste des utilisateurs (CEO)
  getUsers: async () => {
    const response = await fetch(`${API_URL}/users`, {
      credentials: 'include'
    });
    return response.json();
  },

  // Approuver un utilisateur
  approveUser: async (userId) => {
    const response = await fetch(`${API_URL}/users/${userId}/approve`, {
      method: 'PUT',
      credentials: 'include'
    });
    return response.json();
  },

  // Rejeter un utilisateur
  rejectUser: async (userId) => {
    const response = await fetch(`${API_URL}/users/${userId}/reject`, {
      method: 'PUT',
      credentials: 'include'
    });
    return response.json();
  },

  // Modifier un utilisateur
  updateUser: async (userId, userData) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    return response.json();
  },

  // Supprimer un utilisateur (CEO uniquement)
  deleteUser: async (userId) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return response.json();
  }
};
```

---

### 2. Créer les hooks personnalisés

Dans `src/hooks/`, créer :

#### `useAuth.js` (remplacera celui du context)
```javascript
import { useContext } from 'react';
import AuthContext from '../contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};
```

---

### 3. Modifier AuthContext

Dans `src/contexts/AuthContext.jsx`, remplacer les fonctions mockées :

```javascript
import { authService } from '../services/authService';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Au chargement, vérifier si l'utilisateur est connecté
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const userData = await authService.verifyToken();
        setUser(userData);
      } catch (error) {
        console.error('Non authentifié');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifyUser();
  }, []);

  const login = async (credentials) => {
    const userData = await authService.login(credentials);
    setUser(userData);
    return { success: true };
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const register = async (data) => {
    return await authService.register(data);
  };

  // ... reste du code
};
```

---

### 4. Modifier les pages

Pour chaque page, remplacer les données mockées par des appels API.

#### Exemple : `TeamsList.jsx`

**AVANT (mock) :**
```javascript
const teams = [
  { id: 1, name: "Équipe Dev", ... },
  // ...
];
```

**APRÈS (API) :**
```javascript
import { teamService } from '../services/teamService';

const [teams, setTeams] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchTeams = async () => {
    try {
      const data = await teamService.getTeams();
      setTeams(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };
  fetchTeams();
}, []);
```

---

## 🔧 Variables d'environnement

Créer un fichier `.env` à la racine du frontend :

```env
VITE_API_URL=http://localhost:8080/api
```

Pour la production :
```env
VITE_API_URL=https://api.votre-domaine.com/api
```

---

## 📋 Checklist d'intégration

### Services à créer
- [ ] `authService.js` - Authentification (login, register, logout, verifyToken)
- [ ] `clockService.js` - Pointage (clockIn, clockOut, getHistory)
- [ ] `teamService.js` - Équipes (getTeams, getTeam, createTeam, updateTeam, deleteTeam, addMember, removeMember, exportCSV, exportPDF)
- [ ] `userService.js` - Utilisateurs (getUsers, approveUser, rejectUser, updateUser, deleteUser)

### Pages à intégrer
- [ ] `EmployeeDashboard` - Remplacer données mockées par clockService
- [ ] `TeamsList` - Remplacer données mockées par teamService (avec edit/delete pour CEO)
- [ ] `TeamDetail` - Remplacer données mockées par teamService (membres, stats, export)
- [ ] `UsersListPage` - Remplacer données mockées par userService (approve, reject, edit, delete)
- [ ] `ProfilePage` - Charger et sauvegarder via userService

### Modals à intégrer
- [ ] `EditUserModal` - Connecter au userService.updateUser()
- [ ] `TeamFormModal` - Connecter à teamService.createTeam() et teamService.updateTeam()
- [ ] `AddMemberModal` - Connecter à teamService.addMember()

### Configuration
- [ ] Créer `.env` avec `VITE_API_URL`
- [ ] Modifier `AuthContext` pour utiliser `authService`
- [ ] Configurer CORS sur le backend

### Tests
- [ ] Tester l'authentification (login, register, logout)
- [ ] Tester les routes protégées (EMPLOYEE, MANAGER, CEO)
- [ ] Tester toutes les fonctionnalités CRUD :
  - [ ] Créer équipe
  - [ ] Modifier équipe
  - [ ] Supprimer équipe (CEO)
  - [ ] Ajouter membre
  - [ ] Retirer membre
  - [ ] Créer utilisateur
  - [ ] Modifier utilisateur (CEO)
  - [ ] Supprimer utilisateur (CEO)
  - [ ] Approuver/Rejeter utilisateur (CEO)
- [ ] Tester les exports (CSV et PDF)
- [ ] Tester les périodes (7J, 30J, 365J)
- [ ] Tester le pointage (In/Out/Break)

### Gestion des erreurs
- [ ] Ajouter try/catch dans tous les appels API
- [ ] Afficher des messages d'erreur à l'utilisateur
- [ ] Gérer les erreurs 401 (déconnexion automatique)
- [ ] Gérer les erreurs 403 (accès refusé)
- [ ] Gérer les erreurs 500 (erreur serveur)

### UX/UI
- [ ] Ajouter des loaders pendant les appels API
- [ ] Ajouter des confirmations avant suppression
- [ ] Afficher des notifications de succès
- [ ] Désactiver les boutons pendant les requêtes

---

## 🎯 Points d'attention

1. **Gestion des erreurs** : Ajouter des try/catch et afficher des messages à l'utilisateur
2. **Loading states** : Afficher des spinners pendant les requêtes
3. **Tokens** : Gérer le stockage du token (cookies ou localStorage)
4. **CORS** : Configurer le backend pour accepter les requêtes du frontend
5. **Refresh token** : Implémenter le renouvellement automatique du token
6. **Permissions** : Vérifier les rôles côté backend également (ne jamais faire confiance au frontend)
7. **Validation** : Valider les données côté backend avant traitement
8. **Export** : Le backend doit générer les fichiers CSV et PDF avec les vraies données

---

## 📊 Actions par rôle

### EMPLOYEE
- ✅ Pointage (In/Out/Break)
- ✅ Voir son historique de pointage
- ✅ Voir ses statistiques personnelles
- ✅ Modifier son profil

### MANAGER
- ✅ Toutes les actions EMPLOYEE
- ✅ Voir ses équipes
- ✅ Créer une équipe
- ✅ Voir les détails de ses équipes
- ✅ Ajouter/retirer des membres de ses équipes
- ✅ Exporter les données de ses équipes (CSV/PDF)

### CEO
- ✅ Toutes les actions MANAGER
- ✅ Voir toutes les équipes (pas seulement les siennes)
- ✅ Modifier toute équipe (nom, description, manager)
- ✅ Supprimer toute équipe
- ✅ Voir tous les utilisateurs
- ✅ Approuver/Rejeter les nouvelles inscriptions (status PENDING → APPROVED/REJECTED)
- ✅ Modifier tout utilisateur (prénom, nom, email, **rôle** EMPLOYEE/MANAGER uniquement)
- ✅ Supprimer tout utilisateur (sauf lui-même)
- ⚠️ **Restriction : Un CEO ne peut pas promouvoir un autre utilisateur en CEO**

---

## � Sécurité

### Frontend
- ✅ Routes protégées par rôle avec `ProtectedRoute`
- ✅ Navigation dynamique selon le rôle
- ✅ Masquage des actions interdites (boutons edit/delete)
- ✅ Validation des formulaires
- ✅ Prévention auto-suppression (CEO ne peut pas se supprimer)

### Backend (à implémenter)
- [ ] Middleware d'authentification sur toutes les routes protégées
- [ ] Vérification des rôles pour chaque action sensible
- [ ] Validation des données entrantes
- [ ] Protection CSRF
- [ ] Rate limiting
- [ ] Logging des actions sensibles (changement de rôle, suppression, etc.)

---

## �📚 Documentation backend requise

Le backend doit fournir :
- Spécification OpenAPI/Swagger des endpoints
- Format des réponses (success/error)
- Codes HTTP utilisés
- Gestion des tokens (JWT, cookies, etc.)
- Politiques CORS
- **Endpoints d'export** :
  - `GET /api/teams/:id/export/csv?period=7` → Fichier CSV
  - `GET /api/teams/:id/export/pdf?period=7` → Fichier PDF
- **Endpoints de gestion des utilisateurs** :
  - `PUT /api/users/:id/approve` → Approuver inscription
  - `PUT /api/users/:id/reject` → Rejeter inscription
  - `PUT /api/users/:id` → Modifier utilisateur (y compris le rôle)
  - `DELETE /api/users/:id` → Supprimer utilisateur
- **Endpoints de gestion des équipes** :
  - `POST /api/teams` → Créer équipe
  - `PUT /api/teams/:id` → Modifier équipe
  - `DELETE /api/teams/:id` → Supprimer équipe
  - `POST /api/teams/:id/members` → Ajouter membre
  - `DELETE /api/teams/:id/members/:userId` → Retirer membre

---

## 🆕 Nouvelles fonctionnalités ajoutées

### EditUserModal
- Composant : `/src/components/manager/EditUserModal.jsx`
- Permet au CEO de modifier un utilisateur :
  - Prénom, Nom
  - Email
  - Rôle (EMPLOYEE, MANAGER uniquement - **pas CEO**)
- Intégration dans `UsersListPage` avec bouton "Modifier"
- Sécurité : Seul le CEO actuel peut rester CEO, pas de promotion possible

### TeamCard avec actions
- Composant : `/src/components/manager/TeamCard.jsx`
- Props ajoutées : `onEdit`, `onDelete`, `showActions`
- Boutons Modifier/Supprimer visibles uniquement pour CEO
- Utilisé dans `TeamsList`

### Gestion complète des équipes
- Créer équipe (MANAGER + CEO)
- Modifier équipe (CEO uniquement)
- Supprimer équipe (CEO uniquement)
- Mode du modal : 'create' ou 'edit'

---

**Note** : Actuellement, tout fonctionne avec des données mockées. L'intégration backend sera transparente grâce à cette architecture !
