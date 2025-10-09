// src/components/layout/Sidebar.jsx
import React from 'react';
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
 * Composant Sidebar réutilisable
 * 
 * Props:
 * - items: Array d'objets représentant les liens de navigation
 *   Chaque objet doit avoir: { icon: Component, label: string, active: boolean, onClick: function }
 * 
 * Exemple d'utilisation:
 * <Sidebar items={[
 *   { icon: LayoutDashboard, label: "Dashboard", active: true, onClick: () => {} },
 *   { icon: Users, label: "Équipes", active: false, onClick: () => {} }
 * ]} />
 */
export default function Sidebar({ items = [] }) {
  return (
    <aside className="w-16 bg-blue-600 flex flex-col items-center py-6 space-y-8">
      {/* Logo en haut */}
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
        <span className="text-blue-600 font-bold text-sm">PB</span>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 flex flex-col space-y-4">
        {items.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <button
              key={index}
              onClick={item.onClick}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                ${item.active 
                  ? 'bg-white text-blue-600' 
                  : 'text-white hover:bg-blue-500'
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
