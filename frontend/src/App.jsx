import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DemoPage from './pages/DemoPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import TeamsList from './pages/TeamsList';
import TeamDetail from './pages/TeamDetail';
import ProfilePage from './pages/ProfilePage';

/**
 * Composant App - Point d'entrée avec le système de routing
 * 
 * Routes disponibles:
 * - /login : Connexion
 * - /register : Inscription
 * - /dashboard : Dashboard employé
 * - /teams : Liste des équipes (Manager/CEO)
 * - /teams/:teamId : Détails d'une équipe
 * - /profile : Profil utilisateur
 * - /demo : Page de démonstration des composants
 * - / : Redirige vers /dashboard par défaut
 * 
 * Pour ajouter une nouvelle route:
 * <Route path="/ma-page" element={<MaPage />} />
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentification */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Dashboard employé - Page principale */}
        <Route path="/dashboard" element={<EmployeeDashboard />} />
        
        {/* Liste des équipes - Manager/CEO */}
        <Route path="/teams" element={<TeamsList />} />
        
        {/* Détails d'une équipe */}
        <Route path="/teams/:teamId" element={<TeamDetail />} />
        
        {/* Profil utilisateur */}
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Page de démo des composants */}
        <Route path="/demo" element={<DemoPage />} />
        
        {/* Redirection par défaut vers /dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Route 404 - redirige vers /dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
