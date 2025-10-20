// src/components/layout/Header.jsx
import React from 'react';
import { Bell, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

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
  userAvatar = null,
  notifications = [],
  onMarkNotificationRead = null
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  // Compter les notifications non lues
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Obtenir les initiales de l'utilisateur
  const getInitials = (name) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Mapper les rôles à des variants de badge
  const getRoleBadgeVariant = (role) => {
    switch(role?.toUpperCase()) {
      case 'CEO': return 'default';
      case 'MANAGER': return 'secondary';
      case 'EMPLOYEE': return 'outline';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role) => {
    switch(role?.toUpperCase()) {
      case 'CEO': return 'CEO';
      case 'MANAGER': return 'Manager';
      case 'EMPLOYEE': return 'Employé';
      default: return role;
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40 backdrop-blur">
      <div className="flex items-center justify-between">
        {/* Logo / Nom de l'application */}
        <div className="flex items-center gap-3">
          <img 
            src="/images/PrimeBank-Logo.png" 
            alt="PrimeBank" 
            className="h-10 object-contain"
            onError={(e) => {
              // Fallback si l'image n'est pas trouvée
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
          <div className="flex items-center gap-3 hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">PrimeBank</h1>
              <p className="text-xs text-gray-500">Time Manager</p>
            </div>
          </div>
        </div>

        {/* Partie droite: Notifications + Profil utilisateur */}
        <div className="flex items-center gap-3">
          
          {/* Dropdown de notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="relative"
              >
                <Bell className="w-4 h-4" />
                {/* Badge de notification */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  🔔 Notifications temporairement indisponibles
                  <p className="text-xs text-gray-400 mt-1">
                    Le système de notifications nécessite une implémentation complète dans le backend.
                  </p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => onMarkNotificationRead && onMarkNotificationRead(notification.id)}
                    >
                      <div className="flex items-start gap-2 w-full">
                        <span className="text-lg">{notification.icon}</span>
                        <div className="flex-1">
                          <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.time}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown menu utilisateur avec shadcn */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-3 h-auto py-2 px-3 hover:bg-slate-100"
              >
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-gray-900">{userName}</p>
                  {userRole && (
                    <Badge 
                      variant={getRoleBadgeVariant(userRole)} 
                      className="text-xs mt-0.5"
                    >
                      {getRoleLabel(userRole)}
                    </Badge>
                  )}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-semibold">{userName}</p>
                  {userRole && (
                    <p className="text-xs font-normal text-muted-foreground mt-1">
                      {getRoleLabel(userRole)}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                <span>Mon profil</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Se déconnecter</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
