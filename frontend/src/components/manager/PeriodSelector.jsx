// src/components/manager/PeriodSelector.jsx
import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * PeriodSelector - Sélecteur de granularité pour les statistiques
 *
 * Permet de filtrer les données par granularité :
 * - Jour: 7 derniers jours (1 point par jour)
 * - Semaine: 4 dernières semaines (1 point par semaine)
 * - Mois: 12 derniers mois (1 point par mois)
 * - Année: 5 dernières années (1 point par année)
 *
 * Props:
 * - selectedGranularity: 'day' | 'week' | 'month' | 'year'
 * - onGranularityChange: Callback appelée quand la granularité change
 *
 * Usage:
 * <PeriodSelector
 *   selectedGranularity={granularity}
 *   onGranularityChange={(type) => setGranularity(type)}
 * />
 */
const PeriodSelector = ({ selectedGranularity = 'week', onGranularityChange }) => {
  const granularities = [
    { type: 'day', label: 'Jour' },
    { type: 'week', label: 'Semaine' },
    { type: 'month', label: 'Mois' },
    { type: 'year', label: 'Année' }
  ];

  return (
    <div className="flex items-center space-x-2">
      <Calendar className="w-5 h-5 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">Granularité :</span>
      <div className="flex space-x-2">
        {granularities.map((g) => (
          <Button
            key={g.type}
            onClick={() => onGranularityChange(g.type)}
            variant={selectedGranularity === g.type ? "default" : "outline"}
            size="sm"
          >
            {g.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default PeriodSelector;
