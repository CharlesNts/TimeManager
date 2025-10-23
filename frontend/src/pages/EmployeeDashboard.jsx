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
import { Clock, AlertTriangle, Briefcase, ArrowLeft, Calendar } from 'lucide-react';
import api from '../api/client';
import { buildChartSeries } from '../api/statsApi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { exportEmployeeDashboardPDF } from '../utils/pdfExport';
import { exportEmployeeDashboardCSV } from '../utils/csvExport';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import ExportMenu from '../components/ui/ExportMenu';

import {
  toParis,
  toISO,
  minutesBetween
} from '../utils/dateUtils';

import {
  getPeriodInfo,
  getDisplayPeriodBoundaries,
  getDisplayPeriodBoundariesShifted
} from '../utils/granularityUtils';

// ---------- Agrégation par jour ----------
// Unused function - kept for reference
// function aggregateByDay(clocks) {
//   const map = new Map(); // 'YYYY-MM-DD' -> { firstIn: Date, totalWorkedMin: number }
//
//   for (const c of clocks) {
//     const inD = toParis(new Date(c.clockIn));
//
//     // Ignorer les pointages invalides (clockOut avant clockIn ou même temps)
//     if (!c.clockOut) continue; // Ignorer les sessions ouvertes
//
//     const outD = toParis(new Date(c.clockOut));
//
//     // Vérifier que le pointage est valide (clockOut après clockIn)
//     if (outD <= inD) continue;
//
//     // Vérifier que la durée est réaliste (max 12h par session)
//     const workedMin = minutesBetween(inD, outD);
//     if (workedMin > 12 * 60) continue; // Ignorer les sessions > 12h
//
//     const key = `${inD.getFullYear()}-${pad(inD.getMonth() + 1)}-${pad(inD.getDate())}`;
//
//     const current = map.get(key);
//     if (!current) {
//       map.set(key, { firstIn: inD, totalWorkedMin: workedMin });
//     } else {
//       if (inD < current.firstIn) current.firstIn = inD; // conserver le premier clock-in
//       current.totalWorkedMin += workedMin;
//       map.set(key, current);
//     }
//   }
//
//   return Array.from(map.entries())
//     .map(([dateKey, v]) => ({ dateKey, ...v }))
//     .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
// }

