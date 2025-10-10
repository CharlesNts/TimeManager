# Guide de déploiement - Frontend TimeManager

## Installation rapide

### 1. Installer les dépendances
```bash
cd frontend
npm install
```

### 2. Lancer le serveur de développement
```bash
npm run dev
```

Le frontend sera accessible sur : `http://localhost:5173`

### 3. Build de production
```bash
npm run build
```

Les fichiers optimisés seront générés dans le dossier `dist/`.

### 4. Prévisualiser le build de production
```bash
npm run preview
```

---

## Structure des fichiers de configuration

### `package.json`
**Rôle** : Liste toutes les dépendances du projet et les scripts disponibles.

**Dépendances principales** :
- `react` + `react-dom` : Framework React
- `react-router-dom` : Navigation entre les pages
- `axios` : Requêtes HTTP vers le backend
- `lucide-react` : Bibliothèque d'icônes
- `tailwindcss` : Framework CSS utilitaire
- `clsx` + `tailwind-merge` : Gestion intelligente des classes CSS

**Scripts disponibles** :
- `npm run dev` → Lance le serveur de développement
- `npm run build` → Crée la version de production
- `npm run preview` → Prévisualise la version de production
- `npm run lint` → Vérifie le code avec ESLint

---

### `tailwind.config.js`
**Rôle** : Configuration de Tailwind CSS.

**Contient** :
- Les chemins des fichiers à scanner pour les classes CSS
- Le thème personnalisé (couleurs, espacements, rayons de bordure)
- Les variables CSS pour shadcn/ui
- Support du dark mode

---

### `components.json`
**Rôle** : Configuration pour shadcn/ui (bibliothèque de composants).

**Définit** :
- Où installer les composants (`src/components`)
- Où se trouve le fichier CSS (`src/styles/globals.css`)
- Les alias d'imports (`@/*` → `src/*`)
- Le style de base (default)

---

### `jsconfig.json`
**Rôle** : Configuration JavaScript pour VS Code et Vite.

**Permet** :
- Les imports absolus avec `@/` au lieu de chemins relatifs
- Exemple : `import Card from '@/components/ui/card'`

---

### `index.html`
**Rôle** : Point d'entrée HTML de l'application.

**Contient** :
- La balise `<div id="root">` où React s'attache
- Le script qui charge `src/main.jsx`

---

### `src/main.jsx`
**Rôle** : Point d'entrée JavaScript de l'application React.

**Responsabilités** :
- Importe React et ReactDOM
- Importe les styles globaux
- Monte l'application React dans `#root`

---

### `src/App.jsx`
**Rôle** : Composant racine de l'application.

**Contient** :
- Le routeur React Router
- La structure principale de l'app

---

### `src/styles/globals.css`
**Rôle** : Styles globaux de l'application.

**Contient** :
- Les imports Tailwind CSS
- Les variables CSS pour les thèmes (clair/sombre)
- Les couleurs personnalisées utilisées par shadcn/ui

---

### `src/lib/utils.js`
**Rôle** : Fonctions utilitaires réutilisables.

**Contient** :
- `cn()` : Fonction pour fusionner les classes CSS Tailwind intelligemment

---

## Architecture des dossiers

```
frontend/
├── src/
│   ├── components/      # Composants React réutilisables
│   │   ├── ui/          # Composants shadcn/ui
│   │   └── dashboard/   # Composants spécifiques au dashboard
│   ├── pages/           # Pages de l'application
│   ├── services/        # Services API (axios)
│   ├── contexts/        # Contextes React (état global)
│   ├── hooks/           # Hooks personnalisés
│   ├── lib/             # Fonctions utilitaires
│   ├── styles/          # Fichiers CSS
│   ├── App.jsx          # Composant racine
│   └── main.jsx         # Point d'entrée
├── index.html           # Template HTML
├── package.json         # Dépendances et scripts
├── tailwind.config.js   # Config Tailwind
├── components.json      # Config shadcn/ui
└── jsconfig.json        # Config JavaScript
```

---

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm install` | Installe toutes les dépendances |
| `npm run dev` | Lance le serveur de dev (hot reload) |
| `npm run build` | Crée la version optimisée pour la production |
| `npm run preview` | Teste le build de production localement |
| `npm run lint` | Vérifie la qualité du code |
| `npx shadcn@latest add [composant]` | Ajoute un composant shadcn/ui |

---

## Configuration shadcn/ui (optionnel)

Pour ajouter des composants shadcn/ui (boutons, dialogs, etc.) :

```bash
npx shadcn@latest add card
npx shadcn@latest add button
npx shadcn@latest add input
```

Voir tous les composants : https://ui.shadcn.com/docs/components

---

## Dépannage

### `npm install` échoue
- Supprimer `node_modules/` et `package-lock.json`
- Relancer `npm install`

### Port 5173 déjà utilisé
- Modifier le port dans `vite.config.js` ou
- Tuer le processus sur le port 5173

### Les imports avec `@/` ne fonctionnent pas
- Vérifier que `jsconfig.json` existe
- Redémarrer VS Code
