// src/components/employee/ClockActions.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { LogIn, LogOut, Coffee, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { clockIn, clockOut, getCurrentClock, getClockHistory, getClockPauses } from '../../api/clocks.api';

export default function ClockActions({ userId, onChanged }) {
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
      // Utiliser l'API pour récupérer les pauses réelles
      const pausesData = await getClockPauses(clockId);
      setPauses(Array.isArray(pausesData) ? pausesData : []);
      // Ne pas essayer de détecter les pauses en cours, le backend ne les supporte pas
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

const handleBreak = async () => {
    // FONCTIONNALITÉ DÉSACTIVÉE : Le backend ne supporte pas les pauses en temps réel
    // 
    // PROBLÈME BACKEND :
    // - Le backend exige que clockOut soit défini AVANT de pouvoir créer une pause
    // - Cela signifie qu'on ne peut pas faire de pause pendant une session active
    // - L'entité ClockPause a endAt en NOT NULL, ce qui empêche les "pauses en cours"
    // 
    // SOLUTION BACKEND NÉCESSAIRE :
    // 1. Rendre ClockPause.endAt nullable dans l'entité
    // 2. Modifier ClockPauseService.create() pour accepter endAt = null
    // 3. Permettre les pauses même si Clock.clockOut == null
    // 4. Ajouter une logique similaire à clockIn/clockOut (créer puis mettre à jour)
    //
    // En attendant cette correction backend, la fonctionnalité pause est désactivée.
    
    setError(
      '⚠️ Fonctionnalité de pause temporairement indisponible.\n\n' +
      'Problème technique : Le backend actuel exige d\'avoir pointé le départ avant de pouvoir ' +
      'enregistrer des pauses, ce qui empêche les pauses en temps réel pendant une session de travail. ' +
      'Une correction du backend est nécessaire pour activer cette fonctionnalité.'
    );
  };  const isClockedIn = !!openSession;
  const status = !isClockedIn
    ? { label: 'Hors service', cls: 'bg-gray-100 text-gray-800' }
    : isOnBreak
    ? { label: 'En pause', cls: 'bg-yellow-100 text-yellow-800' }
    : { label: 'Au travail', cls: 'bg-black text-white' };

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
            disabled={true}
            variant="default"
            className="w-full bg-gray-300 text-gray-600 cursor-not-allowed"
            title="Fonctionnalité temporairement indisponible - Correction backend nécessaire"
          >
            <Coffee className="w-4 h-4" />
            Pauses (temporairement indisponible)
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
                {pauses.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        {new Date(p.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' '}—{' '}
                        {p.endAt ? new Date(p.endAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'en cours'}
                      </div>
                      {p.note && <div className="text-xs text-gray-500">{p.note}</div>}
                    </div>
                  </li>
                ))}
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
}