// ---------- Fetch helper ----------
async function fetchClocksRange(userId, from, to) {
  const { data } = await api.get(`/api/users/${userId}/clocks/range`, {
    params: { from: toISO(from), to: toISO(to) },
  });
  return Array.isArray(data) ? data : [];
}

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

  if (type === 'lateness') {
    title = 'Jours en retard'
    formattedValue = `${Math.round(value)} jour${Math.round(value) > 1 ? 's' : ''}`
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
  const { userId } = useParams(); // Pour afficher le dashboard d'un autre employé
  const navigate = useNavigate();
  
  // Si userId dans l'URL, c'est un manager/CEO qui consulte. Sinon, c'est l'utilisateur lui-même
  const [viewedEmployee, setViewedEmployee] = useState(null);
  const isViewingOtherEmployee = !!userId;
  const targetUserId = userId || user?.id;
  const targetUser = isViewingOtherEmployee ? viewedEmployee : user;

  // Debug: Afficher uniquement si on consulte le dashboard d'un autre employé
  if (isViewingOtherEmployee) {
    console.log('[DBG] Manager/CEO viewing employee:', userId, 'current user:', user?.id);
  }
  
  const sidebarItems = getSidebarItems(user?.role);

  const [hasClockedInToday, setHasClockedInToday] = useState(false);
  const [currentStatus, setCurrentStatus] = useState({ status: 'not-clocked', label: 'Non pointé', icon: '⏰', color: 'secondary' });
  const [selectedGranularity, setSelectedGranularity] = useState('week');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // clé d'invalidation pour forcer refetch (KPIs + Historique)
  const [refreshKey, setRefreshKey] = useState(0);

  // Charger les infos de l'employé consulté
  useEffect(() => {
    if (isViewingOtherEmployee && userId) {
      const loadEmployee = async () => {
        try {
          const { data } = await api.get(`/api/users/${userId}`);
          setViewedEmployee(data);
        } catch (err) {
          console.error('[EmployeeDashboard] Erreur chargement employé:', err);
          // Rediriger si employé non trouvé ou pas d'accès
          navigate('/dashboard');
        }
      };
      loadEmployee();
    }
  }, [userId, isViewingOtherEmployee, navigate]);

  // Rafraîchir quand la granularité change
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [selectedGranularity]);

  // Rafraîchir quand l’onglet redevient actif (utile quand tu touches la BDD à la main)
  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Vérifier si pointé aujourd'hui et déterminer le statut actuel (même logique que ClockActions)
  useEffect(() => {
    const loadToday = async () => {
      try {
        // Utiliser la même API que ClockActions : /api/users/${userId}/clocks
        const { data } = await api.get(`/api/users/${targetUserId}/clocks`, {
          params: { page: 0, size: 1, sort: 'clockIn,desc' },
        });
        const lastSession = data?.content?.[0] || null;

        // Check if user has clocked in TODAY (regardless of clockOut)
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
          // Vérifier si en pause (mock - regarder dans localStorage comme ClockActions)
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

  // KPIs
  const [stats, setStats] = useState({
    hoursWeek: '—',
    delaysMonth: '—',
    avgWeek: '—',
    comparison: '—',
  });
  const [recentClocks, setRecentClocks] = useState([]);
  const [hoursChartSeries, setHoursChartSeries] = useState([]);
  const [avgChartSeries, setAvgChartSeries] = useState([]);
  const [latenessData, setLatenessData] = useState({ totalDays: 0, lateDays: 0, rate: 0, lateDaysChartSeries: [] });
  
  // Calendar modal
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Clock notification hook - Toast auto-dismiss après 5 secondes
  useClockNotification(hasClockedInToday, user?.role, isViewingOtherEmployee);

  // Notifications hook - Gère les notifications dans le header
  const { notifications, markAsRead } = useNotifications(hasClockedInToday, user?.role);

  // --- Load teams for the user (same approach as ProfilePage) ---
  // We import teamApi dynamically to avoid circular imports and to keep
  // API files untouched. This mirrors the logic in `ProfilePage.jsx`.
  const [teamsForUser, setTeamsForUser] = useState([]);
  const [schedulesByTeam, setSchedulesByTeam] = useState({}); // teamId -> schedule

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      if (!targetUserId) return;
      try {
        const mod = await import('../api/teamApi');
        const data = await mod.fetchUserMemberships(targetUserId);
        if (!cancel) setTeamsForUser(Array.isArray(data) ? data : []);
        
        // Charger le planning pour chaque équipe
        if (Array.isArray(data) && data.length > 0) {
          const { scheduleTemplatesApi } = await import('../api/scheduleTemplatesApi');
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

  // Charger KPIs (dépend de refreshKey et selectedGranularity)
  useEffect(() => {
    if (!targetUserId) return;

    const loadKpis = async () => {
      try {

        // Utiliser les vraies périodes d'affichage (qui incluent jusqu'à 23:59:59 du dernier jour)
        const periodBoundaries = getDisplayPeriodBoundaries(selectedGranularity);
        const previousBoundaries = getDisplayPeriodBoundariesShifted(selectedGranularity, 1);

        // Récupérer les dates de la première et dernière période
        const periodStart = periodBoundaries[0].startDate;
        const periodEnd = periodBoundaries[periodBoundaries.length - 1].endDate;
        const prevPeriodStart = previousBoundaries[0].startDate;
        const prevPeriodEnd = previousBoundaries[previousBoundaries.length - 1].endDate;

        const { periodCount } = getPeriodInfo(selectedGranularity);

        const [clocksThisPeriod, clocksPrevPeriod] = await Promise.all([
          fetchClocksRange(targetUserId, periodStart, periodEnd),
          fetchClocksRange(targetUserId, prevPeriodStart, prevPeriodEnd),
        ]);

        // Stocker pour PDF
        setRecentClocks(clocksThisPeriod.slice(0, 20));

        // Heures sur la période (ignorer les sessions ouvertes et irréalistes)
        const minutesBetweenLocal = (a, b) => Math.max(0, Math.round((toParis(b) - toParis(a)) / 60000));
        const totalPeriodMin = clocksThisPeriod.reduce((sum, c) => {
          // Ignorer les sessions ouvertes
          if (!c.clockOut) return sum;
          
          const inD = new Date(c.clockIn);
          const outD = new Date(c.clockOut);
          
          // Vérifier que le pointage est valide
          if (outD <= inD) return sum;
          
          // Vérifier que la durée est réaliste (max 12h par session)
          const workedMin = minutesBetweenLocal(inD, outD);
          if (workedMin > 12 * 60) return sum;
          
          return sum + workedMin;
        }, 0);

        // Aggreger les clocks par période (jour/semaine/mois/année)
        const hoursPerPeriod = periodBoundaries.map(period => {
          const periodClocks = clocksThisPeriod.filter(c => {
            const clockDate = toParis(new Date(c.clockIn));
            return clockDate >= period.startDate && clockDate <= period.endDate;
          });

          const totalMin = periodClocks.reduce((sum, c) => {
            if (!c.clockOut) return sum;
            const inD = toParis(new Date(c.clockIn));
            const outD = toParis(new Date(c.clockOut));
            if (outD <= inD) return sum;
            const workedMin = minutesBetween(inD, outD);
            if (workedMin > 12 * 60) return sum;
            return sum + workedMin;
          }, 0);

          return { date: period.label, minutesWorked: totalMin };
        });

        // Heures de la PÉRIODE ACTUELLE SEULEMENT (dernière période d'affichage)
        const currentPeriodBoundary = periodBoundaries[periodBoundaries.length - 1];
        const currentPeriodHours = hoursPerPeriod.find(h => h.date === currentPeriodBoundary.label);
        const currentPeriodMin = currentPeriodHours ? currentPeriodHours.minutesWorked : 0;
        const cpH = Math.floor(currentPeriodMin / 60);
        const cpM = currentPeriodMin % 60;
        const hoursPeriodDisplay = `${cpH}h ${String(cpM).padStart(2, '0')}m`;

        // Retards (données réelles basées sur les pointages après 9h30)
        const LATE_THRESHOLD_HOUR = 9;
        const LATE_THRESHOLD_MINUTE = 30;

        // Compter les vrais jours calendaires avec retard dans la PÉRIODE ACTUELLE SEULEMENT
        const currentPeriod = periodBoundaries[periodBoundaries.length - 1];
        const currentPeriodClocks = clocksThisPeriod.filter(c => {
          const clockDate = toParis(new Date(c.clockIn));
          return clockDate >= currentPeriod.startDate && clockDate <= currentPeriod.endDate;
        });

        const daysWithLateInCurrentPeriod = new Set();
        currentPeriodClocks.forEach(c => {
          const clockInTime = toParis(new Date(c.clockIn));
          if (clockInTime.getHours() > LATE_THRESHOLD_HOUR ||
              (clockInTime.getHours() === LATE_THRESHOLD_HOUR && clockInTime.getMinutes() >= LATE_THRESHOLD_MINUTE)) {
            const dayKey = clockInTime.toISOString().split('T')[0]; // YYYY-MM-DD
            daysWithLateInCurrentPeriod.add(dayKey);
          }
        });

        const lateDaysCount = daysWithLateInCurrentPeriod.size;
        // Compter aussi les jours travaillés dans la période actuelle seulement
        const daysWorkedInCurrentPeriod = new Set();
        currentPeriodClocks.forEach(c => {
          const dayKey = toParis(new Date(c.clockIn)).toISOString().split('T')[0];
          daysWorkedInCurrentPeriod.add(dayKey);
        });
        const currentPeriodDaysWorked = daysWorkedInCurrentPeriod.size || 1;
        const latenessRatePercent = currentPeriodDaysWorked > 0 ? (lateDaysCount / currentPeriodDaysWorked) * 100 : 0;
        const delaysPeriodCount = `${lateDaysCount}`; // Format pour affichage

        // Pour le graphique, créer un point de données par jour/semaine/mois/année avec nombre de jours en retard dans cette période
        const lateDaysStats = periodBoundaries.map(period => {
          const periodDaysWithLate = clocksThisPeriod.filter(c => {
            const clockInTime = toParis(new Date(c.clockIn));
            return (clockInTime.getHours() > LATE_THRESHOLD_HOUR ||
                   (clockInTime.getHours() === LATE_THRESHOLD_HOUR && clockInTime.getMinutes() >= LATE_THRESHOLD_MINUTE)) &&
                   clockInTime >= period.startDate && clockInTime <= period.endDate;
          }).map(c => toParis(new Date(c.clockIn)).toISOString().split('T')[0])
            .filter((v, i, a) => a.indexOf(v) === i) // Unique days
            .length;

          return {
            date: period.label,
            minutesWorked: periodDaysWithLate // Nombre de jours en retard pour cette période
          };
        });

        const lateDaysChart = buildChartSeries(lateDaysStats, 12, periodCount);
        setLatenessData({ totalDays: currentPeriodDaysWorked, lateDays: lateDaysCount, rate: latenessRatePercent, lateDaysChartSeries: lateDaysChart });

        // Calculer la vraie moyenne pour chaque période
        // La "moyenne" = heures de la période / nombre de jours dans la période
        const daysPerPeriod = {
          'day': 1,
          'week': 7,
          'month': 30.4, // Moyenne sur l'année
          'year': 365
        };
        const divisor = daysPerPeriod[selectedGranularity] || 1;

        // Moyenne de la PÉRIODE ACTUELLE SEULEMENT
        const currentPeriodForAvg = periodBoundaries[periodBoundaries.length - 1];
        const currentPeriodHoursForAvg = hoursPerPeriod.find(h => h.date === currentPeriodForAvg.label);
        const currentPeriodMinForAvg = currentPeriodHoursForAvg ? currentPeriodHoursForAvg.minutesWorked : 0;
        const avgForCurrentPeriod = Math.round(currentPeriodMinForAvg / divisor);
        const apH = Math.floor(avgForCurrentPeriod / 60);
        const apM = avgForCurrentPeriod % 60;
        const avgDaily = `${apH}h ${String(apM).padStart(2, '0')}m`;

        // Moyenne globale pour l'affichage des stats globales
        // const periodsWithWork = periodBoundaries.filter(p =>
        //   hoursPerPeriod.find(h => h.date === p.label && h.minutesWorked > 0)
        // ).length || 1;
        // const avgPeriodicMin = Math.round(totalPeriodMin / periodsWithWork);

        // Comparaison vs période précédente
        const prevPeriodBoundaries = getDisplayPeriodBoundariesShifted(selectedGranularity, 1);
        const hoursPerPrevPeriod = prevPeriodBoundaries.map(period => {
          const periodClocks = clocksPrevPeriod.filter(c => {
            const clockDate = toParis(new Date(c.clockIn));
            return clockDate >= period.startDate && clockDate <= period.endDate;
          });

          const totalMin = periodClocks.reduce((sum, c) => {
            if (!c.clockOut) return sum;
            const inD = toParis(new Date(c.clockIn));
            const outD = toParis(new Date(c.clockOut));
            if (outD <= inD) return sum;
            const workedMin = minutesBetween(inD, outD);
            if (workedMin > 12 * 60) return sum;
            return sum + workedMin;
          }, 0);

          return { date: period.label, minutesWorked: totalMin };
        });

        const totalPrevPeriodMin = hoursPerPrevPeriod.reduce((sum, h) => sum + h.minutesWorked, 0);

        let comparison = '0%';
        if (totalPrevPeriodMin > 0) {
          const diffPct = ((totalPeriodMin - totalPrevPeriodMin) / totalPrevPeriodMin) * 100;
          comparison = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`;
        } else if (totalPeriodMin > 0) {
          comparison = '+100%';
        }

        // Build chart series from period-based stats
        const hoursChart = buildChartSeries(hoursPerPeriod, 12, periodCount);

        // Utiliser le divisor déjà calculé pour les stats du graphique
        const avgStats = hoursPerPeriod.map(hp => ({
          date: hp.date,
          minutesWorked: hp.minutesWorked / divisor
        }));
        const avgChart = buildChartSeries(avgStats, 12, periodCount);

        setHoursChartSeries(hoursChart);
        setAvgChartSeries(avgChart);

        setStats({
          hoursWeek: hoursPeriodDisplay,  // Heures de la période actuelle seulement
          delaysMonth: delaysPeriodCount, // Déjà en format '—'
          avgWeek: avgDaily,
          comparison
        });
      } catch (e) {
        console.warn('[Dashboard KPIs] error:', e?.message || e);
        setStats({ hoursWeek: '—', delaysMonth: '—', avgWeek: '—', comparison: '—' });
      }
    };

    loadKpis();
  }, [targetUserId, refreshKey, selectedGranularity]);

  const handleChanged = async () => {
    // Juste incrémenter refreshKey, le useEffect se chargera de recharger le statut
    setRefreshKey((k) => k + 1);
  };

  const handleExportPDF = () => {
    exportEmployeeDashboardPDF(targetUser || user, stats, recentClocks, getPeriodInfo(selectedGranularity).periodCount);
  };

  const handleExportCSV = () => {
    exportEmployeeDashboardCSV(targetUser || user, stats, recentClocks, getPeriodInfo(selectedGranularity).periodCount);
  };

  // Afficher un loader si on charge les infos de l'employé
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
      onMarkNotificationRead={() => {}}
    >
      <div className="p-8 space-y-6">
        <div className="max-w-7xl mx-auto">
          
          {/* En-tête de la page */}
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
                  {isViewingOtherEmployee 
                    ? `Dashboard de ${viewedEmployee?.firstName} ${viewedEmployee?.lastName}`
                    : "Mon Dashboard"}
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

          {/* Layout en 2 colonnes : Actions à gauche (33%), Stats + Historique à droite (67%) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Colonne gauche : Actions de pointage */}
            {!isViewingOtherEmployee && (
              <div className="lg:col-span-1">
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

                  {/* Demander un congé */}
                  {!isViewingOtherEmployee && (
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
                            Le backend doit être configuré pour filtrer les demandes de congés par manager avant que cette fonctionnalité soit activée.
                          </p>
                        </div>
                        <Button
                          disabled
                          className="w-full opacity-50 cursor-not-allowed"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Demander un congé
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Mes équipes (copié de ProfilePage) */}
                  {!isViewingOtherEmployee && (
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Mes équipes</CardTitle>
                          <CardDescription>
                            {teamsForUser.length} équipe{teamsForUser.length > 1 ? 's' : ''} dont vous faites partie
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {teamsForUser.length === 0 ? (
                            <div className="text-sm text-gray-500">Vous ne faites partie d&apos;aucune équipe pour le moment.</div>
                          ) : (
                            <div className="space-y-3">
                              {teamsForUser.map((team) => {
                                const schedule = schedulesByTeam[team.id];
                                let pattern = null;
                                let workDaysDisplay = '';
                                let times = '';
                                
                                if (schedule && schedule.weeklyPatternJson) {
                                  try {
                                    pattern = JSON.parse(schedule.weeklyPatternJson);
                                    const daysMap = {
                                      mon: 'Lun',
                                      tue: 'Mar',
                                      wed: 'Mer',
                                      thu: 'Jeu',
                                      fri: 'Ven',
                                      sat: 'Sam',
                                      sun: 'Dim'
                                    };
                                    const workDays = Object.entries(daysMap)
                                      .filter(([key]) => pattern[key] && pattern[key].length > 0)
                                      .map(([, val]) => val);
                                    workDaysDisplay = workDays.join(', ');
                                    
                                    const firstWorkDay = Object.entries(pattern).find(([key, val]) => 
                                      ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(key) && 
                                      val && val.length > 0
                                    );
                                    if (firstWorkDay && firstWorkDay[1][0]) {
                                      times = `${firstWorkDay[1][0][0]} - ${firstWorkDay[1][0][1]}`;
                                    }
                                  } catch (e) {
                                    console.warn('Erreur parsing schedule:', e);
                                  }
                                }
                                
                                return (
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
                                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <Badge variant="outline" className="text-xs">
                                              Manager : {team.managerName || `${team.manager?.firstName || ''} ${team.manager?.lastName || ''}`}
                                            </Badge>
                                            {schedule && (
                                              <>
                                                <Badge variant="secondary" className="text-xs">
                                                  📅 {workDaysDisplay}
                                                </Badge>
                                                <Badge variant="secondary" className="text-xs">
                                                  🕐 {times}
                                                </Badge>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <Briefcase className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Colonne droite : Statistiques + Historique */}
            <div className={!isViewingOtherEmployee ? "lg:col-span-2" : "lg:col-span-3"}>
              {/* Statistiques */}
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {isViewingOtherEmployee ? 'Statistiques' : 'Mes statistiques'}
                      </CardTitle>
                      <CardDescription>
                        Aperçu de vos performances - {getPeriodInfo(selectedGranularity).label}
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
                  <div className="space-y-6">
                    {/* Heures période */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Heures travaillées
                        </CardTitle>
                        <Clock className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.hoursWeek}</div>
                        <p className="text-xs text-gray-500 mt-2">Période actuelle ({getPeriodInfo(selectedGranularity).label})</p>
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

                    {/* Jours en retard */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-medium text-gray-500">
                            Jours en retard
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs">À corriger en backend</Badge>
                        </div>
                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{latenessData.lateDays}</div>
                        <p className="text-xs text-gray-500 mt-2">sur {latenessData.totalDays} jours travaillés ({latenessData.rate.toFixed(1)}%)</p>
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

                    {/* Moyenne quotidienne */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Moyenne quotidienne
                        </CardTitle>
                        <Briefcase className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.avgWeek}</div>
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
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
      </div>

      {/* Planning Modal */}
      <ClockCalendarView
        open={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        clocks={recentClocks}
        userName={`${targetUser?.firstName || ''} ${targetUser?.lastName || ''}`.trim() || 'Employé'}
        schedule={teamsForUser.length > 0 ? schedulesByTeam[teamsForUser[0].id] : null}
        userId={targetUserId}
      />

      {/* Leave Request Modal */}
      <RequestLeaveModal
        open={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        userId={user?.id}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
          // TODO: Show success toast
        }}
      />
    </Layout>
  );
}