import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DemoPage from './pages/DemoPage';

/**
 * Composant App - Point d'entrée avec le système de routing
 * 
 * Routes disponibles:
 * - /demo : Page de démonstration des composants
 * - / : Redirige vers /demo par défaut
 * 
 * Pour ajouter une nouvelle route:
 * <Route path="/ma-page" element={<MaPage />} />
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Page de démo des composants */}
        <Route path="/demo" element={<DemoPage />} />
        
        {/* Redirection par défaut vers /demo */}
        <Route path="/" element={<Navigate to="/demo" replace />} />
        
        {/* Route 404 - redirige aussi vers /demo pour l'instant */}
        <Route path="*" element={<Navigate to="/demo" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
