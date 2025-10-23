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
} from 'lucide-react';
import {
  listScheduleTemplatesForTeam,
  activateScheduleTemplate,
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

  // Load teams on mount
  useEffect(() => {
    const loadTeams = async () => {
      try {
        setLoading(true);
        const managerTeams = await fetchTeamsByManager(user?.id);
        setTeams(managerTeams);

        // Set first team as default
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

      // Update local state
      setSchedules((prev) =>
        prev.map((s) => ({
          ...s,
          active: s.id === scheduleId,
        }))
      );
    } catch (err) {
      console.error('Error activating schedule:', err);
      setError('Erreur lors de l\'activation du planning');
    } finally {
      setActivatingScheduleId(null);
    }
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
  };

  const parseSchedulePattern = (jsonString) => {
    try {
      const pattern = JSON.parse(jsonString);
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const daysLabel = pattern.workDays
        .map((d) => dayNames[d])
        .join(', ');
      return {
        days: daysLabel,
        startTime: pattern.startTime,
        endTime: pattern.endTime,
      };
    } catch {
      return {
        days: 'Format invalide',
        startTime: '-',
        endTime: '-',
      };
    }
  };

  if (!user || user.role !== 'MANAGER') {
    return (
      <Layout sidebarItems={sidebarItems}>
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Accès Restreint</h1>
          <p className="text-gray-600">Seuls les managers peuvent gérer les plannings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-8">
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <div className="w-4 h-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
              Chargement des plannings...
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!loading && (
          <div className="flex gap-3">
            {schedules.length === 0 ? (
              <Button
                onClick={() => setIsCreating(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Créer un planning
              </Button>
            ) : (
              <div className="flex gap-2 items-center text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p>
                  Un planning existe déjà pour {selectedTeamName}.
                  <strong className="ml-1">Modifiez-le directement</strong> depuis la carte ci-dessous.
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
              return (
                <Card
                  key={schedule.id}
                  className={schedule.active ? 'border-blue-500 border-2' : ''}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {schedule.name}
                          {schedule.active && (
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
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      {!schedule.active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActivateSchedule(schedule.id)}
                          disabled={activatingScheduleId === schedule.id}
                          className="flex-1 gap-2"
                        >
                          {activatingScheduleId === schedule.id ? (
                            <>
                              <div className="w-3 h-3 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
                              Activation...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Activer
                            </>
                          )}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditSchedule(schedule)}
                        className="flex-1 gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        Éditer
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
    </Layout>
  );
}
