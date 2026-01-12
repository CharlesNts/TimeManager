// src/components/employee/EmployeeLeavesWidget.jsx
import React, { useEffect, useState } from 'react';
import { Calendar, Loader2, AlertCircle, CheckCircle, XCircle, Clock, History } from 'lucide-react';
import { getEmployeeLeaves, getLeaveTypeLabel, getLeaveStatusLabel, cancelLeave, LEAVE_STATUS } from '../../api/leavesApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/Badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

const getStatusColor = (status) => {
  switch (status) {
    case LEAVE_STATUS.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case LEAVE_STATUS.APPROVED:
      return 'bg-green-100 text-green-800';
    case LEAVE_STATUS.REJECTED:
      return 'bg-red-100 text-red-800';
    case LEAVE_STATUS.CANCELLED:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case LEAVE_STATUS.PENDING:
      return <Clock className="w-4 h-4" />;
    case LEAVE_STATUS.APPROVED:
      return <CheckCircle className="w-4 h-4" />;
    case LEAVE_STATUS.REJECTED:
      return <XCircle className="w-4 h-4" />;
    case LEAVE_STATUS.CANCELLED:
      return <XCircle className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

export default function EmployeeLeavesWidget({ userId, onRequestLeave, showHistoryExternal = false, onCloseHistory }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Gérer l'ouverture externe du modal (via raccourci clavier)
  useEffect(() => {
    if (showHistoryExternal) {
      setShowHistoryModal(true);
    }
  }, [showHistoryExternal]);

  // Quand le modal se ferme, notifier le parent
  const handleCloseHistory = () => {
    setShowHistoryModal(false);
    onCloseHistory && onCloseHistory();
  };

  const loadLeaves = async () => {
    if (!userId) return;

    setLoading(true);
    setError('');

    try {
      const data = await getEmployeeLeaves(userId);
      // Debug: voir la structure des données
      console.log('[EmployeeLeavesWidget] Leaves data:', data);
      if (data.length > 0) {
        console.log('[EmployeeLeavesWidget] Sample leave object keys:', Object.keys(data[0]));
        console.log('[EmployeeLeavesWidget] Sample leave object:', data[0]);
      }
      // Trier par date de création décroissante (les plus récents en premier)
      const sorted = data.sort((a, b) => {
        const dateA = new Date(a.createdAt || getStartDate(a) || 0);
        const dateB = new Date(b.createdAt || getStartDate(b) || 0);
        return dateB - dateA;
      });
      setLeaves(sorted);
    } catch (err) {
      console.error('[EmployeeLeavesWidget] Error loading leaves:', err);
      setError('Erreur lors du chargement des congés');
    } finally {
      setLoading(false);
    }
  };

  // Helper pour accéder aux champs de date (supporte tous les formats possibles)
  const getStartDate = (leave) => {
    return leave.startAt || leave.start_at || leave.startDate || leave.start_date || null;
  };
  const getEndDate = (leave) => {
    return leave.endAt || leave.end_at || leave.endDate || leave.end_date || null;
  };

  // Séparer les congés en catégories
  const now = new Date();
  
  // Demandes en attente
  const pendingLeaves = leaves.filter(leave => leave.status === LEAVE_STATUS.PENDING);
  
  // Congés à venir ou en cours (non en attente)
  const upcomingLeaves = leaves.filter(leave => {
    const endDate = new Date(getEndDate(leave));
    return leave.status !== LEAVE_STATUS.PENDING && !isNaN(endDate.getTime()) && endDate >= now;
  });

  // Historique (congés passés)
  const historyLeaves = leaves.filter(leave => {
    const endDate = new Date(getEndDate(leave));
    return leave.status !== LEAVE_STATUS.PENDING && (!isNaN(endDate.getTime()) ? endDate < now : true);
  });
  
  // Combinaison pour le modal
  const activeLeaves = [...pendingLeaves, ...upcomingLeaves];

  useEffect(() => {
    loadLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleCancel = async (leaveId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) {
      return;
    }

    setCancellingId(leaveId);
    setError('');

    try {
      await cancelLeave(leaveId, userId);
      await loadLeaves(); // Recharger la liste
    } catch (err) {
      console.error('[EmployeeLeavesWidget] Error cancelling leave:', err);
      setError('Erreur lors de l\'annulation de la demande');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Calculer le nombre de jours de congé de façon sécurisée
  const safeDays = (startAt, endAt) => {
    if (!startAt || !endAt) return 0;
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Récupérer la dernière demande
  const latestLeave = leaves.length > 0 ? leaves[0] : null;

  const renderLeaveItem = (leave, isLatest = false) => {
    const startDate = getStartDate(leave);
    const endDate = getEndDate(leave);
    const days = safeDays(startDate, endDate);
    const canCancel = leave.status === LEAVE_STATUS.PENDING;

    return (
      <div
        key={leave.id}
        className={`p-3 border rounded-lg ${
          isLatest 
            ? 'border-blue-200 bg-blue-50/50' 
            : 'border-gray-200 hover:bg-gray-50'
        } transition`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium text-sm text-gray-900">
                {getLeaveTypeLabel(leave.type)}
              </span>
              <Badge className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(leave.status)}`}>
                {getStatusIcon(leave.status)}
                {getLeaveStatusLabel(leave.status)}
              </Badge>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex items-center gap-1 flex-wrap">
                <Calendar className="w-3 h-3" />
                <span>
                  {formatDate(startDate)} → {formatDate(endDate)}
                </span>
                {days > 0 && <span className="ml-1 font-medium">({days} jour{days > 1 ? 's' : ''})</span>}
              </div>
              {leave.reason && (
                <div className="text-gray-500 italic">
                  &quot;{leave.reason}&quot;
                </div>
              )}
              {(leave.managerNote || leave.manager_note) && (
                <div className={`mt-2 p-2 rounded text-xs border ${
                  leave.status === LEAVE_STATUS.REJECTED 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <strong>Note du manager:</strong> {leave.managerNote || leave.manager_note}
                </div>
              )}
            </div>
          </div>
        </div>

        {canCancel && (
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCancel(leave.id)}
              disabled={cancellingId === leave.id}
              className="text-xs"
            >
              {cancellingId === leave.id ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Annulation...
                </>
              ) : (
                'Annuler'
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Mes congés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Mes congés
          </CardTitle>
          <CardDescription>
            {pendingLeaves.length === 0 
              ? 'Aucune demande en attente' 
              : `${pendingLeaves.length} demande${pendingLeaves.length > 1 ? 's' : ''} en attente`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            onClick={onRequestLeave}
            className="w-full mb-4"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Demander un congé
          </Button>

          {leaves.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">Aucune demande de congé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Dernière demande */}
              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Dernière demande
                </h3>
                {renderLeaveItem(latestLeave, true)}
              </div>

              {/* Bouton pour voir l'historique complet */}
              <Button
                variant="outline"
                onClick={() => setShowHistoryModal(true)}
                className="w-full text-sm"
              >
                <History className="w-4 h-4 mr-2" />
                Voir tout l&apos;historique ({leaves.length} demande{leaves.length > 1 ? 's' : ''})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de l'historique */}
      <Dialog open={showHistoryModal} onOpenChange={handleCloseHistory}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historique de mes congés
            </DialogTitle>
            <DialogDescription>
              Toutes vos demandes de congés ({leaves.length} au total)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Congés actifs et en attente */}
            {activeLeaves.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                  À venir & En attente ({activeLeaves.length})
                </h3>
                <div className="space-y-2">
                  {activeLeaves.map((leave) => renderLeaveItem(leave))}
                </div>
              </div>
            )}

            {/* Historique des congés */}
            {historyLeaves.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Historique ({historyLeaves.length})
                </h3>
                <div className="space-y-2">
                  {historyLeaves.map((leave) => renderLeaveItem(leave))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
