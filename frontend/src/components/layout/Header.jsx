// src/components/layout/Header.jsx
import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  const handleProfileClick = () => {
    navigate('/profile');
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
