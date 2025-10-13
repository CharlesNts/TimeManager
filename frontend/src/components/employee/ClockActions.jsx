// src/components/employee/ClockActions.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Clock as ClockIcon, LogIn, LogOut, Coffee, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

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
    <div className="space-y-4">
      {/* Statut compact */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Statut actuel</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.cls}`}>
            {status.label}
          </span>
        </div>
        <div className="text-xs text-gray-600">
          {isClockedIn
            ? <>Arrivé à <strong className="text-gray-900">{new Date(openSession.clockIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></>
            : <>Aucune session en cours</>}
        </div>
      </div>

      {/* Boutons principaux */}
      <div className="space-y-2">
        <Button
          onClick={handleClockIn}
          disabled={loading || isClockedIn}
          variant="default"
          size="lg"
          className="w-full"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Pointer l'arrivée
        </Button>

        <Button
          onClick={handleClockOut}
          disabled={loading || !isClockedIn}
          variant="secondary"
          size="lg"
          className="w-full"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Pointer le départ
        </Button>
      </div>

      {/* Info pause */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
        <p className="text-xs text-amber-800 font-medium">
          <Coffee className="w-3.5 h-3.5 inline mr-1" />
          Pause (fonctionnalité à venir)
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}
    </div>
  );
}