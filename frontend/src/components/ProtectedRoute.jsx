// src/routes/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // tant que l'init d'auth n'est pas finie, ne pas rediriger
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If allowedRoles is provided, ensure the user's role is included
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Accès refusé</h2>
            <p className="text-sm text-gray-600 mb-4">Vous n&apos;avez pas la permission d&apos;accéder à cette page.</p>
          </div>
        </div>
      );
    }
  }

  return children;
}