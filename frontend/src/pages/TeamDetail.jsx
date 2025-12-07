// src/pages/TeamDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';

import Layout from '../components/layout/Layout';
import TeamFormModal from '../components/manager/TeamFormModal';
import AddMemberModal from '../components/manager/AddMemberModal';
import WorkScheduleConfigurator from '../components/manager/WorkScheduleConfigurator';
import ConfirmModal from '../components/ui/ConfirmModal';
import PeriodSelector from '../components/manager/PeriodSelector';
import ExportMenu from '../components/ui/ExportMenu';
import { getPeriodInfo } from '../utils/granularityUtils';

import {
  ArrowLeft,
  Users,
  UserCircle,
  Clock,
  CalendarCheck,
  CalendarClock,
  Edit,
  Trash2,
  UserPlus,
} from 'lucide-react';

import api from '../api/client';
import {
  updateTeam,
} from '../api/teamApi';
import {
  fetchTeamMembers,
  addMember,
  removeMember,
} from '../api/teamMembersApi';
import workShiftsApi from '../api/workShiftsApi';
import scheduleTemplatesApi from '../api/scheduleTemplatesApi';
import { buildChartSeries } from '../api/statsApi';
import { getDisplayPeriodBoundaries } from '../utils/granularityUtils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

// shadcn components
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// Helper function to format minutes
function fmtMinutes(v) {
  if (typeof v !== 'number') return '—'
  const h = Math.floor(v / 60)
  const m = v % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Custom Tooltip context-aware for different chart types
const CustomTooltip = ({ active, payload, type = 'hours' }) => {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0].value
  const label = payload[0].payload?.label || payload[0].payload?.name || 'N/A'

  let title = 'Heures travaillées'
  let formattedValue = fmtMinutes(value)

  if (type === 'adherence') {
    title = 'Adhérence'
    formattedValue = `${value}%`
  } else if (type === 'members') {
    title = 'Par Membre'
    formattedValue = fmtMinutes(value)
  } else if (type === 'comparison') {
    title = 'Évolution'
    formattedValue = `${value >= 0 ? '+' : ''}${value}%`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md p-2">
      <p className="text-xs font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{formattedValue}</p>
    </div>
  )
};

// ---------- Utils time (Europe/Paris) ----------
const toParis = (date) => new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => {
  const p = toParis(d);
  return `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}T${pad(p.getHours())}:${pad(p.getMinutes())}:${pad(p.getSeconds())}`;
};

const minutesBetween = (a, b) => Math.max(0, Math.round((b - a) / 60000));

// ---- récupère le détail d’équipe (GET /api/teams/:id)
async function fetchTeamById(teamId) {
  const { data } = await api.get(`/api/teams/${teamId}`);
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    managerId: data.manager?.id ?? null,
    managerName: data.manager ? `${data.manager.firstName} ${data.manager.lastName}` : '—',
    createdAt: data.createdAt || null,
  };
}

// ---- récupère les clocks pour un user entre 2 dates
async function fetchClocksRange(userId, from, to) {
  const { data } = await api.get(`/api/users/${userId}/clocks/range`, {
    params: { from: toISO(from), to: toISO(to) },
  });
  return Array.isArray(data) ? data : [];
}

