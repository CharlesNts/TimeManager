import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DemoPage from './pages/DemoPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import TeamsList from './pages/TeamsList';
import TeamDetail from './pages/TeamDetail';
import ProfilePage from './pages/ProfilePage';
import UsersListPage from './pages/UsersListPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Composant App - Point d'entrée avec le système de routing
 * 
 * Routes disponibles:
 * - /login : Connexion
 * - /register : Inscription
 * - /dashboard : Dashboard employé (tous les utilisateurs authentifiés)
 * - /teams : Liste des équipes (Manager/CEO uniquement)
 * - /teams/:teamId : Détails d'une équipe (Manager/CEO uniquement)
 * - /profile : Profil utilisateur (tous les utilisateurs authentifiés)
 * - /users : Gestion des utilisateurs (CEO uniquement)
 * - /demo : Page de démonstration des composants
 * - / : Redirige vers /dashboard par défaut
 * - * : Page 404
 * 
 * Les routes protégées utilisent ProtectedRoute avec allowedRoles
 * L'authentification est gérée par AuthContext (actuellement avec données mockées)
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Authentification - Pages publiques */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Dashboard employé - Tous les utilisateurs authentifiés */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Liste des équipes - Manager/CEO uniquement */}
          <Route 
            path="/teams" 
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'CEO']}>
                <TeamsList />
              </ProtectedRoute>
            } 
          />
          
          {/* Détails d'une équipe - Manager/CEO uniquement */}
          <Route 
            path="/teams/:teamId" 
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'CEO']}>
                <TeamDetail />
              </ProtectedRoute>
            } 
          />
          
          {/* Profil utilisateur - Tous les utilisateurs authentifiés */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          
          {/* Gestion des utilisateurs - CEO uniquement */}
          <Route 
            path="/users" 
            element={
              <ProtectedRoute allowedRoles={['CEO']}>
                <UsersListPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Page de démo des composants - Public */}
          <Route path="/demo" element={<DemoPage />} />
          
          {/* Redirection par défaut vers /dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Route 404 - Page non trouvée */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
