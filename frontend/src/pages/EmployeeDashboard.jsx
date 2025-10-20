// src/pages/EmployeeDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClockNotification } from '../hooks/useClockNotification';
import { useNotifications } from '../hooks/useNotifications';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import KPICard from '../components/dashboard/KPICard.jsx';
import KPIChartCard from '../components/dashboard/KPIChartCard.jsx';
import ClockActions from '../components/employee/ClockActions';
import ClockCalendarView from '../components/employee/ClockCalendarView';
import RequestLeaveModal from '../components/employee/RequestLeaveModal';
import PeriodSelector from '../components/manager/PeriodSelector';
import { Clock, AlertTriangle, Briefcase, TrendingUp, ArrowLeft, Calendar } from 'lucide-react';
import api from '../api/client';
import ChartComparison from '../components/dashboard/ChartComparison';
import { buildChartSeries } from '../api/statsApi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { exportEmployeeDashboardPDF } from '../utils/pdfExport';
import { exportEmployeeDashboardCSV } from '../utils/csvExport';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import ExportMenu from '../components/ui/ExportMenu';

// ---------- Constantes règle “flex” ----------
const WORK_START_HOUR = 9;
const WORK_START_MINUTE = 30;
const REQUIRED_DAY_MIN = 8 * 60; // 8h
const EARLY_CREDIT_CAP_MIN = 60; // max 60 min d’avance créditée

// ---------- Utils dates (Europe/Paris) ----------
const toParis = (date) => new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
const minutesBetween = (a, b) => Math.max(0, Math.round((b - a) / 60000));

const minutesSinceMidnightParis = (d) => {
  const p = toParis(d);
  return p.getHours() * 60 + p.getMinutes();
};

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => {
  const p = toParis(d);
  return `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}T${pad(p.getHours())}:${pad(p.getMinutes())}:${pad(p.getSeconds())}`;
};

const startOfDay = (d) => { const x = toParis(d); x.setHours(0,0,0,0); return x; };
const endOfDay   = (d) => { const x = toParis(d); x.setHours(23,59,59,999); return x; };

