# Composants UI/UX - TimeManager Frontend

## 📋 Vue d'ensemble

Ce document liste tous les composants UI/UX créés pour l'application TimeManager, prêts à être connectés au backend.

---

## 🎨 Composants UI Réutilisables

### 1. **ConfirmModal** (`/components/ui/ConfirmModal.jsx`)
Modal de confirmation pour les actions destructives.

**Props:**
- `isOpen` (boolean) - État d'ouverture
- `onClose` (function) - Callback de fermeture
- `onConfirm` (function) - Callback de confirmation
- `title` (string) - Titre du modal
- `message` (string) - Message de confirmation
- `confirmText` (string) - Texte du bouton confirmer
- `cancelText` (string) - Texte du bouton annuler
- `variant` (string) - danger | warning | info

**Utilisation:**
```jsx
<ConfirmModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="Supprimer cet utilisateur ?"
  message="Cette action est irréversible."
  variant="danger"
/>
```

---

### 2. **Loading** (`/components/ui/Loading.jsx`)
Composants de chargement et skeletons.

**Composants exportés:**
- `Spinner` - Indicateur de chargement circulaire
- `LoadingOverlay` - Overlay plein écran
- `Skeleton` - Placeholder animé
- `TableSkeleton` - Skeleton pour tableaux
- `CardSkeleton` - Skeleton pour cartes
- `LoadingButton` - Bouton avec état de chargement

**Utilisation:**
```jsx
import { Spinner, Skeleton, LoadingButton } from './components/ui/Loading';

<Spinner size="lg" text="Chargement..." />
<Skeleton variant="text" lines={3} />
<LoadingButton loading={isLoading}>Enregistrer</LoadingButton>
```

---

### 3. **Table** (`/components/ui/Table.jsx`)
Tableau réutilisable avec tri, pagination et actions.

**Props:**
- `columns` (array) - Configuration des colonnes
- `data` (array) - Données à afficher
- `emptyMessage` (string) - Message si vide
- `loading` (boolean) - État de chargement
- `onRowClick` (function) - Callback au clic sur ligne
- `actions` (function) - Fonction render des actions

**Utilisation:**
```jsx
const columns = [
  { key: 'name', label: 'Nom', sortable: true },
  { key: 'email', label: 'Email' },
  { 
    key: 'role', 
    label: 'Rôle',
    render: (row) => <RoleBadge role={row.role} />
  }
];

<Table
  columns={columns}
  data={users}
  loading={isLoading}
  actions={(row) => (
    <button onClick={() => handleEdit(row)}>Modifier</button>
  )}
/>
```

**Pagination:**
```jsx
import { Pagination } from './components/ui/Table';

<Pagination
  currentPage={1}
  totalPages={10}
  totalItems={100}
  itemsPerPage={10}
  onPageChange={(page) => setCurrentPage(page)}
/>
```

---

### 4. **Toast** (`/components/ui/Toast.jsx`)
Notifications temporaires.

**Composants:**
- `Toast` - Composant de base
- `ToastProvider` - Provider avec file d'attente
- `useToast` - Hook pour utiliser les toasts

**Utilisation:**
```jsx
// 1. Wrapper l'app avec ToastProvider dans main.jsx
import { ToastProvider } from './components/ui/Toast';

<ToastProvider>
  <App />
</ToastProvider>

// 2. Utiliser dans les composants
import { useToast } from './components/ui/Toast';

const toast = useToast();

toast.success('Opération réussie !');
toast.error('Une erreur est survenue');
toast.warning('Attention !', 'Titre optionnel');
toast.info('Information', undefined, 6000); // Durée custom
```

---

### 5. **Badge** (`/components/ui/Badge.jsx`)
Badges colorés réutilisables.

**Composants:**
- `Badge` - Badge générique
- `StatusBadge` - Badge de statut (PENDING, APPROVED, etc.)
- `RoleBadge` - Badge de rôle (CEO, MANAGER, EMPLOYEE)

**Utilisation:**
```jsx
import Badge, { StatusBadge, RoleBadge } from './components/ui/Badge';

<Badge variant="success">Actif</Badge>
<StatusBadge status="PENDING" />
<RoleBadge role="MANAGER" />
```

---

### 6. **EmptyState** (`/components/ui/EmptyState.jsx`)
État vide avec illustration et CTA.

**Props:**
- `icon` (string) - Type d'icône (users, search, inbox, clipboard)
- `customIcon` (Component) - Icône Lucide personnalisée
- `title` (string) - Titre
- `description` (string) - Description
- `actionText` (string) - Texte du bouton
- `onAction` (function) - Callback du bouton

**Utilisation:**
```jsx
<EmptyState
  icon="users"
  title="Aucun membre"
  description="Commencez par ajouter des membres à cette équipe"
  actionText="Ajouter un membre"
  onAction={() => setModalOpen(true)}
/>
```

---

## 👥 Composants Manager

### 7. **AddMemberModal** (`/components/manager/AddMemberModal.jsx`)
Modal pour ajouter des membres à une équipe.

