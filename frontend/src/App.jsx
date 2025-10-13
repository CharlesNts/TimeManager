import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DemoPage from './pages/DemoPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import CEODashboard from './pages/CEODashboard';
import TeamsList from './pages/TeamsList';
import TeamDetail from './pages/TeamDetail';
import ProfilePage from './pages/ProfilePage';
import UsersListPage from './pages/UsersListPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Router pour le dashboard - redirige selon le rôle
 */
function DashboardRouter() {
  const { user } = useAuth();
  
  if (user?.role === 'CEO') {
    return <CEODashboard />;
  } else if (user?.role === 'MANAGER') {
    return <ManagerDashboard />;
  } else {
    return <EmployeeDashboard />;
  }
}

/**
 * Composant App - Point d'entrée avec le système de routing
 * 
 * Routes disponibles:
 * - /login : Connexion
 * - /register : Inscription
 * - /forgot-password : Demande de réinitialisation mot de passe
 * - /reset-password?token=xxx : Réinitialisation mot de passe avec token
 * - /dashboard : Dashboard (redirige selon le rôle)
 * - /teams : Liste des équipes (Manager/CEO uniquement)
 * - /teams/:teamId : Détails d'une équipe (Manager/CEO uniquement)
 * - /profile : Profil utilisateur (tous les utilisateurs authentifiés)
 * - /users : Gestion des utilisateurs (CEO uniquement)
 * - /demo : Page de démonstration des composants
 * - / : Redirige vers /dashboard par défaut
 * - * : Page 404
 * 
 * Les routes protégées utilisent ProtectedRoute avec allowedRoles
 * L'authentification est gérée par AuthContext
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Authentification - Pages publiques */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Dashboards spécifiques par rôle */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardRouter />
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
