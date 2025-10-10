// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext } from 'react';

/**
 * AuthContext - Contexte d'authentification
 * 
 * Fournit les informations de l'utilisateur connecté et les méthodes d'authentification.
 * 
 * ACTUELLEMENT : Utilise des données mockées pour le développement
 * PLUS TARD : Sera connecté aux services/authService.js pour les vraies données du backend
 * 
 * Usage:
 * const { user, login, logout, isAuthenticated } = useAuth();
 */

const AuthContext = createContext(null);

/**
 * Hook pour accéder au contexte d'authentification
 * Doit être utilisé dans un composant wrappé par AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};

/**
 * AuthProvider - Provider du contexte d'authentification
 * 
 * Props:
 * - children: Les composants enfants
 */
export const AuthProvider = ({ children }) => {
  // MOCK : Utilisateur connecté par défaut
  // Plus tard : cet état sera initialisé depuis le localStorage ou un appel API
  const [user, setUser] = useState({
    id: 1,
    username: 'jonathan.gromat',
    firstName: 'Jonathan',
    lastName: 'GROMAT',
    email: 'jonathan.gromat@example.com',
    role: 'EMPLOYEE', // EMPLOYEE | MANAGER | CEO
    avatar: null,
    teamId: 1 // Pour les managers/employés
  });

  /**
   * Simule une connexion
   * Plus tard : appellera authService.login(credentials)
   */
  const login = async (credentials) => {
    // MOCK : Simulation de connexion
    console.log('🔐 Mock Login:', credentials);
    
    // Exemple de changement de rôle pour tester
    // Décommenter pour tester différents rôles :
    
    // setUser({ ...user, role: 'EMPLOYEE' });
    // setUser({ ...user, role: 'MANAGER' });
    // setUser({ ...user, role: 'CEO' });
    
    return { success: true };
  };

  /**
   * Simule une déconnexion
   * Plus tard : appellera authService.logout()
   */
  const logout = () => {
    // MOCK : Simulation de déconnexion
    console.log('🔓 Mock Logout');
    setUser(null);
  };

  /**
   * Simule une inscription
   * Plus tard : appellera authService.register(data)
   */
  const register = async (data) => {
    // MOCK : Simulation d'inscription
    console.log('📝 Mock Register:', data);
    return { success: true };
  };

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  const isAuthenticated = user !== null;

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   */
  const hasRole = (role) => {
    return user?.role === role;
  };

  /**
   * Vérifie si l'utilisateur a au moins un des rôles spécifiés
   */
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  /**
   * Change le rôle de l'utilisateur (UNIQUEMENT POUR LE DEV/TEST)
   * À SUPPRIMER ou désactiver en production
   */
  const changeRole = (newRole) => {
    console.log(`🔄 Changement de rôle: ${user?.role} → ${newRole}`);
    setUser({ ...user, role: newRole });
  };

  const value = {
    user,
    login,
    logout,
    register,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    changeRole, // Helper pour tester différents rôles
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
