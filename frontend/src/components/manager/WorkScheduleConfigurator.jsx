import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Clock, Loader2, Calendar } from 'lucide-react';
import { scheduleTemplatesApi } from '../../api/scheduleTemplatesApi';

const DAYS_FR = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export default function WorkScheduleConfigurator({ open, onClose, teamId, teamName, schedule, onSave }) {
  const isEditing = !!schedule;

  // Helper map for day name to value conversion
  const dayNameToValueMap = {
    mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
  };
  const dayValueToNameMap = {
    1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun'
  };

  const parsePattern = useCallback(() => {
    if (!schedule?.weeklyPatternJson) {
      return { workDays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:30' };
    }
    try {
      const parsedPattern = JSON.parse(schedule.weeklyPatternJson);
      const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const extractedWorkDays = [];
      let extractedStartTime = '09:00';
      let extractedEndTime = '17:30';

      dayKeys.forEach((key) => {
        const actualDayValue = dayNameToValueMap[key];
        if (parsedPattern[key] && Array.isArray(parsedPattern[key]) && parsedPattern[key].length > 0) {
          extractedWorkDays.push(actualDayValue);
          if (parsedPattern[key][0] && Array.isArray(parsedPattern[key][0]) && parsedPattern[key][0].length === 2) {
            extractedStartTime = parsedPattern[key][0][0];
            extractedEndTime = parsedPattern[key][0][1];
          }
        }
      });

      return {
        workDays: extractedWorkDays.sort((a, b) => {
          const orderA = a === 0 ? 7 : a;
          const orderB = b === 0 ? 7 : b;
          return orderA - orderB;
        }),
        startTime: extractedStartTime,
        endTime: extractedEndTime,
        pauseDuration: parsedPattern.pauseDuration || '',
        startDate: parsedPattern.startDate || '',
        endDate: parsedPattern.endDate || ''
      };

    } catch (e) {
      console.warn('Erreur parsing schedule.weeklyPatternJson dans WorkScheduleConfigurator:', e);
      return { workDays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:30', pauseDuration: '', startDate: '', endDate: '' };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule]);

  const [scheduleName, setScheduleName] = useState(schedule?.name || `Planning ${teamName || 'équipe'}`);
  const [workDays, setWorkDays] = useState([]); // Initialized to empty to be set by useEffect
  const [startTime, setStartTime] = useState('09:00'); // Initialized to default to be set by useEffect
  const [endTime, setEndTime] = useState('17:30'); // Initialized to default to be set by useEffect
  const [pauseDuration, setPauseDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form data when modal opens or schedule changes (for editing)
  useEffect(() => {
    if (open) {
      const resetValues = parsePattern();
      setScheduleName(schedule?.name || `Planning ${teamName || 'équipe'}`);
      setWorkDays(resetValues.workDays);
      setStartTime(resetValues.startTime);
      setEndTime(resetValues.endTime);
      setPauseDuration(resetValues.pauseDuration);
      setStartDate(resetValues.startDate);
      setEndDate(resetValues.endDate);
      setError('');
    }
  }, [open, schedule, teamName, parsePattern]);


  const toggleWorkDay = (dayValue) => {
    setWorkDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue].sort((a, b) => {
          // Sort correctly for days of week (Mon-Sun, 0 for Sun)
          const orderA = a === 0 ? 7 : a; // Sunday last
          const orderB = b === 0 ? 7 : b;
          return orderA - orderB;
        })
    );
  };

  const handleSave = async () => {
    setError('');

    if (!scheduleName.trim()) {
      setError('Le nom du planning est obligatoire');
      return;
    }

    if (!teamId && !isEditing) {
      setError('ID équipe manquant');
      return;
    }

    if (workDays.length === 0) {
      setError('Sélectionnez au moins un jour de travail');
      return;
    }

    setIsSaving(true);
    try {
      // Créer le weeklyPatternJson dans le format attendu par TeamDetail
      const weeklyPattern = {};
      workDays.forEach(dayValue => {
        const dayName = dayValueToNameMap[dayValue];
        if (dayName) {
          weeklyPattern[dayName] = [[startTime, endTime]];
        }
      });
      weeklyPattern.excludedDates = []; // Ensure it's always an array, even if empty

      // Save pauseDuration if present
      if (pauseDuration) {
        weeklyPattern.pauseDuration = pauseDuration;
      }

      // Save Validity Dates
      if (startDate) weeklyPattern.startDate = startDate;
      if (endDate) weeklyPattern.endDate = endDate;

      let template;

      if (isEditing) {
        template = await scheduleTemplatesApi.update(schedule.id, {
          name: scheduleName,
          weeklyPatternJson: JSON.stringify(weeklyPattern),
          // Assuming teamId and active status are not changed via this modal
          teamId: schedule.teamId,
          active: schedule.active,
        });
      } else {
        template = await scheduleTemplatesApi.create({
          teamId,
          name: scheduleName,
          active: false,
          weeklyPatternJson: JSON.stringify(weeklyPattern)
        });
      }

      if (onSave) {
        onSave(template);
      }

      onClose();
    } catch (err) {
      console.error('[WorkScheduleConfigurator] Erreur sauvegarde:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {isEditing ? 'Modifier le planning' : 'Configuration des horaires de travail'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Modifiez le planning pour ${teamName || 'l\'équipe'}`
              : `Définissez le planning hebdomadaire et les horaires pour ${teamName || 'l\'équipe'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nom du planning */}
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Nom du planning</Label>
            <Input
              id="schedule-name"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              placeholder="Planning standard"
            />
          </div>

          {/* Jours de travail hebdomadaires */}
          <div className="space-y-3">
            <Label>📋 Jours de travail hebdomadaires</Label>
            <div className="grid grid-cols-4 gap-3">
              {DAYS_FR.map((day) => (
                <div
                  key={day.value}
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${workDays.includes(day.value)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  onClick={() => toggleWorkDay(day.value)}
                >
                  <Checkbox
                    checked={workDays.includes(day.value)}
                    onCheckedChange={() => toggleWorkDay(day.value)}
                  />
                  <span className="text-sm font-medium">{day.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWorkDays([1, 2, 3, 4, 5])}
              >
                Lun-Ven
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWorkDays([1, 2, 3, 4, 5, 6, 0])}
              >
                Toute la semaine
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWorkDays(workDays.filter((d) => d !== 0 && d !== 6))}
              >
                Exclure weekend
              </Button>
            </div>
          </div>

          {/* Horaires */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              ⏰ Horaires
            </Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-time" className="text-xs text-muted-foreground">Début</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time" className="text-xs text-muted-foreground">Fin</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pause-duration" className="text-xs text-muted-foreground">Pause (min)</Label>
                <Input
                  id="pause-duration"
                  type="number"
                  min="0"
                  value={pauseDuration}
                  onChange={(e) => setPauseDuration(e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>
          </div>

          {/* Période de validité */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              📅 Période de validité (Optionnel)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid-start" className="text-xs text-muted-foreground">Du</Label>
                <Input
                  id="valid-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="valid-end" className="text-xs text-muted-foreground">Au</Label>
                <Input
                  id="valid-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Résumé */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              📊 Résumé: <strong>{workDays.length} jours de travail par semaine</strong>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              De {startTime} à {endTime}
              {pauseDuration ? ` (Pause: ${pauseDuration} min)` : ''}
            </p>
            {(() => {
              if (!startTime || !endTime) return null;
              const [sh, sm] = startTime.split(':').map(Number);
              const [eh, em] = endTime.split(':').map(Number);
              const startMin = sh * 60 + sm;
              const endMin = eh * 60 + em;
              let diff = endMin - startMin;
              if (diff < 0) diff += 24 * 60; // Handle overnight? Assuming day-shift for now

              if (pauseDuration) {
                diff -= Number(pauseDuration);
              }

              const h = Math.floor(diff / 60);
              const m = diff % 60;

              return (
                <p className="text-xs text-blue-700 font-bold mt-1">
                  Temps de travail effectif (Net) : {h}h{m > 0 ? m : ''} / jour
                </p>
              );
            })()}
          </div>
        </div>

        <DialogFooter>
          {error && (
            <div className="w-full text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              {error}
            </div>
          )}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Modification...' : 'Enregistrement...'}
                </>
              ) : (
                isEditing ? 'Modifier' : 'Enregistrer'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
