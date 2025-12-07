import React, { useEffect, useState } from 'react';
import { Check, X, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { getPendingLeaves, approveLeave, rejectLeave, getLeaveTypeLabel } from '../../api/leavesApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/Badge';

export default function PendingLeavesWidget() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [showRejectNote, setShowRejectNote] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [backendNotConfigured] = useState(true); // Backend bug: ByteBuddyInterceptor serialization error - needs @JsonIgnoreProperties fix

  useEffect(() => {
    loadPendingLeaves();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingLeaves, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingLeaves = async () => {
    try {
      setError('');
      const data = await getPendingLeaves();
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[PendingLeavesWidget] Error loading:', err);
      setError('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      setProcessingId(leaveId);
      await approveLeave(leaveId);
      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
    } catch (err) {
      console.error('[PendingLeavesWidget] Error approving:', err);
      setError('Erreur lors de l\'approbation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (leaveId) => {
    try {
      setProcessingId(leaveId);
      await rejectLeave(leaveId, rejectNote || 'Demande rejetée');
      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      setShowRejectNote(null);
      setRejectNote('');
    } catch (err) {
      console.error('[PendingLeavesWidget] Error rejecting:', err);
      setError('Erreur lors du rejet');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Demandes de congés en attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Backend note: The /api/leaves/pending endpoint needs to be configured to filter
  // requests by manager. Currently it returns ALL pending leaves in the system.
  // The proper query exists in the repository but isn't wired in the controller/service.
  if (backendNotConfigured) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Demandes de congés en attente
          </CardTitle>
          <CardDescription>
            Fonctionnalité en configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800 font-semibold mb-2">⚠️ Fonctionnalité non disponible</p>
            <p className="text-xs text-yellow-700 mb-3">
              Le backend n&apos;est pas encore configuré pour filtrer les demandes de congés par manager.
            </p>
            <details className="text-xs text-yellow-700">
              <summary className="cursor-pointer font-semibold mb-2">Détails techniques (cliquer pour voir)</summary>
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-left font-mono text-xs space-y-1">
                <p><strong>Erreur:</strong> ByteBuddyInterceptor serialization error (500)</p>
                <p><strong>Cause:</strong> L&apos;entité LeaveRequest retourne des proxies Hibernate non sérialisables.</p>
                <p><strong>Solution:</strong> Ajouter @JsonIgnoreProperties(&quot;hibernateLazyInitializer&quot;, &quot;handler&quot;) sur LeaveRequest.java</p>
                <p><strong>Status:</strong> En attente de correction backend</p>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leaves.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Demandes de congés en attente
          </CardTitle>
          <CardDescription>
            Aucune demande à approuver actuellement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">Toutes les demandes sont à jour</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Demandes de congés en attente
        </CardTitle>
        <CardDescription>
          {leaves.length} demande{leaves.length > 1 ? 's' : ''} à approuver
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {leaves.map((leave) => (
            <div key={leave.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">
                    {leave.employeeName || `Employé #${leave.employeeId}`}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getLeaveTypeLabel(leave.type)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {formatDate(leave.startAt)} à {formatDate(leave.endAt)}
                    </Badge>
                  </div>
                </div>
              </div>

              {leave.reason && (
                <p className="text-xs text-gray-600 mb-2 italic">
                  &quot;{leave.reason}&quot;
                </p>
              )}

              {showRejectNote === leave.id ? (
                <div className="space-y-2 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Raison du rejet (optionnel)..."
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    rows="2"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRejectNote(null)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(leave.id)}
                      disabled={processingId === leave.id}
                      className="flex-1"
                    >
                      {processingId === leave.id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Rejet...
                        </>
                      ) : (
                        'Confirmer le rejet'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRejectNote(leave.id)}
                    disabled={processingId === leave.id}
                    className="flex-1 gap-1 text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                    Rejeter
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(leave.id)}
                    disabled={processingId === leave.id}
                    className="flex-1 gap-1"
                  >
                    {processingId === leave.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Approuver
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
