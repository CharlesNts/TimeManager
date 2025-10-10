// src/utils/navigationConfig.js
import { 
  LayoutDashboard, 
  Users, 
  UserCircle,
  UserCog
} from 'lucide-react';

/**
 * Configuration de la navigation selon les rôles
 * 
 * Définit quels éléments de la sidebar sont visibles pour chaque rôle
 */

/**
 * Items de navigation par rôle
 * Chaque rôle a accès à certaines sections de l'application
 */
const navigationByRole = {
  EMPLOYEE: [
    { 
      icon: LayoutDashboard, 
      label: "Dashboard", 
      path: "/dashboard"
    },
    { 
      icon: UserCircle, 
      label: "Profil", 
      path: "/profile"
    }
  ],
  MANAGER: [
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
    }
  ],
  CEO: [
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
    }
  ]
};

/**
 * Retourne les items de navigation selon le rôle de l'utilisateur
 * 
 * @param {string} role - Le rôle de l'utilisateur (EMPLOYEE | MANAGER | CEO)
 * @returns {Array} Les items de navigation autorisés pour ce rôle
 * 
 * Usage:
 * const sidebarItems = getSidebarItems(user.role);
 */
export const getSidebarItems = (role) => {
  return navigationByRole[role] || navigationByRole.EMPLOYEE;
};

/**
 * Vérifie si un utilisateur a accès à une route spécifique
 * 
 * @param {string} role - Le rôle de l'utilisateur
 * @param {string} path - Le chemin de la route
 * @returns {boolean} True si l'utilisateur a accès à cette route
 */
export const hasAccessToRoute = (role, path) => {
  const items = getSidebarItems(role);
  return items.some(item => path.startsWith(item.path));
};

/**
 * Définition des rôles et leurs permissions
 */
export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  CEO: 'CEO'
};

/**
 * Routes protégées et leurs rôles autorisés
 */
export const PROTECTED_ROUTES = {
  '/teams': ['MANAGER', 'CEO'],
  '/users': ['CEO']
};

export default {
  getSidebarItems,
  hasAccessToRoute,
  ROLES,
  PROTECTED_ROUTES
};
