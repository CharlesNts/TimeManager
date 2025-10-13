// src/components/layout/Header.jsx
import React, { useState } from 'react';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const { logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleProfileClick = () => {
    navigate('/profile');
    setShowUserMenu(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      {/* Titre de la page */}
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>

      {/* Partie droite: Notifications + Profil utilisateur */}
      <div className="flex items-center space-x-4">
        
        {/* Icône de notification */}
        <button className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </button>

        {/* Profil utilisateur - Dropdown avec menu */}
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 bg-black rounded-full px-4 py-2 cursor-pointer hover:bg-gray-800 transition"
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
            
            <ChevronDown className="w-4 h-4 text-white" />
          </button>

          {/* Dropdown menu utilisateur */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                {userRole && <p className="text-xs text-gray-500">{userRole}</p>}
              </div>
              
              <button
                onClick={handleProfileClick}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Mon profil</span>
              </button>
              
              <div className="border-t border-gray-200"></div>
              
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 rounded-b-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
