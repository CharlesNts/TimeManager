// src/components/layout/Sidebar.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  BarChart3, 
  FileText, 
  Send, 
  Bell, 
  Grid3x3 
} from 'lucide-react';

/**
 * Composant Sidebar réutilisable avec navigation React Router
 * 
 * Props:
 * - items: Array d'objets représentant les liens de navigation
 *   Chaque objet doit avoir: { icon: Component, label: string, path: string }
 * 
 * Le composant détecte automatiquement quelle page est active via l'URL
 * 
 * Exemple d'utilisation:
 * <Sidebar items={[
 *   { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
 *   { icon: Users, label: "Équipes", path: "/teams" }
 * ]} />
 */
export default function Sidebar({ items = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-16 bg-black flex flex-col items-center py-6 space-y-8">
      {/* Logo en haut */}
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
        <span className="text-black font-bold text-sm">PB</span>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 flex flex-col space-y-4">
        {items.map((item, index) => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${isActive
                  ? 'bg-white text-black' 
                  : 'text-white'
                }
              `}
              title={item.label}
            >
              <IconComponent className="w-5 h-5" />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
