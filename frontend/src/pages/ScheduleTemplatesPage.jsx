// src/pages/ScheduleTemplatesPage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import {
  Calendar,
  Plus,
  Edit2,
  AlertCircle,
  Check,
  Clock,
  Trash2,
} from 'lucide-react';
import {
  listScheduleTemplatesForTeam,
  activateScheduleTemplate,
  deleteScheduleTemplate,
} from '../api/scheduleTemplatesApi';
import { fetchTeamsByManager } from '../api/teamApi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/Badge';
import WorkScheduleConfigurator from '../components/manager/WorkScheduleConfigurator';

export default function ScheduleTemplatesPage() {
  const { user } = useAuth();
  const sidebarItems = getSidebarItems(user?.role);

  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [activatingScheduleId, setActivatingScheduleId] = useState(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState(null);

  // -------- helper d'affichage du pattern --------
  const parseSchedulePattern = (weeklyPatternJson) => {
    console.log(
      '%c[DEBUG weeklyPatternJson] →',
      'color:#4f46e5;font-weight:bold',
      weeklyPatternJson,
      '| type:',
      typeof weeklyPatternJson
    );

    try {
      if (!weeklyPatternJson) {
        return {
          days: 'Non configuré',
          startTime: '-',
          endTime: '-',
          pauseDuration: null,
          startDate: '-',
          endDate: '-'
        };
      }

      const pattern =
        typeof weeklyPatternJson === 'string'
          ? JSON.parse(weeklyPatternJson)
          : weeklyPatternJson;

      const dayKeyToLabel = {
        mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi', thu: 'Jeudi', fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche',
      };

      const activeDayKeys = Object.keys(dayKeyToLabel).filter((key) => {
        const slots = pattern[key];
        return Array.isArray(slots) && slots.length > 0 && Array.isArray(slots[0]);
      });

      if (activeDayKeys.length === 0) {
        // Fallback for old format or empty
        if (Array.isArray(pattern.workDays)) {
          // ... old format logic if needed, or just return default
          // For brevity/robustness, let's just return configured fields if they exist
        }
        return {
          days: 'Non configuré',
          startTime: '-',
          endTime: '-',
          pauseDuration: pattern.pauseDuration || null,
          startDate: pattern.startDate || null,
          endDate: pattern.endDate || null
        };
      }

      const firstDayKey = activeDayKeys[0];
      const firstSlots = pattern[firstDayKey];
      const firstInterval = Array.isArray(firstSlots) && firstSlots[0] ? firstSlots[0] : null;
      const startTime = firstInterval && firstInterval[0] ? firstInterval[0] : '-';
      const endTime = firstInterval && firstInterval[1] ? firstInterval[1] : '-';
      const daysLabel = activeDayKeys.map((key) => dayKeyToLabel[key]).join(', ');

      return {
        days: daysLabel,
        startTime,
        endTime,
        pauseDuration: pattern.pauseDuration || null,
        startDate: pattern.startDate || null,
        endDate: pattern.endDate || null
      };
    } catch (e) {
      console.warn('❗ Format Planning invalide →', weeklyPatternJson, e);
      return {
        days: 'Format invalide',
        startTime: '-',
        endTime: '-',
        pauseDuration: null,
        startDate: '-',
        endDate: '-'
      };
    }
  };

  // Load teams on mount
  useEffect(() => {
    const loadTeams = async () => {
      try {
        setLoading(true);
        const managerTeams = await fetchTeamsByManager(user?.id);
        setTeams(managerTeams);

        if (managerTeams.length > 0) {
          setSelectedTeamId(managerTeams[0].id);
          setSelectedTeamName(managerTeams[0].name);
        }
      } catch (err) {
        console.error('Error loading teams:', err);
        setError('Erreur lors du chargement des équipes');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadTeams();
    }
  }, [user?.id]);

  // Load schedules when team changes
  useEffect(() => {
    const loadSchedules = async () => {
      if (!selectedTeamId) return;

      try {
        setLoading(true);
        setError('');
        const templates = await listScheduleTemplatesForTeam(selectedTeamId);
        setSchedules(templates);
      } catch (err) {
        console.error('Error loading schedules:', err);
        setError('Erreur lors du chargement des plannings');
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [selectedTeamId]);

  const handleTeamChange = (teamId) => {
    const team = teams.find((t) => t.id === teamId);
    setSelectedTeamId(teamId);
    setSelectedTeamName(team?.name || '');
  };

  const handleCreateSchedule = async (template) => {
    setSchedules((prev) => [...prev, template]);
    setIsCreating(false);
  };

  const handleActivateSchedule = async (scheduleId) => {
    try {
      setActivatingScheduleId(scheduleId);
      await activateScheduleTemplate(scheduleId);

      // Mise à jour locale : un seul actif
      setSchedules((prev) =>
        prev.map((s) => ({
          ...s,
          active: s.id === scheduleId,
        }))
      );
    } catch (err) {
      console.error('Error activating schedule:', err);
      setError("Erreur lors de l'activation du planning");
    } finally {
      setActivatingScheduleId(null);
    }
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
  };

  const handleDeleteSchedule = async (schedule) => {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le planning "${schedule.name}" ?`
    );
    if (!confirmed) return;

    try {
      setDeletingScheduleId(schedule.id);
      await deleteScheduleTemplate(schedule.id);
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));

      if (editingSchedule && editingSchedule.id === schedule.id) {
        setEditingSchedule(null);
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Erreur lors de la suppression du planning');
    } finally {
      setDeletingScheduleId(null);
    }
  };

  if (!user || user.role !== 'MANAGER') {
    return (
      <Layout
        sidebarItems={sidebarItems}
        pageTitle="Gestion des plannings"
        userName={user ? `${user.firstName} ${user.lastName}` : ''}
        userRole={user?.role}
      >
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Accès Restreint</h1>
          <p className="text-gray-600">Seuls les managers peuvent gérer les plannings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle="Gestion des plannings"
      userName={user ? `${user.firstName} ${user.lastName}` : ''}
      userRole={user?.role}
    >
      <div className="p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Plannings</h1>
            </div>
            <p className="text-gray-600">
              Créez et gérez les modèles de plannings pour vos équipes
            </p>
          </div>

          {/* Team Selector */}
          {teams.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sélectionner une équipe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {teams.map((team) => (
                    <Button
                      key={team.id}
                      variant={selectedTeamId === team.id ? 'default' : 'outline'}
                      onClick={() => handleTeamChange(team.id)}
                    >
                      {team.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Erreur</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!loading && (
            <div className="flex gap-3 items-center flex-wrap">
              <Button
                onClick={() => setIsCreating(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Créer un planning
              </Button>

              {schedules.length > 0 && (
                <div className="flex gap-2 items-center text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <p>
                    Vous pouvez créer plusieurs modèles de planning pour{' '}
                    {selectedTeamName || 'cette équipe'} (par exemple{' '}
                    <strong>Hiver</strong>, <strong>Rush été</strong>, etc.).<br />
                    Activez, modifiez ou supprimez-les depuis les cartes ci-dessous.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Schedules Grid */}
          {!loading && schedules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-12 pb-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun planning
                </h3>
                <p className="text-gray-600 mb-4">
                  Créez votre premier planning pour {selectedTeamName || 'cette équipe'}
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  Créer un planning
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {schedules.map((schedule) => {
                const pattern = parseSchedulePattern(schedule.weeklyPatternJson);
                const isActive = !!schedule.active;
                const isActivating = activatingScheduleId === schedule.id;
                const isDeleting = deletingScheduleId === schedule.id;

                return (
                  <Card
                    key={schedule.id}
                    className={isActive ? 'border-blue-500 border-2' : ''}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {schedule.name}
                            {isActive && (
                              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Actif
                              </Badge>
                            )}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Days */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Jours de travail
                        </p>
                        <p className="text-sm text-gray-700">{pattern.days}</p>
                      </div>

                      {/* Times */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                            Début
                          </p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-semibold">{pattern.startTime}</p>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                            Fin
                          </p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-semibold">{pattern.endTime}</p>
                          </div>
                        </div>
                        {pattern.pauseDuration && (
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                              Pause
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{pattern.pauseDuration} min</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t mt-4">
                        {/* Summary / Stats */}
                        <div className="w-full mb-2">
                          {/* Net Hours Calculation */}
                          {(() => {
                            if (!pattern.startTime || !pattern.endTime || pattern.startTime === '-') return null;
                            const [sh, sm] = pattern.startTime.split(':').map(Number);
                            const [eh, em] = pattern.endTime.split(':').map(Number);
                            let diff = (eh * 60 + em) - (sh * 60 + sm);
                            if (diff < 0) diff += 24 * 60;
                            if (pattern.pauseDuration) diff -= pattern.pauseDuration;

                            const netH = Math.floor(diff / 60);
                            const netM = diff % 60;

                            const validPeriodStr = (pattern.startDate || pattern.endDate)
                              ? `${pattern.startDate ? 'du ' + pattern.startDate : ''} ${pattern.endDate ? 'au ' + pattern.endDate : ''}`
                              : null;

                            return (
                              <div className="text-sm bg-gray-50 p-2 rounded text-center space-y-1">
                                <p className="font-semibold text-gray-700">
                                  Net: <span className="text-blue-600">{netH}h{netM > 0 ? netM : ''} / jour</span>
                                </p>
                                {validPeriodStr && (
                                  <p className="text-xs text-gray-500">
                                    Validité : {validPeriodStr}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t pt-2">
                        {/* Activer / Actif */}
                        <Button
                          size="sm"
                          variant={isActive ? 'default' : 'outline'}
                          onClick={() => handleActivateSchedule(schedule.id)}
                          disabled={isActivating}
                          className="flex-1 gap-2"
                        >
                          {isActivating ? (
                            <>
                              <div className="w-3 h-3 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
                              Activation...
                            </>
                          ) : isActive ? (
                            <>
                              <Check className="w-4 h-4" />
                              Actif
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Définir comme actif
                            </>
                          )}
                        </Button>

                        {/* Éditer */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditSchedule(schedule)}
                          className="flex-1 gap-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          Éditer
                        </Button>

                        {/* Supprimer */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSchedule(schedule)}
                          disabled={isDeleting}
                          className="flex-1 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {isDeleting ? (
                            <>
                              <div className="w-3 h-3 rounded-full border-2 border-red-200 border-t-red-600 animate-spin"></div>
                              Suppression...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              Supprimer
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Create/Edit Modal */}
          {isCreating && (
            <WorkScheduleConfigurator
              open={isCreating}
              onClose={() => setIsCreating(false)}
              teamId={selectedTeamId}
              teamName={selectedTeamName}
              onSave={handleCreateSchedule}
            />
          )}

          {/* Edit Schedule Modal */}
          {editingSchedule && (
            <WorkScheduleConfigurator
              open={!!editingSchedule}
              onClose={() => setEditingSchedule(null)}
              teamId={selectedTeamId}
              teamName={selectedTeamName}
              schedule={editingSchedule}
              onSave={(updated) => {
                setSchedules((prev) =>
                  prev.map((s) => (s.id === updated.id ? updated : s))
                );
                setEditingSchedule(null);
              }}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}