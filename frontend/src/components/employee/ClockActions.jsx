import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { LogIn, LogOut, Coffee, Loader2, Briefcase } from 'lucide-react';
import { Button } from '../ui/button';
import { clockIn, clockOut, getCurrentClock, getClockHistory, getClockPauses, createPause, stopPause } from '../../api/clocks.api';

// --- Helpers ---
const parseDate = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) {
    return new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0, val[5] || 0);
  }
  return new Date(val);
};

const toLocalISOString = (date) => {
  const pad = (n) => n.toString().padStart(2, '0');
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds());
};

export default function ClockActions({ userId, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [openSession, setOpenSession] = useState(null); 
  const [error, setError] = useState('');
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [pauses, setPauses] = useState([]);
  const [pausesLoading, setPausesLoading] = useState(false);

  const loadPausesForClock = useCallback(async (clockId) => {
    if (!clockId) return;
    setPausesLoading(true);
    try {
      const pausesData = await getClockPauses(clockId);
      setPauses(Array.isArray(pausesData) ? pausesData : []);
      const activePause = (pausesData || []).find(p => !p.endAt);
      setIsOnBreak(!!activePause);
    } catch (e) {
      console.error('Erreur lors du chargement des pauses:', e);
      setError('Impossible de charger les pauses');
      setPauses([]);
    } finally {
      setPausesLoading(false);
    }
  }, []);

  const loadLast = useCallback(async () => {
    if (!userId) return;
    setError('');
    try {
      const currentClock = await getCurrentClock(userId);
      if (currentClock && !currentClock.clockOut) {
        setOpenSession(currentClock);
        await loadPausesForClock(currentClock.id);
      } else {
        const history = await getClockHistory(userId, 1);
        const last = history?.[0] || null;
        const active = last && !last.clockOut ? last : null;
        setOpenSession(active);
        if (active) {
          await loadPausesForClock(active.id);
        } else {
          setPauses([]);
        }
      }
    } catch (e) {
      console.error('[ClockActions] Erreur lors du chargement:', e);
      setError(e.message || 'Impossible de charger le statut de pointage');
    }
  }, [userId, loadPausesForClock]);

  useEffect(() => { loadLast(); }, [loadLast]);

  const handleClockIn = async () => {
    setLoading(true); setError('');
    try {
      const data = await clockIn(userId);
      setOpenSession(data);
      setPauses([]);
      setIsOnBreak(false);
      onChanged && onChanged();
    } catch (e) {
      setError(e.message || 'Échec du pointage Arrivée');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true); setError('');
    try {
      await clockOut(userId);
      setOpenSession(null);
      setPauses([]);
      setIsOnBreak(false);
      onChanged && onChanged();
    } catch (e) {
      setError(e.message || 'Échec du pointage Départ');
    } finally {
      setLoading(false);
    }
  };

  const startBreak = async () => {
    const now = new Date();
    const clockInDate = parseDate(openSession.clockIn);
    let safeStartAt = now;
    if (clockInDate && !isNaN(clockInDate.getTime()) && now < new Date(clockInDate.getTime() + 2000)) {
      safeStartAt = new Date(clockInDate.getTime() + 2000);
    }
    await createPause(openSession.id, {
      note: 'Pause',
      startAt: toLocalISOString(safeStartAt)
    });
    setIsOnBreak(true);
  };

  const stopActiveBreak = async (activePause) => {
    const endAt = toLocalISOString(new Date());
    await stopPause(openSession.id, activePause.id, { endAt });
    setIsOnBreak(false);
  };

  const handleBreak = async () => {
    if (!openSession) return;
    setPausesLoading(true); setError('');
    try {
      const activePause = pauses.find(p => !p.endAt);
      if (activePause) {
        await stopActiveBreak(activePause);
      } else {
        await startBreak();
      }
      await loadPausesForClock(openSession.id);
      onChanged && onChanged();
    } catch (e) {
      console.error('[ClockActions] Pause error:', e);
      if (e.response && e.response.status === 409) {
        await loadPausesForClock(openSession.id);
        setError('Synchronisation des pauses effectuée. Veuillez réessayer si nécessaire.');
      } else {
        setError('Impossible de mettre à jour le statut de pause');
      }
    } finally {
      setPausesLoading(false);
    }
  };

  const isClockedIn = !!openSession;
  const status = !isClockedIn
    ? { label: 'Hors service', cls: 'bg-gray-100 text-gray-800' }
    : isOnBreak
      ? { label: 'En pause', cls: 'bg-yellow-100 text-yellow-800' }
      : { label: 'Au travail', cls: 'bg-green-100 text-green-800' };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Statut actuel</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.cls}`}>
            {status.label}
          </span>
        </div>
        <div className="text-xs text-gray-600">
          {isClockedIn
            ? <>Arrivé à <strong className="text-gray-900">{parseDate(openSession.clockIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></>
            : <>Aucune session en cours</>}
        </div>
      </div>

      <div className="space-y-2">
        <Button onClick={handleClockIn} disabled={loading || isClockedIn} variant="default" size="lg" className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Pointer l&apos;arrivée
        </Button>
        <Button onClick={handleClockOut} disabled={loading || !isClockedIn} variant="secondary" size="lg" className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Pointer le départ
        </Button>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="space-y-2">
          <Button
            onClick={handleBreak}
            disabled={!isClockedIn || pausesLoading}
            variant={isOnBreak ? "default" : "outline"}
            className={`w-full ${isOnBreak ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'}`}
          >
            {pausesLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : isOnBreak ? <Briefcase className="w-4 h-4 mr-2" /> : <Coffee className="w-4 h-4 mr-2" />}
            {isOnBreak ? "Reprendre le travail" : "Commencer une pause"}
          </Button>
          <div className="text-xs">
            {isOnBreak ? (
              <div className="flex items-center justify-center space-x-2 text-amber-700 font-medium">
                <Coffee className="w-3 h-3" /> <span>En pause</span>
              </div>
            ) : pausesLoading ? (
              <div className="text-center text-gray-600">Chargement des pauses...</div>
            ) : pauses && pauses.length ? (
              <ul className="space-y-1">
                {pauses.map((p) => {
                  const startDate = parseDate(p.startAt);
                  const endDate = parseDate(p.endAt);
                  return (
                    <li key={p.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">
                          {startDate && !isNaN(startDate) ? startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          {' '}—{' '}
                          {endDate && !isNaN(endDate) ? endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'en cours'}
                        </div>
                        {p.note && <div className="text-xs text-gray-500">{p.note}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-xs text-gray-600">Aucune pause enregistrée</div>
            )}
          </div>
        </div>
      </div>
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">{error}</div>}
    </div>
  );
}

ClockActions.propTypes = {
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChanged: PropTypes.func,
};
