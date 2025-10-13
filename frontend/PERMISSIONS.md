# 🔐 Permissions et Accès par Rôle

> **TimeManager** - Gestion des rôles et permissions

---

## 👤 EMPLOYEE (Employé)

### Pages accessibles
- ✅ `/my-clocks` - Dashboard personnel (pointages, stats)
- ✅ `/profile` - Mon profil

### Actions autorisées
- ✅ Clock in/out (pointer)
- ✅ Voir son historique de pointages
- ✅ Voir ses stats personnelles
- ✅ Modifier son profil
- ❌ Pas d'accès aux équipes
- ❌ Pas d'accès aux autres utilisateurs

---

## 👔 MANAGER

### Pages accessibles
- ✅ `/dashboard` - Dashboard Manager (vue d'ensemble de ses équipes)
- ✅ `/my-clocks` - Dashboard personnel (pointages, stats)
- ✅ `/teams` - Liste de SES équipes uniquement
- ✅ `/teams/:id` - Détail de SES équipes
- ✅ `/profile` - Mon profil

### Actions autorisées
- ✅ Clock in/out (pointer comme un employé)
- ✅ Créer des équipes (il en devient automatiquement le manager)
- ✅ Modifier SES équipes (nom, description)
- ✅ Ajouter/retirer des membres dans SES équipes
- ✅ Voir les stats de SES équipes
- ✅ Exporter les données de SES équipes (CSV)
- ❌ Ne peut PAS voir les équipes des autres managers
- ❌ Ne peut PAS modifier les utilisateurs
- ❌ Ne peut PAS approuver/rejeter des utilisateurs

---

## 👑 CEO (Directeur)

### Pages accessibles
- ✅ `/dashboard` - Dashboard CEO (vue globale entreprise)
- ✅ `/my-clocks` - Dashboard personnel (pointages, stats)
- ✅ `/teams` - Liste de TOUTES les équipes (tous managers + CEO)
- ✅ `/teams/:id` - Détail de N'IMPORTE quelle équipe
- ✅ `/users` - Gestion de TOUS les utilisateurs
- ✅ `/profile` - Mon profil

### Actions autorisées
- ✅ Clock in/out (pointer comme un employé)
- ✅ Voir TOUTES les équipes de l'entreprise
- ✅ Créer des équipes (peut choisir n'importe quel manager)
- ✅ Modifier N'IMPORTE quelle équipe
- ✅ Supprimer N'IMPORTE quelle équipe
- ✅ Ajouter/retirer des membres dans N'IMPORTE quelle équipe
- ✅ Voir les stats de TOUTES les équipes
- ✅ Voir TOUS les utilisateurs
- ✅ Approuver/Rejeter les utilisateurs en attente
- ✅ Modifier N'IMPORTE quel utilisateur (rôle, email, etc.)
- ✅ Supprimer N'IMPORTE quel utilisateur
- ✅ Promouvoir un utilisateur (EMPLOYEE → MANAGER, MANAGER → CEO)
- ❌ Ne peut PAS promouvoir un CEO (sécurité)

---

## 🎯 Résumé des différences clés

### Équipes
- **EMPLOYEE** : Aucun accès
- **MANAGER** : Voit et gère SES équipes uniquement
- **CEO** : Voit et gère TOUTES les équipes

### Utilisateurs
- **EMPLOYEE** : Voit uniquement son profil
- **MANAGER** : Voit uniquement son profil
- **CEO** : Voit et gère TOUS les utilisateurs + approuve les inscriptions

### Pointages
- **Tous** : Peuvent pointer et voir leurs propres stats

### Dashboard
- **EMPLOYEE** : Dashboard personnel uniquement
- **MANAGER** : Dashboard manager (ses équipes) + dashboard personnel
- **CEO** : Dashboard CEO (global entreprise) + dashboard personnel

---

## 🔄 Flux typiques

### Inscription d'un nouvel employé
1. Utilisateur s'inscrit via `/register`
2. Statut = `PENDING` (en attente)
3. CEO voit l'utilisateur dans son dashboard
4. CEO approuve → Statut = `APPROVED`
5. Utilisateur peut se connecter et pointer

### Création d'une équipe par un MANAGER
1. MANAGER va sur `/teams`
2. Clique "Créer une équipe"
3. Renseigne nom, description
4. Le MANAGER est automatiquement :
   - Le manager de l'équipe
   - Membre de l'équipe
5. Il peut ensuite ajouter d'autres membres

### Création d'une équipe par un CEO
1. CEO va sur `/teams`
2. Clique "Créer une équipe"
3. Renseigne nom, description
4. **Choisit** le manager dans une liste (MANAGER ou CEO)
5. Le manager choisi devient membre automatiquement
6. CEO peut ajouter d'autres membres

---

## 📝 Notes importantes

### Sécurité
- ✅ Les routes sont protégées par `ProtectedRoute` avec `allowedRoles`
- ✅ JWT vérifié à chaque requête backend
- ✅ Un CEO ne peut pas se promouvoir lui-même en CEO (déjà CEO)
- ✅ Les actions sensibles (delete user, approve) sont limitées au CEO

### Backend
- ✅ Toutes les permissions sont vérifiées côté backend également
- ✅ Le frontend cache/affiche les boutons selon le rôle (UX)
- ✅ Le backend refuse les requêtes non autorisées (sécurité)

### Hiérarchie des rôles
```
CEO (niveau 3)
  ↓
MANAGER (niveau 2)
  ↓
EMPLOYEE (niveau 1)
```

Un rôle supérieur a TOUJOURS accès aux fonctionnalités des rôles inférieurs + ses propres privilèges.

---

**Auteur** : Équipe TimeManager  
**Dernière mise à jour** : 13 octobre 2025
