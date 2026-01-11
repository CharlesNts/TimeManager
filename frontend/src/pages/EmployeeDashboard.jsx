// src/pages/EmployeeDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClockNotification } from '../hooks/useClockNotification';
// import { useNotifications } from '../hooks/useNotifications'; // Removed
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import ClockActions from '../components/employee/ClockActions';
import ClockCalendarView from '../components/employee/ClockCalendarView';
import RequestLeaveModal from '../components/employee/RequestLeaveModal';
import PeriodSelector from '../components/manager/PeriodSelector';
import { Clock, AlertTriangle, Briefcase, ArrowLeft, Calendar, CalendarCheck, AlertCircle } from 'lucide-react';
import api from '../api/client';
import { getClocksInRange } from '../api/clocks.api';
import reportsApi from '../api/reportsApi';
import scheduleTemplatesApi from '../api/scheduleTemplatesApi';
import { buildChartSeries } from '../api/statsApi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { exportEmployeeDashboardPDF } from '../utils/pdfExport';
import { exportEmployeeDashboardCSV } from '../utils/csvExport';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/Badge';
import ChartModal from '../components/ui/ChartModal';
import ExportMenu from '../components/ui/ExportMenu';

import {
  toParis,
  toISO
} from '../utils/dateUtils';

import {
  getPeriodInfo,
  getDisplayPeriodBoundaries
} from '../utils/granularityUtils';

import { calculateScheduledMinutesFromTemplate, getLatenessThresholdFromSchedule } from '../utils/scheduleUtils';

