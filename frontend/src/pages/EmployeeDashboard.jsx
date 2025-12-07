// src/pages/EmployeeDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClockNotification } from '../hooks/useClockNotification';
import { useNotifications } from '../hooks/useNotifications';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import ClockActions from '../components/employee/ClockActions';
import ClockCalendarView from '../components/employee/ClockCalendarView';
import RequestLeaveModal from '../components/employee/RequestLeaveModal';
import PeriodSelector from '../components/manager/PeriodSelector';
import { Clock, AlertTriangle, Briefcase, ArrowLeft, Calendar, CalendarCheck } from 'lucide-react';
import api from '../api/client';
import scheduleTemplatesApi from '../api/scheduleTemplatesApi';
import { buildChartSeries } from '../api/statsApi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { exportEmployeeDashboardPDF } from '../utils/pdfExport';
import { exportEmployeeDashboardCSV } from '../utils/csvExport';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/Badge';
import ExportMenu from '../components/ui/ExportMenu';

import {
  toParis,
  toISO
} from '../utils/dateUtils';

import {
  getPeriodInfo,
  getDisplayPeriodBoundaries
} from '../utils/granularityUtils';

import { calculateScheduledMinutesFromTemplate } from '../utils/scheduleUtils';

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

async function fetchClocksRange(userId, from, to) {
  const { data } = await api.get(`/api/users/${userId}/clocks/range`, {
    params: { from: toISO(from), to: toISO(to) },
  });
  return Array.isArray(data) ? data : [];
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
  const [avgChartSeries, setAvgChartSeries] = useState([]);
  const [adherenceData, setAdherenceData] = useState({ rate: 0, scheduledHours: 0, chartSeries: [] });
  const [stats, setStats] = useState({
    hoursCurrent: 0,
    evolutionRate: 0,
    evolutionLabel: '',
    avgCurrent: 0
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useClockNotification(hasClockedInToday, user?.role, isViewingOtherEmployee);
  const { notifications, markAsRead } = useNotifications(hasClockedInToday, user?.role);

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

        // Evolution (Single Period)
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

        // Fetch Clocks
        const clocks = await fetchClocksRange(targetUserId, startOfCurrentPeriod, endOfCurrentPeriod);
        setRecentClocks(clocks.slice(0, 20));

        let totalCurrentMinutes = 0;
        let singleCurrentMinutes = 0;
        let singlePreviousMinutes = 0;
        const dailyHoursMap = {};

        let dailyScheduledMap = {};
        let totalScheduledMinutes = 0;

        clocks.forEach(c => {
          const inD = new Date(c.clockIn);
          const outD = c.clockOut ? new Date(c.clockOut) : now;
          const minutes = Math.max(0, Math.round((outD - inD) / 60000));

          totalCurrentMinutes += minutes;
          if (inD >= singleCurrentStart && inD <= singleCurrentEnd) singleCurrentMinutes += minutes;
          else if (inD >= singlePreviousStart && inD <= singlePreviousEnd) singlePreviousMinutes += minutes;

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

        // Final Stats
        const singleCurrentHours = singleCurrentMinutes / 60;
        const singlePreviousHours = singlePreviousMinutes / 60;
        const evolutionRate = singlePreviousHours > 0
          ? ((singleCurrentHours - singlePreviousHours) / singlePreviousHours) * 100
          : 0;

        let evolutionLabel = "vs période précédente";
        if (selectedGranularity === 'week') evolutionLabel = "vs semaine précédente";
        if (selectedGranularity === 'day') evolutionLabel = "vs hier";
        if (selectedGranularity === 'month') evolutionLabel = "vs mois précédent";
        if (selectedGranularity === 'year') evolutionLabel = "vs année précédente";

        // Global adherence: total worked capped at scheduled / total scheduled
        const totalWorkedMinutes = Object.values(dailyHoursMap).reduce((a, b) => a + b, 0);
        const totalOverlapMinutes = Math.min(totalWorkedMinutes, totalScheduledMinutes);
        const globalAdherenceRate = totalScheduledMinutes > 0
          ? Math.min(100, (totalOverlapMinutes / totalScheduledMinutes) * 100)
          : 0;

        setHoursChartSeries(hoursData);
        setAvgChartSeries(avgChart);
        setAdherenceData({
          rate: globalAdherenceRate,
          scheduledHours: Math.round(totalScheduledMinutes / 60),
          chartSeries: adherenceSeries
        });
        setStats({
          hoursCurrent: Math.floor(totalCurrentMinutes / 60),
          minutesCurrent: totalCurrentMinutes % 60,
          evolutionRate,
          evolutionLabel,
          avgCurrent: Math.round(totalCurrentMinutes / periodCount / 60 * 10) / 10
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
    // Stats need to be adapted for the PDF function if it expects specific shape, 
    // or update PDF export. Passing generic stats object.
    exportEmployeeDashboardPDF(targetUser || user, stats, recentClocks, getPeriodInfo(selectedGranularity).periodCount);
  };

  const handleExportCSV = () => {
    exportEmployeeDashboardCSV(targetUser || user, stats, recentClocks, getPeriodInfo(selectedGranularity).periodCount);
  };

  if (isViewingOtherEmployee && !viewedEmployee) {
    return (
      <Layout
        sidebarItems={sidebarItems}
        pageTitle="Dashboard Employé"
        userName={`${user?.firstName} ${user?.lastName}`}
        userRole={user?.role}
        notifications={notifications}
        onMarkNotificationRead={markAsRead}
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
      notifications={[]}
      onMarkNotificationRead={() => { }}
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

                  <Card className="mt-6 border-yellow-200 bg-yellow-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Congés
                      </CardTitle>
                      <CardDescription>
                        Fonctionnalité en configuration
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg mb-3">
                        <p className="text-xs text-yellow-800 font-semibold mb-1">⚠️ Non disponible</p>
                        <p className="text-xs text-yellow-700">
                          Le backend doit être configuré pour filtrer les demandes de congés par manager.
                        </p>
                      </div>
                      <Button disabled className="w-full opacity-50 cursor-not-allowed">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Heures */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Heures travaillées
                        </CardTitle>
                        <Clock className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-2">
                          <div className="text-2xl font-bold">
                            {stats.hoursCurrent}h {String(stats.minutesCurrent).padStart(2, '0')}m
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
                      </CardContent>
                    </Card>

                    {/* Adhérence */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Adhérence Planning
                        </CardTitle>
                        <CalendarCheck className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{adherenceData.rate.toFixed(1)}%</div>
                        <p className="text-xs text-gray-500 mt-2">
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
                      </CardContent>
                    </Card>

                    {/* Moyenne */}
                    <Card className="md:col-span-2">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Moyenne quotidienne
                        </CardTitle>
                        <Briefcase className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.avgCurrent}h</div>
                        <p className="text-xs text-gray-500 mt-2">Moyenne par unité de temps</p>
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
        clocks={recentClocks}
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
    </Layout>
  );
}