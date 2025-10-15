# CEO Dashboard - Documentation des KPIs

## 📊 Statistiques affichées

### 1. **Total Utilisateurs**
- **Calcul**: `Utilisateurs approuvés + Utilisateurs en attente`
- **Source**: 
  - `/api/users` (approuvés)
  - `/api/users/pending` (en attente)
- **Signification**: Nombre total d'utilisateurs dans le système (actifs + en attente d'approbation)

### 2. **En attente d'approbation** (Orange)
- **Calcul**: Nombre d'utilisateurs retournés par `/api/users/pending`
- **Source**: `/api/users/pending`
- **Signification**: Utilisateurs qui se sont inscrits mais n'ont pas encore été approuvés par le CEO
- **Action**: Le CEO peut les approuver ou rejeter depuis cette page ou la page Utilisateurs

### 3. **Utilisateurs approuvés** (Vert)
- **Calcul**: Nombre d'utilisateurs retournés par `/api/users`
- **Source**: `/api/users`
- **Signification**: Utilisateurs validés et actifs dans le système
- **Note**: Le backend ne renvoie que les utilisateurs approuvés via `/api/users`

### 4. **Total Équipes**
- **Calcul**: Nombre d'équipes uniques après déduplication
- **Source**: Agrégation de `/api/teams?managerId={id}` pour tous les MANAGER et CEO
- **Signification**: Nombre total d'équipes créées dans l'entreprise
- **Note**: Dédupliqué par ID car plusieurs managers peuvent référencer la même équipe

### 5. **Managers**
- **Calcul**: Nombre d'utilisateurs avec `role === 'MANAGER'`
- **Source**: Filtrage sur `/api/users`
- **Signification**: Nombre de managers approuvés (pas nécessairement avec des équipes)
- **Note**: N'inclut pas les CEO

### 6. **Employés actifs**
- **Calcul**: Nombre d'utilisateurs avec `role === 'EMPLOYEE'`
- **Source**: Filtrage sur `/api/users`
- **Signification**: Nombre d'employés approuvés dans le système
- **Note**: "Actifs" signifie "approuvés", pas "qui ont pointé récemment"

## 🔄 Flux de données

```
CEO Dashboard Load
├─ GET /api/users                 → Utilisateurs approuvés
├─ GET /api/users/pending         → Utilisateurs en attente
└─ Pour chaque MANAGER/CEO:
   └─ GET /api/teams?managerId=X  → Équipes du manager
```

## ⚠️ Points importants

1. **Pas de champ `status` dans UserDTO**
   - Le backend ne renvoie pas `status: 'PENDING'` ou `status: 'APPROVED'`
   - Deux endpoints séparés : `/api/users` (approuvés) et `/api/users/pending`

2. **Employés "actifs"**
   - Actuellement = tous les employés approuvés
   - Pourrait être amélioré pour ne compter que ceux qui ont pointé dans les X derniers jours

3. **Équipes dédupliquées**
   - Nécessaire car plusieurs managers peuvent avoir accès à la même équipe
   - Utilise un `Map` avec l'ID comme clé

4. **Top 5 affichés**
   - Utilisateurs en attente : 5 premiers
   - Équipes récentes : 5 premières
   - Bouton "Voir tous" redirige vers les pages complètes

## 🎯 Actions disponibles

### Sur les utilisateurs en attente :
- ✅ **Approuver** : `PUT /api/users/{id}/approve`
- ❌ **Rejeter** : `PUT /api/users/{id}/reject`

### Navigation :
- **"Voir tous"** (utilisateurs) → `/users`
- **"Voir toutes"** (équipes) → `/teams`
- **Clic sur équipe** → `/teams/{id}`

## 📈 Améliorations possibles

1. **Employés actifs réels** : Compter uniquement ceux qui ont pointé dans les 7 derniers jours
2. **Managers avec équipes** : Distinguer les managers qui ont des équipes de ceux qui n'en ont pas
3. **Graphiques** : Ajouter des tendances sur le nombre d'utilisateurs/équipes dans le temps
4. **Temps réel** : WebSocket pour mettre à jour les stats automatiquement
