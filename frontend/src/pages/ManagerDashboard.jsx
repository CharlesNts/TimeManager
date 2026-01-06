// src/pages/ManagerDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import {
  Users,
  Clock,
  TrendingUp,
  Building2,
  Plus,
  CalendarCheck, // Changed Icon
  CalendarClock,
  AlertCircle,
} from 'lucide-react';
import api from '../api/client';
import reportsApi from '../api/reportsApi';
import scheduleTemplatesApi from '../api/scheduleTemplatesApi';
import TeamFormModal from '../components/manager/TeamFormModal';
import WorkScheduleConfigurator from '../components/manager/WorkScheduleConfigurator';
import PendingLeavesWidget from '../components/manager/PendingLeavesWidget';
import { exportManagerDashboardPDF } from '../utils/pdfExport';
import { exportManagerDashboardCSV } from '../utils/csvExport';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import KPICard from '../components/dashboard/KPICard';
import PeriodSelector from '../components/manager/PeriodSelector';
import ExportMenu from '../components/ui/ExportMenu';
import { buildChartSeries } from '../api/statsApi';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { getPeriodInfo, getDisplayPeriodBoundaries } from '../utils/granularityUtils';
import { calculateScheduledMinutesFromTemplate } from '../utils/scheduleUtils';
import { toParis } from '../utils/dateUtils';
import ChartModal from '../components/ui/ChartModal';

// Helper pour afficher le rôle côté UI (CEO -> ADMIN)
function displayRole(role) {
  if (!role) return '';
  return role === 'CEO' ? 'ADMIN' : role;
}