// ---- récupère le dernier clock (page 0, 1 élément)
async function fetchLastClock(userId) {
  const { data } = await api.get(`/api/users/${userId}/clocks`, {
    params: { page: 0, size: 1, sort: 'clockIn,desc' },
  });
  return data?.content?.[0] || null;
}

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const sidebarItems = getSidebarItems(user?.role);

  // --------- UI state
  const [selectedGranularity, setSelectedGranularity] = useState('week');
  const selectedPeriod = getPeriodInfo(selectedGranularity).periodCount;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // --------- Data state
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);

  // --------- Charts & Stats State
  const [hoursChartSeries, setHoursChartSeries] = useState([]);
  const [memberComparisonData, setMemberComparisonData] = useState([]);
  const [adherenceData, setAdherenceData] = useState({ rate: 0, scheduledHours: 0, chartSeries: [] });
  const [hoursTotals, setHoursTotals] = useState({ current: 0, evolutionRate: 0, evolutionLabel: '' });

  // For Table
  const [hoursByMember, setHoursByMember] = useState({});
  const [lastByMember, setLastByMember] = useState({});

  // --------- Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForConfig, setScheduleForConfig] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, member: null });

  // ====== LOAD TEAM + MEMBERS ======
  const loadAll = async () => {
    if (!teamId) return;
    setLoading(true);
    setErr('');
    try {
      const [teamData, membersData] = await Promise.all([
        fetchTeamById(teamId),
        fetchTeamMembers(teamId),
      ]);
      setTeam(teamData);
      setMembers(membersData);
    } catch (e) {
      setErr(e?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // ====== LOAD STATS & CHARTS ======
  useEffect(() => {
    if (!members.length || !teamId || !team) return;

    const loadTeamStats = async () => {
      try {
        const now = new Date();
        const allPeriodBoundaries = getDisplayPeriodBoundaries(selectedGranularity);

        // Filter periods to only include those on or after the team's creation date
        const teamCreationDate = team.createdAt ? new Date(team.createdAt) : null;
        const periodBoundaries = teamCreationDate
          ? allPeriodBoundaries.filter(period => period.endDate >= teamCreationDate)
          : allPeriodBoundaries;

        // If no periods remain after filtering, don't load stats
        if (periodBoundaries.length === 0) {
          setHoursChartSeries([]);
          setMemberComparisonData([]);
          setAdherenceData({ rate: 0, scheduledHours: 0, chartSeries: [] });
          setHoursTotals({ current: 0, evolutionRate: 0, evolutionLabel: '' });
          setHoursByMember({});
          setLastByMember({});
          return;
        }

        // Chart Range - use the maximum of the first period's start and team creation date
        const startOfCurrentPeriod = teamCreationDate && periodBoundaries[0].startDate < teamCreationDate
          ? teamCreationDate
          : periodBoundaries[0].startDate;
        const endOfCurrentPeriod = now;

        // Single Period Evolution
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

        let totalCurrentMinutes = 0;
        let singleCurrentMinutes = 0;
        let singlePreviousMinutes = 0;

        const dailyHoursMap = {};
        const memberMinutesMap = {};
        const lastMap = {};

        const dailyScheduledMap = {};
        const dailyOverlapMap = {};
        let totalScheduledMinutes = 0;
        let totalOverlapMinutes = 0;

        // 1. Fetch Shifts for Team (Once)
        let teamShifts = [];
        try {
          teamShifts = await workShiftsApi.listForTeam(teamId, startOfCurrentPeriod.toISOString(), endOfCurrentPeriod.toISOString());
          if (!Array.isArray(teamShifts)) teamShifts = [];
        } catch (e) { console.warn(e); }

        const shiftsByEmployee = {};
        const allMemberIds = members.map(m => m.user?.id ?? m.userId).filter(Boolean);

        teamShifts.forEach(shift => {
          const shiftDuration = Math.max(0, Math.round((new Date(shift.endAt) - new Date(shift.startAt)) / 60000));
          totalScheduledMinutes += shiftDuration;

          const shiftStartParis = toParis(new Date(shift.startAt));
          const dayKey = `${shiftStartParis.getFullYear()}-${String(shiftStartParis.getMonth() + 1).padStart(2, '0')}-${String(shiftStartParis.getDate()).padStart(2, '0')}`;
          dailyScheduledMap[dayKey] = (dailyScheduledMap[dayKey] || 0) + shiftDuration;

          if (shift.employeeId) {
            // Assigned shift
            if (!shiftsByEmployee[shift.employeeId]) shiftsByEmployee[shift.employeeId] = [];
            shiftsByEmployee[shift.employeeId].push(shift);
          } else {
            // Team shift (applies to all)
            allMemberIds.forEach(uid => {
              if (!shiftsByEmployee[uid]) shiftsByEmployee[uid] = [];
              shiftsByEmployee[uid].push(shift);
            });
          }
        });

        // 2. Fetch Clocks & Process Overlap
        await Promise.all(members.map(async (m) => {
          const userId = m.user?.id ?? m.userId;
          if (!userId) return;

          try {
            const [clocks, lastClock] = await Promise.all([
              fetchClocksRange(userId, startOfCurrentPeriod, endOfCurrentPeriod),
              fetchLastClock(userId).catch(() => null)
            ]);

            let userTotal = 0;
            clocks.forEach(c => {
              const inD = toParis(new Date(c.clockIn));
              const outD = c.clockOut ? toParis(new Date(c.clockOut)) : toParis(new Date());
              const minutes = minutesBetween(inD, outD);
              userTotal += minutes;

              // Global stats
              totalCurrentMinutes += minutes;
              if (inD >= singleCurrentStart && inD <= singleCurrentEnd) singleCurrentMinutes += minutes;
              else if (inD >= singlePreviousStart && inD <= singlePreviousEnd) singlePreviousMinutes += minutes;

              // Daily map
              const dayKey = inD.toISOString().split('T')[0];
              dailyHoursMap[dayKey] = (dailyHoursMap[dayKey] || 0) + minutes;
            });

            memberMinutesMap[userId] = userTotal;

            // Overlap Logic
            const userShifts = shiftsByEmployee[userId] || [];
            userShifts.forEach(shift => {
              const shiftStart = new Date(shift.startAt);
              const shiftEnd = new Date(shift.endAt);
              const shiftDuration = Math.max(0, Math.round((shiftEnd - shiftStart) / 60000));

              let overlap = 0;
              clocks.forEach(c => {
                const clockIn = new Date(c.clockIn);
                const clockOut = c.clockOut ? new Date(c.clockOut) : now;
                const oStart = new Date(Math.max(shiftStart, clockIn));
                const oEnd = new Date(Math.min(shiftEnd, clockOut));
                if (oEnd > oStart) overlap += Math.round((oEnd - oStart) / 60000);
              });

              const effective = Math.min(overlap, shiftDuration);
              totalOverlapMinutes += effective;
              const dayKey = toParis(shiftStart).toISOString().split('T')[0];
              dailyOverlapMap[dayKey] = (dailyOverlapMap[dayKey] || 0) + effective;
            });

            // Last clock info
            if (lastClock) {
              const isActive = !lastClock.clockOut;
              const lastIn = toParis(new Date(lastClock.clockIn)).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Paris',
              });
              lastMap[userId] = { status: isActive ? 'active' : 'offline', lastClockIn: lastIn };
            } else {
              lastMap[userId] = { status: 'offline', lastClockIn: '-' };
            }

          } catch (err) {
            console.warn(`Error stats member ${userId}`, err);
          }
        }));

        // 3. Build Data for Charts

        // A. Hours Area Chart
        const hoursPerPeriod = periodBoundaries.map(period => {
          let totalMin = 0;
          Object.entries(dailyHoursMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) totalMin += minutes;
          });
          return { date: period.label, minutesWorked: totalMin };
        });
        const hoursData = buildChartSeries(hoursPerPeriod, 12, selectedPeriod);

        // B. Adherence Chart (Overlap)
        const adherencePerPeriod = periodBoundaries.map(period => {
          let overlap = 0;
          let scheduled = 0;
          Object.entries(dailyOverlapMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) overlap += minutes;
          });
          Object.entries(dailyScheduledMap).forEach(([dayKey, minutes]) => {
            const dayDate = new Date(dayKey);
            if (dayDate >= period.startDate && dayDate <= period.endDate) scheduled += minutes;
          });
          const rate = scheduled > 0 ? Math.min(100, Math.round((overlap / scheduled) * 100)) : (overlap > 0 ? 100 : 0);
          return { date: period.label, value: rate };
        });
        const adherenceForChart = adherencePerPeriod.map(p => ({ date: p.date, minutesWorked: p.value }));
        const adherenceSeries = buildChartSeries(adherenceForChart, 12, selectedPeriod);

        const globalAdherenceRate = totalScheduledMinutes > 0
          ? Math.min(100, (totalOverlapMinutes / totalScheduledMinutes) * 100)
          : 0;

        // C. Member Comparison Bar Chart
        const memberCompData = members.map(m => {
          const uid = m.user?.id ?? m.userId;
          return {
            name: m.user ? `${m.user.firstName} ${m.user.lastName}` : 'Unknown',
            value: Math.round((memberMinutesMap[uid] || 0) / 60 * 10) / 10
          };
        }).sort((a, b) => b.value - a.value);

        // D. Totals & Evolution
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

        setHoursChartSeries(hoursData);
        setMemberComparisonData(memberCompData);
        setAdherenceData({
          rate: globalAdherenceRate,
          scheduledHours: Math.round(totalScheduledMinutes / 60),
          chartSeries: adherenceSeries
        });
        setHoursTotals({
          current: Math.round(totalCurrentMinutes / 60 * 100) / 100,
          evolutionRate,
          evolutionLabel
        });

        setHoursByMember(memberMinutesMap);
        setLastByMember(lastMap);

      } catch (e) {
        console.error('[TeamDetail] loadTeamStats error:', e);
      }
    };

    loadTeamStats();
  }, [members, teamId, selectedGranularity, selectedPeriod, team]);

  const handleBack = () => navigate(-1);

  // ====== TEAM EDIT ======
  const handleEditTeam = () => setIsEditModalOpen(true);

  const handleSaveTeam = async (patch) => {
    try {
      const payload = {
        name: patch.name,
        description: patch.description,
        managerId: patch.managerId, // Support du changement de manager
      };
      const updated = await updateTeam(team.id, payload);
      setTeam((prev) => ({ ...prev, ...updated }));
      setIsEditModalOpen(false);
      // Recharger tout pour avoir les nouvelles infos du manager
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec de la modification');
    }
  };

  // ====== DELETE TEAM ======
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false);

  const handleDeleteTeam = async () => {
    try {
      const { deleteTeam } = await import('../api/teamApi');
      await deleteTeam(team.id);
      navigate('/teams');
    } catch (e) {
      alert(e?.message || 'Échec de la suppression');
    }
  };

  // ====== SCHEDULE CONFIG ======
  const handleOpenScheduleConfig = async () => {
    if (!teamId) return;
    try {
      const active = await scheduleTemplatesApi.getActiveForTeam(teamId);
      setScheduleForConfig(active || null);
    } catch (e) {
      console.error('Erreur chargement planning actif:', e);
      setScheduleForConfig(null);
    }
    setIsScheduleModalOpen(true);
  };

  // ====== MEMBERS ADD / REMOVE ======
  const handleAddMember = async (userId) => {
    try {
      await addMember(team.id, userId);
      setIsAddMemberModalOpen(false);
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec de l’ajout');
    }
  };

  const handleRemoveAsk = (memberRow) => {
    setConfirmDelete({ isOpen: true, member: memberRow });
  };

  const confirmRemoveMember = async () => {
    const row = confirmDelete.member;
    if (!row) return;
    const userId = row.user?.id ?? row.userId;
    try {
      await removeMember(team.id, userId);
      setConfirmDelete({ isOpen: false, member: null });
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec de la suppression');
    }
  };

  // ====== Export CSV/PDF (front only for now) ======
  // construit un dataset membres “affichable”
  const enrichedMembers = useMemo(() => {
    return members.map((m) => {
      const u = m.user || {};
      return {
        id: u.id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        role: u.role || 'EMPLOYEE',
        joinedAt: m.joinedAt,
        hoursInPeriod: fmtMinutes(hoursByMember[u.id] || 0),
        lastClockIn: lastByMember[u.id]?.lastClockIn || '-',
        status: lastByMember[u.id]?.status || 'offline',
      };
    });
  }, [members, hoursByMember, lastByMember]);

  const handleExportCSV = () => {
    if (!team) return;
    const headers = [
      'Nom',
      'Prénom',
      'Rôle',
      'Date d’arrivée',
      `Heures (${selectedPeriod}j)`,
      'Statut',
      'Dernier pointage',
    ];
    const rows = enrichedMembers.map((m) => [
      m.lastName,
      m.firstName,
      m.role === 'MANAGER' ? 'Manager' : 'Employé',
      m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('fr-FR') : '-',
      m.hoursInPeriod,
      m.status === 'active' ? 'Actif' : m.status === 'break' ? 'Pause' : 'Hors ligne',
      m.lastClockIn || '-',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const today = new Date().toISOString().split('T')[0];
    link.download = `equipe_${team.name}_${selectedPeriod}j_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    alert(`🚧 Export PDF backend à brancher : /api/teams/${teamId}/export?period=${selectedPeriod}&format=pdf`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Actif</span>;
      case 'break':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Pause</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Hors ligne</span>;
    }
  };

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle={team?.name || 'Équipe'}
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <button onClick={handleBack} className="flex items-center text-gray-600 font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour aux équipes
          </button>

          {/* Info Team */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {loading ? (
              <div className="text-sm text-gray-500">Chargement…</div>
            ) : err ? (
              <div className="text-sm text-red-600">{err}</div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">{team?.name}</h2>
                    <p className="text-gray-600 mt-1">{team?.description}</p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center whitespace-nowrap">
                        <UserCircle className="w-4 h-4 mr-1" />
                        Manager: <span className="font-medium ml-1">{team?.managerName}</span>
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {members.length} membres
                      </span>
                      <span className="flex items-center">
                        <CalendarClock className="w-4 h-4 mr-1" />
                        {team?.createdAt
                          ? `Créée le ${new Date(team.createdAt).toLocaleDateString('fr-FR')}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    size="sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                  </Button>

                  {/* Menu d'export - Affiché uniquement pour les managers et CEO */}
                  {(user?.role === 'MANAGER' || user?.role === 'CEO') && (
                    <ExportMenu
                      onExportPDF={handleExportPDF}
                      onExportCSV={handleExportCSV}
                      variant="outline"
                    />
                  )}

                  {/* Configurer horaires (Manager et CEO) */}
                  {(user?.role === 'MANAGER' || user?.role === 'CEO') && (
                    <Button
                      onClick={handleOpenScheduleConfig}
                      variant="outline"
                      size="sm"
                    >
                      <CalendarClock className="w-4 h-4 mr-2" />
                      Planning
                    </Button>
                  )}

                  {/* Actions équipe (CEO ou manager de l'équipe) */}
                  {(user?.role === 'CEO' || user?.id === team?.managerId) && (
                    <>
                      <Button
                        onClick={handleEditTeam}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </Button>

                      <Button
                        onClick={() => setConfirmDeleteTeam(true)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* KPIs - Affichés uniquement pour les managers et CEO */}
          {(user?.role === 'MANAGER' || user?.role === 'CEO') && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Statistiques de l&#39;équipe</CardTitle>
                    </div>
                    <PeriodSelector selectedGranularity={selectedGranularity} onGranularityChange={setSelectedGranularity} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Volume de Travail */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Volume de Travail Équipe
                        </CardTitle>
                        <Clock className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-2">
                          <div className="text-2xl font-bold">
                            {Math.floor(hoursTotals.current)}h {Math.round((hoursTotals.current % 1) * 60)}m
                          </div>
                          <div className={`text-sm mb-1 font-medium ${hoursTotals.evolutionRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {hoursTotals.evolutionRate >= 0 ? "↗" : "↘"} {Math.abs(hoursTotals.evolutionRate).toFixed(1)}%
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{hoursTotals.evolutionLabel}</p>
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
                          Respect du Planning
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

                    {/* Comparaison Membres */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Comparaison des Membres
                        </CardTitle>
                        <Users className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {memberComparisonData.length > 0 ? memberComparisonData[0]?.name : 'Aucune donnée'}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Membre le plus actif</p>
                        <div className="h-[120px] mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={memberComparisonData} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
                              <XAxis dataKey="name" axisLine={false} tick={{ fontSize: 12 }} interval={0} />
                              <YAxis hide />
                              <RechartsTooltip content={<CustomTooltip type="members" />} cursor={false} />
                              <Bar dataKey="value" fill="var(--color-desktop)" radius={[4, 4, 0, 0]}>
                                {memberComparisonData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#94a3b8'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                  </div>
                </CardContent>
              </Card>
            </div>
          )}



          {/* Membres */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Membres de l&#39;équipe
                </CardTitle>

                {(user?.role === 'CEO' || user?.role === 'MANAGER') && (
                  <Button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    variant="default"
                    size="sm"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Ajouter un membre
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nom</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rôle</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Arrivé le</th>
                      {(user?.role === 'MANAGER' || user?.role === 'CEO') && (
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                          Heures ({selectedPeriod}j)
                        </th>
                      )}
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Dernier pointage</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Statut</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedMembers.map((m) => (
                      <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {m.firstName?.charAt(0)}
                                {m.lastName?.charAt(0)}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {m.firstName} {m.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${m.role === 'MANAGER'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {m.role === 'MANAGER' ? 'Manager' : 'Employé'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        {(user?.role === 'MANAGER' || user?.role === 'CEO') && (
                          <td className="py-3 px-4 text-sm text-gray-700 font-medium">{m.hoursInPeriod}</td>
                        )}
                        <td className="py-3 px-4 text-sm text-gray-600">{m.lastClockIn}</td>
                        <td className="py-3 px-4">{getStatusBadge(m.status)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/employee/${m.id}/dashboard`)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Voir le dashboard"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            {m.role !== 'MANAGER' && (user?.role === 'CEO' || user?.id === team?.managerId) && (
                              <button
                                onClick={() => handleRemoveAsk({ user: { id: m.id, firstName: m.firstName, lastName: m.lastName } })}
                                className="text-red-600 hover:text-red-800"
                                title="Retirer du groupe"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!enrichedMembers.length && (
                      <tr>
                        <td className="py-6 px-4 text-sm text-gray-500" colSpan={7}>
                          Aucun membre pour cette équipe.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal EDIT TEAM */}
      <TeamFormModal
        isOpen={isEditModalOpen}
        mode="edit"
        team={team ? { id: team.id, name: team.name, description: team.description, managerId: team.managerId } : null}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveTeam}
        userRole={user?.role}
        currentUserId={user?.id}
      />

      {/* Modal ADD MEMBER */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onAddMember={handleAddMember}
        // Le modal a besoin d’une liste d’utilisateurs “sélectionnables”.
        // Si ton modal sait se charger tout seul via /api/users, tu peux ne rien passer.
        currentMembers={members.map((m) => m.user).filter(Boolean)}
      />

      {/* Confirm REMOVE MEMBER */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, member: null })}
        onConfirm={confirmRemoveMember}
        title="Retirer ce membre ?"
        message={
          confirmDelete.member
            ? `Êtes-vous sûr de vouloir retirer ${confirmDelete.member.user?.firstName} ${confirmDelete.member.user?.lastName} de cette équipe ?`
            : ''
        }
        confirmText="Retirer"
        cancelText="Annuler"
        variant="danger"
      />

      {/* Confirm DELETE TEAM */}
      <ConfirmModal
        isOpen={confirmDeleteTeam}
        onClose={() => setConfirmDeleteTeam(false)}
        onConfirm={handleDeleteTeam}
        title="Supprimer cette équipe ?"
        message={`Êtes-vous sûr de vouloir supprimer l'équipe "${team?.name}" ? Cette action est irréversible et supprimera également tous les membres de l'équipe.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />

      {/* Work schedule configurator modal */}
      <WorkScheduleConfigurator
        open={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        teamId={team?.id}
        teamName={team?.name}
        schedule={scheduleForConfig}
        onSave={() => {
          setIsScheduleModalOpen(false);
          loadAll();
        }}
      />
    </Layout>
  );
}