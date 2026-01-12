import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { LogIn, LogOut, Coffee, Loader2, Briefcase } from 'lucide-react';
import { Button } from '../ui/button';
import { clockIn, clockOut, getCurrentClock, getClockHistory, getClockPauses, createPause, stopPause } from '../../api/clocks.api';
import { playSound } from '../../hooks/useNotificationSound';

const ClockActions = forwardRef(function ClockActions({ userId, onChanged }, ref) {
  const [loading, setLoading] = useState(false);
  const [openSession, setOpenSession] = useState(null); // {id, clockIn, clockOut}
  const [error, setError] = useState('');
  // === Pause ===
  // isOnBreak: local UI state driven from pauses list
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [pauses, setPauses] = useState([]);
  const [pausesLoading, setPausesLoading] = useState(false);

  const loadLast = useCallback(async () => {
    if (!userId) return;
    setError('');
    try {
      console.log('[ClockActions] Chargement du statut pour userId:', userId);

      // Récupérer le pointage en cours de l'utilisateur connecté
      const currentClock = await getCurrentClock(userId);
      console.log('[ClockActions] Current clock:', currentClock);

      if (currentClock && !currentClock.clockOut) {
        console.log('[ClockActions] Pointage actif trouvé:', currentClock);
        setOpenSession(currentClock);
        // Charger les pauses pour ce clock
        await loadPausesForClock(currentClock.id);
      } else {
        console.log('[ClockActions] Aucun pointage actif, chargement de l\'historique');
        // Sinon, charger l'historique pour trouver le dernier pointage
        const history = await getClockHistory(userId, 1);
        const last = history?.[0] || null;
        console.log('[ClockActions] Dernier pointage dans l\'historique:', last);

        setOpenSession(last && !last.clockOut ? last : null);
        if (last && !last.clockOut) {
          await loadPausesForClock(last.id);
        } else {
          setPauses([]);
        }
      }
    } catch (e) {
      console.error('[ClockActions] Erreur lors du chargement:', e);
      setError(e.message || 'Impossible de charger le statut de pointage');
    }
  }, [userId]);

  useEffect(() => { loadLast(); }, [loadLast]);

  // --- Pause helpers ---
  const loadPausesForClock = async (clockId) => {
    if (!clockId) return;
    setPausesLoading(true);
    try {
      const pausesData = await getClockPauses(clockId);
      console.log('[ClockActions] Loaded pauses:', pausesData);
      setPauses(Array.isArray(pausesData) ? pausesData : []);

      // Detect if there's an active pause (no endAt)
      const activePause = pausesData.find(p => !p.endAt);
      console.log('[ClockActions] Active pause:', activePause ? `id=${activePause.id}` : 'none');
      setIsOnBreak(!!activePause);
    } catch (e) {
      console.error('Erreur lors du chargement des pauses:', e);
      setError('Impossible de charger les pauses');
      setPauses([]);
    } finally {
      setPausesLoading(false);
    }
  };

  const handleClockIn = async () => {
    setLoading(true); setError('');
    try {
      const data = await clockIn(userId);
      setOpenSession(data);
      setPauses([]);
      setIsOnBreak(false);
      playSound('clockIn');
      onChanged && onChanged();
    } catch (e) {
      playSound('error');
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
      playSound('clockOut');
      onChanged && onChanged();
    } catch (e) {
      playSound('error');
      setError(e.message || 'Échec du pointage Départ');
    } finally {
      setLoading(false);
    }
  };

  const handleBreak = async () => {
    if (!openSession) return;

    // Toggle logic: Start or Stop
    setPausesLoading(true);
    setError('');

    try {
      const activePause = pauses.find(p => !p.endAt);

      // Helper to get Local ISO string (YYYY-MM-DDTHH:mm:ss)
      const toLocalISOString = (date) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return date.getFullYear() +
          '-' + pad(date.getMonth() + 1) +
          '-' + pad(date.getDate()) +
          'T' + pad(date.getHours()) +
          ':' + pad(date.getMinutes()) +
          ':' + pad(date.getSeconds());
      };

      if (activePause) {
        // STOP pause - send endAt in request body
        const endAt = toLocalISOString(new Date());
        console.log('[ClockActions] Stopping pause:', activePause.id, 'with endAt:', endAt);
        const result = await stopPause(openSession.id, activePause.id, { endAt });
        console.log('[ClockActions] stopPause result:', result);
        setIsOnBreak(false);
        playSound('breakEnd');
      } else {
        // START pause
        // Ensure startAt is not before clockIn (plus a safe buffer)
        const now = new Date();

        // Parse clockIn which might be an array [yyyy, mm, dd, hh, mm, ss]
        let clockInVal = openSession.clockIn;
        let clockInDate;

        if (Array.isArray(clockInVal)) {
          // Month is 0-indexed in JS Date
          clockInDate = new Date(
            clockInVal[0],
            clockInVal[1] - 1,
            clockInVal[2],
            clockInVal[3] || 0,
            clockInVal[4] || 0,
            clockInVal[5] || 0
          );
        } else {
          clockInDate = new Date(clockInVal);
        }

        let safeStartAt = now;
        if (!isNaN(clockInDate.getTime()) && now < new Date(clockInDate.getTime() + 2000)) {
          // If 'now' is too close or before clockIn, force it to be after
          safeStartAt = new Date(clockInDate.getTime() + 2000);
        }
        const startAtValue = toLocalISOString(safeStartAt);
        const newPause = await createPause(openSession.id, {
          note: 'Pause',
          startAt: startAtValue
        });
        console.log('[ClockActions] createPause result:', newPause);
        setIsOnBreak(true);
        playSound('breakStart');
      }

      // Reload pauses from backend to get complete data
      await loadPausesForClock(openSession.id);

      // Trigger dashboard refresh
      onChanged && onChanged();
    } catch (e) {
      console.error('[ClockActions] Pause error:', e);

      // Handle 409 Conflict specifically
      if (e.response && e.response.status === 409) {
        console.warn('[ClockActions] Conflict detected (409). Refreshing pauses...');
        // Refresh the list to see if a pause was already open/closed externally
        await loadPausesForClock(openSession.id);
        setError('Synchronisation des pauses effectuée. Veuillez réessayer si nécessaire.');
      } else {
        setError('Impossible de mettre à jour le statut de pause');
      }
    } finally {
      setPausesLoading(false);
    }
  };

  // Exposer les méthodes pour les raccourcis clavier
  useImperativeHandle(ref, () => ({
    // Toggle clock in/out
    toggleClock: () => {
      if (loading) return;
      if (isClockedIn) {
        handleClockOut();
      } else {
        handleClockIn();
      }
    },
    // Toggle break
    toggleBreak: () => {
      if (!isClockedIn || pausesLoading) return;
      handleBreak();
    },
    // Get current state
    getState: () => ({
      isClockedIn,
      isOnBreak,
      loading,
      pausesLoading,
    }),
  }));

  const isClockedIn = !!openSession;
  const status = !isClockedIn
    ? { label: 'Hors service', cls: 'bg-gray-100 text-gray-800' }
    : isOnBreak
      ? { label: 'En pause', cls: 'bg-yellow-100 text-yellow-800' }
      : { label: 'Au travail', cls: 'bg-green-100 text-green-800' };

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
          Pointer l&apos;arrivée
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
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="space-y-2">
          <Button
            onClick={handleBreak}
            disabled={!isClockedIn || pausesLoading}
            variant={isOnBreak ? "default" : "outline"}
            className={`w-full ${isOnBreak ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'}`}
          >
            {pausesLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : isOnBreak ? (
              <Briefcase className="w-4 h-4 mr-2" />
            ) : (
              <Coffee className="w-4 h-4 mr-2" />
            )}
            {isOnBreak ? "Reprendre le travail" : "Commencer une pause"}
          </Button>

          {/* Status display */}
          <div className="text-xs">
            {isOnBreak ? (
              <div className="flex items-center justify-center space-x-2 text-amber-700 font-medium">
                <Coffee className="w-3 h-3" />
                <span>En pause</span>
              </div>
            ) : pausesLoading ? (
              <div className="text-center text-gray-600">Chargement des pauses...</div>
            ) : pauses && pauses.length ? (
              <ul className="space-y-1">
                {pauses.map((p) => {
                  // Helper to parse date which might be array [yyyy, mm, dd, hh, mm, ss] or string
                  const parseDate = (val) => {
                    if (!val) return null;
                    if (Array.isArray(val)) {
                      return new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0, val[5] || 0);
                    }
                    return new Date(val);
                  };
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

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}
    </div>
  );
});

export default ClockActions;