// src/pages/EmployeeDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import KPICard from '../components/dashboard/KPICard.jsx';
import ClockActions from '../components/employee/ClockActions';
import ClockHistory from '../components/employee/ClockHistory';
import PeriodSelector from '../components/manager/PeriodSelector';
import { Clock, AlertTriangle, Briefcase, TrendingUp, FileDown, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import { exportEmployeeDashboardPDF } from '../utils/pdfExport';
import { exportEmployeeDashboardCSV } from '../utils/csvExport';

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
    const outD = c.clockOut ? toParis(new Date(c.clockOut)) : toParis(new Date());
    const workedMin = minutesBetween(inD, outD);
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

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { userId } = useParams(); // Pour afficher le dashboard d'un autre employé
  const navigate = useNavigate();
  
  // Si userId dans l'URL, c'est un manager/CEO qui consulte. Sinon, c'est l'utilisateur lui-même
  const [viewedEmployee, setViewedEmployee] = useState(null);
  const isViewingOtherEmployee = !!userId;
  const targetUserId = userId || user?.id;
  const targetUser = isViewingOtherEmployee ? viewedEmployee : user;

  console.log('[DBG] current user:', user, 'viewing userId:', userId);
  const sidebarItems = getSidebarItems(user?.role);

  const [hasClockedInToday, setHasClockedInToday] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

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

  // Vérifier si pointé aujourd'hui
  useEffect(() => {
    const loadToday = async () => {
      try {
        const today = new Date();
        const data = await fetchClocksRange(targetUserId, startOfDay(today), endOfDay(today));
        setHasClockedInToday(Array.isArray(data) && data.length > 0);
      } catch {
        setHasClockedInToday(false);
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

        // Heures sur la période
        const minutesBetweenLocal = (a, b) => Math.max(0, Math.round((toParis(b) - toParis(a)) / 60000));
        const totalPeriodMin = clocksThisPeriod.reduce((sum, c) => {
          const inD = new Date(c.clockIn);
          const outD = c.clockOut ? new Date(c.clockOut) : new Date();
          return sum + minutesBetweenLocal(inD, outD);
        }, 0);
        const hwH = Math.floor(totalPeriodMin / 60);
        const hwM = totalPeriodMin % 60;
        const hoursPeriod = `${hwH}h ${String(hwM).padStart(2, '0')}m`;

        // Jours en retard sur la période (désactivé - nécessite horaires de travail)
        const daysAggPeriod = aggregateByDay(clocksThisPeriod);
        const delaysPeriodCount = '—'; // Fonctionnalité à venir

        // Moyenne quotidienne sur la période
        const daysWorked = daysAggPeriod.length || 1;
        const avgDailyMin = Math.round(totalPeriodMin / daysWorked);
        const adH = Math.floor(avgDailyMin / 60);
        const adM = avgDailyMin % 60;
        const avgDaily = `${adH}h ${String(adM).padStart(2, '0')}m`;

        // Comparaison vs période précédente
        const totalPrevPeriodMin = clocksPrevPeriod.reduce((sum, c) => {
          const inD = new Date(c.clockIn);
          const outD = c.clockOut ? new Date(c.clockOut) : new Date();
          return sum + minutesBetweenLocal(inD, outD);
        }, 0);
        let comparison = '0%';
        if (totalPrevPeriodMin > 0) {
          const diffPct = ((totalPeriodMin - totalPrevPeriodMin) / totalPrevPeriodMin) * 100;
          comparison = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`;
        } else if (totalPeriodMin > 0) {
          comparison = '+100%';
        }

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
    if (!targetUserId) return;
    try {
      const today = new Date();
      const data = await fetchClocksRange(targetUserId, startOfDay(today), endOfDay(today));
      setHasClockedInToday(Array.isArray(data) && data.length > 0);
    } catch {
      setHasClockedInToday(false);
    }
    // Invalide tout (KPIs + Historique)
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
      <div className="p-8 space-y-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Bouton retour si consultation d'un autre employé */}
          {isViewingOtherEmployee && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          )}

          {!hasClockedInToday && !isViewingOtherEmployee && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-800">
                    ⏰ Vous n'avez pas encore pointé aujourd'hui
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    N'oubliez pas de pointer votre arrivée pour que vos heures soient comptabilisées.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions de pointage - Seulement si c'est son propre dashboard */}
          {!isViewingOtherEmployee && (
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Actions de pointage</h2>
              <ClockActions userId={targetUserId} onChanged={handleChanged} />
            </section>
          )}
          
          {/* Statistiques */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {isViewingOtherEmployee ? 'Statistiques' : 'Mes statistiques'}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                  <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
                </div>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard 
                title={`Heures (${selectedPeriod === 7 ? 'semaine' : selectedPeriod === 30 ? 'mois' : `${selectedPeriod}j`})`} 
                value={stats.hoursWeek} 
                icon={Clock}
              >
                <p className="text-xs text-gray-500 mt-1">Derniers {selectedPeriod} jours</p>
              </KPICard>
              <KPICard title="Jours en retard" value="—" icon={AlertTriangle}>
                <p className="text-xs text-blue-600 mt-1">⚙️ Fonctionnalité à venir (horaires de travail requis)</p>
              </KPICard>
              <KPICard title="Moyenne quotidienne" value={stats.avgWeek} icon={Briefcase}>
                <p className="text-xs text-gray-500 mt-1">Sur la période</p>
              </KPICard>
              <KPICard title="Comparaison" value={stats.comparison} icon={TrendingUp}>
                <p className="text-xs text-green-500 mt-1">vs période précédente</p>
              </KPICard>
            </div>
          </section>

          {/* Historique */}
          <section>
            <ClockHistory userId={targetUserId} period={selectedPeriod} refreshKey={refreshKey} />
          </section>

        </div>
      </div>
    </Layout>
  );
}