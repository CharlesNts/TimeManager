// src/pages/TeamsList.jsx
import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Users, Plus, CalendarCheck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import TeamCard from '../components/manager/TeamCard';
import TeamFormModal from '../components/manager/TeamFormModal';
import PeriodSelector from '../components/manager/PeriodSelector';
import ExportMenu from '../components/ui/ExportMenu';
import ChartModal from '../components/ui/ChartModal';
import api from '../api/client';
import scheduleTemplatesApi from '../api/scheduleTemplatesApi';
import { fetchTeamsForCurrentUser, deleteTeam } from '../api/teamApi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardTitle, CardHeader, CardDescription } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { getPeriodInfo, getDisplayPeriodBoundaries } from '../utils/granularityUtils';
import { calculateScheduledMinutesFromTemplate } from '../utils/scheduleUtils';
import { toParis } from '../utils/dateUtils';
import { exportTeamsListPDF } from '../utils/pdfExport';
import { exportTeamsListCSV } from '../utils/csvExport';

// --- Helpers ---
function fmtMinutes(v) {
  if (typeof v !== 'number') return '—';
  const h = Math.floor(v / 60);
  const m = v % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

const CustomTooltip = ({ active, payload, type = 'hours' }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const value = payload[0].value;
  const label = data?.label || data?.name || 'N/A';
  const teamsBreakdown = data?.teamsBreakdown || [];

  let title = 'Heures travaillées';
  let formattedValue = fmtMinutes(value);
  if (type === 'adherence') { title = 'Adhérence'; formattedValue = `${Math.round(value)}%`; }
  else if (type === 'teams') { title = 'Par Équipe'; formattedValue = `${value}h`; }

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-lg p-3 max-w-xs">
      <p className="text-xs font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-700 mb-2">{formattedValue}</p>
      {teamsBreakdown.length > 0 && (
        <div className="border-t pt-2 mt-1">
          <p className="text-xs font-medium text-gray-500 mb-1">Par équipe :</p>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {teamsBreakdown.slice(0, 5).map((t, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-600 truncate mr-2" style={{ maxWidth: '100px' }}>{t.name}</span>
                <span className="font-medium text-gray-800">{type === 'adherence' ? `${t.value}%` : fmtMinutes(t.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
CustomTooltip.propTypes = { active: PropTypes.bool, payload: PropTypes.array, type: PropTypes.string };

export default function TeamsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sidebarItems = getSidebarItems(user?.role);

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedGranularity, setSelectedGranularity] = useState('week');
  const [teamComparisonData, setTeamComparisonData] = useState([]);
  const [adherenceData, setAdherenceData] = useState({ rate: 0, chartSeries: [] });
  const [chartModal, setChartModal] = useState({ open: false, title: '', subtitle: '', data: [], chartType: 'bar', config: {} });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadTeams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user?.role === 'CEO') {
        const { data: allUsers } = await api.get('/api/users');
        const managerIds = (allUsers || []).filter(u => u.role === 'MANAGER' || u.role === 'CEO').map(u => u.id);
        const perManager = await Promise.all(managerIds.map(id => api.get('/api/teams', { params: { managerId: id } }).then(res => res.data).catch(() => [])));
        const merged = perManager.flat();
        const byId = new Map();
        merged.forEach(t => t?.id != null && byId.set(t.id, t));
        setTeams(Array.from(byId.values()).map(t => ({ id: t.id, name: t.name, description: t.description || '', managerName: t.manager ? `${t.manager.firstName} ${t.manager.lastName}` : '—', memberCount: t.memberCount ?? t.membersCount ?? 0 })));
      } else {
        setTeams(await fetchTeamsForCurrentUser(user));
      }
    } catch (e) { console.error('Erreur chargement équipes:', e.message); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const loadStats = useCallback(async () => {
    if (!teams.length || user?.role !== 'CEO') { setStatsLoading(false); return; }
    setStatsLoading(true);
    try {
      const now = new Date();
      const periodBoundaries = getDisplayPeriodBoundaries(selectedGranularity);
      const start = periodBoundaries[0].startDate;
      
      const teamsWithMembers = await Promise.all(teams.map(async team => {
        try { const { data } = await api.get(`/api/teams/${team.id}/members`); return { ...team, members: Array.isArray(data) ? data : [] }; }
        catch { return { ...team, members: [] }; }
      }));

      const uniqueIds = [...new Set(teamsWithMembers.flatMap(t => t.members.map(m => m.user?.id || m.userId)).filter(Boolean))];
      const [clocksRes, scheduleRes] = await Promise.all([
        Promise.all(uniqueIds.map(async id => {
          try { const { data } = await api.get(`/api/users/${id}/clocks/range`, { params: { from: start.toISOString(), to: now.toISOString() } }); return { userId: id, clocks: data || [] }; }
          catch { return { userId: id, clocks: [] }; }
        })),
        Promise.all(teamsWithMembers.map(async t => {
          try { const s = await scheduleTemplatesApi.getActiveForTeam(t.id); return { teamId: t.id, schedule: s, count: t.members.length }; }
          catch { return { teamId: t.id, schedule: null, count: t.members.length }; }
        }))
      ]);

      // Processing simplified...
      processAndSetStats(teamsWithMembers, clocksRes, scheduleRes, periodBoundaries, now);
    } catch (err) { console.error(err); }
    finally { setStatsLoading(false); }
  }, [teams, selectedGranularity, user?.role]);

  const processAndSetStats = (teamsWithMembers, clocksRes, scheduleRes, periodBoundaries, now) => {
    const userStats = {};
    const dailyHours = {};
    const teamDaily = {};
    teamsWithMembers.forEach(t => teamDaily[t.id] = { name: t.name, daily: {} });

    clocksRes.forEach(({ userId, clocks }) => {
      userStats[userId] = { total: 0 };
      clocks.forEach(c => {
        const dur = Math.max(0, Math.round(( (c.clockOut ? new Date(c.clockOut) : now) - new Date(c.clockIn)) / 60000));
        userStats[userId].total += dur;
        const key = dateToKey(toParis(new Date(c.clockIn)));
        dailyHours[key] = (dailyHours[key] || 0) + dur;
        teamsWithMembers.forEach(t => {
          if (t.members.some(m => (m.user?.id || m.userId) === userId)) {
            teamDaily[t.id].daily[key] = (teamDaily[t.id].daily[key] || 0) + dur;
          }
        });
      });
    });

    const comparison = teamsWithMembers.map(t => ({
      name: t.name,
      value: Math.round(t.members.reduce((acc, m) => acc + (userStats[m.user?.id || m.userId]?.total || 0), 0) / 60 * 10) / 10
    })).sort((a, b) => b.value - a.value);

    setTeamComparisonData(comparison);
    
    const adherenceSeries = periodBoundaries.map(p => {
      let worked = sumInPeriod(dailyHours, p);
      let scheduled = scheduleRes.reduce((acc, s) => {
        if (!s.schedule) return acc;
        return acc + sumInPeriod(calculateScheduledMinutesFromTemplate(periodBoundaries[0].startDate, now, s.schedule).dailyMap, p) * s.count;
      }, 0);
      return { label: p.label, value: scheduled > 0 ? Math.min(100, Math.round((Math.min(worked, scheduled) / scheduled) * 100)) : 0 };
    });

    setAdherenceData({
      rate: adherenceSeries.length ? adherenceSeries.reduce((s, x) => s + x.value, 0) / adherenceSeries.length : 0,
      chartSeries: adherenceSeries
    });
  };

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleExportPDF = () => exportTeamsListPDF(teams, { teamComparisonData, adherenceRate: adherenceData.rate }, getPeriodInfo(selectedGranularity).label);
  const handleExportCSV = () => exportTeamsListCSV(teams, { teamComparisonData, adherenceRate: adherenceData.rate }, getPeriodInfo(selectedGranularity).label);

  return (
    <Layout sidebarItems={sidebarItems} pageTitle="Mes équipes" userName={`${user?.firstName} ${user?.lastName}`} userRole={user?.role}>
      <div className="p-8"><div className="max-w-7xl mx-auto">
        <TeamsHeader 
          count={teams.length} 
          onExportPDF={handleExportPDF} 
          onExportCSV={handleExportCSV} 
          onCreate={user?.role === 'CEO' ? () => { setModalMode('create'); setSelectedTeam(null); setIsModalOpen(true); } : null} 
        />
        {user?.role === 'CEO' && teams.length > 0 && (
          <TeamsStats 
            granularity={selectedGranularity} 
            onGranularityChange={setSelectedGranularity} 
            loading={statsLoading} 
            comparisonData={teamComparisonData} 
            adherenceData={adherenceData} 
            setChartModal={setChartModal} 
          />
        )}

        {loading && <div className="text-gray-600">Chargement...</div>}

        <TeamsGrid 
          loading={loading} 
          teams={teams} 
          onTeamClick={id => navigate(`/teams/${id}`)} 
          onEdit={t => { setModalMode('edit'); setSelectedTeam(t); setIsModalOpen(true); }} 
          onDelete={async id => { if(confirm('Sûr ?')) { await deleteTeam(id); loadTeams(); } }} 
          isCEO={user?.role === 'CEO'} 
        />
      </div></div>
      <TeamFormModal isOpen={isModalOpen} mode={modalMode} team={selectedTeam} onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); loadTeams(); }} userRole={user?.role} currentUserId={user?.id} />
      <ChartModal open={chartModal.open} onClose={() => setChartModal(m => ({ ...m, open: false }))} title={chartModal.title} subtitle={chartModal.subtitle} data={chartModal.data} type={chartModal.chartType} chartConfig={chartModal.config} CustomTooltip={CustomTooltip} />
    </Layout>
  );
}

// --- Internal Helper Components ---

function dateToKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function sumInPeriod(map, p) {
  return Object.entries(map).reduce((acc, [k, v]) => {
    const d = new Date(k);
    return (d >= p.startDate && d <= p.endDate) ? acc + v : acc;
  }, 0);
}

function TeamsHeader({ count, onExportPDF, onExportCSV, onCreate }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div><h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestion des équipes</h1><p className="text-gray-500 mt-1">{count} équipe{count > 1 ? 's' : ''}</p></div>
      <div className="flex items-center gap-3">
        <ExportMenu onExportPDF={onExportPDF} onExportCSV={onExportCSV} variant="outline" />
        {onCreate && <Button onClick={onCreate}><Plus className="w-4 h-4 mr-2" />Créer une équipe</Button>}
      </div>
    </div>
  );
}
TeamsHeader.propTypes = { count: PropTypes.number.isRequired, onExportPDF: PropTypes.func.isRequired, onExportCSV: PropTypes.func.isRequired, onCreate: PropTypes.func };

function TeamsStats({ granularity, onGranularityChange, loading, comparisonData, adherenceData, setChartModal }) {
  return (
    <Card className="mb-8">
      <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-xl">Statistiques des équipes</CardTitle><PeriodSelector selectedGranularity={granularity} onGranularityChange={onGranularityChange} /></div></CardHeader>
      <CardContent>
        {loading ? <div className="text-gray-500 text-sm">Chargement...</div> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <KPIChart title="Comparaison des Équipes" icon={<TrendingUp className="h-4 w-4 text-gray-400" />} onExpand={() => setChartModal({ open: true, title: 'Comparaison', data: comparisonData, chartType: 'bar', config: { barColors: ['#2563eb', '#94a3b8'] } })}>
              <div className="h-[180px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide /><YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18}>
                      {comparisonData.slice(0, 5).map((e, i) => <Cell key={i} fill={i === 0 ? '#2563eb' : '#94a3b8'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </KPIChart>
            <KPIChart title="Adhérence moyenne" icon={<CalendarCheck className="h-4 w-4 text-gray-400" />} onExpand={() => setChartModal({ open: true, title: 'Adhérence', data: adherenceData.chartSeries, chartType: 'area', config: { color: '#10b981' } })}>
              <div className="text-2xl font-bold mb-2">{adherenceData.rate.toFixed(1)}%</div>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={adherenceData.chartSeries} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                    <XAxis dataKey="label" hide /><Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </KPIChart>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
TeamsStats.propTypes = { granularity: PropTypes.string.isRequired, onGranularityChange: PropTypes.func.isRequired, loading: PropTypes.bool.isRequired, comparisonData: PropTypes.array.isRequired, adherenceData: PropTypes.object.isRequired, setChartModal: PropTypes.func.isRequired };

function KPIChart({ title, icon, children, onExpand }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onExpand}>
      <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>{icon}</CardHeader>
      <CardContent>{children}<p className="text-xs text-center text-gray-400 mt-2">Cliquer pour agrandir</p></CardContent>
    </Card>
  );
}
KPIChart.propTypes = { title: PropTypes.string.isRequired, icon: PropTypes.node, children: PropTypes.node.isRequired, onExpand: PropTypes.func.isRequired };

function TeamsGrid({ loading, teams, onTeamClick, onEdit, onDelete, isCEO }) {
  if (loading) return null;
  if (!teams.length) return <EmptyTeams isCEO={isCEO} />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teams.map(t => <TeamCard key={t.id} teamName={t.name} description={t.description} memberCount={t.memberCount} managerName={t.managerName} onClick={() => onTeamClick(t.id)} onEdit={() => onEdit(t)} onDelete={() => onDelete(t.id)} showActions={isCEO} />)}
    </div>
  );
}
TeamsGrid.propTypes = { loading: PropTypes.bool.isRequired, teams: PropTypes.array.isRequired, onTeamClick: PropTypes.func.isRequired, onEdit: PropTypes.func.isRequired, onDelete: PropTypes.func.isRequired, isCEO: PropTypes.bool };

function EmptyTeams({ isCEO }) {
  return (
    <Card className="text-center py-12"><CardContent>
      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" /><CardTitle className="mb-2">Aucune équipe pour le moment</CardTitle>
      <CardDescription className="mb-4">{isCEO ? 'Commencez par créer votre première équipe' : "Vous n'êtes membre d'aucune équipe"}</CardDescription>
    </CardContent></Card>
  );
}
EmptyTeams.propTypes = { isCEO: PropTypes.bool };
