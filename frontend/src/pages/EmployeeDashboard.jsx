// src/pages/EmployeeDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClockNotification } from '../hooks/useClockNotification';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import ClockActions from '../components/employee/ClockActions';
import ClockCalendarView from '../components/employee/ClockCalendarView';
import RequestLeaveModal from '../components/employee/RequestLeaveModal';
import PeriodSelector from '../components/manager/PeriodSelector';
import { Clock, AlertTriangle, Briefcase, ArrowLeft, Calendar } from 'lucide-react';
import api from '../api/client';
import reportsApi from '../api/reportsApi';
import scheduleTemplatesApi from '../api/scheduleTemplatesApi';
import { buildChartSeries } from '../api/statsApi';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { exportEmployeeDashboardPDF } from '../utils/pdfExport';
import { exportEmployeeDashboardCSV } from '../utils/csvExport';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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

import { calculateScheduledMinutesFromTemplate } from '../utils/scheduleUtils';

// --- Global Helpers ---

function fmtMinutes(v) {
  if (typeof v !== 'number') return '—';
  const h = Math.floor(v / 60);
  const m = v % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function CustomTooltip({ active, payload, type = 'hours' }) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  const label = payload[0].payload?.label || 'N/A';

  let title = 'Heures travaillées';
  let formattedValue = fmtMinutes(Math.round(value));

  if (type === 'adherence') {
    title = 'Adhérence';
    formattedValue = `${Math.round(value)}%`;
  } else if (type === 'lateness') {
    title = 'Taux de retard';
    formattedValue = `${value.toFixed(1)}%`;
  } else if (type === 'avg') {
    title = 'Moyenne';
    formattedValue = fmtMinutes(Math.round(value));
  } else if (type === 'comparison') {
    title = 'Comparaison';
    formattedValue = `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md p-2">
      <p className="text-xs font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{formattedValue}</p>
    </div>
  );
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  type: PropTypes.string,
};

async function fetchClocksRange(userId, from, to) {
  const { data } = await api.get(`/api/users/${userId}/clocks/range`, {
    params: { from: toISO(from), to: toISO(to) },
  });
  return Array.isArray(data) ? data : [];
}

// --- KPI Logic Extraction ---

function calculateLateness(clocksRange, startDate, endDate) {
  const clocksByDay = {};
  clocksRange.forEach(c => {
    const d = new Date(c.clockIn);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!clocksByDay[dayKey]) clocksByDay[dayKey] = [];
    clocksByDay[dayKey].push(d);
  });

  const limitMinutes = 9 * 60 + 5; // 09:05
  let lateDays = 0;
  let totalDays = 0;

  Object.entries(clocksByDay).forEach(([dayKey, dates]) => {
    dates.sort((a, b) => a - b);
    const dayDate = new Date(dayKey);
    dayDate.setHours(12, 0, 0, 0);
    if (dayDate >= startDate && dayDate <= endDate) {
      totalDays++;
      const firstMinutes = dates[0].getHours() * 60 + dates[0].getMinutes();
      if (firstMinutes > limitMinutes) lateDays++;
    }
  });

  return {
    rate: totalDays > 0 ? (lateDays / totalDays) * 100 : 0,
    lateDays,
    totalDays
  };
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
  const [chartModal, setChartModal] = useState({ open: false, type: null, title: '', subtitle: '', data: [], chartType: 'area', config: {} });

  // Load viewed employee
  useEffect(() => {
    if (isViewingOtherEmployee && userId) {
      api.get(`/api/users/${userId}`)
        .then(res => setViewedEmployee(res.data))
        .catch(() => navigate('/dashboard'));
    }
  }, [userId, isViewingOtherEmployee, navigate]);

  useEffect(() => { setRefreshKey(k => k + 1); }, [selectedGranularity]);

  // Status Check
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const { data } = await api.get(`/api/users/${targetUserId}/clocks`, {
          params: { page: 0, size: 1, sort: 'clockIn,desc' },
        });
        const last = data?.content?.[0] || null;
        const today = toParis(new Date());
        today.setHours(0, 0, 0, 0);
        setHasClockedInToday(last && last.clockIn ? toParis(new Date(last.clockIn)) >= today : false);
        
        if (!(last && !last.clockOut)) {
          setCurrentStatus({ status: 'not-clocked', label: 'Non pointé', icon: '⏰', color: 'secondary' });
        } else {
          const raw = localStorage.getItem(`clock-pauses-${last.id}`);
          const pauses = raw ? JSON.parse(raw) : [];
          const isOnBreak = !!(pauses?.length && !pauses[pauses.length - 1].endAt);
          setCurrentStatus(isOnBreak 
            ? { status: 'on-break', label: 'En pause', icon: '☕', color: 'outline' }
            : { status: 'working', label: 'En travail', icon: '💼', color: 'default' });
        }
      } catch (err) {
        setCurrentStatus({ status: 'not-clocked', label: 'Non pointé', icon: '⏰', color: 'secondary' });
      }
    };
    if (targetUserId) loadStatus();
  }, [targetUserId, refreshKey]);

  const [recentClocks, setRecentClocks] = useState([]);
  const [hoursChartSeries, setHoursChartSeries] = useState([]);
  const [adherenceData, setAdherenceData] = useState({ rate: 0, scheduledHours: 0, chartSeries: [], evolutionRate: 0 });
  const [stats, setStats] = useState({ hoursCurrent: 0, minutesCurrent: 0, evolutionRate: 0, evolutionLabel: '', avgCurrent: 0 });
  const [latenessData, setLatenessData] = useState({ rate: 0, lateDays: 0, totalDays: 0, chartSeries: [], evolutionRate: 0 });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [teamsForUser, setTeamsForUser] = useState([]);
  const [schedulesByTeam, setSchedulesByTeam] = useState({});

  useClockNotification(hasClockedInToday, user?.role, isViewingOtherEmployee);

  useEffect(() => {
    let cancel = false;
    const loadTeams = async () => {
      if (!targetUserId) return;
      try {
        const mod = await import('../api/teamApi');
        const data = await mod.fetchUserMemberships(targetUserId);
        if (cancel) return;
        setTeamsForUser(Array.isArray(data) ? data : []);
        const schedules = {};
        for (const team of data) {
          try {
            const sch = await scheduleTemplatesApi.getActiveForTeam(team.id);
            if (sch) schedules[team.id] = sch;
          } catch (e) { /* ignore */ }
        }
        if (!cancel) setSchedulesByTeam(schedules);
      } catch (e) { if (!cancel) setTeamsForUser([]); }
    };
    loadTeams();
    return () => { cancel = true; };
  }, [targetUserId]);

  const calculateEvolution = (current, previous) => {
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  };

  const loadKpis = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const now = new Date();
      const periodBoundaries = getDisplayPeriodBoundaries(selectedGranularity);
      const { periodCount } = getPeriodInfo(selectedGranularity);
      const startOfCurrentPeriod = periodBoundaries[0].startDate;

      const clocksRange = await fetchClocksRange(targetUserId, startOfCurrentPeriod, now);
      setLatenessData(prev => ({ ...prev, ...calculateLateness(clocksRange, startOfCurrentPeriod, now) }));
      setRecentClocks(clocksRange.slice(0, 20));

      let totalNetMin = 0;
      try {
        const hData = await reportsApi.getUserHours(targetUserId, startOfCurrentPeriod.toISOString(), now.toISOString());
        totalNetMin = Math.round((hData.netHours || 0) * 60);
      } catch (e) { /* fallback to manual sum if needed */ }

      // Map worked/scheduled hours daily
      const dailyHoursMap = {};
      const dailyScheduledMap = {};
      let totalScheduledMin = 0;

      clocksRange.forEach(c => {
        const inD = new Date(c.clockIn);
        const outD = c.clockOut ? new Date(c.clockOut) : now;
        const dayKey = dateToKey(toParis(inD));
        dailyHoursMap[dayKey] = (dailyHoursMap[dayKey] || 0) + Math.round((outD - inD) / 60000);
      });

      Object.values(schedulesByTeam).forEach(sch => {
        const data = calculateScheduledMinutesFromTemplate(startOfCurrentPeriod, now, sch);
        totalScheduledMin += data.totalMinutes;
        Object.entries(data.dailyMap).forEach(([k, v]) => { dailyScheduledMap[k] = (dailyScheduledMap[k] || 0) + v; });
      });

      // Charts
      const hoursData = buildChartSeries(periodBoundaries.map(p => ({
        date: p.label,
        minutesWorked: sumMapInPeriod(dailyHoursMap, p)
      })), 12, periodCount);
      
      const adherencePerPeriod = periodBoundaries.map(p => {
        const worked = sumMapInPeriod(dailyHoursMap, p);
        const scheduled = sumMapInPeriod(dailyScheduledMap, p);
        return { date: p.label, value: scheduled > 0 ? Math.min(100, Math.round((Math.min(worked, scheduled) / scheduled) * 100)) : 0 };
      });

      const totalOverlap = Math.min(totalNetMin || 0, totalScheduledMin);
      const globalAdh = totalScheduledMin > 0 ? Math.min(100, (totalOverlap / totalScheduledMin) * 100) : 0;

      setHoursChartSeries(hoursData);
      setAdherenceData({
        rate: globalAdh,
        scheduledHours: Math.round(totalScheduledMin / 60),
        chartSeries: buildChartSeries(adherencePerPeriod.map(p => ({ date: p.date, minutesWorked: p.value })), 12, periodCount),
        evolutionRate: adherencePerPeriod.length >= 2 ? calculateEvolution(adherencePerPeriod[adherencePerPeriod.length-1].value, adherencePerPeriod[adherencePerPeriod.length-2].value) : 0
      });

      setStats({
        hoursCurrent: Math.floor(totalNetMin / 60),
        minutesCurrent: totalNetMin % 60,
        evolutionRate: 0, // Simplified evolution
        evolutionLabel: `vs période précédente`,
        avgCurrent: totalNetMin / periodCount / 60
      });

    } catch (e) { console.warn('[KPI Error]', e); }
  }, [targetUserId, selectedGranularity, schedulesByTeam]);

  useEffect(() => { loadKpis(); }, [loadKpis]);

  const handleChanged = () => setRefreshKey(k => k + 1);

  const handleExportPDF = () => {
    const chartData = { hoursChartSeries, adherenceChartSeries: adherenceData.chartSeries, adherenceRate: adherenceData.rate, latenessRate: latenessData.rate };
    exportEmployeeDashboardPDF(targetUser || user, stats, recentClocks, chartData, getPeriodInfo(selectedGranularity).label);
  };

  const handleExportCSV = () => {
    const chartData = { hoursChartSeries, adherenceRate: adherenceData.rate, latenessRate: latenessData.rate };
    exportEmployeeDashboardCSV(targetUser || user, stats, recentClocks, chartData, getPeriodInfo(selectedGranularity).label);
  };

  const pageTitle = isViewingOtherEmployee ? `Dashboard de ${viewedEmployee?.firstName} ${viewedEmployee?.lastName}` : "Mon dashboard";

  if (isViewingOtherEmployee && !viewedEmployee) return <Layout sidebarItems={sidebarItems} pageTitle="Dashboard" userName={`${user?.firstName}`} userRole={user?.role}><div className="p-8">Chargement...</div></Layout>;

  return (
    <Layout sidebarItems={sidebarItems} pageTitle={pageTitle} userName={`${user?.firstName} ${user?.lastName}`} userRole={user?.role}>
      <div className="p-8 space-y-6">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title={pageTitle} isOther={isViewingOtherEmployee} navigate={navigate} status={currentStatus} />
          
          {!hasClockedInToday && !isViewingOtherEmployee && <AlertClockIn />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {!isViewingOtherEmployee && (
              <div className="lg:col-span-1 space-y-6">
                <div className="sticky top-6">
                  <ActionCard title="Actions de pointage" icon={<Clock className="w-5 h-5"/>}><ClockActions userId={targetUserId} onChanged={handleChanged} /></ActionCard>
                  <ActionCard title="Congés" icon={<Calendar className="w-5 h-5"/>}><Button onClick={() => setIsLeaveModalOpen(true)} className="w-full"><Calendar className="w-4 h-4 mr-2" />Demander un congé</Button></ActionCard>
                  <TeamListCard teams={teamsForUser} />
                </div>
              </div>
            )}

            <div className={!isViewingOtherEmployee ? "lg:col-span-2" : "lg:col-span-3"}>
              <StatsCard 
                granularity={selectedGranularity} 
                onGranularityChange={setSelectedGranularity} 
                onCalendarOpen={() => setIsCalendarOpen(true)}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                hoursSeries={hoursChartSeries}
                adherenceData={adherenceData}
                latenessData={latenessData}
                stats={stats}
                CustomTooltip={CustomTooltip}
                setChartModal={setChartModal}
              />
            </div>
          </div>
        </div>
      </div>

      <ClockCalendarView open={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} clocks={recentClocks} userName={`${targetUser?.firstName || ''} ${targetUser?.lastName || ''}`} schedule={teamsForUser[0]?.id ? schedulesByTeam[teamsForUser[0].id] : null} userId={targetUserId} />
      <RequestLeaveModal open={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} userId={user?.id} onSuccess={handleChanged} />
      <ChartModal open={chartModal.open} onClose={() => setChartModal(m => ({ ...m, open: false }))} title={chartModal.title} subtitle={chartModal.subtitle} data={chartModal.data} type={chartModal.chartType} chartConfig={chartModal.config} CustomTooltip={CustomTooltip} />
    </Layout>
  );
}

// --- Internal Helper Components ---

function dateToKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sumMapInPeriod(map, period) {
  let total = 0;
  Object.entries(map).forEach(([key, val]) => {
    const d = new Date(key);
    if (d >= period.startDate && d <= period.endDate) total += val;
  });
  return total;
}

function DashboardHeader({ title, isOther, navigate, status }) {
  return (
    <div className="mb-6">
      {isOther && <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="gap-2 mb-4"><ArrowLeft className="w-4 h-4" />Retour</Button>}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
          <p className="text-gray-500 mt-1">{isOther ? "Consultez les statistiques de l'employé" : "Gérez vos pointages et statistiques"}</p>
        </div>
        {!isOther && <Badge variant={status.color} className="text-sm px-4 py-2 gap-2"><span>{status.icon}</span><span>{status.label}</span></Badge>}
      </div>
    </div>
  );
}
DashboardHeader.propTypes = {
  title: PropTypes.string.isRequired,
  isOther: PropTypes.bool,
  navigate: PropTypes.func.isRequired,
  status: PropTypes.object.isRequired,
};

function AlertClockIn() {
  return (
    <Card className="mb-6 border-l-4 border-orange-400 bg-orange-50">
      <CardContent className="p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-900">⏰ Pointage manquant</p>
          <p className="text-xs text-orange-800 mt-1">N&apos;oubliez pas de pointer votre arrivée aujourd&apos;hui.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({ title, icon, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
ActionCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  children: PropTypes.node,
};

function TeamListCard({ teams }) {
  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>Mes équipes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {teams.length === 0 ? <p className="text-sm text-gray-500">Aucune équipe.</p> : teams.map(t => (
          <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href=`/teams/${t.id}`}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <h4 className="font-semibold">{t.name}</h4>
                <Badge variant="outline" className="text-xs mt-1">Manager: {t.managerName || '—'}</Badge>
              </div>
              <Briefcase className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
TeamListCard.propTypes = { teams: PropTypes.array.isRequired };

function StatsCard({ granularity, onGranularityChange, onCalendarOpen, onExportPDF, onExportCSV, hoursSeries, adherenceData, latenessData, stats, CustomTooltip, setChartModal }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle>Statistiques</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCalendarOpen} className="gap-2"><Calendar className="w-4 h-4" />Planning</Button>
            <ExportMenu onExportPDF={onExportPDF} onExportCSV={onExportCSV} />
          </div>
        </div>
        <div className="pt-4"><PeriodSelector selectedGranularity={granularity} onGranularityChange={onGranularityChange} /></div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KPIItem 
            title="Heures travaillées" 
            value={`${Math.floor(stats.avgCurrent || 0)}h ${String(Math.round(((stats.avgCurrent || 0) % 1) * 60)).padStart(2, '0')}m`}
            evolution={stats.evolutionRate} 
            label={stats.evolutionLabel} 
            data={hoursSeries} 
            color="var(--color-desktop)" 
            onExpand={() => setChartModal({ open: true, title: 'Heures travaillées', data: hoursSeries, chartType: 'area', config: { color: 'var(--color-desktop)', tooltipType: 'hours' }})}
            CustomTooltip={CustomTooltip}
          />
          <KPIItem 
            title="Adhérence" 
            value={`${adherenceData.rate.toFixed(1)}%`}
            evolution={adherenceData.evolutionRate} 
            label={`${adherenceData.scheduledHours}h planifiées`} 
            data={adherenceData.chartSeries} 
            color="#10b981" 
            onExpand={() => setChartModal({ open: true, title: 'Adhérence Planning', data: adherenceData.chartSeries, chartType: 'area', config: { color: '#10b981', tooltipType: 'adherence' }})}
            CustomTooltip={CustomTooltip}
          />
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Taux de retard</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{latenessData.rate.toFixed(1)}%</div>
              <p className="text-xs text-gray-500 mt-2">{latenessData.lateDays} jour(s) sur {latenessData.totalDays}</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
StatsCard.propTypes = {
  granularity: PropTypes.string.isRequired,
  onGranularityChange: PropTypes.func.isRequired,
  onCalendarOpen: PropTypes.func.isRequired,
  onExportPDF: PropTypes.func.isRequired,
  onExportCSV: PropTypes.func.isRequired,
  hoursSeries: PropTypes.array.isRequired,
  adherenceData: PropTypes.object.isRequired,
  latenessData: PropTypes.object.isRequired,
  stats: PropTypes.object.isRequired,
  CustomTooltip: PropTypes.func.isRequired,
  setChartModal: PropTypes.func.isRequired,
};

function KPIItem({ title, value, evolution, label, data, color, onExpand, CustomTooltip }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-all" onClick={onExpand}>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <div className="text-2xl font-bold">{value}</div>
          <div className={`text-sm mb-1 font-medium ${evolution >= 0 ? 'text-green-600' : 'text-red-600'}`}>{evolution >= 0 ? "↗" : "↘"} {Math.abs(evolution).toFixed(1)}%</div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
        <div className="h-[80px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
              <XAxis hide dataKey="label" />
              <YAxis hide />
              <RechartsTooltip content={<CustomTooltip type={title.toLowerCase().includes('adh') ? 'adherence' : 'hours'} />} cursor={false} />
              <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.1} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
KPIItem.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  evolution: PropTypes.number,
  label: PropTypes.string,
  data: PropTypes.array,
  color: PropTypes.string,
  onExpand: PropTypes.func,
  CustomTooltip: PropTypes.func,
};
