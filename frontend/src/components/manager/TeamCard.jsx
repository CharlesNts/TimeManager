// src/components/manager/TeamCard.jsx
import React from 'react';
import { Users, Clock, TrendingUp, ArrowRight } from 'lucide-react';

/**
 * Composant TeamCard - Carte affichant les informations d'une équipe
 * 
 * Props:
 * - teamName: Nom de l'équipe
 * - memberCount: Nombre de membres
 * - avgHours: Moyenne d'heures hebdomadaires
 * - trend: Tendance (ex: "+5%")
 * - onClick: Fonction appelée au clic sur "Voir détails"
 * 
 * Exemple:
 * <TeamCard 
 *   teamName="Équipe Dev" 
 *   memberCount={8} 
 *   avgHours="35h 30m"
 *   trend="+3.2%"
 *   onClick={() => console.log("Voir équipe")}
 * />
 */
export default function TeamCard({ 
  teamName, 
  memberCount, 
  avgHours, 
  trend,
  onClick 
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header de la carte */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{teamName}</h3>
          <p className="text-sm text-gray-500 mt-1 flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {memberCount} {memberCount > 1 ? 'membres' : 'membre'}
          </p>
        </div>
        
        {/* Icône d'équipe */}
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <Users className="w-6 h-6 text-gray-600" />
        </div>
      </div>

      {/* Stats de l'équipe */}
      <div className="space-y-3 mb-4">
        {/* Moyenne d'heures */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Moy. hebdomadaire
          </span>
          <span className="text-sm font-medium text-gray-900">{avgHours}</span>
        </div>

        {/* Tendance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Tendance
          </span>
          <span className={`text-sm font-medium ${
            trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend}
          </span>
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
