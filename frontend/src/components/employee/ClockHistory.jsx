// src/components/employee/ClockHistory.jsx
import React from 'react';
import { Calendar, Clock } from 'lucide-react';

/**
 * Composant ClockHistory - Historique des pointages
 * 
 * Affiche un tableau avec:
 * - Date
 * - Heure d'arrivée (clockIn)
 * - Heure de départ (clockOut)
 * - Durée totale calculée
 * - Statut: "Terminé" (clockOut existe) ou "En cours" (clockOut null)
 * 
 * Pour l'instant avec des données de démo
 * Plus tard, les données viendront de l'API basée sur la table Clocks
 */
export default function ClockHistory() {
  // Données de démo - Plus tard viendront d'un service/API
  // Correspond à la table Clocks (id, userId, clockIn, clockOut)
  const historyData = [
    {
      id: 1,
      date: '2025-10-09',
      dateLabel: 'Aujourd\'hui',
      clockIn: '09:00',
      clockOut: '17:30',
      totalHours: '8h 30m'
    },
    {
      id: 2,
      date: '2025-10-08',
      dateLabel: 'Hier',
      clockIn: '08:45',
      clockOut: '17:15',
      totalHours: '8h 30m'
    },
    {
      id: 3,
      date: '2025-10-07',
      dateLabel: 'Lun 07 Oct',
      clockIn: '09:10',
      clockOut: '18:00',
      totalHours: '8h 50m'
    },
    {
      id: 4,
      date: '2025-10-04',
      dateLabel: 'Ven 04 Oct',
      clockIn: '08:30',
      clockOut: '16:45',
      totalHours: '8h 15m'
    },
    {
      id: 5,
      date: '2025-10-03',
      dateLabel: 'Jeu 03 Oct',
      clockIn: '09:00',
      clockOut: null, // clockOut null = toujours en cours
      totalHours: '6h 15m' // Durée calculée depuis clockIn jusqu'à maintenant
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Calendar className="w-5 h-5 mr-2 text-blue-600" />
        Historique des pointages
      </h2>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Arrivée</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Départ</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Durée</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Statut</th>
            </tr>
          </thead>
          <tbody>
            {historyData.map((record) => (
              <tr key={record.id} className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-gray-700 font-medium">
                  {record.dateLabel}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {record.clockIn}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {record.clockOut || (
                    <span className="text-orange-500">En cours...</span>
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 font-medium">
                  {record.totalHours}
                </td>
                <td className="py-3 px-4">
                  {record.clockOut ? (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      Terminé
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      En cours
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer avec info */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        Affichage des 5 derniers pointages
      </div>
    </div>
  );
}
