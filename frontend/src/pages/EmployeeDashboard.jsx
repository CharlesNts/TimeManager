// src/pages/EmployeeDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import KPICard from '../components/dashboard/KPICard.jsx';
import ClockActions from '../components/employee/ClockActions';
import ClockHistory from '../components/employee/ClockHistory';
import PeriodSelector from '../components/manager/PeriodSelector';
import { Clock, AlertTriangle, Briefcase, TrendingUp } from 'lucide-react';
import api from '../api/client';

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
  console.log('[DBG] current user:', user);
  const sidebarItems = getSidebarItems(user?.role);

  const [hasClockedInToday, setHasClockedInToday] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  // clé d'invalidation pour forcer refetch (KPIs + Historique)
  const [refreshKey, setRefreshKey] = useState(0);

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

  // Vérifier si pointé aujourd’hui
  useEffect(() => {
    const loadToday = async () => {
      try {
        const today = new Date();
        const data = await fetchClocksRange(user.id, startOfDay(today), endOfDay(today));
        setHasClockedInToday(Array.isArray(data) && data.length > 0);
      } catch {
        setHasClockedInToday(false);
      }
    };
    if (user?.id) loadToday();
  }, [user?.id, refreshKey]);

  // KPIs
  const [stats, setStats] = useState({
    hoursWeek: '—',
    delaysMonth: '—',
    avgWeek: '—',
    comparison: '—',
  });

  // Charger KPIs (dépend de refreshKey)
  useEffect(() => {
    if (!user?.id) return;

    const loadKpis = async () => {
      try {
        const now = new Date();

        const thisWeekStart = startOfWeekMon(now);
        const thisWeekEnd = endOfWeekSun(now);
        const lastWeekEnd = addDays(thisWeekStart, -1);
        const lastWeekStart = startOfWeekMon(lastWeekEnd);

        const monthStart = firstDayOfMonth(now);
        const monthEnd = lastDayOfMonth(now);

        const [clocksThisWeek, clocksLastWeek, clocksThisMonth] = await Promise.all([
          fetchClocksRange(user.id, thisWeekStart, thisWeekEnd),
          fetchClocksRange(user.id, lastWeekStart, lastWeekEnd),
          fetchClocksRange(user.id, monthStart, monthEnd),
        ]);

        // Heures cette semaine
        const minutesBetweenLocal = (a, b) => Math.max(0, Math.round((toParis(b) - toParis(a)) / 60000));
        const totalWeekMin = clocksThisWeek.reduce((sum, c) => {
          const inD = new Date(c.clockIn);
          const outD = c.clockOut ? new Date(c.clockOut) : new Date();
          return sum + minutesBetweenLocal(inD, outD);
        }, 0);
        const hwH = Math.floor(totalWeekMin / 60);
        const hwM = totalWeekMin % 60;
        const hoursWeek = `${hwH}h ${String(hwM).padStart(2, '0')}m`;

        // Jours en retard (mois)
        const daysAggMonth = aggregateByDay(clocksThisMonth);
        const delaysMonthCount = daysAggMonth.reduce((acc, d) => {
          const comp = complianceForDay(d.firstIn, d.totalWorkedMin);
          return acc + (comp.isLate ? 1 : 0);
        }, 0);

        // Moyenne hebdo (sur semaines du mois)
        let weekBuckets = new Map(); // key: ISO lundi -> minutes
        for (const d of daysAggMonth) {
          const [year, mm, dd] = d.dateKey.split('-').map(Number);
          const dateObj = toParis(new Date(year, mm - 1, dd));
          const monday = startOfWeekMon(dateObj);
          const key = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;

          const prev = weekBuckets.get(key) || 0;
          weekBuckets.set(key, prev + d.totalWorkedMin);
        }
        const weekValues = Array.from(weekBuckets.values());
        const divisor = weekValues.length || 1;
        const avgWeekMin = Math.round(weekValues.reduce((a, b) => a + b, 0) / divisor);
        const awH = Math.floor(avgWeekMin / 60);
        const awM = avgWeekMin % 60;
        const avgWeek = `${awH}h ${String(awM).padStart(2, '0')}m`;

        // Comparaison vs semaine passée
        const totalLastWeekMin = clocksLastWeek.reduce((sum, c) => {
          const inD = new Date(c.clockIn);
          const outD = c.clockOut ? new Date(c.clockOut) : new Date();
          return sum + minutesBetweenLocal(inD, outD);
        }, 0);
        let comparison = '0%';
        if (totalLastWeekMin > 0) {
          const diffPct = ((totalWeekMin - totalLastWeekMin) / totalLastWeekMin) * 100;
          comparison = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`;
        } else if (totalWeekMin > 0) {
          comparison = '+100%';
        }

        setStats({ hoursWeek, delaysMonth: String(delaysMonthCount), avgWeek, comparison });
      } catch (e) {
        console.warn('[Dashboard KPIs] error:', e?.message || e);
        setStats({ hoursWeek: '—', delaysMonth: '—', avgWeek: '—', comparison: '—' });
      }
    };

    loadKpis();
  }, [user?.id, refreshKey]);

  const handleChanged = async () => {
    if (!user?.id) return;
    try {
      const today = new Date();
      const data = await fetchClocksRange(user.id, startOfDay(today), endOfDay(today));
      setHasClockedInToday(Array.isArray(data) && data.length > 0);
    } catch {
      setHasClockedInToday(false);
    }
    // Invalide tout (KPIs + Historique)
    setRefreshKey((k) => k + 1);
  };

  return (
    <Layout 
      sidebarItems={sidebarItems}
      pageTitle="Mon dashboard"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8 space-y-8">
        <div className="max-w-7xl mx-auto">
          
          {!hasClockedInToday && (
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

          {/* Actions de pointage */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Actions de pointage</h2>
            <ClockActions userId={user?.id} onChanged={handleChanged} />
          </section>
          
          {/* Statistiques */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Mes statistiques</h2>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard title="Heures cette semaine" value={stats.hoursWeek} icon={Clock}>
                <p className="text-xs text-gray-500 mt-1">Du lun au dim</p>
              </KPICard>
              <KPICard title="Jours en retard (mois)" value={stats.delaysMonth} icon={AlertTriangle}>
                <p className="text-xs text-orange-500 mt-1">Règle flex 09:30–17:30</p>
              </KPICard>
              <KPICard title="Moyenne hebdo (mois)" value={stats.avgWeek} icon={Briefcase}>
                <p className="text-xs text-gray-500 mt-1">Sur les semaines du mois</p>
              </KPICard>
              <KPICard title="Comparaison" value={stats.comparison} icon={TrendingUp}>
                <p className="text-xs text-green-500 mt-1">vs semaine passée</p>
              </KPICard>
            </div>
          </section>

          {/* Historique */}
          <section>
            <ClockHistory userId={user?.id} period={selectedPeriod} refreshKey={refreshKey} />
          </section>

        </div>
      </div>
    </Layout>
  );
}