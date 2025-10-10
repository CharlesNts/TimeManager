// src/components/employee/ClockHistory.jsx
import React from 'react';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

/**
 * Composant ClockHistory - Historique des pointages avec détection de retards
 * 
 * Affiche un tableau avec:
 * - Date
 * - Heure d'arrivée (clockIn)
 * - Heure de départ (clockOut)
 * - Durée totale calculée
 * - Retard (calculé selon les horaires de l'équipe)
 * - Statut: "Terminé", "En cours", ou "Retard"
 * 
 * Props:
 * - period: Nombre de jours à afficher (7, 30, 365)
 * 
 * Règle métier :
 * - Horaires équipe : workStartTime (ex: 09:00)
 * - Retard si clockIn > workStartTime
 * 
 * Pour l'instant avec des données de démo
 * Plus tard, les données viendront de l'API basée sur la table Clocks
 */
export default function ClockHistory({ period = 7 }) {
  // Horaires de l'équipe (plus tard viendront de l'API via le contexte)
  const teamSchedule = {
    workStartTime: '09:00',
    workEndTime: '17:30'
  };

  // Fonction pour calculer le retard
  const calculateDelay = (clockIn) => {
    const [clockHour, clockMin] = clockIn.split(':').map(Number);
    const [scheduleHour, scheduleMin] = teamSchedule.workStartTime.split(':').map(Number);
    
    const clockInMinutes = clockHour * 60 + clockMin;
    const expectedMinutes = scheduleHour * 60 + scheduleMin;
    
    const delayMinutes = clockInMinutes - expectedMinutes;
    
    if (delayMinutes <= 0) return { isLate: false, minutes: 0 };
    return { isLate: true, minutes: delayMinutes };
  };

  // Données de démo - Plus tard viendront d'un service/API GET /api/clocks/history?period={period}
  // Correspond à la table Clocks (id, userId, clockIn, clockOut)
  // MOCK : Génère des données pour la période demandée
  const generateHistoryData = (days) => {
    const data = [];
    const today = new Date('2025-10-09');
    
    for (let i = 0; i < days && i < 30; i++) { // Limité à 30 pour la démo
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Ignorer les week-ends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const clockIn = i === 0 ? '09:00' : 
                      i === 1 ? '08:45' : 
                      i % 3 === 0 ? '09:10' : // Quelques retards
                      i % 5 === 0 ? '09:30' : 
                      '09:00';
      
      const clockOut = i === 0 ? '17:30' :
                       i === 1 ? '17:15' :
                       i % 7 === 0 ? null : // Quelques "en cours"
                       '17:30';
      
      data.push({
        id: i + 1,
        date: date.toISOString().split('T')[0],
        dateLabel: i === 0 ? 'Aujourd\'hui' :
                   i === 1 ? 'Hier' :
                   date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }),
        clockIn,
        clockOut,
        totalHours: clockOut ? '8h 30m' : '6h 15m'
      });
    }
    
    return data;
  };

  const historyData = generateHistoryData(period);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          Historique des pointages
        </h2>
        
        {/* Info horaires équipe */}
        <div className="text-xs text-gray-500">
          Horaires : {teamSchedule.workStartTime} - {teamSchedule.workEndTime}
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Arrivée</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Départ</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Durée</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Retard</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Statut</th>
            </tr>
          </thead>
          <tbody>
            {historyData.map((record) => {
              const delay = calculateDelay(record.clockIn);
              
              return (
                <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-700 font-medium">
                    {record.dateLabel}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      {record.clockIn}
                      {delay.isLate && (
                        <AlertTriangle className="w-4 h-4 ml-2 text-orange-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {record.clockOut || (
                      <span className="text-orange-500">En cours...</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 font-medium">
                    {record.totalHours}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {delay.isLate ? (
                      <span className="text-orange-600 font-medium">
                        +{delay.minutes} min
                      </span>
                    ) : (
                      <span className="text-green-600">
                        À l'heure
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {delay.isLate ? (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                        ⚠️ Retard
                      </span>
                    ) : record.clockOut ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        ✓ Terminé
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        En cours
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer avec stats */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          Affichage des {historyData.length} derniers pointages ({period} jours)
        </span>
        <div className="flex items-center space-x-4">
          <span className="text-green-600">
            ✓ {historyData.filter(r => !calculateDelay(r.clockIn).isLate).length} à l'heure
          </span>
          <span className="text-orange-600">
            ⚠️ {historyData.filter(r => calculateDelay(r.clockIn).isLate).length} retards
          </span>
        </div>
      </div>
    </div>
  );
}
