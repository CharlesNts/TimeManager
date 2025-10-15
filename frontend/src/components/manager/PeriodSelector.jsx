// src/components/manager/PeriodSelector.jsx
import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * PeriodSelector - Sélecteur de période pour les statistiques
 * 
 * Permet de filtrer les données sur différentes périodes :
 * - 7 jours (semaine)
 * - 30 jours (mois)
 * - 365 jours (année)
 * 
 * Props:
 * - selectedPeriod: La période actuellement sélectionnée (7 | 30 | 365)
 * - onPeriodChange: Callback appelée quand la période change
 * 
 * Usage:
 * <PeriodSelector 
 *   selectedPeriod={period}
 *   onPeriodChange={(days) => setPeriod(days)}
 * />
 */
const PeriodSelector = ({ selectedPeriod = 7, onPeriodChange }) => {
  const periods = [
    { days: 7, label: '7 jours' },
    { days: 30, label: '30 jours' },
    { days: 365, label: '1 an' }
  ];

  return (
    <div className="flex items-center space-x-2">
      <Calendar className="w-5 h-5 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">Période :</span>
      <div className="flex space-x-2">
        {periods.map((period) => (
          <Button
            key={period.days}
            onClick={() => onPeriodChange(period.days)}
            variant={selectedPeriod === period.days ? "default" : "outline"}
            size="sm"
          >
            {period.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default PeriodSelector;