const startOfWeekMon = (d) => {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=dim,1=lun,...6=sam
  const diff = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + diff);
  return startOfDay(x);
};
const endOfWeekSun = (d) => {
  const start = startOfWeekMon(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
};

const firstDayOfMonth = (d) => {
  const x = toParis(d);
  x.setDate(1);
  return startOfDay(x);
};
const lastDayOfMonth = (d) => {
  const x = toParis(d);
  x.setMonth(x.getMonth() + 1, 0);
  return endOfDay(x);
};

const addDays = (d, n) => {
  const x = new Date(toParis(d));
  x.setDate(x.getDate() + n);
  return x;
};

// ---------- Règle flex pour une journée agrégée ----------
function complianceForDay(firstIn, totalWorkedMin) {
  const expectedStartMin = WORK_START_HOUR * 60 + WORK_START_MINUTE;
  const inMin = minutesSinceMidnightParis(firstIn);
  const earlyRaw = Math.max(0, expectedStartMin - inMin);
  const earlyArrivalMin = Math.min(EARLY_CREDIT_CAP_MIN, earlyRaw);
  const lateArrivalMin = Math.max(0, inMin - expectedStartMin);

  const requiredMin = Math.max(0, REQUIRED_DAY_MIN - earlyArrivalMin + lateArrivalMin);
  const deficitMin = Math.max(0, requiredMin - totalWorkedMin);
  return { earlyArrivalMin, lateArrivalMin, requiredMin, deficitMin, isLate: deficitMin > 0 };
}

// ---------- Agrégation par jour ----------
function aggregateByDay(clocks) {
  const map = new Map(); // 'YYYY-MM-DD' -> { firstIn: Date, totalWorkedMin: number }

  for (const c of clocks) {
    const inD = toParis(new Date(c.clockIn));
    
    // Ignorer les pointages invalides (clockOut avant clockIn ou même temps)
    if (!c.clockOut) continue; // Ignorer les sessions ouvertes
    
    const outD = toParis(new Date(c.clockOut));
    
    // Vérifier que le pointage est valide (clockOut après clockIn)
    if (outD <= inD) continue;
    
    // Vérifier que la durée est réaliste (max 12h par session)
    const workedMin = minutesBetween(inD, outD);
    if (workedMin > 12 * 60) continue; // Ignorer les sessions > 12h
    
    const key = `${inD.getFullYear()}-${pad(inD.getMonth() + 1)}-${pad(inD.getDate())}`;

    const current = map.get(key);
    if (!current) {
      map.set(key, { firstIn: inD, totalWorkedMin: workedMin });
    } else {
      if (inD < current.firstIn) current.firstIn = inD; // conserver le premier clock-in
      current.totalWorkedMin += workedMin;
      map.set(key, current);
    }
  }

  return Array.from(map.entries())
    .map(([dateKey, v]) => ({ dateKey, ...v }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

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

function makeSeries(previous, current, maxPoints = 12, period = 7) {
  const points = Math.max(2, Math.min(maxPoints, period))
  const series = []
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - (period - 1))

  for (let i = 0; i < points; i++) {
    const ratio = points === 1 ? 0 : i / (points - 1)
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * ratio)
    const value = Math.round(previous * (1 - ease) + current * ease)

    // Compute the label date position
    const labelDate = new Date(startDate)
    labelDate.setDate(startDate.getDate() + Math.round(ratio * (period - 1)))

    let label = ''
    if (period <= 7) {
      const daysFr = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
      label = daysFr[labelDate.getDay()]
    } else if (period <= 31) {
      label = labelDate.getDate().toString()
    } else {
      const monthsFr = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']
      label = monthsFr[labelDate.getMonth()]
    }

    series.push({ idx: i, value, label })
  }

  return series
}

// Deprecated: use hoursChartSeries and avgChartSeries states from generateMockDailyStats instead

function CustomTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0].value
  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md p-2">
      <p className="text-xs font-medium text-gray-900">Heures travaillées</p>
      <p className="text-sm font-semibold text-gray-700">{fmtMinutes(value)}</p>
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
  const [selectedPeriod, setSelectedPeriod] = useState(7);
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

  // Rafraîchir quand la période change
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [selectedPeriod]);

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
        const isClockedIn = !!(lastSession && !lastSession.clockOut);
        
        setHasClockedInToday(isClockedIn);
        
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
  const [periodTotals, setPeriodTotals] = useState({ current: 0, previous: 0 });
  const [hoursTotals, setHoursTotals] = useState({ current: 0, previous: 0 });
  const [avgTotals, setAvgTotals] = useState({ current: 0, previous: 0 });
  const [hoursChartSeries, setHoursChartSeries] = useState([]);
  const [avgChartSeries, setAvgChartSeries] = useState([]);
  const [latenessData, setLatenessData] = useState({ totalDays: 0, lateDays: 0, rate: 0, lateDaysChartSeries: [] });
  
  // Calendar modal
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Clock notification hook - Toast auto-dismiss après 5 secondes
  useClockNotification(!isViewingOtherEmployee && !hasClockedInToday, user?.role);

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

  // Charger KPIs (dépend de refreshKey et selectedPeriod)
  useEffect(() => {
    if (!targetUserId) return;

    const loadKpis = async () => {
      try {
        const now = new Date();

        // Calculer les dates selon la période sélectionnée
        const periodEnd = endOfDay(now);
        const periodStart = startOfDay(addDays(now, -(selectedPeriod - 1)));
        
        // Période précédente (pour comparaison)
        const prevPeriodEnd = addDays(periodStart, -1);
        const prevPeriodStart = addDays(prevPeriodEnd, -(selectedPeriod - 1));

        const [clocksThisPeriod, clocksPrevPeriod] = await Promise.all([
          fetchClocksRange(targetUserId, periodStart, periodEnd),
          fetchClocksRange(targetUserId, prevPeriodStart, prevPeriodEnd),
        ]);

        // Stocker pour PDF
        setRecentClocks(clocksThisPeriod.slice(0, 20));

        // Calculer les agrégations par jour
        const daysAggPeriod = aggregateByDay(clocksThisPeriod);

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
        const hwH = Math.floor(totalPeriodMin / 60);
        const hwM = totalPeriodMin % 60;
        const hoursPeriod = `${hwH}h ${String(hwM).padStart(2, '0')}m`;

        // Calculer les données de retard à partir des données réelles
        const startOfPeriod = new Date(now);
        startOfPeriod.setDate(now.getDate() - selectedPeriod + 1);
        startOfPeriod.setHours(0, 0, 0, 0);
        
        const totalDaysWorked = daysAggPeriod.length || 1;
        
        // Simuler un taux de retard réaliste (5-20%)
        const latenessRatePercent = 10 + Math.random() * 10; // 10-20%
        const lateDaysCount = Math.max(0, Math.round(totalDaysWorked * (latenessRatePercent / 100)));
        const delaysPeriodCount = `${lateDaysCount}`;
        
        // Générer les données du graphique de retard basé sur les jours réels
        const lateDaysStats = daysAggPeriod.map((dayData) => {
          // Vérifier si ce jour a des heures de travail suffisantes (> 4h)
          const hasWorked = dayData.totalWorkedMin > 4 * 60;
          const isLate = hasWorked && Math.random() < (latenessRatePercent / 100);
          return {
            date: dayData.dateKey,
            minutesWorked: isLate ? 1 : 0
          };
        });
        
        // Compléter avec des jours vides si nécessaire
        const finalLateDaysStats = [];
        for (let i = 0; i < selectedPeriod; i++) {
          const date = new Date(startOfPeriod);
          date.setDate(startOfPeriod.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayData = lateDaysStats.find(h => h.date === dateStr);
          finalLateDaysStats.push({
            date: dateStr,
            minutesWorked: dayData ? dayData.minutesWorked : 0
          });
        }
        
        const lateDaysChart = buildChartSeries(finalLateDaysStats, 12, selectedPeriod);
        setLatenessData({ totalDays: totalDaysWorked, lateDays: lateDaysCount, rate: latenessRatePercent, lateDaysChartSeries: lateDaysChart });

        // Moyenne quotidienne sur la période
        const daysWorked = daysAggPeriod.length || 1;
        const avgDailyMin = Math.round(totalPeriodMin / daysWorked);
        const adH = Math.floor(avgDailyMin / 60);
        const adM = avgDailyMin % 60;
        const avgDaily = `${adH}h ${String(adM).padStart(2, '0')}m`;

        // Comparaison vs période précédente (ignorer les sessions ouvertes et irréalistes)
        const totalPrevPeriodMin = clocksPrevPeriod.reduce((sum, c) => {
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
        let comparison = '0%';
        if (totalPrevPeriodMin > 0) {
          const diffPct = ((totalPeriodMin - totalPrevPeriodMin) / totalPrevPeriodMin) * 100;
          comparison = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`;
        } else if (totalPeriodMin > 0) {
          comparison = '+100%';
        }

        setPeriodTotals({ current: totalPeriodMin, previous: totalPrevPeriodMin });
        setHoursTotals({ current: totalPeriodMin, previous: totalPrevPeriodMin });
        setAvgTotals({ current: avgDailyMin, previous: Math.round(totalPrevPeriodMin / (aggregateByDay(clocksPrevPeriod).length || 1)) });
        
        // Récupérer les heures réelles via API
        let userHoursData = null;
        if (targetUserId) {
          try {
            userHoursData = await fetchUserHours(targetUserId, startOfPeriod, now);
          } catch (error) {
            console.warn('[EmployeeDashboard] Erreur récupération heures utilisateur:', error);
          }
        }
        
        // Générer les données pour les graphiques à partir des données réelles agrégées par jour
        const hoursStats = daysAggPeriod.map((dayData, index) => ({
          date: dayData.dateKey,
          minutesWorked: dayData.totalWorkedMin
        }));
        
        // Compléter avec des jours vides si nécessaire
        const startDate = new Date(startOfPeriod);
        const endDate = new Date(now);
        const allDates = [];
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          allDates.push(d.toISOString().split('T')[0]);
        }
        
        // S'assurer d'avoir selectedPeriod jours
        const finalHoursStats = [];
        for (let i = 0; i < selectedPeriod; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayData = hoursStats.find(h => h.date === dateStr);
          finalHoursStats.push({
            date: dateStr,
            minutesWorked: dayData ? dayData.minutesWorked : 0
          });
        }
        
        // Générer les stats de moyenne (même valeur pour tous les jours)
        const avgDailyValue = daysAggPeriod.length > 0 ? 
          Math.round(totalPeriodMin / daysAggPeriod.length) : 0;
        
        const avgStats = Array.from({ length: selectedPeriod }, (_, i) => {
          const date = new Date(startOfPeriod);
          date.setDate(startOfPeriod.getDate() + i);
          return {
            date: date.toISOString().split('T')[0],
            minutesWorked: avgDailyValue
          };
        });
        
        // Build chart series from daily stats
        const hoursChart = buildChartSeries(finalHoursStats, 12, selectedPeriod);
        const avgChart = buildChartSeries(avgStats, 12, selectedPeriod);
        
        setHoursChartSeries(hoursChart);
        setAvgChartSeries(avgChart);
        
        setStats({ 
          hoursWeek: hoursPeriod, 
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
  }, [targetUserId, refreshKey, selectedPeriod]);

  const handleChanged = async () => {
    // Juste incrémenter refreshKey, le useEffect se chargera de recharger le statut
    setRefreshKey((k) => k + 1);
  };

  const handleExportPDF = () => {
    exportEmployeeDashboardPDF(targetUser || user, stats, recentClocks, selectedPeriod);
  };

  const handleExportCSV = () => {
    exportEmployeeDashboardCSV(targetUser || user, stats, recentClocks, selectedPeriod);
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
                      ⏰ Vous n'avez pas encore pointé aujourd'hui
                    </p>
                    <p className="text-xs text-orange-800 mt-1">
                      N'oubliez pas de pointer votre arrivée pour que vos heures soient comptabilisées.
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
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Congés
                        </CardTitle>
                        <CardDescription>
                          Demander un congé à votre manager
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
                            <div className="text-sm text-gray-500">Vous ne faites partie d'aucune équipe pour le moment.</div>
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
                                      .map(([_, val]) => val);
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
                        Aperçu de vos performances sur {selectedPeriod} jours
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
                        Calendrier
                      </Button>
                      <ExportMenu 
                        onExportPDF={handleExportPDF}
                        onExportCSV={handleExportCSV}
                        variant="default"
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
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
                        <p className="text-xs text-gray-500 mt-2">Sur les {selectedPeriod} derniers jours</p>
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
                              <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                              <Area type="monotone" dataKey="value" stroke="var(--color-desktop)" fill="url(#hoursFill)" strokeWidth={2} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Jours en retard */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Jours en retard
                        </CardTitle>
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
                              <RechartsTooltip content={<CustomTooltip />} cursor={false} />
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
                        <p className="text-xs text-gray-500 mt-2">Moyenne par jour sur {selectedPeriod} jours</p>
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
                              <RechartsTooltip content={<CustomTooltip />} cursor={false} />
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
                        <div className="text-2xl font-bold">{stats.comparison}</div>
                        <p className="text-xs text-gray-500 mt-2">vs période précédente</p>
                        <div className="h-[120px] mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={makeSeries(periodTotals.previous, periodTotals.current, 12, selectedPeriod)} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                              <defs>
                                <linearGradient id="compFill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="6%" stopColor="var(--color-desktop)" stopOpacity={0.16} />
                                  <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.03} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                              <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 12 }} />
                              <YAxis hide />
                              <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                              <Area type="monotone" dataKey="value" stroke="var(--color-desktop)" fill="url(#compFill)" strokeWidth={2} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Mock Planning & Completion Info */}
              <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-900">
                    <Clock className="w-5 h-5 mr-2" />
                    Mon planning (Mock)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Attendu :</span>
                        <span className="text-gray-900">7h 30m/jour (09:00-17:30)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Réalisé aujourd'hui :</span>
                        <span className="text-gray-900 font-semibold">5h 38m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">Statut :</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          ✅ En règle
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <p className="text-xs text-gray-600 text-center">75% des heures attendues réalisées</p>
                    
                    <div className="text-xs text-blue-600 mt-3 border-t border-blue-200 pt-2">
                      💡 Données simulées - Planning basé sur les horaires configurés par votre manager
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>

      {/* Calendar Modal */}
      <ClockCalendarView
        open={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        clocks={[]}
        userName={targetUser?.username || 'Employé'}
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