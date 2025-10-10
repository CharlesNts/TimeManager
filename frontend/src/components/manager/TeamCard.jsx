// src/components/manager/TeamCard.jsx
import React from 'react';
import { Users, UserCircle, ArrowRight, Edit, Trash2 } from 'lucide-react';

/**
 * Composant TeamCard - Carte affichant les informations d'une équipe
 * 
 * Props:
 * - teamName: Nom de l'équipe (Teams.name)
 * - description: Description de l'équipe (Teams.description)
 * - memberCount: Nombre de membres (calculé via TeamMember)
 * - managerName: Nom du manager (User.firstName + lastName)
 * - onClick: Fonction appelée au clic sur "Voir détails"
 * - onEdit: Fonction appelée au clic sur "Modifier" (optionnel, pour CEO/Manager)
 * - onDelete: Fonction appelée au clic sur "Supprimer" (optionnel, pour CEO)
 * - showActions: Boolean pour afficher les boutons d'action (optionnel)
 * 
 * Note: avgHours et trend seront calculés côté backend via les Clocks
 * 
 * Exemple:
 * <TeamCard 
 *   teamName="Équipe Dev" 
 *   description="Développement logiciel"
 *   memberCount={8} 
 *   managerName="Jean Dupont"
 *   onClick={() => console.log("Voir équipe")}
 *   onEdit={() => console.log("Modifier équipe")}
 *   onDelete={() => console.log("Supprimer équipe")}
 *   showActions={true}
 * />
 */
export default function TeamCard({ 
  teamName, 
  description,
  memberCount, 
  managerName,
  onClick,
  onEdit,
  onDelete,
  showActions = false
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header de la carte */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{teamName}</h3>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        
        {/* Actions (Modifier/Supprimer) */}
        {showActions ? (
          <div className="flex items-center space-x-2 ml-4">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Modifier l'équipe"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer l'équipe"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center ml-4">
            <Users className="w-6 h-6 text-gray-600" />
          </div>
        )}
      </div>

      {/* Infos de l'équipe */}
      <div className="space-y-3 mb-4">
        {/* Nombre de membres */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Membres
          </span>
          <span className="text-sm font-medium text-gray-900">
            {memberCount} {memberCount > 1 ? 'personnes' : 'personne'}
          </span>
        </div>

        {/* Manager */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center">
            <UserCircle className="w-4 h-4 mr-2" />
            Manager
          </span>
          <span className="text-sm font-medium text-gray-900">{managerName}</span>
        </div>
      </div>

      {/* Bouton Voir détails */}
      <button
        onClick={onClick}
        className="w-full flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg font-medium text-sm"
      >
        Voir détails
        <ArrowRight className="w-4 h-4 ml-2" />
      </button>
    </div>
  );
}
