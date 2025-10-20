import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import CEODashboard from './pages/CEODashboard';
import TeamsList from './pages/TeamsList';
import TeamDetail from './pages/TeamDetail';
import ProfilePage from './pages/ProfilePage';
import UsersListPage from './pages/UsersListPage';
import CreateUserPage from './pages/CreateUserPage';
import ScheduleTemplatesPage from './pages/ScheduleTemplatesPage';
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
 * - /my-clocks : Dashboard personnel / Mes pointages (page par défaut)
 * - /dashboard-manager : Dashboard Manager (Manager uniquement)
 * - /dashboard-ceo : Dashboard CEO (CEO uniquement)
 * - /teams : Liste des équipes (Manager/CEO uniquement)
 * - /teams/:teamId : Détails d'une équipe (Manager/CEO uniquement)
 * - /profile : Profil utilisateur (tous les utilisateurs authentifiés)
 * - /users : Gestion des utilisateurs (CEO uniquement)
 
 * - / : Redirige vers /my-clocks par défaut
 * - * : Page 404
 * 
 * Les routes protégées utilisent ProtectedRoute avec allowedRoles
 * L'authentification est gérée par AuthContext
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          {/* Authentification - Pages publiques */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Dashboard personnel / Mes pointages - Page par défaut - Accessible à tous */}
          <Route 
            path="/my-clocks" 
            element={
              <ProtectedRoute>
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Dashboard Manager - Manager uniquement */}
          <Route 
            path="/dashboard-manager" 
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <ManagerDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Dashboard CEO - CEO uniquement */}
          <Route 
            path="/dashboard-ceo" 
            element={
              <ProtectedRoute allowedRoles={['CEO']}>
                <CEODashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Dashboard d'un employé spécifique - Manager/CEO uniquement */}
          <Route 
            path="/employee/:userId/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'CEO']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Liste des équipes - CEO uniquement */}
          <Route 
            path="/teams" 
            element={
              <ProtectedRoute allowedRoles={['CEO']}>
                <TeamsList />
              </ProtectedRoute>
            } 
          />
          
          {/* Détails d'une équipe - accessible aux utilisateurs authentifiés (membres/managers/CEO) */}
          <Route 
            path="/teams/:teamId" 
            element={
              <ProtectedRoute>
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
          
          {/* Création d'utilisateur - CEO uniquement */}
          <Route
            path="/users/create"
            element={
              <ProtectedRoute allowedRoles={['CEO']}>
                <CreateUserPage />
              </ProtectedRoute>
            }
          />

          {/* Gestion des plannings - Manager uniquement */}
          <Route
            path="/schedule-templates"
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <ScheduleTemplatesPage />
              </ProtectedRoute>
            }
          />

          {/* Redirection par défaut vers /my-clocks */}
          <Route path="/" element={<Navigate to="/my-clocks" replace />} />
          
          {/* Route 404 - Page non trouvée */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
