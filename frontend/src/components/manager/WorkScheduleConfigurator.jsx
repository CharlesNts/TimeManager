import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Clock, Loader2 } from 'lucide-react';
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

  // Initialize from schedule if editing, otherwise default values
  const [scheduleName, setScheduleName] = useState(schedule?.name || `Planning ${teamName || 'équipe'}`);

  const parsePattern = () => {
    if (!schedule?.weeklyPatternJson) {
      return { workDays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:30' };
    }
    try {
      return JSON.parse(schedule.weeklyPatternJson);
    } catch {
      return { workDays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:30' };
    }
  };

  const initialPattern = parsePattern();
  const [workDays, setWorkDays] = useState(initialPattern.workDays);
  const [startTime, setStartTime] = useState(initialPattern.startTime);
  const [endTime, setEndTime] = useState(initialPattern.endTime);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleWorkDay = (dayValue) => {
    setWorkDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue].sort()
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
      setError('Sélectionnez au least un jour de travail');
      return;
    }

    setIsSaving(true);
    try {
      // Créer le pattern JSON simple avec seulement les jours et horaires
      const weeklyPattern = {
        workDays: workDays,
        startTime: startTime,
        endTime: endTime,
      };

      let template;

      if (isEditing) {
        // Mode édition: appeler UPDATE
        template = await scheduleTemplatesApi.update(schedule.id, {
          name: scheduleName,
          weeklyPatternJson: JSON.stringify(weeklyPattern),
        });
      } else {
        // Mode création: appeler CREATE
        template = await scheduleTemplatesApi.create({
          teamId,
          name: scheduleName,
          active: true,
          weeklyPatternJson: JSON.stringify(weeklyPattern)
        });
      }

      // Appeler le callback onSave si fourni
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
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    workDays.includes(day.value)
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Résumé */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              📊 Résumé: <strong>{workDays.length} jours de travail par semaine</strong>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              De {startTime} à {endTime}
            </p>
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