// Helper functions for charts
function fmtMinutes(v) {
  if (typeof v !== 'number') return '—'
  const h = Math.floor(v / 60)
  const m = v % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

function CustomTooltip({ active, payload, type = 'hours' }) {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0].value
  const label = payload[0].payload?.label || 'N/A'

  let title = 'Heures travaillées'
  let formattedValue = fmtMinutes(Math.round(value))

  if (type === 'adherence') {
    title = 'Adhérence'
    formattedValue = `${Math.round(value)}%`
  } else if (type === 'lateness') {
    title = 'Taux de retard'
    formattedValue = `${value.toFixed(1)}%`
  } else if (type === 'avg') {
    title = 'Moyenne'
    formattedValue = fmtMinutes(Math.round(value))
  } else if (type === 'comparison') {
    title = 'Comparaison'
    formattedValue = `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md p-2">
      <p className="text-xs font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{formattedValue}</p>
    </div>
  )
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();

  const [viewedEmployee, setViewedEmployee] = useState(null);
  const isViewingOtherEmployee = !!userId;
  const targetUserId = userId || user?.id;
  const targetUser = isViewingOtherEmployee ? viewedEmployee : user;

  const sidebarItems = getSidebarItems(user?.role);

  const [hasClockedInToday, setHasClockedInToday] = useState(false);
  const [currentStatus, setCurrentStatus] = useState({ status: 'not-clocked', label: 'Non pointé', icon: '⏰', color: 'secondary' });
  const [selectedGranularity, setSelectedGranularity] = useState('week');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Chart modal state
  const [chartModal, setChartModal] = useState({ open: false, type: null, title: '', subtitle: '', data: [], chartType: 'area', config: {} });

  // Load viewed employee
  useEffect(() => {
    if (isViewingOtherEmployee && userId) {
      const loadEmployee = async () => {
        try {
          const { data } = await api.get(`/api/users/${userId}`);
          setViewedEmployee(data);
        } catch (err) {
          console.error('[EmployeeDashboard] Erreur chargement employé:', err);
          navigate('/dashboard');
        }
      };
      loadEmployee();
    }
  }, [userId, isViewingOtherEmployee, navigate]);

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [selectedGranularity]);

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Status Check
  useEffect(() => {
    const loadToday = async () => {
      try {
        const { data } = await api.get(`/api/users/${targetUserId}/clocks`, {
          params: { page: 0, size: 1, sort: 'clockIn,desc' },
        });
        const lastSession = data?.content?.[0] || null;

        const today = toParis(new Date());
        today.setHours(0, 0, 0, 0);
        const hasClockedToday = lastSession && lastSession.clockIn
          ? toParis(new Date(lastSession.clockIn)) >= today
          : false;

        const isClockedIn = !!(lastSession && !lastSession.clockOut);

        setHasClockedInToday(hasClockedToday);

        if (!isClockedIn) {
          setCurrentStatus({ status: 'not-clocked', label: 'Non pointé', icon: '⏰', color: 'secondary' });
        } else {
          const mockKey = `clock-pauses-${lastSession.id}`;
          const raw = localStorage.getItem(mockKey);
          const pauses = raw ? JSON.parse(raw) : [];
          const lastPause = pauses?.length ? pauses[pauses.length - 1] : null;
          const isOnBreak = !!(lastPause && !lastPause.endAt);

          if (isOnBreak) {
            setCurrentStatus({ status: 'on-break', label: 'En pause', icon: '☕', color: 'outline' });
          } else {
            setCurrentStatus({ status: 'working', label: 'En travail', icon: '💼', color: 'default' });
          }
        }
      } catch (err) {
        console.error('Erreur chargement statut:', err);
        setHasClockedInToday(false);
        setCurrentStatus({ status: 'not-clocked', label: 'Non pointé', icon: '⏰', color: 'secondary' });
      }
    };
    if (targetUserId) loadToday();
  }, [targetUserId, refreshKey]);

  // KPIs & Charts State
  const [recentClocks, setRecentClocks] = useState([]);
  const [hoursChartSeries, setHoursChartSeries] = useState([]);
  const [, setAvgChartSeries] = useState([]);
  const [adherenceData, setAdherenceData] = useState({ rate: 0, scheduledHours: 0, chartSeries: [], evolutionRate: 0 });
  const [stats, setStats] = useState({
    hoursCurrent: 0,
    minutesCurrent: 0,
    evolutionRate: 0,
    evolutionLabel: '',
    avgCurrent: 0
  });
  const [latenessData, setLatenessData] = useState({ rate: 0, lateDays: 0, totalDays: 0, chartSeries: [], evolutionRate: 0 });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useClockNotification(hasClockedInToday, user?.role, isViewingOtherEmployee);
  // const { notifications, markAsRead } = useNotifications(hasClockedInToday, user?.role); // Removed

  const [teamsForUser, setTeamsForUser] = useState([]);
  const [schedulesByTeam, setSchedulesByTeam] = useState({});

  // Load Teams and their Schedule Templates
  useEffect(() => {
    let cancel = false;
    const load = async () => {
      if (!targetUserId) return;
      try {
        const mod = await import('../api/teamApi');
        const data = await mod.fetchUserMemberships(targetUserId);
        if (!cancel) setTeamsForUser(Array.isArray(data) ? data : []);

        if (Array.isArray(data) && data.length > 0) {
          const schedules = {};
          for (const team of data) {
            try {
              const schedule = await scheduleTemplatesApi.getActiveForTeam(team.id);
              if (schedule) {
                schedules[team.id] = schedule;
              }
            } catch (e) {
              console.warn(`[EmployeeDashboard] No schedule for team ${team.id}:`, e?.message);
            }
          }
          if (!cancel) setSchedulesByTeam(schedules);
        }
      } catch (e) {
        console.warn('[EmployeeDashboard] unable to load teams:', e?.message || e);
        if (!cancel) setTeamsForUser([]);
      }
    };
    load();
    return () => { cancel = true; };
  }, [targetUserId]);

  // Load Stats
  useEffect(() => {
    if (!targetUserId) return;

    const loadKpis = async () => {
      try {
        const now = new Date();
        const periodBoundaries = getDisplayPeriodBoundaries(selectedGranularity);
        const { periodCount } = getPeriodInfo(selectedGranularity);

        const startOfCurrentPeriod = periodBoundaries[0].startDate;
        const endOfCurrentPeriod = now;

        // Evolution: Comparer la période TOTALE actuelle vs la période TOTALE précédente
        // Ex: Semaine = comparer les 7 derniers jours vs les 7 jours avant
        // Ex: Mois = comparer les 4 dernières semaines vs les 4 semaines avant
        const periodDurationMs = endOfCurrentPeriod.getTime() - startOfCurrentPeriod.getTime();
        const previousPeriodEnd = new Date(startOfCurrentPeriod.getTime() - 1); // Juste avant le début de la période actuelle
        const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDurationMs);
        previousPeriodStart.setHours(0, 0, 0, 0);
        previousPeriodEnd.setHours(23, 59, 59, 999);

        // Fetch Clocks Current Period
        const clocksRange = await getClocksInRange(targetUserId, startOfCurrentPeriod, endOfCurrentPeriod);

        // Fetch Clocks Previous Period (for evolution) - Client side calculation to avoid server 500s
        const previousClocksRange = await getClocksInRange(targetUserId, previousPeriodStart, previousPeriodEnd);

        // Calculate Minutes Helper
        const calcTotalMinutes = (clocks) => {
          return clocks.reduce((acc, c) => {
            const inD = new Date(c.clockIn);
            // If currently working (no clockOut), use now, or ignore? 
            // Usually for stats we count up to now if it's today.
            const outD = c.clockOut ? new Date(c.clockOut) : (new Date().getDate() === inD.getDate() ? new Date() : inD); 
            const minutes = Math.max(0, Math.round((outD - inD) / 60000));
            return acc + minutes;
          }, 0);
        };

        const totalCurrentMinutes = calcTotalMinutes(clocksRange);
        const previousPeriodMinutes = calcTotalMinutes(previousClocksRange);

        // Evolution Calculation
        const currentHours = totalCurrentMinutes / 60;
        const previousHours = previousPeriodMinutes / 60;
        let evolutionRate = 0;

        if (previousHours > 0) {
          evolutionRate = ((currentHours - previousHours) / previousHours) * 100;
        } else if (currentHours > 0) {
          evolutionRate = 100;
        }

        // Lateness Calculation (Client Side)
        let currentLatenessRate = 0;
        let totalLateDays = 0;
        let totalDaysWithClock = 0;

        // --- CALCUL RETARD DYNAMIQUE UNIFIÉ (Toutes granularités) ---

        // 1. Organiser les clocks par jour (Date locale)
        const clocksByDay = {};
        clocksRange.forEach(c => {
          const d = new Date(c.clockIn);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dayKey = `${year}-${month}-${day}`;

          if (!clocksByDay[dayKey]) clocksByDay[dayKey] = [];
          clocksByDay[dayKey].push(d);
        });

        // Récupérer le schedule template actif pour le seuil de retard
        const activeSchedule = Object.values(schedulesByTeam)[0] || null;

        // 2. Déterminer le statut de retard pour chaque jour
        // eslint-disable-next-line no-unused-vars
        const dayLatenessMap = {};
        Object.entries(clocksByDay).forEach(([dayKey, dates]) => {
          // Trouver le premier clock-in de la journée
          dates.sort((a, b) => a - b);
          const firstClock = dates[0];
          const firstMinutes = firstClock.getHours() * 60 + firstClock.getMinutes();

          // Seuil dynamique basé sur le schedule template (avec 5 min de tolérance)
          const limitMinutes = getLatenessThresholdFromSchedule(activeSchedule, firstClock, 5);
          const isLate = firstMinutes > limitMinutes;

          // Vérifier si ce jour est dans la période affichée
          const dayDate = new Date(dayKey);
          dayDate.setHours(12, 0, 0, 0); // Sécurité

          if (dayDate >= startOfCurrentPeriod && dayDate <= endOfCurrentPeriod) {
            totalDaysWithClock++;
            if (isLate) totalLateDays++;
          }
        });

        currentLatenessRate = totalDaysWithClock > 0
          ? (totalLateDays / totalDaysWithClock) * 100
          : 0;

        setLatenessData({
          rate: currentLatenessRate,
          lateDays: totalLateDays,
          totalDays: totalDaysWithClock,
          chartSeries: [], // Pas de graphique pour le retard
          evolutionRate: 0 // Pas d'évolution calculée (pas de données période précédente)
        });

        // Filter clocks for the relevant period only for KPIs (not graph)
        const relevantClocks = clocksRange.filter(c => new Date(c.clockIn) >= startOfCurrentPeriod && new Date(c.clockIn) <= endOfCurrentPeriod);
        setRecentClocks(relevantClocks.slice(0, 20));

        // let totalCurrentMinutes = 0; // Already calculated above
        const dailyHoursMap = {};

        let dailyScheduledMap = {};
        let totalScheduledMinutes = 0;

        relevantClocks.forEach(c => {
          const inD = new Date(c.clockIn);
          const outD = c.clockOut ? new Date(c.clockOut) : now;
          const minutes = Math.max(0, Math.round((outD - inD) / 60000));

          // totalCurrentMinutes += minutes; // Already calculated above

          const clockInParis = toParis(inD);
          const yearStr = clockInParis.getFullYear();
          const monthStr = String(clockInParis.getMonth() + 1).padStart(2, '0');
          const dayStr = String(clockInParis.getDate()).padStart(2, '0');
          const dayKey = `${yearStr}-${monthStr}-${dayStr}`;
          dailyHoursMap[dayKey] = (dailyHoursMap[dayKey] || 0) + minutes;
        });

        // Calculate scheduled hours from Schedule Templates (not WorkShifts)
        // Use schedulesByTeam which was populated by the teams loading useEffect
        Object.values(schedulesByTeam).forEach(schedule => {
          if (!schedule) return;

          const scheduledData = calculateScheduledMinutesFromTemplate(
            startOfCurrentPeriod,
            endOfCurrentPeriod,
            schedule
          );

          // Add to totals (employee belongs to each team once, so no multiplication needed)
          totalScheduledMinutes += scheduledData.totalMinutes;
          Object.entries(scheduledData.dailyMap).forEach(([dayKey, minutes]) => {
            dailyScheduledMap[dayKey] = (dailyScheduledMap[dayKey] || 0) + minutes;
          });
        });

        // Build Charts
        const hoursPerPeriod = periodBoundaries.map(period => {
          let totalMin = 0;
          Object.entries(dailyHoursMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) totalMin += minutes;
          });
          return { date: period.label, minutesWorked: totalMin };
        });
        const hoursData = buildChartSeries(hoursPerPeriod, 12, periodCount);

        // Adherence Chart (Worked vs Scheduled from Template)
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
          const overlap = Math.min(worked, scheduled);
          const rate = scheduled > 0 ? Math.min(100, Math.round((overlap / scheduled) * 100)) : 0;
          return { date: period.label, value: rate };
        });
        const adherenceForChart = adherencePerPeriod.map(p => ({ date: p.date, minutesWorked: p.value }));
        const adherenceSeries = buildChartSeries(adherenceForChart, 12, periodCount);

        // Averages
        const daysPerPeriod = { 'day': 1, 'week': 7, 'month': 30.4, 'year': 365 };
        const divisor = daysPerPeriod[selectedGranularity] || 1;
        const avgStats = hoursPerPeriod.map(hp => ({ date: hp.date, minutesWorked: hp.minutesWorked / divisor }));
        const avgChart = buildChartSeries(avgStats, 12, periodCount);

        // Labels corrigés pour refléter la comparaison de périodes complètes
        let evolutionLabel = "vs période précédente";
        if (selectedGranularity === 'week') evolutionLabel = "vs 7 jours précédents";
        if (selectedGranularity === 'month') evolutionLabel = "vs 4 semaines précédentes";
        if (selectedGranularity === 'year') evolutionLabel = "vs 12 mois précédents";

        // Use locally calculated minutes
        const displayMinutes = totalCurrentMinutes;

        // Global adherence: total worked (NET) capped at scheduled / total scheduled
        // Note: adherence is calculated globally on the period, not day-by-day sum of overlaps
        // Using displayMinutes ensures consistency with the main KPI (Net Hours)
        const totalOverlapMinutes = Math.min(displayMinutes, totalScheduledMinutes);
        const globalAdherenceRate = totalScheduledMinutes > 0
          ? Math.min(100, (totalOverlapMinutes / totalScheduledMinutes) * 100)
          : 0;

        // Calcul de l'évolution d'adhérence (dernière période vs avant-dernière)
        // Règles:
        // 1. Si pas assez de données (previousAdh <= 10%), évolution = 0
        // 2. Si adhérence actuelle >= 100%, ne peut pas être en régression
        // 3. COHÉRENCE UI : Si l'adhérence globale est excellente (> 99.5%), on ne montre pas de régression locale
        let adherenceEvolution = 0;
        if (adherencePerPeriod.length >= 2) {
          const currentAdh = adherencePerPeriod[adherencePerPeriod.length - 1].value;
          const previousAdh = adherencePerPeriod[adherencePerPeriod.length - 2].value;

          // Seulement calculer l'évolution si la période précédente a des données significatives
          if (previousAdh > 10 && currentAdh > 0) {
            adherenceEvolution = ((currentAdh - previousAdh) / previousAdh) * 100;

            // Si l'adhérence actuelle est à 100%, on ne peut pas être en régression
            // (on a atteint le maximum possible)
            if (currentAdh >= 100 && adherenceEvolution < 0) {
              adherenceEvolution = 0;
            }
          }
        }

        // Force consistency: if global stats say "100%" (or close), don't show negative evolution
        if (globalAdherenceRate > 99.5 && adherenceEvolution < 0) {
          adherenceEvolution = 0;
        }

        setHoursChartSeries(hoursData);
        setAvgChartSeries(avgChart);
        setAdherenceData({
          rate: globalAdherenceRate,
          scheduledHours: Math.round(totalScheduledMinutes / 60),
          chartSeries: adherenceSeries,
          evolutionRate: adherenceEvolution
        });

        setStats({
          hoursCurrent: Math.floor(displayMinutes / 60),
          minutesCurrent: displayMinutes % 60,
          evolutionRate,
          evolutionLabel,
          avgCurrent: Math.round(displayMinutes / periodCount / 60 * 10) / 10
        });

      } catch (e) {
        console.warn('[Dashboard KPIs] error:', e?.message || e);
      }
    };

    loadKpis();
  }, [targetUserId, refreshKey, selectedGranularity, schedulesByTeam]);

  const handleChanged = async () => {
    setRefreshKey((k) => k + 1);
  };

  const handleExportPDF = () => {
    const chartData = {
      hoursChartSeries,
      adherenceChartSeries: adherenceData.chartSeries,
      adherenceRate: adherenceData.rate,
      latenessRate: latenessData.rate
    };
    const granularityLabel = getPeriodInfo(selectedGranularity).label;
    exportEmployeeDashboardPDF(targetUser || user, stats, recentClocks, chartData, granularityLabel);
  };

  const handleExportCSV = () => {
    const chartData = {
      hoursChartSeries,
      adherenceRate: adherenceData.rate,
      latenessRate: latenessData.rate
    };
    const granularityLabel = getPeriodInfo(selectedGranularity).label;
    exportEmployeeDashboardCSV(targetUser || user, stats, recentClocks, chartData, granularityLabel);
  };

  if (isViewingOtherEmployee && !viewedEmployee) {
    return (
      <Layout
        sidebarItems={sidebarItems}
        pageTitle="Dashboard Employé"
        userName={`${user?.firstName} ${user?.lastName}`}
        userRole={user?.role}
      >
        <div className="p-8">
          <div className="text-gray-600">Chargement...</div>
        </div>
      </Layout>
    );
  }

  const pageTitle = isViewingOtherEmployee
    ? `Dashboard de ${viewedEmployee?.firstName} ${viewedEmployee?.lastName}`
    : "Mon dashboard";

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle={pageTitle}
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8 space-y-6">
        <div className="max-w-7xl mx-auto">

          {/* En-tête */}
          <div className="mb-6">
            {isViewingOtherEmployee && (
              <Button
                onClick={() => navigate(-1)}
                variant="ghost"
                size="sm"
                className="gap-2 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                  {pageTitle}
                </h1>
                <p className="text-gray-500 mt-1">
                  {isViewingOtherEmployee
                    ? `Consultez les statistiques et pointages de ${viewedEmployee?.firstName}`
                    : "Gérez vos pointages et consultez vos statistiques"}
                </p>
              </div>
              {!isViewingOtherEmployee && (
                <Badge
                  variant={currentStatus.color}
                  className="text-sm px-4 py-2 flex items-center gap-2"
                >
                  <span>{currentStatus.icon}</span>
                  <span>{currentStatus.label}</span>
                </Badge>
              )}
            </div>
          </div>

          {!hasClockedInToday && !isViewingOtherEmployee && (
            <Card className="mb-6 border-l-4 border-orange-400 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-900">
                      ⏰ Vous n&apos;avez pas encore pointé aujourd&apos;hui
                    </p>
                    <p className="text-xs text-orange-800 mt-1">
                      N&apos;oubliez pas de pointer votre arrivée pour que vos heures soient comptabilisées.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Actions & Teams */}
            {!isViewingOtherEmployee && (
              <div className="lg:col-span-1 space-y-6">
                <div className="sticky top-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Actions de pointage
                      </CardTitle>
                      <CardDescription>
                        Gérez vos arrivées et départs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ClockActions userId={targetUserId} onChanged={handleChanged} />
                    </CardContent>
                  </Card>

                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Congés
                      </CardTitle>
                      <CardDescription>
                        Demandez des jours de congé
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => setIsLeaveModalOpen(true)}
                        className="w-full"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Demander un congé
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Mes équipes</CardTitle>
                        <CardDescription>
                          {teamsForUser.length} équipe{teamsForUser.length > 1 ? 's' : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {teamsForUser.length === 0 ? (
                          <div className="text-sm text-gray-500">Aucune équipe.</div>
                        ) : (
                          <div className="space-y-3">
                            {teamsForUser.map((team) => (
                              <Card
                                key={team.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => window.location.href = `/teams/${team.id}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900">{team.name}</h4>
                                      <p className="text-sm text-muted-foreground mt-1">{team.description || 'Aucune description'}</p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">
                                          Manager : {team.managerName || '—'}
                                        </Badge>
                                      </div>
                                    </div>
                                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Right Column: Charts */}
            <div className={!isViewingOtherEmployee ? "lg:col-span-2" : "lg:col-span-3"}>

              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {isViewingOtherEmployee ? 'Statistiques' : 'Mes statistiques'}
                      </CardTitle>
                      <CardDescription>
                        Aperçu des performances - {getPeriodInfo(selectedGranularity).label}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCalendarOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        Planning
                      </Button>
                      <ExportMenu
                        onExportPDF={handleExportPDF}
                        onExportCSV={handleExportCSV}
                        variant="default"
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <PeriodSelector selectedGranularity={selectedGranularity} onGranularityChange={setSelectedGranularity} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Heures */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setChartModal({
                        open: true,
                        title: 'Heures travaillées',
                        subtitle: getPeriodInfo(selectedGranularity).label,
                        data: hoursChartSeries,
                        chartType: 'area',
                        config: { color: 'var(--color-desktop)', gradientId: 'hoursModalFill', tooltipType: 'hours' }
                      })}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Heures travaillées
                        </CardTitle>
                        <Clock className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-2">
                          <div className="text-2xl font-bold">
                            {/* Affichage de la moyenne plutôt que du total */}
                            {Math.floor(stats.avgCurrent)}h {String(Math.round((stats.avgCurrent % 1) * 60)).padStart(2, '0')}m
                          </div>
                          <div className={`text-sm mb-1 font-medium ${stats.evolutionRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.evolutionRate >= 0 ? "↗" : "↘"} {Math.abs(stats.evolutionRate).toFixed(1)}%
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{stats.evolutionLabel}</p>
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

                    {/* Adhérence */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setChartModal({
                        open: true,
                        title: 'Adhérence Planning',
                        subtitle: getPeriodInfo(selectedGranularity).label,
                        data: adherenceData.chartSeries,
                        chartType: 'area',
                        config: { color: '#10b981', gradientId: 'adhModalFill', tooltipType: 'adherence' }
                      })}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Adhérence Planning
                        </CardTitle>
                        <CalendarCheck className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{adherenceData.rate.toFixed(1)}%</div>
                        <div className={`text-sm mb-1 font-medium ${adherenceData.evolutionRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {adherenceData.evolutionRate >= 0 ? "↗" : "↘"} {Math.abs(adherenceData.evolutionRate).toFixed(1)}%
                        </div>
                        <p className="text-xs text-gray-500">
                          {adherenceData.scheduledHours}h planifiées
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

                    {/* Taux de retard - KPI Simple */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Taux de retard
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{latenessData.rate.toFixed(1)}%</div>
                        <p className="text-xs text-gray-500 mt-2">
                          {latenessData.lateDays} jour(s) en retard sur {latenessData.totalDays} jours travaillés
                        </p>

                      </CardContent>
                    </Card>

                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
      </div>

      <ClockCalendarView
        open={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        userName={`${targetUser?.firstName || ''} ${targetUser?.lastName || ''}`.trim() || 'Employé'}
        schedule={teamsForUser.length > 0 ? schedulesByTeam[teamsForUser[0].id] : null}
        userId={targetUserId}
      />

      <RequestLeaveModal
        open={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        userId={user?.id}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
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
    </Layout >
  );
}