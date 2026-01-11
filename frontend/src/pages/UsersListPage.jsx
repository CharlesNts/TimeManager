// src/pages/UsersListPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import EditUserModal from '../components/manager/EditUserModal';
import PeriodSelector from '../components/manager/PeriodSelector';
import ExportMenu from '../components/ui/ExportMenu';
import ChartModal from '../components/ui/ChartModal';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { exportUsersListPDF } from '../utils/pdfExport';
import { exportUsersListCSV } from '../utils/csvExport';
import {
  Check,
  X,
  Edit,
  Trash2,
  Filter,
  Clock,
  CalendarCheck,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { buildChartSeries } from '../api/statsApi';
import { getPeriodInfo, getDisplayPeriodBoundaries } from '../utils/granularityUtils';
import { toParis, toISO } from '../utils/dateUtils';
import api from '../api/client';
import { getClocksInRange } from '../api/clocks.api';
import scheduleTemplatesApi from '../api/scheduleTemplatesApi';
import { calculateScheduledMinutesFromTemplate, getLatenessThresholdFromSchedule } from '../utils/scheduleUtils';

import {
  fetchUsers,
  fetchPendingUsers,
  approveUser,
  updateUser,
  deleteUser,
} from '../api/userAdminApi';

// Helper function to format minutes
function fmtMinutes(v) {
  if (typeof v !== 'number') return '—'
  const h = Math.floor(v / 60)
  const m = v % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, type = 'hours' }) => {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0].value
  const label = payload[0].payload?.label || 'N/A'

  let title = 'Heures travaillées'
  let formattedValue = fmtMinutes(value)

  if (type === 'adherence') {
    title = 'Adhérence'
    formattedValue = `${Math.round(value)}%`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md p-2">
      <p className="text-xs font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{formattedValue}</p>
    </div>
  )
};

