// src/components/employee/ClockActions.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Clock as ClockIcon, LogIn, LogOut, Coffee, Loader2 } from 'lucide-react';

export default function ClockActions({ userId, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [openSession, setOpenSession] = useState(null); // {id, clockIn, clockOut}
  const [error, setError] = useState('');
  // === Pause: conservée comme dans la maquette (local UI) ===
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const loadLast = async () => {
    if (!userId) return;
    setError('');
    try {
      const { data } = await api.get(`/api/users/${userId}/clocks`, {
        params: { page: 0, size: 1, sort: 'clockIn,desc' },
      });
      const last = data?.content?.[0] || null;
      setOpenSession(last && !last.clockOut ? last : null);
    } catch (e) {
      setError(e.message || 'Impossible de charger le statut de pointage');
    }
  };

  useEffect(() => { loadLast(); }, [userId]);

  const handleClockIn = async () => {
    if (!userId) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.post(`/api/users/${userId}/clocks/in`);
      setOpenSession(data);
      setIsOnBreak(false);
      setLastAction({ type: 'in', time: new Date() });
      onChanged && onChanged();
    } catch (e) {
      setError(e.message || 'Échec du pointage Arrivée');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!userId) return;
    setLoading(true); setError('');
    try {
      await api.post(`/api/users/${userId}/clocks/out`);
      setOpenSession(null);
      setIsOnBreak(false);
      setLastAction({ type: 'out', time: new Date() });
      onChanged && onChanged();
    } catch (e) {
      setError(e.message || 'Échec du pointage Départ');
    } finally {
      setLoading(false);
    }
  };

  const handleBreak = () => {
    const now = new Date();
    setIsOnBreak((prev) => !prev);
    setLastAction({ type: isOnBreak ? 'break-end' : 'break-start', time: now });
    // NOTE: pas d’API pour la pause actuellement
  };

  const isClockedIn = !!openSession;
  const status = !isClockedIn
    ? { label: 'Hors service', cls: 'bg-gray-100 text-gray-800' }
    : isOnBreak
    ? { label: 'En pause', cls: 'bg-yellow-100 text-yellow-800' }
    : { label: 'Au travail', cls: 'bg-black text-white' };

  const lastLabel = () => {
    if (!lastAction) return '';
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
        <ClockIcon className="w-5 h-5 mr-2 text-gray-900" />
        Actions de pointage
      </h2>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">Statut :</span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {isClockedIn
          ? <>Arrivé à <strong>{new Date(openSession.clockIn).toLocaleTimeString()}</strong></>
          : <>Aucune session en cours</>}
        {lastAction && (
          <div className="mt-1">
            Dernier pointage : {lastLabel()} à {lastAction.time.toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleClockIn}
          disabled={loading || isClockedIn}
          className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium ${
            loading || isClockedIn ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white'
          }`}
        >
          {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <LogIn className="w-5 h-5 mr-2" />}
          Arrivée
        </button>

        <button
          onClick={handleClockOut}
          disabled={loading || !isClockedIn}
          className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium ${
            loading || !isClockedIn ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white'
          }`}
        >
          {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <LogOut className="w-5 h-5 mr-2" />}
          Départ
        </button>
      </div>

      <button
        disabled={true}
        className="w-full p-4 rounded-lg font-semibold shadow transition bg-gray-100 text-gray-400 cursor-not-allowed"
      >
        <Coffee className="w-5 h-5 mr-2" />
        Prendre une pause (À venir)
      </button>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          ℹ️ La fonctionnalité de pause n'est pas encore disponible (backend en cours de développement).
        </p>
      </div>

      {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
    </div>
  );
}