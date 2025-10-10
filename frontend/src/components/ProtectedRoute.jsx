// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute - Composant pour protéger les routes selon les rôles
 * 
 * Vérifie si l'utilisateur est authentifié et a le(s) bon(s) rôle(s)
 * Redirige vers /login si non authentifié
 * Redirige vers /dashboard si authentifié mais sans le bon rôle
 * 
 * Props:
 * - children: Le composant à afficher si l'accès est autorisé
 * - allowedRoles: Array des rôles autorisés (ex: ['MANAGER', 'CEO'])
 * - redirectTo: Chemin de redirection personnalisé (optionnel)
 * 
 * Usage:
 * <ProtectedRoute allowedRoles={['MANAGER', 'CEO']}>
 *   <TeamsList />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/dashboard' 
}) => {
  const { user, isAuthenticated } = useAuth();

  // Si pas authentifié, rediriger vers login
  if (!isAuthenticated) {
    console.log('⚠️ ProtectedRoute: Non authentifié, redirection vers /login');
    return <Navigate to="/login" replace />;
  }

  // Si pas de rôles spécifiés, autoriser tous les utilisateurs authentifiés
  if (allowedRoles.length === 0) {
    return children;
  }

  // Vérifier si l'utilisateur a un des rôles autorisés
  const hasAccess = allowedRoles.includes(user.role);

  if (!hasAccess) {
    console.log(`⚠️ ProtectedRoute: Rôle ${user.role} non autorisé. Rôles requis:`, allowedRoles);
    return <Navigate to={redirectTo} replace />;
  }

  // Accès autorisé
  return children;
};

export default ProtectedRoute;
