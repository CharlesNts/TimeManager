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
import { Clock, AlertTriangle, Briefcase, TrendingUp, ArrowLeft } from 'lucide-react';
import api from '../api/client';
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
                  variant={hasClockedInToday ? "default" : "secondary"}
                  className="text-sm px-4 py-2"
                >
                  {hasClockedInToday ? "✓ Pointé aujourd'hui" : "⏰ Non pointé"}
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
                    <ExportMenu 
                      onExportPDF={handleExportPDF}
                      onExportCSV={handleExportCSV}
                      variant="default"
                    />
                  </div>
                  <div className="pt-4">
                    <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KPICard 
                      title={`Heures (${selectedPeriod === 7 ? 'semaine' : selectedPeriod === 30 ? 'mois' : `${selectedPeriod}j`})`} 
                      value={stats.hoursWeek} 
                      icon={Clock}
                    >
                      <p className="text-xs text-gray-500 mt-1">Derniers {selectedPeriod} jours</p>
                    </KPICard>
                    <KPICard title="Jours en retard" value="—" icon={AlertTriangle}>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        ⚙️ À venir
                      </Badge>
                    </KPICard>
                    <KPICard title="Moyenne quotidienne" value={stats.avgWeek} icon={Briefcase}>
                      <p className="text-xs text-gray-500 mt-1">Sur la période</p>
                    </KPICard>
                    <KPICard title="Comparaison" value={stats.comparison} icon={TrendingUp}>
                      <Badge variant={stats.comparison.startsWith('+') ? 'default' : 'secondary'} className="mt-2">
                        vs période précédente
                      </Badge>
                    </KPICard>
                  </div>
                </CardContent>
              </Card>

              {/* Historique */}
              <section>
                <ClockHistory userId={targetUserId} period={selectedPeriod} refreshKey={refreshKey} />
              </section>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}