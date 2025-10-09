import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DemoPage from './pages/DemoPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import TeamsList from './pages/TeamsList';

/**
 * Composant App - Point d'entrée avec le système de routing
 * 
 * Routes disponibles:
 * - /dashboard : Dashboard employé
 * - /teams : Liste des équipes (Manager/CEO)
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
        {/* Dashboard employé - Page principale */}
        <Route path="/dashboard" element={<EmployeeDashboard />} />
        
        {/* Liste des équipes - Manager/CEO */}
        <Route path="/teams" element={<TeamsList />} />
        
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
