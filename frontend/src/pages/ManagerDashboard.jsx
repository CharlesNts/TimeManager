// src/pages/ManagerDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import {
  Users,
  User,
  Clock,
  TrendingUp,
  Building2,
  Plus,
  AlertCircle,
  CalendarClock,
} from 'lucide-react';
import api from '../api/client';
import TeamFormModal from '../components/manager/TeamFormModal';
import WorkScheduleConfigurator from '../components/manager/WorkScheduleConfigurator';
import PendingLeavesWidget from '../components/manager/PendingLeavesWidget';
import { createTeam } from '../api/teamApi';
import { exportManagerDashboardPDF } from '../utils/pdfExport';
import { exportManagerDashboardCSV } from '../utils/csvExport';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import KPICard from '../components/dashboard/KPICard';
import PeriodSelector from '../components/manager/PeriodSelector';
import ExportMenu from '../components/ui/ExportMenu';
import { buildChartSeries } from '../api/statsApi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { getPeriodInfo, getDisplayPeriodBoundaries, getDisplayPeriodBoundariesShifted } from '../utils/granularityUtils';
import { toParis } from '../utils/dateUtils';

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
  const label = payload[0].payload?.label || 'N/A'

  let title = 'Heures travaillées'
  let formattedValue = fmtMinutes(value)

  if (type === 'lateness') {
    title = 'Jours en retard'
    formattedValue = value > 0 ? '✓ Retard' : 'À l\'heure'
  } else if (type === 'avg') {
    title = 'Moyenne'
    formattedValue = fmtMinutes(value)
  } else if (type === 'comparison') {
    title = 'Comparaison'
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
  const selectedPeriod = getPeriodInfo(selectedGranularity).periodCount; // For backward compatibility
  const [hoursTotals, setHoursTotals] = useState({ current: 0, previous: 0 });
  const [avgTotals, setAvgTotals] = useState({ current: 0, previous: 0 });
  const [hoursChartSeries, setHoursChartSeries] = useState([]);
  const [avgChartSeries, setAvgChartSeries] = useState([]);
  const [latenessData, setLatenessData] = useState({ totalDays: 0, lateDays: 0, rate: 0, lateDaysChartSeries: [] });

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

        // Calculer les stats globales
        const totalMembers = teamsWithMembers.reduce((sum, t) => sum + t.memberCount, 0);
        
        // Calculer les membres actifs (ceux qui ont une session ouverte)
        const allMembers = teamsWithMembers.flatMap(t => t.members);
        let activeMembersCount = 0;
        let totalMinutesThisWeek = 0;
        
        // Pour chaque membre, vérifier son dernier clock
        await Promise.all(
          allMembers.map(async (member) => {
            const userId = member.user?.id ?? member.userId;
            if (!userId) return;
            
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
              
              // Calculer les heures de cette semaine
              const now = new Date();
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - 6); // 7 derniers jours
              startOfWeek.setHours(0, 0, 0, 0);
              
              const { data: weekClocks } = await api.get(`/api/users/${userId}/clocks/range`, {
                params: {
                  from: startOfWeek.toISOString(),
                  to: now.toISOString()
                }
              });
              
              if (Array.isArray(weekClocks)) {
                weekClocks.forEach(clock => {
                  const clockIn = new Date(clock.clockIn);
                  const clockOut = clock.clockOut ? new Date(clock.clockOut) : now;
                  const minutes = Math.round((clockOut - clockIn) / 60000);
                  totalMinutesThisWeek += Math.max(0, minutes);
                });
              }
            } catch (err) {
              console.warn(`[ManagerDashboard] Erreur pour membre ${userId}:`, err);
            }
          })
        );
        
        const totalHours = Math.floor(totalMinutesThisWeek / 60);
        
        setTeams(teamsWithMembers);
        setStats({
          totalTeams: teamsWithMembers.length,
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
    loadDashboard();
    
    const loadRealStats = async () => {
      try {
        const now = new Date();

        // Utiliser les vraies périodes d'affichage pour la granularité sélectionnée
        const periodBoundaries = getDisplayPeriodBoundaries(selectedGranularity);
        const previousBoundaries = getDisplayPeriodBoundariesShifted(selectedGranularity, 1);

        // La période actuelle commence au début de la première période d'affichage
        const startOfCurrentPeriod = periodBoundaries[0].startDate;
        const endOfCurrentPeriod = now;

        // La période précédente
        const startOfPreviousPeriod = previousBoundaries[0].startDate;
        const endOfPreviousPeriod = startOfCurrentPeriod;

        // Récupérer tous les membres de toutes les équipes
        const allMemberIds = teams.flatMap(team => 
          team.members.map(member => member.user?.id || member.userId)
        ).filter(Boolean);
        
        let totalCurrentMinutes = 0;
        let totalPreviousMinutes = 0;
        let totalLateDays = 0;
        let totalWorkedDays = 0;
        const dailyHoursMap = {};
        const dailyLateMap = {}; // Ajouter un map pour les retards par jour
        
        // Pour chaque membre, récupérer les heures travaillées
        await Promise.all(
          allMemberIds.map(async (userId) => {
            try {
              // Période actuelle
              const { data: currentClocks } = await api.get(`/api/users/${userId}/clocks/range`, {
                params: {
                  from: startOfCurrentPeriod.toISOString(),
                  to: endOfCurrentPeriod.toISOString()
                }
              });

              // Période précédente
              const { data: previousClocks } = await api.get(`/api/users/${userId}/clocks/range`, {
                params: {
                  from: startOfPreviousPeriod.toISOString(),
                  to: endOfPreviousPeriod.toISOString()
                }
              });
              
              // Calculer les minutes pour la période actuelle
              if (Array.isArray(currentClocks)) {
                currentClocks.forEach(clock => {
                  const clockIn = new Date(clock.clockIn);
                  const clockOut = clock.clockOut ? new Date(clock.clockOut) : now;
                  const minutes = Math.round((clockOut - clockIn) / 60000);
                  totalCurrentMinutes += Math.max(0, minutes);

                  // Regrouper par jour pour le graphique (utiliser l'heure de Paris pour la clé du jour)
                  const clockInParis = toParis(clockIn);
                  const yearStr = clockInParis.getFullYear();
                  const monthStr = String(clockInParis.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(clockInParis.getDate()).padStart(2, '0');
                  const dayKey = `${yearStr}-${monthStr}-${dayStr}`;
                  dailyHoursMap[dayKey] = (dailyHoursMap[dayKey] || 0) + minutes;

                  // Vérifier si c'est un retard (après 9h30 heure de Paris)
                  if (clockInParis.getHours() > 9 || (clockInParis.getHours() === 9 && clockInParis.getMinutes() >= 30)) {
                    totalLateDays++;
                    dailyLateMap[dayKey] = (dailyLateMap[dayKey] || 0) + 1;
                  }
                });
                totalWorkedDays += currentClocks.length;
              }
              
              // Calculer les minutes pour la période précédente
              if (Array.isArray(previousClocks)) {
                previousClocks.forEach(clock => {
                  const clockIn = new Date(clock.clockIn);
                  const clockOut = clock.clockOut ? new Date(clock.clockOut) : startOfCurrentPeriod;
                  const minutes = Math.round((clockOut - clockIn) / 60000);
                  totalPreviousMinutes += Math.max(0, minutes);
                });
              }
            } catch (err) {
              console.warn(`[ManagerDashboard] Erreur stats pour utilisateur ${userId}:`, err);
            }
          })
        );
        
        // Calculer les moyennes
        const avgCurrentMinutes = allMemberIds.length > 0 ? totalCurrentMinutes / allMemberIds.length : 0;
        const avgPreviousMinutes = allMemberIds.length > 0 ? totalPreviousMinutes / allMemberIds.length : 0;

        // Aggreger les heures par période
        const hoursPerPeriod = periodBoundaries.map(period => {
          let totalMin = 0;
          Object.entries(dailyHoursMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey + 'T00:00:00');
            if (dayDate >= period.startDate && dayDate <= period.endDate) {
              totalMin += minutes;
            }
          });
          return { date: period.label, minutesWorked: totalMin };
        });

        // Aggreger les retards par période
        const latePerPeriod = periodBoundaries.map(period => {
          let lateCount = 0;
          Object.entries(dailyLateMap).forEach(([dayKey, count]) => {
            const dayDate = new Date(dayKey + 'T00:00:00');
            if (dayDate >= period.startDate && dayDate <= period.endDate) {
              lateCount += count;
            }
          });
          return { date: period.label, minutesWorked: lateCount > 0 ? 1 : 0 };
        });

        // Moyenne par période
        const periodsWithWork = periodBoundaries.filter(p =>
          hoursPerPeriod.find(h => h.date === p.label && h.minutesWorked > 0)
        ).length || 1;
        const avgPeriodicMin = Math.round(totalCurrentMinutes / periodsWithWork);
        const avgData = hoursPerPeriod.map(hp => ({ date: hp.date, minutesWorked: avgPeriodicMin }));

        // Calculer le taux de retard
        const latenessRate = totalWorkedDays > 0 ? (totalLateDays / totalWorkedDays) * 100 : 0;

        const hoursData = buildChartSeries(hoursPerPeriod, 12, selectedPeriod);
        const avgChartData = buildChartSeries(avgData, 12, selectedPeriod);
        const latenessSeries = buildChartSeries(latePerPeriod, 12, selectedPeriod);

        // Convertir les minutes en heures pour l'affichage
        const hoursCurrentDisplay = Math.round(totalCurrentMinutes / 60 * 100) / 100; // 2 décimales
        const hoursPreviousDisplay = Math.round(totalPreviousMinutes / 60 * 100) / 100;
        const avgCurrentDisplay = Math.round(avgCurrentMinutes / 60 * 100) / 100;
        const avgPreviousDisplay = Math.round(avgPreviousMinutes / 60 * 100) / 100;
        
        setHoursTotals({
          current: hoursCurrentDisplay,
          previous: hoursPreviousDisplay,
          currentMinutes: totalCurrentMinutes,
          previousMinutes: totalPreviousMinutes
        });
        
        setAvgTotals({
          current: avgCurrentDisplay,
          previous: avgPreviousDisplay,
          currentMinutes: avgCurrentMinutes,
          previousMinutes: avgPreviousMinutes
        });
        
        setHoursChartSeries(hoursData);
        setAvgChartSeries(avgChartData);
        
        setLatenessData({
          totalDays: totalWorkedDays,
          lateDays: totalLateDays,
          rate: latenessRate,
          lateDaysChartSeries: latenessSeries
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

  const handleOpenCreateTeam = () => {
    setTeamModalMode('create');
    setIsTeamModalOpen(true);
  };
  
  const handleOpenScheduleConfig = (team) => {
    setSelectedTeamForSchedule(team);
    setIsScheduleModalOpen(true);
  };

  const handleSaveTeam = async (teamData) => {
    try {
      const payload = {
        name: teamData.name,
        description: teamData.description,
        managerId: teamData.managerId || user?.id,
      };
      const createdTeam = await createTeam(payload);
      setIsTeamModalOpen(false);
      await loadDashboard();
      
      // Proposer de configurer les horaires après création
      const shouldConfig = window.confirm(
        `Équipe "${payload.name}" créée avec succès !\n\nVoulez-vous configurer les horaires de travail maintenant ?`
      );
      if (shouldConfig && createdTeam) {
        setSelectedTeamForSchedule(createdTeam);
        setIsScheduleModalOpen(true);
      }
    } catch (e) {
      alert(e.message || 'Enregistrement impossible');
    }
  };

  const handleExportPDF = () => {
    exportManagerDashboardPDF(user, stats, teams);
  };

  const handleExportCSV = () => {
    exportManagerDashboardCSV(user, stats, teams);
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                        {/* Heures totales */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                              Heures totales équipes
                            </CardTitle>
                            <Clock className="h-4 w-4 text-gray-400" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {Math.floor(hoursTotals.current)}h {Math.round((hoursTotals.current % 1) * 60)}m
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{getPeriodInfo(selectedGranularity).label}</p>
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
                          </CardContent>
                        </Card>

                        {/* Taux de retard */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                              Taux de retard
                            </CardTitle>
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{latenessData.rate.toFixed(1)}%</div>
                            <p className="text-xs text-gray-500 mt-2">{latenessData.lateDays} jours en retard sur {latenessData.totalDays} jours travaillés</p>
                            <div className="h-[120px] mt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={latenessData.lateDaysChartSeries} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                                  <defs>
                                    <linearGradient id="lateFill" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="6%" stopColor="var(--color-mobile)" stopOpacity={0.16} />
                                      <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.03} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                                  <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 12 }} />
                                  <YAxis hide />
                                  <RechartsTooltip content={<CustomTooltip type="lateness" />} cursor={false} />
                                  <Area type="monotone" dataKey="value" stroke="var(--color-mobile)" fill="url(#lateFill)" strokeWidth={2} dot={false} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Moyenne par membre */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                              Moyenne par membre
                            </CardTitle>
                            <User className="h-4 w-4 text-gray-400" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {Math.floor(avgTotals.current)}h {Math.round((avgTotals.current % 1) * 60)}m
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Moyenne par {selectedGranularity === 'day' ? 'jour' : selectedGranularity === 'week' ? 'semaine' : selectedGranularity === 'month' ? 'mois' : 'année'}</p>
                            <div className="h-[120px] mt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={avgChartSeries} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                                  <defs>
                                    <linearGradient id="avgFill" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="6%" stopColor="var(--color-mobile)" stopOpacity={0.16} />
                                      <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.03} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                                  <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 12 }} />
                                  <YAxis hide />
                                  <RechartsTooltip content={<CustomTooltip type="avg" />} cursor={false} />
                                  <Area type="monotone" dataKey="value" stroke="var(--color-mobile)" fill="url(#avgFill)" strokeWidth={2} dot={false} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Comparaison */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                              Comparaison
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-gray-400" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {hoursTotals.currentMinutes >= hoursTotals.previousMinutes ? "↗" : "↘"} 
                              {" "}
                              {hoursTotals.previousMinutes > 0 ? Math.abs(((hoursTotals.currentMinutes - hoursTotals.previousMinutes) / hoursTotals.previousMinutes * 100).toFixed(1)) : '0'}%
                            </div>
                            <p className="text-xs text-gray-500 mt-2">vs période précédente</p>
                            <div className="h-[120px] mt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={hoursChartSeries} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                                  <defs>
                                    <linearGradient id="compFill" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="6%" stopColor="var(--color-desktop)" stopOpacity={0.16} />
                                      <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.03} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                                  <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 12 }} />
                                  <YAxis hide />
                                  <RechartsTooltip content={<CustomTooltip type="comparison" />} cursor={false} />
                                  <Area type="monotone" dataKey="value" stroke="var(--color-desktop)" fill="url(#compFill)" strokeWidth={2} dot={false} />
                                </AreaChart>
                              </ResponsiveContainer>
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
          onSave={() => {
            setIsScheduleModalOpen(false);
            loadDashboard(); // Recharger les données après sauvegarde
          }}
        />
    </Layout>
  );
}