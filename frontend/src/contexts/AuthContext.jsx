// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l’intérieur d’un AuthProvider');
  }
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { id, firstName, lastName, email, role, ... }
  const [loading, setLoading] = useState(true);

  // Charge l’utilisateur connecté à partir du JWT présent dans localStorage
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setUser(null);
          return;
        }
        const { data } = await api.get('/auth/me');
        // Check if account is active
        // if (!data.active) {
        //   localStorage.removeItem('access_token');
        //   localStorage.removeItem('token_type');
        //   localStorage.removeItem('expires_in');
        //   setUser(null);
        //   return;
        // }
        setUser(data);
      } catch (err) {
        // Token invalide/expiré → on nettoie et on repart propre
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_type');
        localStorage.removeItem('expires_in');
        setUser(null);
        console.warn('[AuthContext] /auth/me:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // À appeler après /auth/login :
  // 1) stocker le token dans localStorage
  // 2) GET /auth/me
  // 3) setUser(me.data) —> pas besoin de reload
  const login = (userData) => setUser(userData);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('expires_in');
    setUser(null);
  };

  const isAuthenticated = !!user;
  const hasRole = (role) => user?.role === role;
  const hasAnyRole = (roles) => !!user && roles.includes(user.role);

  const value = {
    user,
    setUser,      // utile après /auth/me dans LoginPage
    login,        // optionnel si tu préfères: setUser(me.data)
    logout,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    loading,
  };

  // On ne rend pas l’app tant que /auth/me n’a pas répondu (évite les flickers de routes protégées)
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthContext;