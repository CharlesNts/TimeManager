// src/components/employee/ClockHistory.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Calendar } from 'lucide-react';

// Utils date (Europe/Paris strict)
const pad2 = (x) => String(x).padStart(2, '0');

const toISOParis = (date) => {
  const d = toParis(new Date(date));
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
         `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const startOfDayParis = (d) => { const x = toParis(new Date(d)); x.setHours(0,0,0,0); return x; };
const endOfDayParis   = (d) => { const x = toParis(new Date(d)); x.setHours(23,59,59,999); return x; };
const addDaysParis    = (d, n) => { const x = toParis(new Date(d)); x.setDate(x.getDate() + n); return x; };

// Europe/Paris
const toParis = (date) => new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

// Format durée
function formatDuration(clock) {
  const start = toParis(new Date(clock.clockIn));
  const end = clock.clockOut ? toParis(new Date(clock.clockOut)) : toParis(new Date());
  const diff = Math.max(0, end - start);
  const mins = Math.round(diff / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// Règle flex pour une session
// Unused function - kept for reference
// function complianceInfo(clockInDate, clockOutDate) {
//   const REQUIRED_DAY_MIN = 8 * 60;
//
//   const inMin = minutesSinceMidnightParis(clockInDate);
//   const expectedStartMin = WORK_START_HOUR * 60 + WORK_START_MINUTE;
//   const earlyRaw = Math.max(0, expectedStartMin - inMin);
//   const earlyArrivalMin = Math.min(EARLY_CREDIT_CAP_MIN, earlyRaw);
//   const lateArrivalMin = Math.max(0, inMin - expectedStartMin);
//
//   const endRef = clockOutDate ? toParis(clockOutDate) : toParis(new Date());
//   const workedMs = Math.max(0, endRef - toParis(clockInDate));
//   const workedMin = Math.round(workedMs / 60000);
//
//   const requiredMin = Math.max(0, REQUIRED_DAY_MIN - earlyArrivalMin + lateArrivalMin);
//   const deficitMin = Math.max(0, requiredMin - workedMin);
//
//   return { earlyArrivalMin, lateArrivalMin, workedMin, requiredMin, deficitMin, isLate: deficitMin > 0 };
// }

export default function ClockHistory({ userId, period = 7, refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) return;
      setLoading(true);
      setErr('');
      setItems([]); // important: vider avant refetch pour éviter l’illusion de données figées
      try {
        const now = new Date();
        const today = toParis(now);
        const from = startOfDayParis(addDaysParis(today, -period + 1));
        const to   = endOfDayParis(today);

        const { data } = await api.get(`/api/users/${userId}/clocks/range`, {
          params: { from: toISOParis(from), to: toISOParis(to) },
        });

        if (!cancelled) {
          const arr = Array.isArray(data) ? data : [];
          arr.sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));
          setItems(arr);
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Erreur de chargement de l’historique');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, period, refreshKey]);


  if (!userId) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          Historique des pointages
        </h2>
        <div className="text-xs text-gray-500">Horaires: 09:30 - 17:30 (flex)</div>
      </div>

      {loading && <div className="text-sm text-gray-500">Chargement…</div>}
      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
      {!loading && !items.length && !err && (
        <div className="text-sm text-gray-500">Aucun pointage sur la période sélectionnée.</div>
      )}

      <div className="overflow-x-auto">
        <div className="max-h-[480px] overflow-y-auto rounded border border-gray-100">
          <table className="w-full">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Arrivée</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Départ</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Durée</th>
                <th className="text-left py-3 px-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const inDate = new Date(c.clockIn);
                const outDate = c.clockOut ? new Date(c.clockOut) : null;
                return (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700 font-medium">
                      {inDate.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {toParis(inDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {outDate ? toParis(outDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) : <span className="text-orange-500">En cours…</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 font-medium">
                      {formatDuration(c)}
                    </td>
                    <td className="py-3 px-4">
                      {outDate ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">✓ Terminé</span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">En cours</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {items.length} pointage{items.length > 1 ? 's' : ''} sur {period} jour{period > 1 ? 's' : ''}.
        </span>
        <span className="text-blue-600 text-xs">
          ℹ️ Le calcul des retards nécessite la configuration des horaires de travail
        </span>
      </div>
    </div>
  );
}