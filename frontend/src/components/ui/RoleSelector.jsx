// src/components/ui/RoleSelector.jsx
import React from 'react';
import { UserCircle } from 'lucide-react';

/**
 * Composant RoleSelector - Sélecteur de rôle pour testing
 * 
 * Permet de simuler différents rôles utilisateur pendant le développement
 * À RETIRER en production (remplacé par authentification réelle)
 * 
 * Props:
 * - currentRole: 'NON_INSCRIT' | 'EMPLOYEE' | 'MANAGER' | 'CEO'
 * - onRoleChange: Function - Appelée quand on change de rôle
 * - currentUserId: Number - ID utilisateur actuel
 * - onUserIdChange: Function - Appelée quand on change d'ID
 */
export default function RoleSelector({ 
  currentRole, 
  onRoleChange,
  currentUserId,
  onUserIdChange 
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 shadow-lg">
      <div className="flex items-center space-x-3">
        <UserCircle className="w-5 h-5 text-yellow-700" />
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-yellow-900">Voir en tant que:</span>
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="px-3 py-1 border border-yellow-400 rounded bg-white text-sm font-medium focus:ring-2 focus:ring-yellow-500"
          >
            <option value="NON_INSCRIT">Non inscrit</option>
            <option value="EMPLOYEE">Employé</option>
            <option value="MANAGER">Manager</option>
            <option value="CEO">CEO</option>
          </select>
        </div>
        {currentRole !== 'NON_INSCRIT' && (
          <div className="flex items-center space-x-2 border-l border-yellow-400 pl-3">
            <span className="text-xs text-yellow-800">User ID:</span>
            <input
              type="number"
              value={currentUserId}
              onChange={(e) => onUserIdChange(parseInt(e.target.value))}
              className="w-16 px-2 py-1 border border-yellow-400 rounded bg-white text-sm"
              min="1"
              max="10"
            />
          </div>
        )}
        <div className="border-l border-yellow-400 pl-3">
          <span className="text-xs font-bold text-yellow-900 bg-yellow-200 px-2 py-1 rounded">
            DEV MODE
          </span>
        </div>
      </div>
    </div>
  );
}
