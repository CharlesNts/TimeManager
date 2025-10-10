// src/components/layout/Header.jsx
import React, { useState } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Composant Header réutilisable
 * 
 * Props:
 * - title: Titre de la page (ex: "Mon dashboard", "Liste équipes")
 * - userName: Nom de l'utilisateur connecté
 * - userRole: Rôle de l'utilisateur (optionnel, ex: "Manager")
 * - userAvatar: URL de l'avatar (optionnel)
 * 
 * Exemple:
 * <Header 
 *   title="Mon dashboard" 
 *   userName="Jonathan GROMAT" 
 *   userRole="Manager"
 * />
 */
export default function Header({ 
  title = "Dashboard", 
  userName = "Utilisateur", 
  userRole = null,
  userAvatar = null 
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { changeRole, user } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const handleProfileClick = () => {
    navigate('/profile');
  };

  // Vérifier si on est sur login ou register
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // Liste des rôles disponibles
  const roles = [
    { value: 'EMPLOYEE', label: 'Employé', icon: '👤' },
    { value: 'MANAGER', label: 'Manager', icon: '👔' },
    { value: 'CEO', label: 'CEO', icon: '👑' }
  ];

  const handleRoleChange = (newRole) => {
    changeRole(newRole);
    setShowRoleMenu(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      {/* Titre de la page */}
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>

      {/* Partie droite: Notifications + Profil utilisateur */}
      <div className="flex items-center space-x-4">
        
        {/* Sélecteur de rôle DEV (uniquement si pas sur login/register) */}
        {!isAuthPage && (
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
              title="Changer de rôle (DEV uniquement)"
            >
              <span>🔧 {user?.role || 'EMPLOYEE'}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Dropdown menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="px-3 py-2 border-b border-gray-200">
                  <p className="text-xs text-gray-500 font-medium">Mode développement</p>
                </div>
                {roles.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => handleRoleChange(role.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 ${
                      user?.role === role.value ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span>{role.icon}</span>
                    <span>{role.label}</span>
                    {user?.role === role.value && <span className="ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Icône de notification */}
        <button className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </button>

        {/* Profil utilisateur - Cliquable */}
        <button 
          onClick={handleProfileClick}
          className="flex items-center space-x-3 bg-black rounded-full px-4 py-2 cursor-pointer"
        >
          <span className="text-white font-medium text-sm">{userName}</span>
          
          {/* Avatar */}
          <div className="w-8 h-8 bg-white rounded-full overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