// Helper function to format minutes
function fmtMinutes(v) {
  if (typeof v !== 'number') return '—'
  const h = Math.floor(v / 60)
  const m = v % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Custom Tooltip context-aware for different chart types
const CustomTooltip = ({ active, payload, type = 'hours' }) => {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0].value
  const label = payload[0].payload?.label || payload[0].payload?.name || 'N/A'

  let title = 'Heures travaillées'
  let formattedValue = fmtMinutes(value)

  if (type === 'adherence') {
    title = 'Adhérence'
    formattedValue = `${value}%`
  } else if (type === 'teams') {
    title = 'Par Équipe'
    formattedValue = fmtMinutes(value)
  } else if (type === 'comparison') {
    title = 'Évolution'
    formattedValue = `${value >= 0 ? '+' : ''}${value}%`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md p-2">
      <p className="text-xs font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{formattedValue}</p>
    </div>
  )
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sidebarItems = getSidebarItems(user?.role);

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalMembers: 0,
    activeMembers: 0,
    totalHoursThisWeek: 0,
  });

  // KPI states avec charts
  const [selectedGranularity, setSelectedGranularity] = useState('week');
  const selectedPeriod = getPeriodInfo(selectedGranularity).periodCount;
  const [hoursTotals, setHoursTotals] = useState({ current: 0, previous: 0 });
  const [hoursChartSeries, setHoursChartSeries] = useState([]);

  const [teamComparisonData, setTeamComparisonData] = useState([]); // New state for Team Comparison

  const [adherenceData, setAdherenceData] = useState({ rate: 0, scheduledHours: 0, chartSeries: [] });
  const [latenessData, setLatenessData] = useState({ rate: 0, lateDays: 0, totalDays: 0, chartSeries: [], evolutionRate: 0 });

  // Chart modal state
  const [chartModal, setChartModal] = useState({ open: false, type: null, title: '', subtitle: '', data: [], chartType: 'area', config: {} });

  // extract loadDashboard so it can be called after team creation
  const loadDashboard = useCallback(async () => {
    if (!user || user.role !== 'MANAGER') return;

    setLoading(true);
    try {
      // Charger les équipes du manager
      const { data: myTeams } = await api.get('/api/teams', {
        params: { managerId: user.id }
      });

      const teamsArray = Array.isArray(myTeams) ? myTeams : [];

      // Pour chaque équipe, charger les membres
      const teamsWithMembers = await Promise.all(
        teamsArray.map(async (team) => {
          try {
            const { data: members } = await api.get(`/api/teams/${team.id}/members`);
            return {
              ...team,
              members: Array.isArray(members) ? members : [],
              memberCount: Array.isArray(members) ? members.length : 0,
            };
          } catch {
            return { ...team, members: [], memberCount: 0 };
          }
        })
      );

      // Calculer les stats globales (Unique users)
      const allMembers = teamsWithMembers.flatMap(t => t.members);
      const uniqueMemberIds = [...new Set(allMembers.map(m => m.user?.id || m.userId).filter(Boolean))];
      const totalMembers = uniqueMemberIds.length;

      // Calculer les membres actifs (ceux qui ont une session ouverte)
      let activeMembersCount = 0;
      let totalMinutesThisWeek = 0;
      const memberMinutesMap = {}; // Store minutes per user

      // Pour chaque membre UNIQUE, vérifier son dernier clock
      await Promise.all(
        uniqueMemberIds.map(async (userId) => {
          let minutesForUser = 0;

          try {
            // Récupérer le dernier clock
            const { data: clocks } = await api.get(`/api/users/${userId}/clocks`, {
              params: { page: 0, size: 1, sort: 'clockIn,desc' }
            });
            const lastClock = clocks?.content?.[0];

            // Si le dernier clock n'a pas de clockOut, l'utilisateur est actif
            if (lastClock && !lastClock.clockOut) {
              activeMembersCount++;
            }

            // Calculer les heures de cette semaine (NET HOURS)
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - 6);
            startOfWeek.setHours(0, 0, 0, 0);

            try {
              const hoursData = await reportsApi.getUserHours(
                userId,
                startOfWeek.toISOString(),
                now.toISOString()
              );
              minutesForUser = Math.round((hoursData.netHours || 0) * 60);
            } catch (e) {
              console.warn(`[ManagerDashboard] Erreur getUserHours pour ${userId}:`, e);
              // Fallback au calcul manuel si endpoint échoue (ex: ancienne version API cache)
              const { data: weekClocks } = await api.get(`/api/users/${userId}/clocks/range`, {
                params: { from: startOfWeek.toISOString(), to: now.toISOString() }
              });
              if (Array.isArray(weekClocks)) {
                weekClocks.forEach(clock => {
                  const clockIn = new Date(clock.clockIn);
                  const clockOut = clock.clockOut ? new Date(clock.clockOut) : now;
                  const minutes = Math.round((clockOut - clockIn) / 60000);
                  minutesForUser += Math.max(0, minutes);
                });
              }
            }

            memberMinutesMap[userId] = minutesForUser;
            totalMinutesThisWeek += minutesForUser;

          } catch (err) {
            console.warn(`[ManagerDashboard] Erreur pour membre ${userId}:`, err);
          }
        })
      );

      // Re-map teams to include their total minutes (Summing distinct member contributions per team)
      const teamsWithStats = teamsWithMembers.map(team => {
        const teamMinutes = team.members.reduce((acc, member) => {
          const userId = member.user?.id ?? member.userId;
          return acc + (memberMinutesMap[userId] || 0);
        }, 0);
        return { ...team, minutesThisWeek: teamMinutes };
      });

      const totalHours = Math.floor(totalMinutesThisWeek / 60);

      setTeams(teamsWithStats);
      setStats({
        totalTeams: teamsWithStats.length,
        totalMembers,
        activeMembers: activeMembersCount,
        totalHoursThisWeek: totalHours,
      });

    } catch (err) {
      console.error('[ManagerDashboard] Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Charger les vraies statistiques avec charts
  useEffect(() => {
    if (!stats.totalMembers || !user) return;

    const loadRealStats = async () => {
      try {
        const now = new Date();
        const periodBoundaries = getDisplayPeriodBoundaries(selectedGranularity);

        const startOfCurrentPeriod = periodBoundaries[0].startDate;
        const endOfCurrentPeriod = now;

        // Single Period for Evolution
        const latestPeriod = periodBoundaries[periodBoundaries.length - 1];
        const singleCurrentStart = latestPeriod.startDate;
        const singleCurrentEnd = latestPeriod.endDate;

        let singlePreviousStart, singlePreviousEnd;
        if (periodBoundaries.length >= 2) {
          const prev = periodBoundaries[periodBoundaries.length - 2];
          singlePreviousStart = prev.startDate;
          singlePreviousEnd = prev.endDate;
        } else {
          singlePreviousStart = new Date(singleCurrentStart);
          if (selectedGranularity === 'day') singlePreviousStart.setDate(singlePreviousStart.getDate() - 1);
          else if (selectedGranularity === 'week') singlePreviousStart.setDate(singlePreviousStart.getDate() - 7);
          singlePreviousEnd = new Date(singleCurrentStart);
        }

        // eslint-disable-next-line no-unused-vars
        let totalCurrentMinutes = 0;
        let singleCurrentMinutes = 0;
        let singlePreviousMinutes = 0;

        const dailyHoursMap = {}; // Actual hours worked
        let dailyScheduledMap = {}; // Scheduled hours from templates
        let totalScheduledMinutes = 0;

        // Extract Unique Users
        const allMemberIds = teams.flatMap(team =>
          team.members.map(member => member.user?.id || member.userId)
        ).filter(Boolean);
        const uniqueMemberIds = [...new Set(allMemberIds)];

        const userStatsMap = {}; // { userId: { totalMin: 0, clocks: [] } }

        // Map team -> member count for schedule calculation
        const teamMemberCountMap = {};
        teams.forEach(t => {
          teamMemberCountMap[t.id] = t.members.length;
        });

        // 1. Parallel Fetch: Clocks for all users AND Schedule Templates for all teams
        const allResults = await Promise.all([
          // Fetch Clocks for all users
          Promise.all(uniqueMemberIds.map(async (userId) => {
            try {
              const { data } = await api.get(`/api/users/${userId}/clocks/range`, {
                params: { from: startOfCurrentPeriod.toISOString(), to: endOfCurrentPeriod.toISOString() }
              });
              return { userId, clocks: Array.isArray(data) ? data : [] };
            } catch (e) { return { userId, clocks: [] }; }
          })),
          // Fetch Active Schedule Templates for all teams
          Promise.all(teams.map(async (team) => {
            try {
              const schedule = await scheduleTemplatesApi.getActiveForTeam(team.id);
              return { teamId: team.id, schedule };
            } catch (e) { return { teamId: team.id, schedule: null }; }
          })),
          // Fetch Lateness Rate for all users (Current Month)
          Promise.all(uniqueMemberIds.map(async (userId) => {
            const currentMonthStr = startOfCurrentPeriod.toISOString().substring(0, 7); // YYYY-MM
            try {
              return await reportsApi.getUserLatenessRate(userId, currentMonthStr);
            } catch (e) { return { totalDaysWithClock: 0, lateDays: 0 }; }
          }))
        ]);

        const clocksResults = allResults[0];
        const scheduleResults = allResults[1];
        const latenessResults = allResults[2];

        // --- Calculate Aggregated Lateness ---
        const totalLatenessStats = latenessResults.reduce((acc, curr) => {
          return {
            totalDays: acc.totalDays + (curr.totalDaysWithClock || 0),
            lateDays: acc.lateDays + (curr.lateDays || 0)
          };
        }, { totalDays: 0, lateDays: 0 });

        const aggregatedLatenessRate = totalLatenessStats.totalDays > 0
          ? (totalLatenessStats.lateDays / totalLatenessStats.totalDays) * 100
          : 0;

        setLatenessData({
          rate: aggregatedLatenessRate,
          lateDays: totalLatenessStats.lateDays,
          totalDays: totalLatenessStats.totalDays,
          chartSeries: [], // TODO: Calculate monthly series for manager view
          evolutionRate: 0 // TODO: Calculate evolution vs previous period
        });

        // 2. Process Clocks (Actual Volume)
        clocksResults.forEach(({ userId, clocks }) => {
          userStatsMap[userId] = { totalMin: 0, clocks };

          clocks.forEach(clock => {
            const clockIn = new Date(clock.clockIn);
            const clockOut = clock.clockOut ? new Date(clock.clockOut) : now;
            const minutes = Math.max(0, Math.round((clockOut - clockIn) / 60000));

            // Global Stats
            totalCurrentMinutes += minutes;
            userStatsMap[userId].totalMin += minutes;

            if (clockIn >= singleCurrentStart && clockIn <= singleCurrentEnd) {
              singleCurrentMinutes += minutes;
            } else if (clockIn >= singlePreviousStart && clockIn <= singlePreviousEnd) {
              singlePreviousMinutes += minutes;
            }

            // Daily Map (Actual)
            const dayKey = toParis(clockIn).toISOString().split('T')[0];
            dailyHoursMap[dayKey] = (dailyHoursMap[dayKey] || 0) + minutes;
          });
        });

        // 3. Calculate Scheduled Hours from Schedule Templates
        scheduleResults.forEach(({ teamId, schedule }) => {
          if (!schedule) return;

          const memberCount = teamMemberCountMap[teamId] || 0;
          if (memberCount === 0) return;

          const scheduledData = calculateScheduledMinutesFromTemplate(
            startOfCurrentPeriod,
            endOfCurrentPeriod,
            schedule
          );

          // Multiply by number of members (each member should work those hours)
          totalScheduledMinutes += scheduledData.totalMinutes * memberCount;
          Object.entries(scheduledData.dailyMap).forEach(([dayKey, minutes]) => {
            dailyScheduledMap[dayKey] = (dailyScheduledMap[dayKey] || 0) + (minutes * memberCount);
          });
        });

        // 4. Aggregate Per Team (using processed user stats)
        const teamMinutesMap = {};
        teams.forEach(team => {
          let teamTotalMinutes = 0;
          team.members.forEach(member => {
            const userId = member.user?.id || member.userId;
            if (userStatsMap[userId]) {
              teamTotalMinutes += userStatsMap[userId].totalMin;
            }
          });
          teamMinutesMap[team.id] = { name: team.name, minutes: teamTotalMinutes };
        });

        // Build Team Comparison Data
        const comparisonData = Object.values(teamMinutesMap)
          .map(t => ({ name: t.name, value: Math.round(t.minutes / 60 * 10) / 10 }))
          .sort((a, b) => b.value - a.value);

        setTeamComparisonData(comparisonData);

        // Chart Data: Hours
        const hoursPerPeriod = periodBoundaries.map(period => {
          let totalMin = 0;
          Object.entries(dailyHoursMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) totalMin += minutes;
          });
          return { date: period.label, minutesWorked: totalMin };
        });

        // Chart Data: Adherence (Worked vs Scheduled from Template)
        const adherencePerPeriod = periodBoundaries.map(period => {
          let worked = 0;
          let scheduled = 0;

          // Sum worked hours for this period
          Object.entries(dailyHoursMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) worked += minutes;
          });

          // Sum scheduled hours for this period (from template)
          Object.entries(dailyScheduledMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) scheduled += minutes;
          });

          // Adherence = min(worked, scheduled) / scheduled * 100
          // Cap at 100% (can't have more than 100% adherence)
          const overlap = Math.min(worked, scheduled);
          const rate = scheduled > 0 ? Math.min(100, Math.round((overlap / scheduled) * 100)) : 0;

          return { date: period.label, value: rate };
        });

        // Global adherence: total worked capped at scheduled / total scheduled
        const totalWorkedMinutes = Object.values(dailyHoursMap).reduce((a, b) => a + b, 0);
        const totalOverlapMinutes = Math.min(totalWorkedMinutes, totalScheduledMinutes);
        // eslint-disable-next-line no-unused-vars
        const globalAdherenceRate = totalScheduledMinutes > 0
          ? Math.min(100, (totalOverlapMinutes / totalScheduledMinutes) * 100)
          : 0;

        const hoursData = buildChartSeries(hoursPerPeriod, 12, selectedPeriod);
        const adherenceForChart = adherencePerPeriod.map(p => ({ date: p.date, minutesWorked: p.value }));
        const adherenceSeries = buildChartSeries(adherenceForChart, 12, selectedPeriod);

        // Calcul de la moyenne des heures par période (au lieu du total)
        const avgMinutesPerPeriod = hoursPerPeriod.length > 0
          ? hoursPerPeriod.reduce((sum, p) => sum + p.minutesWorked, 0) / hoursPerPeriod.length
          : 0;
        const hoursAverageDisplay = Math.round(avgMinutesPerPeriod / 60 * 100) / 100;

        // Calcul de la moyenne d'adhérence (moyenne des points du graphique)
        const avgAdherenceRate = adherencePerPeriod.length > 0
          ? adherencePerPeriod.reduce((sum, p) => sum + p.value, 0) / adherencePerPeriod.length
          : 0;

        const scheduledHoursDisplay = Math.round(totalScheduledMinutes / 60);

        // Evolution logic
        const singleCurrentHours = singleCurrentMinutes / 60;
        const singlePreviousHours = singlePreviousMinutes / 60;
        const evolutionRate = singlePreviousHours > 0
          ? ((singleCurrentHours - singlePreviousHours) / singlePreviousHours) * 100
          : 0;

        let evolutionLabel = "vs période précédente";
        if (selectedGranularity === 'week') evolutionLabel = "vs jour précédent";
        if (selectedGranularity === 'month') evolutionLabel = "vs semaine précédente";
        if (selectedGranularity === 'year') evolutionLabel = "vs mois précédent";

        setHoursTotals({
          current: hoursAverageDisplay,
          currentMinutes: avgMinutesPerPeriod,
          evolutionRate: evolutionRate,
          evolutionLabel: evolutionLabel
        });

        setHoursChartSeries(hoursData);

        setAdherenceData({
          rate: avgAdherenceRate,
          scheduledHours: scheduledHoursDisplay,
          chartSeries: adherenceSeries
        });

      } catch (err) {
        console.error('[ManagerDashboard] Erreur chargement statistiques:', err);
      }
    };

    loadRealStats();
  }, [stats.totalMembers, selectedGranularity, selectedPeriod, teams, user, loadDashboard]);

  // --- Team creation modal state ---
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamModalMode, setTeamModalMode] = useState('create');

  // --- Work schedule configurator state ---
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedTeamForSchedule, setSelectedTeamForSchedule] = useState(null);
  const [scheduleForConfig, setScheduleForConfig] = useState(null);

  const handleOpenCreateTeam = () => {
    setTeamModalMode('create');
    setIsTeamModalOpen(true);
  };

  const handleOpenScheduleConfig = async (team) => {
    setSelectedTeamForSchedule(team);
    try {
      const active = await scheduleTemplatesApi.getActiveForTeam(team.id);
      setScheduleForConfig(active || null);
    } catch (e) {
      console.error('Erreur chargement planning actif:', e);
      setScheduleForConfig(null);
    }
    setIsScheduleModalOpen(true);
  };

  const handleSaveTeam = async (savedTeam) => {
    try {
      // Le modal a déjà créé l'équipe et nous renvoie l'objet créé
      setIsTeamModalOpen(false);
      await loadDashboard();

      // Proposer de configurer les horaires après création
      const shouldConfig = window.confirm(
        `Équipe "${savedTeam.name}" créée avec succès !\n\nVoulez-vous configurer les horaires de travail maintenant ?`
      );
      if (shouldConfig && savedTeam) {
        setSelectedTeamForSchedule(savedTeam);
        setIsScheduleModalOpen(true);
      }
    } catch (e) {
      alert(e.message || 'Erreur post-création');
    }
  };


  const handleExportPDF = () => {
    const chartData = {
      hoursTotals,
      hoursChartSeries,
      teamComparisonData,
      adherenceRate: adherenceData.rate,
    };
    const granularityLabel = getPeriodInfo(selectedGranularity).label;
    exportManagerDashboardPDF(user, stats, teams, chartData, granularityLabel);
  };

  const handleExportCSV = () => {
    const chartData = {
      hoursTotals,
      hoursChartSeries,
      teamComparisonData,
      adherenceRate: adherenceData.rate,
    };
    const granularityLabel = getPeriodInfo(selectedGranularity).label;
    exportManagerDashboardCSV(user, stats, teams, chartData, granularityLabel);
  };

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle="Dashboard Manager"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={displayRole(user?.role)}
    >
      <div className="p-8 space-y-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Manager</h1>
                <p className="text-gray-500 mt-1">
                  Gérez vos équipes et suivez les performances
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportMenu
                  onExportPDF={handleExportPDF}
                  onExportCSV={handleExportCSV}
                  variant="outline"
                />
                {/* Manager can create teams locally via modal */}
                <Button
                  onClick={handleOpenCreateTeam}
                  variant="default"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Créer une équipe
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Chargement...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Layout en 2 colonnes : Équipes à gauche (33%), Statistiques à droite (67%) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Colonne gauche : Vos équipes (33%) */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          Vos équipes
                        </CardTitle>
                        <CardDescription>
                          {teams.length} équipe{teams.length > 1 ? 's' : ''} gérée{teams.length > 1 ? 's' : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {teams.length === 0 ? (
                          <div className="text-center py-8">
                            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                              Aucune équipe
                            </h3>
                            <p className="text-xs text-gray-500 mb-3">
                              Créez votre première équipe
                            </p>
                            <Button
                              onClick={handleOpenCreateTeam}
                              size="sm"
                              className="w-full"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Créer
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {teams.map(team => (
                              <div
                                key={team.id}
                                className="p-3 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition cursor-pointer"
                                onClick={() => navigate(`/teams/${team.id}`)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-sm text-gray-900">{team.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1 truncate">{team.description || 'Aucune description'}</p>
                                    <div className="flex items-center mt-2 text-xs text-gray-600">
                                      <Users className="w-3 h-3 mr-1" />
                                      {team.memberCount} {team.memberCount > 1 ? 'membres' : 'membre'}
                                      <span className="mx-2">•</span>
                                      <Clock className="w-3 h-3 mr-1" />
                                      {Math.round((team.minutesThisWeek || 0) / 60)}h
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenScheduleConfig(team);
                                    }}
                                    title="Configurer les horaires"
                                  >
                                    <CalendarClock className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button
                              onClick={handleOpenCreateTeam}
                              variant="outline"
                              size="sm"
                              className="w-full mt-3"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Créer une équipe
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Colonne droite : Statistiques globales (67%) */}
                <div className="lg:col-span-2">
                  {/* Info rapide sur les équipes - KPIs simples */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                    <KPICard
                      title="Mes Équipes"
                      value={stats.totalTeams}
                      icon={Building2}
                    />
                    <KPICard
                      title="Total Membres"
                      value={stats.totalMembers}
                      icon={Users}
                    />
                    <KPICard
                      title="Actifs maintenant"
                      value={stats.activeMembers}
                      icon={TrendingUp}
                    />
                    <KPICard
                      title="Cette semaine"
                      value={`${stats.totalHoursThisWeek}h`}
                      icon={Clock}
                    />
                    <KPICard
                      title="Taux de retard"
                      value={`${latenessData.rate.toFixed(1)}%`}
                      icon={AlertCircle}
                      trend={latenessData.lateDays > 0 ? `${latenessData.lateDays} jour(s) en retard` : "Aucun retard"}
                      // trendUp={false} // Force red if supported
                      color="text-amber-600"
                    />
                  </div>

                  {/* Statistiques détaillées */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">Mes statistiques</CardTitle>
                          <CardDescription>
                            Aperçu des performances de vos équipes - {getPeriodInfo(selectedGranularity).label}
                          </CardDescription>
                        </div>
                        <ExportMenu
                          onExportPDF={handleExportPDF}
                          onExportCSV={handleExportCSV}
                          variant="default"
                        />
                      </div>
                      <div className="pt-4">
                        <PeriodSelector selectedGranularity={selectedGranularity} onGranularityChange={setSelectedGranularity} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Heures moyennes par période */}
                        <Card
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setChartModal({
                            open: true,
                            title: 'Heures moyennes par période',
                            subtitle: getPeriodInfo(selectedGranularity).label,
                            data: hoursChartSeries,
                            chartType: 'area',
                            config: { color: 'var(--color-desktop)', gradientId: 'hoursModalFill', tooltipType: 'hours' }
                          })}
                        >
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                              Heures moyennes par période
                            </CardTitle>
                            <Clock className="h-4 w-4 text-gray-400" />
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-end gap-2">
                              <div className="text-2xl font-bold">
                                {Math.floor(hoursTotals.current)}h {Math.round((hoursTotals.current % 1) * 60)}m
                              </div>
                              <div className={`text-sm mb-1 font-medium ${hoursTotals.evolutionRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {hoursTotals.evolutionRate >= 0 ? "↗" : "↘"} {Math.abs(hoursTotals.evolutionRate).toFixed(1)}%
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Moyenne • {hoursTotals.evolutionLabel || "vs période précédente"}</p>
                            <div className="h-[120px] mt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={hoursChartSeries} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                                  <defs>
                                    <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="6%" stopColor="var(--color-desktop)" stopOpacity={0.16} />
                                      <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.03} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                                  <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 12 }} />
                                  <YAxis hide />
                                  <RechartsTooltip content={<CustomTooltip type="hours" />} cursor={false} />
                                  <Area type="monotone" dataKey="value" stroke="var(--color-desktop)" fill="url(#hoursFill)" strokeWidth={2} dot={false} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">Cliquer pour agrandir</p>
                          </CardContent>
                        </Card>

                        {/* Adhérence Planning */}
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
                            <div className="text-2xl font-bold">{adherenceData.rate.toFixed(1)}%</div>
                            <p className="text-xs text-gray-500 mt-2">
                              Moyenne • {adherenceData.scheduledHours}h planifiées
                            </p>
                            <div className="h-[120px] mt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={adherenceData.chartSeries} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                                  <defs>
                                    <linearGradient id="adhFill" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="6%" stopColor="#10b981" stopOpacity={0.16} />
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                                  <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 12 }} />
                                  <YAxis hide />
                                  <RechartsTooltip content={<CustomTooltip type="adherence" />} cursor={false} />
                                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#adhFill)" strokeWidth={2} dot={false} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">Cliquer pour agrandir</p>
                          </CardContent>
                        </Card>

                        {/* Comparaison des Équipes */}
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
                            <Users className="h-4 w-4 text-gray-400" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {teamComparisonData.length > 0 ? teamComparisonData[0]?.name : 'Aucune donnée'}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Équipe la plus active sur la période</p>
                            <div className="h-[120px] mt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={teamComparisonData} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                                  <XAxis dataKey="name" axisLine={false} tick={{ fontSize: 12 }} interval={0} />
                                  <YAxis hide />
                                  <RechartsTooltip content={<CustomTooltip type="teams" />} cursor={false} />
                                  <Bar dataKey="value" fill="var(--color-desktop)" radius={[4, 4, 0, 0]}>
                                    {teamComparisonData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#94a3b8'} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">Cliquer pour agrandir</p>
                          </CardContent>
                        </Card>

                        {/* Taux de retard */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                              Taux de retard de l&apos;équipe
                            </CardTitle>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{latenessData.rate.toFixed(1)}%</div>
                            <p className="text-xs text-gray-500 mt-2">
                              {latenessData.lateDays} jour(s) en retard • {latenessData.totalDays} jours travaillés
                            </p>
                            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                              <p className="text-xs text-amber-700">
                                Taux agrégé pour tous les membres de vos équipes sur le mois en cours.
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Pending Leaves Widget */}
              <div>
                <PendingLeavesWidget />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team modal - rendered globally so it can open regardless of teams list */}
      <TeamFormModal
        isOpen={isTeamModalOpen}
        mode={teamModalMode}
        team={null}
        onClose={() => setIsTeamModalOpen(false)}
        onSave={handleSaveTeam}
        userRole={user?.role}
        currentUserId={user?.id}
      />

      {/* Work schedule configurator modal */}
      <WorkScheduleConfigurator
        open={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        teamId={selectedTeamForSchedule?.id}
        teamName={selectedTeamForSchedule?.name}
        schedule={scheduleForConfig}
        onSave={() => {
          setIsScheduleModalOpen(false);
          loadDashboard();
        }}
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