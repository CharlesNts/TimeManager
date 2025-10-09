// src/components/employee/ClockActions.jsx
import React, { useState } from 'react';
import { Clock, LogIn, LogOut, Coffee } from 'lucide-react';

/**
 * Composant ClockActions - Zone d'actions pour pointer
 * 
 * Affiche:
 * - Le statut actuel (au travail, en pause, ou hors service)
 * - L'heure du dernier pointage
 * - Boutons Clock In / Clock Out / Pause
 * 
 * Pour l'instant en mode démo (données statiques)
 * Plus tard, ce composant appellera l'API via les services
 */
export default function ClockActions() {
  // États locaux pour simuler le statut (en mode démo)
  // Plus tard, ces données viendront d'un Context ou d'un Hook
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  // Fonction pour gérer le Clock In
  const handleClockIn = () => {
    const now = new Date();
    setIsClockedIn(true);
    setIsOnBreak(false);
    setLastAction({
      type: 'in',
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
    // Plus tard: appel API pour enregistrer le pointage
  };

  // Fonction pour gérer le Clock Out
  const handleClockOut = () => {
    const now = new Date();
    setIsClockedIn(false);
    setIsOnBreak(false);
    setLastAction({
      type: 'out',
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
    // Plus tard: appel API pour enregistrer le pointage
  };

  // Fonction pour gérer le début/fin de pause
  const handleBreak = () => {
    const now = new Date();
    setIsOnBreak(!isOnBreak);
    setLastAction({
      type: isOnBreak ? 'break-end' : 'break-start',
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
    // Plus tard: appel API pour enregistrer la pause
  };

  // Déterminer le statut actuel
  const getStatus = () => {
    if (!isClockedIn) return { label: 'Hors service', color: 'bg-gray-100 text-gray-800' };
    if (isOnBreak) return { label: 'En pause', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Au travail', color: 'bg-black text-white' };
  };

  const status = getStatus();

  // Label du dernier pointage
  const getLastActionLabel = () => {
    if (!lastAction) return null;
    switch (lastAction.type) {
      case 'in': return 'Arrivée';
      case 'out': return 'Départ';
      case 'break-start': return 'Début de pause';
      case 'break-end': return 'Fin de pause';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-gray-900" />
        Actions de pointage
      </h2>

      {/* Statut actuel */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Statut actuel :</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Dernier pointage */}
        {lastAction && (
          <div className="mt-3 text-sm text-gray-500">
            Dernier pointage : {getLastActionLabel()} à {lastAction.time}
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="grid grid-cols-2 gap-3">
        {/* Clock In */}
        <button
          onClick={handleClockIn}
          disabled={isClockedIn}
          className={`
            flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors
            ${isClockedIn
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
            }
          `}
        >
          <LogIn className="w-5 h-5 mr-2" />
          Arrivée
        </button>

        {/* Clock Out */}
        <button
          onClick={handleClockOut}
          disabled={!isClockedIn}
          className={`
            flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors
            ${!isClockedIn
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-800 text-white hover:bg-gray-700'
            }
          `}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Départ
        </button>
      </div>

      {/* Bouton Pause (pleine largeur) */}
      <button
        onClick={handleBreak}
        disabled={!isClockedIn}
        className={`
          w-full mt-3 flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors
          ${!isClockedIn
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isOnBreak
            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
            : 'bg-white text-gray-900 border-2 border-gray-900 hover:bg-gray-50'
          }
        `}
      >
        <Coffee className="w-5 h-5 mr-2" />
        {isOnBreak ? 'Terminer la pause' : 'Prendre une pause'}
      </button>

      {/* Info supplémentaire */}
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <p className="text-xs text-gray-700">
          💡 N'oubliez pas de pointer vos pauses pour un suivi précis.
        </p>
      </div>
    </div>
  );
}
