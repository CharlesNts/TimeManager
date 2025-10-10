# Navigation - TimeManager Frontend

## 🧭 Structure de Navigation

### Sidebar Principale (toutes les pages)

La sidebar est identique sur toutes les pages avec 4 icônes :

```jsx
const sidebarItems = [
  { 
    icon: LayoutDashboard, 
    label: "Dashboard", 
    path: "/dashboard"
  },
  { 
    icon: Users, 
    label: "Équipes", 
    path: "/teams"
  },
  { 
    icon: UserCircle, 
    label: "Profil", 
    path: "/profile"
  },
  { 
    icon: UserCog, 
    label: "Utilisateurs", 
    path: "/users"
  },
];
```

### Routes Disponibles

| Route | Page | Description | Icône Sidebar |
|-------|------|-------------|---------------|
| `/dashboard` | EmployeeDashboard | Dashboard personnel avec pointage | LayoutDashboard |
| `/teams` | TeamsList | Liste des équipes | Users |
| `/teams/:teamId` | TeamDetail | Détails d'une équipe + membres | - |
| `/profile` | ProfilePage | Profil utilisateur | UserCircle |
| `/users` | UsersListPage | Gestion utilisateurs (CEO) | UserCog |
| `/login` | LoginPage | Connexion (pas de sidebar) | - |
| `/register` | RegisterPage | Inscription (pas de sidebar) | - |
| `/demo` | DemoPage | Démonstration composants | - |
| `*` | NotFoundPage | Page 404 | - |

## 📱 Pages avec Sidebar

Toutes les pages suivantes utilisent le composant `<Layout>` avec la sidebar identique :

1. **EmployeeDashboard** (`/dashboard`)
   - Accueil de l'application
   - Pointage Clock In/Out
   - Historique personnel
   - KPIs individuels

2. **TeamsList** (`/teams`)
   - Liste de toutes les équipes
   - Création d'équipe (Manager/CEO)
   - Statistiques par équipe

3. **TeamDetail** (`/teams/:teamId`)
   - Détails d'une équipe
   - Liste des membres
   - Gestion des membres (ajouter/retirer)
   - Édition des informations

4. **ProfilePage** (`/profile`)
   - Informations personnelles
   - Modification du profil
   - Changement de mot de passe

5. **UsersListPage** (`/users`)
   - Liste de tous les utilisateurs
   - Approbation des inscriptions (PENDING)
   - CRUD utilisateurs
   - Filtres par rôle et statut

6. **DemoPage** (`/demo`)
   - Vitrine des composants
   - Accessible uniquement par URL directe

## 🔓 Pages sans Sidebar

1. **LoginPage** (`/login`)
   - Connexion utilisateur
   - Validation @primebank.com

2. **RegisterPage** (`/register`)
   - Inscription nouveau compte
   - Status PENDING par défaut

3. **NotFoundPage** (404)
   - Page d'erreur personnalisée
   - Boutons de navigation

## 🎯 Navigation Simplifiée

**Pour le moment (sans authentification) :**
- ✅ Toutes les pages sont accessibles directement
- ✅ Pas de restriction par rôle sur la navigation
- ✅ RoleSelector permet de simuler les rôles en dev

**Plus tard (avec backend) :**
- 🔒 Middleware d'authentification
- 🔒 Protection des routes par rôle
- 🔒 Redirection vers /login si non connecté
- 🔒 Sidebar adaptée selon le rôle :
  - EMPLOYEE : Dashboard, Équipes (voir), Profil
  - MANAGER : Dashboard, Équipes (gérer), Profil
  - CEO : Dashboard, Équipes, Profil, Utilisateurs

## 🚀 Flux Utilisateur

### Première visite
1. `/` → Redirect vers `/dashboard`
2. Utiliser le RoleSelector (coin bas-droit) pour simuler un rôle
3. Naviguer via la sidebar (4 icônes)

### Navigation principale
```
Dashboard (/dashboard)
    ↓
Équipes (/teams)
    ↓
Détail Équipe (/teams/:id)
    ↓
Profil (/profile)
    ↓
Utilisateurs (/users)
```

### Pages hors flux
- `/login` - Connexion (accessible directement)
- `/register` - Inscription (accessible directement)
- `/demo` - Démo composants (accessible par URL)
- `/*` - 404 (toute URL invalide)

## 🎨 Cohérence Visuelle

Toutes les pages avec sidebar partagent :
- ✅ Même sidebar noire (16px large)
- ✅ Logo PB en haut
- ✅ 4 icônes de navigation
- ✅ RoleSelector en bas à droite (dev mode)
- ✅ Header avec titre de page et info utilisateur
- ✅ Thème noir/gris/blanc cohérent

---

**Note :** La sidebar est volontairement simple et fixe pour l'instant. L'adaptation par rôle sera implémentée côté backend avec les guards de routes.
