// src/pages/TeamsList.jsx
import React, { useEffect, useState } from 'react';
import { Users, Plus, CalendarCheck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import TeamCard from '../components/manager/TeamCard';
import TeamFormModal from '../components/manager/TeamFormModal';
import PeriodSelector from '../components/manager/PeriodSelector';
import ExportMenu from '../components/ui/ExportMenu';
import ChartModal from '../components/ui/ChartModal';
import api from '../api/client';
import scheduleTemplatesApi from '../api/scheduleTemplatesApi';
import {
  fetchTeamsForCurrentUser,
  deleteTeam,
} from '../api/teamApi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
// buildChartSeries imported from statsApi below
import { getPeriodInfo, getDisplayPeriodBoundaries } from '../utils/granularityUtils';
import { calculateScheduledMinutesFromTemplate } from '../utils/scheduleUtils';
import { toParis } from '../utils/dateUtils';
import { exportTeamsListPDF } from '../utils/pdfExport';
import { exportTeamsListCSV } from '../utils/csvExport';

// Helper function to format minutes
function fmtMinutes(v) {
  if (typeof v !== 'number') return '—'
  const h = Math.floor(v / 60)
  const m = v % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Custom Tooltip with per-team breakdown
const CustomTooltip = ({ active, payload, type = 'hours' }) => {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  const value = payload[0].value
  const label = data?.label || data?.name || 'N/A'
  const teamsBreakdown = data?.teamsBreakdown || []

  let title = 'Heures travaillées'
  let formattedValue = fmtMinutes(value)

  if (type === 'adherence') {
    title = 'Adhérence'
    formattedValue = `${Math.round(value)}%`
  } else if (type === 'teams') {
    title = 'Par Équipe'
    formattedValue = `${value}h`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-lg p-3 max-w-xs">
      <p className="text-xs font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-700 mb-2">{formattedValue}</p>
      {teamsBreakdown.length > 0 && (
        <div className="border-t pt-2 mt-1">
          <p className="text-xs font-medium text-gray-500 mb-1">Par équipe :</p>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {teamsBreakdown.slice(0, 5).map((t, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-600 truncate mr-2" style={{ maxWidth: '100px' }}>{t.name}</span>
                <span className="font-medium text-gray-800">
                  {type === 'adherence' ? `${t.value}%` : fmtMinutes(t.value)}
                </span>
              </div>
            ))}
            {teamsBreakdown.length > 5 && (
              <p className="text-xs text-gray-400">+{teamsBreakdown.length - 5} autres...</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
};

export default function TeamsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sidebarItems = getSidebarItems(user?.role);

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Granularity and Charts
  const [selectedGranularity, setSelectedGranularity] = useState('week');
  const selectedPeriod = getPeriodInfo(selectedGranularity).periodCount;
  const [teamComparisonData, setTeamComparisonData] = useState([]);
  const [, setHoursChartSeries] = useState([]);
  const [adherenceData, setAdherenceData] = useState({ rate: 0, chartSeries: [] });
  const [chartModal, setChartModal] = useState({ open: false, title: '', subtitle: '', data: [], chartType: 'bar', config: {} });
  const [statsLoading, setStatsLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setErr('');
    try {
      if (user?.role === 'CEO') {
        const { data: allUsers } = await api.get('/api/users');
        const managerIds = (allUsers || [])
          .filter((u) => u.role === 'MANAGER' || u.role === 'CEO')
          .map((u) => u.id);

        const perManager = await Promise.all(
          managerIds.map((id) =>
            api
              .get('/api/teams', { params: { managerId: id } })
              .then((res) => Array.isArray(res.data) ? res.data : [])
              .catch(() => [])
          )
        );

        const merged = perManager.flat();
        const byId = new Map();
        for (const t of merged) {
          if (t && t.id != null) byId.set(t.id, t);
        }
        const allTeams = Array.from(byId.values());

        // Charger le nombre de membres pour chaque équipe
        const memberCounts = await Promise.all(
          allTeams.map((t) =>
            api.get(`/api/teams/${t.id}/members`)
              .then((res) => Array.isArray(res.data) ? res.data.length : 0)
              .catch(() => 0)
          )
        );

        const normalized = allTeams.map((t, index) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          managerName: t.manager ? `${t.manager.firstName} ${t.manager.lastName}` : '—',
          memberCount: memberCounts[index],
        }));

        setTeams(normalized);
      } else {
        const data = await fetchTeamsForCurrentUser(user);
        setTeams(data);
      }
    } catch (e) {
      setErr(e.message || 'Erreur lors du chargement des équipes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  // Load Stats for Graphs
  useEffect(() => {
    if (!teams.length || user?.role !== 'CEO') {
      setStatsLoading(false);
      return;
    }

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const now = new Date();
        const periodBoundaries = getDisplayPeriodBoundaries(selectedGranularity);
        const startOfCurrentPeriod = periodBoundaries[0].startDate;
        const endOfCurrentPeriod = now;

        // Fetch members for all teams
        const teamsWithMembers = await Promise.all(
          teams.map(async (team) => {
            try {
              const { data: members } = await api.get(`/api/teams/${team.id}/members`);
              return { ...team, members: Array.isArray(members) ? members : [] };
            } catch {
              return { ...team, members: [] };
            }
          })
        );

        // Get unique user IDs
        const allMemberIds = teamsWithMembers.flatMap(t => t.members.map(m => m.user?.id || m.userId)).filter(Boolean);
        const uniqueMemberIds = [...new Set(allMemberIds)];

        // Fetch clocks and schedules in parallel
        const [clocksResults, scheduleResults] = await Promise.all([
          Promise.all(uniqueMemberIds.map(async (userId) => {
            try {
              const { data } = await api.get(`/api/users/${userId}/clocks/range`, {
                params: { from: startOfCurrentPeriod.toISOString(), to: endOfCurrentPeriod.toISOString() }
              });
              return { userId, clocks: Array.isArray(data) ? data : [] };
            } catch { return { userId, clocks: [] }; }
          })),
          Promise.all(teamsWithMembers.map(async (team) => {
            try {
              const schedule = await scheduleTemplatesApi.getActiveForTeam(team.id);
              return { teamId: team.id, schedule, memberCount: team.members.length };
            } catch { return { teamId: team.id, schedule: null, memberCount: team.members.length }; }
          }))
        ]);

        // Per-team daily hours map (for per-team breakdown in tooltips)
        const teamDailyHoursMap = {}; // { teamId: { dayKey: minutes } }
        teamsWithMembers.forEach(team => {
          teamDailyHoursMap[team.id] = { name: team.name, dailyMap: {} };
        });

        // Process clocks - also track per-team daily hours
        const userStatsMap = {};
        const dailyHoursMap = {};
        clocksResults.forEach(({ userId, clocks }) => {
          userStatsMap[userId] = { totalMin: 0 };
          clocks.forEach(clock => {
            const clockIn = new Date(clock.clockIn);
            const clockOut = clock.clockOut ? new Date(clock.clockOut) : now;
            const minutes = Math.max(0, Math.round((clockOut - clockIn) / 60000));
            userStatsMap[userId].totalMin += minutes;

            const clockInParis = toParis(clockIn);
            const dayKey = `${clockInParis.getFullYear()}-${String(clockInParis.getMonth() + 1).padStart(2, '0')}-${String(clockInParis.getDate()).padStart(2, '0')}`;
            dailyHoursMap[dayKey] = (dailyHoursMap[dayKey] || 0) + minutes;

            // Track per-team
            teamsWithMembers.forEach(team => {
              const isMember = team.members.some(m => (m.user?.id || m.userId) === userId);
              if (isMember) {
                if (!teamDailyHoursMap[team.id].dailyMap[dayKey]) {
                  teamDailyHoursMap[team.id].dailyMap[dayKey] = 0;
                }
                teamDailyHoursMap[team.id].dailyMap[dayKey] += minutes;
              }
            });
          });
        });

        // Process schedules
        let dailyScheduledMap = {};
        scheduleResults.forEach(({ schedule, memberCount }) => {
          if (!schedule || memberCount === 0) return;
          const scheduledData = calculateScheduledMinutesFromTemplate(startOfCurrentPeriod, endOfCurrentPeriod, schedule);
          Object.entries(scheduledData.dailyMap).forEach(([dayKey, minutes]) => {
            dailyScheduledMap[dayKey] = (dailyScheduledMap[dayKey] || 0) + (minutes * memberCount);
          });
        });

        // Team Comparison Data
        const teamMinutesMap = {};
        teamsWithMembers.forEach(team => {
          let teamTotalMinutes = 0;
          team.members.forEach(member => {
            const userId = member.user?.id || member.userId;
            if (userStatsMap[userId]) {
              teamTotalMinutes += userStatsMap[userId].totalMin;
            }
          });
          teamMinutesMap[team.id] = { name: team.name, minutes: teamTotalMinutes };
        });

        const comparisonData = Object.values(teamMinutesMap)
          .map(t => ({ name: t.name, value: Math.round(t.minutes / 60 * 10) / 10 }))
          .sort((a, b) => b.value - a.value);

        setTeamComparisonData(comparisonData);

        // Hours Chart with per-team breakdown
        const hoursPerPeriod = periodBoundaries.map(period => {
          let totalMin = 0;
          const teamsBreakdown = [];

          Object.entries(dailyHoursMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) totalMin += minutes;
          });

          // Per-team breakdown for this period
          // eslint-disable-next-line no-unused-vars
          Object.entries(teamDailyHoursMap).forEach(([_teamId, teamData]) => {
            let teamMin = 0;
            Object.entries(teamData.dailyMap).forEach(([dayKey, minutes]) => {
              const dayDate = new Date(dayKey);
              if (dayDate >= period.startDate && dayDate <= period.endDate) teamMin += minutes;
            });
            if (teamMin > 0) {
              teamsBreakdown.push({ name: teamData.name, value: teamMin });
            }
          });

          teamsBreakdown.sort((a, b) => b.value - a.value);

          return {
            label: period.label,
            value: totalMin,
            teamsBreakdown
          };
        });

        setHoursChartSeries(hoursPerPeriod);

        // Adherence Chart with per-team breakdown
        const adherencePerPeriod = periodBoundaries.map(period => {
          let worked = 0;
          let scheduled = 0;
          const teamsBreakdown = [];

          Object.entries(dailyHoursMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) worked += minutes;
          });

          Object.entries(dailyScheduledMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) scheduled += minutes;
          });

          const overlap = Math.min(worked, scheduled);
          const rate = scheduled > 0 ? Math.min(100, Math.round((overlap / scheduled) * 100)) : 0;

          // Per-team adherence (simplified - based on hours worked)
          // eslint-disable-next-line no-unused-vars
          Object.entries(teamDailyHoursMap).forEach(([_teamId, teamData]) => {
            let teamWorked = 0;
            Object.entries(teamData.dailyMap).forEach(([dayKey, minutes]) => {
              const dayDate = new Date(dayKey);
              if (dayDate >= period.startDate && dayDate <= period.endDate) teamWorked += minutes;
            });
            // Simplified: show team hours contribution as % of total
            const teamRate = worked > 0 ? Math.round((teamWorked / worked) * 100) : 0;
            if (teamWorked > 0) {
              teamsBreakdown.push({ name: teamData.name, value: teamRate });
            }
          });

          teamsBreakdown.sort((a, b) => b.value - a.value);

          return { label: period.label, value: rate, teamsBreakdown };
        });

        const avgAdherenceRate = adherencePerPeriod.length > 0
          ? adherencePerPeriod.reduce((sum, p) => sum + p.value, 0) / adherencePerPeriod.length
          : 0;

        setAdherenceData({
          rate: avgAdherenceRate,
          chartSeries: adherencePerPeriod
        });

      } catch (err) {
        console.error('[TeamsList] Error loading stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.length, selectedGranularity, selectedPeriod, user?.role]);

  const handleTeamClick = (teamId) => {
    navigate(`/teams/${teamId}`);
  };

  const handleCreateTeam = () => {
    setModalMode('create');
    setSelectedTeam(null);
    setIsModalOpen(true);
  };

  const handleEditTeam = (team) => {
    setModalMode('edit');
    setSelectedTeam(team);
    setIsModalOpen(true);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) return;
    try {
      await deleteTeam(teamId);
      await load();
    } catch (e) {
      alert(e.message || 'Suppression impossible');
    }
  };

  const handleSaveTeam = async () => {
    try {
      setIsModalOpen(false);
      await load();
    } catch (e) {
      alert(e.message || 'Erreur de rechargement');
    }
  };

  const handleExportPDF = () => {
    exportTeamsListPDF(
      visibleTeams,
      {
        teamComparisonData,
        adherenceRate: adherenceData.rate,
      },
      getPeriodInfo(selectedGranularity).label
    );
  };

  const handleExportCSV = () => {
    exportTeamsListCSV(
      visibleTeams,
      {
        teamComparisonData,
        adherenceRate: adherenceData.rate,
      },
      getPeriodInfo(selectedGranularity).label
    );
  };

  const visibleTeams = teams;

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle="Mes équipes"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestion des équipes</h1>
              {!loading && (
                <p className="text-gray-500 mt-1">
                  {visibleTeams.length} {visibleTeams.length > 1 ? 'équipes' : 'équipe'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <ExportMenu
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                variant="outline"
              />

              {user?.role === 'CEO' && (
                <Button
                  onClick={handleCreateTeam}
                  variant="default"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une équipe
                </Button>
              )}
            </div>
          </div>

          {/* Stats Section (CEO only) */}
          {user?.role === 'CEO' && !loading && visibleTeams.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Statistiques des équipes</CardTitle>
                    <CardDescription>
                      Aperçu des performances - {getPeriodInfo(selectedGranularity).label}
                    </CardDescription>
                  </div>
                  <PeriodSelector selectedGranularity={selectedGranularity} onGranularityChange={setSelectedGranularity} />
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-gray-500 text-sm">Chargement des statistiques...</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Team Comparison */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setChartModal({
                        open: true,
                        title: 'Comparaison des Équipes',
                        subtitle: `Heures travaillées - ${getPeriodInfo(selectedGranularity).label}`,
                        data: teamComparisonData,
                        chartType: 'bar',
                        config: { tooltipType: 'teams', barColors: ['#2563eb', '#94a3b8'] }
                      })}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Comparaison des Équipes
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="h-[180px] mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={teamComparisonData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                              <RechartsTooltip content={<CustomTooltip type="teams" />} cursor={{ fill: 'transparent' }} />
                              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18}>
                                {teamComparisonData.slice(0, 5).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#94a3b8'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-center text-gray-400 mt-2">Top 5 équipes • Cliquer pour tout voir</p>
                      </CardContent>
                    </Card>

                    {/* Adherence */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setChartModal({
                        open: true,
                        title: 'Adhérence moyenne',
                        subtitle: getPeriodInfo(selectedGranularity).label,
                        data: adherenceData.chartSeries,
                        chartType: 'area',
                        config: { color: '#10b981', gradientId: 'adhModalFill', tooltipType: 'adherence' }
                      })}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Adhérence moyenne
                        </CardTitle>
                        <CalendarCheck className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">{adherenceData.rate.toFixed(1)}%</div>
                        <div className="h-[120px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={adherenceData.chartSeries} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                              <defs>
                                <linearGradient id="adhFillTeams" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="6%" stopColor="#10b981" stopOpacity={0.16} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                              <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 11 }} />
                              <YAxis hide />
                              <RechartsTooltip content={<CustomTooltip type="adherence" />} cursor={false} />
                              <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#adhFillTeams)" strokeWidth={2} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">Cliquer pour agrandir</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* States */}
          {loading && <div className="text-gray-600">Chargement…</div>}
          {err && <div className="text-red-600 mb-4">{err}</div>}

          {/* Grille */}
          {!loading && visibleTeams.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  teamName={team.name}
                  description={team.description}
                  memberCount={team.memberCount ?? 0}
                  managerName={team.managerName}
                  onClick={() => handleTeamClick(team.id)}
                  onEdit={() => handleEditTeam(team)}
                  onDelete={() => handleDeleteTeam(team.id)}
                  showActions={user?.role === 'CEO'}
                />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && !visibleTeams.length && !err && (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="mb-2">
                  Aucune équipe pour le moment
                </CardTitle>
                <CardDescription className="mb-4">
                  {user?.role === 'CEO'
                    ? 'Commencez par créer votre première équipe'
                    : "Vous n'êtes membre d'aucune équipe"}
                </CardDescription>
                {user?.role === 'CEO' && (
                  <Button
                    onClick={handleCreateTeam}
                    variant="default"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer une équipe
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal création/édition */}
      <TeamFormModal
        isOpen={isModalOpen}
        mode={modalMode}
        team={selectedTeam}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTeam}
        userRole={user?.role}
        currentUserId={user?.id}
      />

      {/* Chart modal for enlarged view */}
      <ChartModal
        open={chartModal.open}
        onClose={() => setChartModal({ ...chartModal, open: false })}
        title={chartModal.title}
        subtitle={chartModal.subtitle}
        data={chartModal.data}
        type={chartModal.chartType}
        chartConfig={chartModal.config}
        CustomTooltip={CustomTooltip}
      />
    </Layout>
  );
}