export default function UsersListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sidebarItems = getSidebarItems(user?.role);

  // Filtres
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Données
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Modal d'édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Granularity and Charts
  const [selectedGranularity, setSelectedGranularity] = useState('week');
  const selectedPeriod = getPeriodInfo(selectedGranularity).periodCount;
  const [hoursChartSeries, setHoursChartSeries] = useState([]);
  const [hoursTotals, setHoursTotals] = useState({ current: 0 });
  const [adherenceData, setAdherenceData] = useState({ rate: 0, chartSeries: [] });
  const [latenessData, setLatenessData] = useState({ rate: 0, lateDays: 0, totalDays: 0 });
  const [chartModal, setChartModal] = useState({ open: false, title: '', subtitle: '', data: [], chartType: 'area', config: {} });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    setErr('');
    try {
      const [allUsers, pending] = await Promise.all([
        fetchUsers(),
        fetchPendingUsers(),
      ]);

      const pendingIds = new Set(pending.map((u) => u.id));

      const mapped = allUsers.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        status: pendingIds.has(u.id) ? 'PENDING' : 'APPROVED',
        createdAt: u.createdAt || new Date().toISOString(),
        phoneNumber: u.phoneNumber || '',
      }));

      setRows(mapped);
    } catch (e) {
      setErr(e?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Load Stats for Graphs
  useEffect(() => {
    if (!rows.length) {
      setStatsLoading(false);
      return;
    }

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const now = new Date();
        const periodBoundaries = getDisplayPeriodBoundaries(selectedGranularity);
        const startOfCurrentPeriod = periodBoundaries[0].startDate;
        const endOfCurrentPeriod = now;

        // Get all employees, managers and admins for clocking stats
        const targetUsers = rows.filter(u => u.role === 'EMPLOYEE' || u.role === 'MANAGER' || u.role === 'CEO');

        // Get all teams for schedule templates
        const { data: allApiUsers } = await api.get('/api/users');
        const managerAndCEOIds = (allApiUsers || [])
          .filter(u => u.role === 'MANAGER' || u.role === 'CEO')
          .map(u => u.id);

        const teamPromises = managerAndCEOIds.map(id =>
          api.get('/api/teams', { params: { managerId: id } })
            .then(res => Array.isArray(res.data) ? res.data : [])
            .catch(() => [])
        );
        const teamArrays = await Promise.all(teamPromises);
        const teamsFlat = teamArrays.flat();
        const uniqueTeams = Array.from(new Map(teamsFlat.map(t => [t.id, t])).values());

        // Fetch members for all teams
        const teamsWithMembers = await Promise.all(
          uniqueTeams.map(async (team) => {
            try {
              const { data: members } = await api.get(`/api/teams/${team.id}/members`);
              return { ...team, members: Array.isArray(members) ? members : [] };
            } catch {
              return { ...team, members: [] };
            }
          })
        );

        // Fetch clocks and schedules
        const [clocksResults, scheduleResults] = await Promise.all([
          Promise.all(targetUsers.map(async (u) => {
            try {
              const clocks = await getClocksInRange(u.id, toISO(startOfCurrentPeriod), toISO(endOfCurrentPeriod));
              // Debug log
              if (clocks.length > 0) console.log(`[UsersListPage] Loaded ${clocks.length} clocks for user ${u.id}`);
              return { userId: u.id, clocks };
            } catch { return { userId: u.id, clocks: [] }; }
          })),
          Promise.all(teamsWithMembers.map(async (team) => {
            try {
              const schedule = await scheduleTemplatesApi.getActiveForTeam(team.id);
              return { teamId: team.id, schedule, memberCount: team.members.length };
            } catch { return { teamId: team.id, schedule: null, memberCount: team.members.length }; }
          }))
        ]);

        // Calculate Lateness Locally
        let totalLateDays = 0;
        let totalDaysWithClock = 0;
        
        // Need to map user -> schedule
        const userScheduleMap = {};
        teamsWithMembers.forEach(t => {
           const schedResult = scheduleResults.find(s => s.teamId === t.id);
           const sched = schedResult?.schedule;
           if (sched) {
             t.members.forEach(m => {
               const uid = m.user?.id || m.userId;
               if (uid) userScheduleMap[uid] = sched;
             });
           }
        });

        // Process clocks & lateness
        const dailyHoursMap = {};
        clocksResults.forEach(({ userId, clocks }) => {
          // Lateness per user
          const schedule = userScheduleMap[userId];
          const daysMap = {};

          clocks.forEach(clock => {
            const clockIn = new Date(clock.clockIn);
            const clockOut = clock.clockOut ? new Date(clock.clockOut) : now;
            const minutes = Math.max(0, Math.round((clockOut - clockIn) / 60000));

            const clockInParis = toParis(clockIn);
            const dayKey = `${clockInParis.getFullYear()}-${String(clockInParis.getMonth() + 1).padStart(2, '0')}-${String(clockInParis.getDate()).padStart(2, '0')}`;
            dailyHoursMap[dayKey] = (dailyHoursMap[dayKey] || 0) + minutes;

            // For lateness: find first clock of day
            const dayStr = clockInParis.toDateString();
            if (!daysMap[dayStr] || clockIn < daysMap[dayStr]) {
               daysMap[dayStr] = clockIn;
            }
          });

          // Compute lateness for this user
          if (schedule) {
             Object.values(daysMap).forEach(firstClockDate => {
               const limitMinutes = getLatenessThresholdFromSchedule(schedule, firstClockDate, 5);
               const actualMinutes = firstClockDate.getHours() * 60 + firstClockDate.getMinutes();
               totalDaysWithClock++;
               if (actualMinutes > limitMinutes) totalLateDays++;
             });
          }
        });

                const currentLatenessRate = totalDaysWithClock > 0 ? (totalLateDays / totalDaysWithClock) * 100 : 0;

                setLatenessData({ rate: currentLatenessRate, lateDays: totalLateDays, totalDays: totalDaysWithClock });

        

                // Process schedules

                let dailyScheduledMap = {};
        scheduleResults.forEach(({ schedule, memberCount }) => {
          if (!schedule || memberCount === 0) return;
          const scheduledData = calculateScheduledMinutesFromTemplate(startOfCurrentPeriod, endOfCurrentPeriod, schedule);
          Object.entries(scheduledData.dailyMap).forEach(([dayKey, minutes]) => {
            dailyScheduledMap[dayKey] = (dailyScheduledMap[dayKey] || 0) + (minutes * memberCount);
          });
        });

        // Hours Chart
        const hoursPerPeriod = periodBoundaries.map(period => {
          let totalMin = 0;
          Object.entries(dailyHoursMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) totalMin += minutes;
          });
          return { date: period.label, minutesWorked: totalMin };
        });

        const hoursData = buildChartSeries(hoursPerPeriod, 12, selectedPeriod);
        setHoursChartSeries(hoursData);

        const avgMinutesPerPeriod = hoursPerPeriod.length > 0
          ? hoursPerPeriod.reduce((sum, p) => sum + p.minutesWorked, 0) / hoursPerPeriod.length
          : 0;
        setHoursTotals({ current: avgMinutesPerPeriod });

        // Adherence Chart
        const adherencePerPeriod = periodBoundaries.map(period => {
          let worked = 0;
          let scheduled = 0;

          Object.entries(dailyHoursMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) worked += minutes;
          });

          Object.entries(dailyScheduledMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) scheduled += minutes;
          });

          const overlap = Math.min(worked, scheduled);
          const rate = scheduled > 0 ? Math.min(100, Math.round((overlap / scheduled) * 100)) : 0;

          return { date: period.label, value: rate };
        });

        const adherenceForChart = adherencePerPeriod.map(p => ({ date: p.date, minutesWorked: p.value }));
        const adherenceSeries = buildChartSeries(adherenceForChart, 12, selectedPeriod);

        const avgAdherenceRate = adherencePerPeriod.length > 0
          ? adherencePerPeriod.reduce((sum, p) => sum + p.value, 0) / adherencePerPeriod.length
          : 0;

        setAdherenceData({
          rate: avgAdherenceRate,
          chartSeries: adherenceSeries
        });

      } catch (err) {
        console.error('[UsersListPage] Error loading stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, selectedGranularity, selectedPeriod]);

  // Filtrage
  const filteredUsers = useMemo(() => {
    return rows.filter((r) => {
      if (filterRole !== 'ALL' && r.role !== filterRole) return false;
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
      return true;
    });
  }, [rows, filterRole, filterStatus]);

  // Actions
  const handleApprove = async (userId) => {
    try {
      await approveUser(userId);
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec de l\'approbation');
    }
  };

  const handleReject = async (userId) => {
    if (!confirm('Êtes-vous sûr de vouloir rejeter cet utilisateur ? Il sera supprimé du système.')) return;
    try {
      await deleteUser(userId);
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec du rejet');
    }
  };

  const handleEdit = (userId) => {
    const u = rows.find((x) => x.id === userId);
    if (!u) return;
    setSelectedUser({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      phoneNumber: u.phoneNumber,
      email: u.email,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (formData) => {
    if (!selectedUser) return;
    try {
      await updateUser(selectedUser.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec de la mise à jour');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await deleteUser(userId);
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec de la suppression');
    }
  };

  // Badges
  const getRoleBadge = (role) => {
    const label = role === 'CEO' ? 'Admin' : role;
    return (
      <Badge variant={role === 'CEO' ? 'default' : role === 'MANAGER' ? 'secondary' : 'outline'}>
        {label}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Approuvé',
      REJECTED: 'Rejeté',
    };
    return (
      <Badge variant={status === 'APPROVED' ? 'default' : status === 'PENDING' ? 'destructive' : 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle="Gestion des utilisateurs"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header avec stats */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Gestion des utilisateurs</h2>
              <div className="flex items-center space-x-6 text-sm">
                <span className="text-gray-600">Total : <strong>{rows.length}</strong> utilisateurs</span>
                <span className="text-orange-600">En attente : <strong>{rows.filter((u) => u.status === 'PENDING').length}</strong></span>
                <span className="text-green-600">Approuvés : <strong>{rows.filter((u) => u.status === 'APPROVED').length}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ExportMenu
                onExportCSV={() => exportUsersListCSV(filteredUsers)}
                onExportPDF={() => exportUsersListPDF(
                  filteredUsers,
                  {
                    hoursChartSeries,
                    adherenceRate: adherenceData.rate,
                  },
                  getPeriodInfo(selectedGranularity).label
                )}
                variant="outline"
              />
              <Button onClick={() => navigate('/users/create')} variant="default">Créer un utilisateur</Button>
            </div>
          </div>

          {/* Stats Charts Section */}
          {!loading && rows.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Statistiques globales</CardTitle>
                    <CardDescription>
                      Aperçu des performances - {getPeriodInfo(selectedGranularity).label}
                    </CardDescription>
                  </div>
                  <PeriodSelector selectedGranularity={selectedGranularity} onGranularityChange={setSelectedGranularity} />
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-gray-500 text-sm">Chargement des statistiques...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Hours Chart */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setChartModal({
                        open: true,
                        title: 'Heures travaillées',
                        subtitle: getPeriodInfo(selectedGranularity).label,
                        data: hoursChartSeries,
                        chartType: 'area',
                        config: { color: 'var(--color-desktop)', gradientId: 'hoursModalFillUsers', tooltipType: 'hours' }
                      })}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Heures travaillées (total)
                        </CardTitle>
                        <Clock className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">{fmtMinutes(Math.round(hoursTotals.current))}</div>
                        <p className="text-xs text-gray-500">Moyenne par période</p>
                        <div className="h-[120px] mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hoursChartSeries} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                              <defs>
                                <linearGradient id="hoursFillUsers" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="6%" stopColor="var(--color-desktop)" stopOpacity={0.16} />
                                  <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.03} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                              <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 11 }} />
                              <YAxis hide />
                              <RechartsTooltip content={<CustomTooltip type="hours" />} cursor={false} />
                              <Area type="monotone" dataKey="value" stroke="var(--color-desktop)" fill="url(#hoursFillUsers)" strokeWidth={2} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">Cliquer pour agrandir</p>
                      </CardContent>
                    </Card>

                    {/* Adherence Chart */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setChartModal({
                        open: true,
                        title: 'Adhérence moyenne',
                        subtitle: getPeriodInfo(selectedGranularity).label,
                        data: adherenceData.chartSeries,
                        chartType: 'area',
                        config: { color: '#10b981', gradientId: 'adhModalFillUsers', tooltipType: 'adherence' }
                      })}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Adhérence moyenne
                        </CardTitle>
                        <CalendarCheck className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">{adherenceData.rate.toFixed(1)}%</div>
                        <p className="text-xs text-gray-500">Respect du planning</p>
                        <div className="h-[120px] mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={adherenceData.chartSeries} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                              <defs>
                                <linearGradient id="adhFillUsers" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="6%" stopColor="#10b981" stopOpacity={0.16} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                              <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 11 }} />
                              <YAxis hide />
                              <RechartsTooltip content={<CustomTooltip type="adherence" />} cursor={false} />
                              <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#adhFillUsers)" strokeWidth={2} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">Cliquer pour agrandir</p>
                      </CardContent>
                    </Card>

                    {/* Lateness KPI - Added */}
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Taux de retard
                        </CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2 text-amber-600">{latenessData.rate.toFixed(1)}%</div>
                        <p className="text-xs text-gray-500">
                          {latenessData.lateDays} jour(s) en retard sur {latenessData.totalDays} jours travaillés
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Filtres */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtres :</span>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="ALL">Tous les rôles</option>
                <option value="EMPLOYEE">Employés</option>
                <option value="MANAGER">Managers</option>
                <option value="CEO">Admin</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="APPROVED">Approuvés</option>
              </select>
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-lg shadow-sm border">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">Chargement…</div>
            ) : err ? (
              <div className="p-6 text-sm text-red-600">{err}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Utilisateur</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rôle</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Statut</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Inscription</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white font-bold text-sm">
                                {(u.firstName || '-')[0]}{(u.lastName || '-')[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {u.firstName} {u.lastName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{u.email}</td>
                        <td className="py-3 px-4">{getRoleBadge(u.role)}</td>
                        <td className="py-3 px-4">{getStatusBadge(u.status)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              onClick={() => navigate(`/employee/${u.id}/dashboard`)}
                              variant="ghost"
                              size="icon"
                              title="Voir le dashboard"
                            >
                              <Clock className="w-4 h-4" />
                            </Button>

                            {u.status === 'PENDING' && (
                              <>
                                <Button onClick={() => handleApprove(u.id)} variant="ghost" size="icon" title="Approuver">
                                  <Check className="w-5 h-5 text-green-600" />
                                </Button>
                                <Button onClick={() => handleReject(u.id)} variant="ghost" size="icon" title="Rejeter">
                                  <X className="w-5 h-5 text-red-600" />
                                </Button>
                              </>
                            )}
                            <Button onClick={() => handleEdit(u.id)} variant="ghost" size="icon" title="Modifier">
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                            {u.id !== user?.id && (
                              <Button onClick={() => handleDelete(u.id)} variant="ghost" size="icon" title="Supprimer">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredUsers.length && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          Aucun utilisateur trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de modification */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
        userData={selectedUser}
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
    </Layout>
  );
}