**Props:**
- `isOpen` (boolean) - État d'ouverture
- `onClose` (function) - Callback de fermeture
- `onAddMember` (function) - Callback d'ajout (userId)
- `currentMembers` (array) - Membres actuels (exclus)
- `availableUsers` (array) - Utilisateurs disponibles

**Utilisation:**
```jsx
<AddMemberModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onAddMember={(userId) => handleAdd(userId)}
  currentMembers={teamMembers}
  availableUsers={allUsers}
/>
```

---

## 📄 Pages

### 8. **NotFoundPage** (`/pages/NotFoundPage.jsx`)
Page 404 personnalisée.

**Features:**
- Illustration 404
- Boutons retour et accueil
- Suggestions de pages populaires

---

### 9. **UsersListPage** (`/pages/UsersListPage.jsx`)
Gestion des utilisateurs (CEO uniquement).

**Features:**
- Liste des utilisateurs avec filtres (rôle, statut)
- Approbation/Rejet des nouveaux utilisateurs (PENDING)
- Actions CRUD (modifier, supprimer)
- Badges de statut et rôle

---

## 📝 Pages Mises à Jour

### 10. **TeamDetail** (mis à jour)
Gestion complète d'une équipe avec membres.

**Nouvelles features ajoutées:**
- ✅ Bouton "Ajouter un membre" (Manager/CEO)
- ✅ Colonne Actions avec bouton supprimer
- ✅ Modal AddMemberModal
- ✅ Modal ConfirmModal pour retirer un membre
- ✅ Protection : impossible de retirer le manager

**Callbacks pour API:**
```javascript
handleAddMember(userId) // POST /api/teams/:teamId/members
handleRemoveMember(member) // DELETE /api/teams/:teamId/members/:userId
```

---

## 🛣️ Routes App.jsx

Toutes les routes sont configurées dans `/src/App.jsx` :

```jsx
/login             → LoginPage
/register          → RegisterPage
/dashboard         → EmployeeDashboard
/teams             → TeamsList
/teams/:teamId     → TeamDetail (avec gestion membres)
/profile           → ProfilePage
/users             → UsersListPage (CEO uniquement)
/demo              → DemoPage
/                  → Redirect vers /dashboard
*                  → NotFoundPage (404)
```

---

## 🎯 Prêt pour le Backend

### Composants prêts à connecter :

#### **TeamDetail** - Gestion des membres
```javascript
// API Calls à implémenter
- GET /api/teams/:teamId/members        → Liste membres
- POST /api/teams/:teamId/members       → Ajouter membre { userId }
- DELETE /api/teams/:teamId/members/:userId → Retirer membre
```

#### **UsersListPage** - Gestion utilisateurs
```javascript
// API Calls à implémenter
- GET /api/users?role=X&status=Y        → Liste utilisateurs
- POST /api/users/:id/approve           → Approuver utilisateur
- POST /api/users/:id/reject            → Rejeter utilisateur
- PUT /api/users/:id                    → Modifier utilisateur
- DELETE /api/users/:id                 → Supprimer utilisateur
```

---

## 📦 Composants UI Complets

| Composant | Fichier | Usage |
|-----------|---------|-------|
| ConfirmModal | `/ui/ConfirmModal.jsx` | Confirmations suppression |
| Loading (Spinner, Skeleton) | `/ui/Loading.jsx` | États de chargement |
| Table + Pagination | `/ui/Table.jsx` | Tableaux de données |
| Toast | `/ui/Toast.jsx` | Notifications |
| Badge | `/ui/Badge.jsx` | Badges statut/rôle |
| EmptyState | `/ui/EmptyState.jsx` | États vides |
| AddMemberModal | `/manager/AddMemberModal.jsx` | Ajout membres équipe |

---

## 🎨 Design System

### Couleurs de variantes :
- **Success** : Vert (approbation, actif)
- **Error** : Rouge (rejet, suppression)
- **Warning** : Orange (en attente, attention)
- **Info** : Bleu (information)
- **Gray** : Gris (neutre, employé)
- **Purple** : Violet (CEO)
- **Blue** : Bleu (Manager)

### Tailles :
- **sm** : Petit (badges, icônes)
- **md** : Moyen (défaut)
- **lg** : Grand (titres, CTA)
- **xl** : Très grand (headers)

---

## ✅ Checklist Complète

- [x] Modal de confirmation (ConfirmModal)
- [x] Composants de chargement (Spinner, Skeleton)
- [x] Tableau réutilisable avec pagination
- [x] Page 404 personnalisée
- [x] Système de notifications (Toast)
- [x] Badges réutilisables
- [x] États vides (EmptyState)
- [x] Gestion des membres d'équipe (TeamDetail + AddMemberModal)
- [x] Gestion des utilisateurs (UsersListPage)
- [x] Routes configurées
- [x] Design cohérent avec Tailwind CSS

---

## 🚀 Prochaines Étapes (Backend)

1. Créer les API endpoints
2. Remplacer les données de démo par des appels API
3. Implémenter l'authentification JWT
4. Ajouter la gestion d'erreurs
5. Tests d'intégration

**L'interface est maintenant complète et prête pour l'intégration backend !**
