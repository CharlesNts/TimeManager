import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { requestLeave, LEAVE_TYPES, getLeaveTypeLabel } from '../../api/leavesApi';

const LEAVE_TYPE_OPTIONS = [
  { value: LEAVE_TYPES.PAID, label: getLeaveTypeLabel(LEAVE_TYPES.PAID) },
  { value: LEAVE_TYPES.SICK, label: getLeaveTypeLabel(LEAVE_TYPES.SICK) },
  { value: LEAVE_TYPES.UNPAID, label: getLeaveTypeLabel(LEAVE_TYPES.UNPAID) },
  { value: LEAVE_TYPES.TRAINING, label: getLeaveTypeLabel(LEAVE_TYPES.TRAINING) },
  { value: LEAVE_TYPES.OTHER, label: getLeaveTypeLabel(LEAVE_TYPES.OTHER) },
];

export default function RequestLeaveModal({ open, onClose, userId, onSuccess }) {
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES.PAID);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleReset = () => {
    setLeaveType(LEAVE_TYPES.PAID);
    setStartDate('');
    setEndDate('');
    setReason('');
    setError('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const validateForm = () => {
    if (!leaveType.trim()) {
      setError('Sélectionnez un type de congé');
      return false;
    }
    if (!startDate) {
      setError('La date de début est obligatoire');
      return false;
    }
    if (!endDate) {
      setError('La date de fin est obligatoire');
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('La date de fin doit être après la date de début');
      return false;
    }
    if (!reason.trim()) {
      setError('La raison est obligatoire');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const leaveData = {
        type: leaveType,
        startAt: new Date(startDate).toISOString(),
        endAt: new Date(endDate).toISOString(),
        reason: reason.trim(),
      };

      await requestLeave(userId, leaveData);

      if (onSuccess) {
        onSuccess();
      }

      handleReset();
      onClose();
    } catch (err) {
      console.error('[RequestLeaveModal] Error:', err);
      setError(err.message || 'Erreur lors de la demande de congé');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate) : null;
  const daysDiff = startDateObj && endDateObj
    ? Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Demander un congé
          </DialogTitle>
          <DialogDescription>
            Soumettez votre demande de congé. Votre manager pourra l'approuver ou la rejeter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Type de congé */}
          <div className="space-y-2">
            <Label htmlFor="leave-type">Type de congé</Label>
            <select
              id="leave-type"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {LEAVE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Date de début</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Date de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Nombre de jours */}
          {daysDiff > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Durée:</strong> {daysDiff} jour{daysDiff > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Raison */}
          <div className="space-y-2">
            <Label htmlFor="reason">Raison</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Décrivez la raison de votre absence..."
              className="min-h-24"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              {reason.length}/500 caractères
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Envoyer la demande'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
