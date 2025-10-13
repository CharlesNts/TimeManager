// src/pages/TeamDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';


import Layout from '../components/layout/Layout';
import TeamFormModal from '../components/manager/TeamFormModal';
import AddMemberModal from '../components/manager/AddMemberModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import PeriodSelector from '../components/manager/PeriodSelector';

import {
  ArrowLeft,
  Users,
  UserCircle,
  Clock,
  Calendar,
  TrendingUp,
  Edit,
  Trash2,
  Download,
  UserPlus,
} from 'lucide-react';

import api from '../api/client';
import {
  updateTeam,          // depuis src/api/teamApi.js
} from '../api/teamApi';
import {
  fetchTeamMembers,    // depuis src/api/teamMembersApi.js
  addMember,
  removeMember,
} from '../api/teamMembersApi';

// ---------- Utils time (Europe/Paris) ----------
const toParis = (date) => new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
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

const minutesBetween = (a, b) => Math.max(0, Math.round((b - a) / 60000));
const fmtHM = (mins) => `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;

// ---- calcule un range [from, to] selon period (7, 30, 365)
function computeRange(period) {
  const now = new Date();
  if (period === 7) {
    // semaine en cours (lun → dim)
    return { from: startOfWeekMon(now), to: endOfWeekSun(now) };
  } else if (period === 30) {
    // mois en cours
    return { from: firstDayOfMonth(now), to: lastDayOfMonth(now) };
  } else {
    // 365 jours glissants
    const from = new Date(now);
    from.setDate(from.getDate() - 364);
    from.setHours(0, 0, 0, 0);
    return { from, to: endOfDay(now) };
  }
}

// ---- récupère le détail d’équipe (GET /api/teams/:id)
async function fetchTeamById(teamId) {
  const { data } = await api.get(`/api/teams/${teamId}`);
  // map léger pour garder un shape cohérent
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

// ---- total minutes travaillées à partir des clocks
function sumWorkedMinutes(clocks) {
  return clocks.reduce((sum, c) => {
    const inD = toParis(new Date(c.clockIn));
    const outD = c.clockOut ? toParis(new Date(c.clockOut)) : toParis(new Date()); // session ouverte
    return sum + minutesBetween(inD, outD);
  }, 0);
}

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const sidebarItems = getSidebarItems(user?.role);

  // --------- UI state
  const [selectedPeriod, setSelectedPeriod] = useState(7); // 7 / 30 / 365
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // --------- Data state
  const [team, setTeam] = useState(null);                // {id, name, description, managerId, managerName, createdAt}
  const [members, setMembers] = useState([]);            // TeamMemberDTO[] : { user, team, joinedAt }
  const [hoursByMember, setHoursByMember] = useState({}); // userId -> minutes
  const [lastByMember, setLastByMember] = useState({}); // userId -> { status, lastClockIn }

  // --------- Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
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

  // ====== FOR PERIOD: compute clocks & hours per member ======
  useEffect(() => {
    const computeHours = async () => {
      if (!members.length) {
        setHoursByMember({});
        setLastByMember({});
        return;
      }
      const { from, to } = computeRange(selectedPeriod);
      try {
        const results = await Promise.all(
          members.map(async (m) => {
            const uid = m.user?.id ?? m.userId ?? null;
            if (!uid) return [null, 0, null];
            const [clocks, last] = await Promise.all([
              fetchClocksRange(uid, from, to),
              fetchLastClock(uid).catch(() => null),
            ]);
            const worked = sumWorkedMinutes(clocks);
            return [uid, worked, last];
          })
        );

        const hoursMap = {};
        const lastMap = {};
        for (const [uid, mins, last] of results) {
          if (!uid) continue;
          hoursMap[uid] = mins;
          if (last) {
            const isActive = !last.clockOut; // pas de clockOut => session ouverte
            const lastIn = toParis(new Date(last.clockIn)).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Paris',
            });
            lastMap[uid] = { status: isActive ? 'active' : 'offline', lastClockIn: lastIn };
          } else {
            lastMap[uid] = { status: 'offline', lastClockIn: '-' };
          }
        }
        setHoursByMember(hoursMap);
        setLastByMember(lastMap);
      } catch (e) {
        console.warn('[TeamDetail] computeHours error:', e?.message || e);
        setHoursByMember({});
        setLastByMember({});
      }
    };
    computeHours();
  }, [members, selectedPeriod]);

  // ====== Aggregated team KPIs ======
  const teamStats = useMemo(() => {
    const values = Object.values(hoursByMember);
    const total = values.reduce((a, b) => a + b, 0);
    const count = values.length || 1;
    const avg = Math.round(total / count);
    const active = Object.values(lastByMember).filter((v) => v?.status === 'active').length;
    return {
      totalHoursThisWeek: fmtHM(total),
      averageHoursPerMember: fmtHM(avg),
      activeMembers: active,
      onBreak: 0, // pas d'API pause pour le moment
    };
  }, [hoursByMember, lastByMember]);

  const handleBack = () => navigate('/teams');

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
        hoursInPeriod: fmtHM(hoursByMember[u.id] || 0),
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

  const [showExportMenu, setShowExportMenu] = useState(false);

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
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">{team?.name}</h2>
                    <p className="text-gray-600 mt-1">{team?.description}</p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center">
                        <UserCircle className="w-4 h-4 mr-1" />
                        Manager: <span className="font-medium ml-1">{team?.managerName}</span>
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {members.length} membres
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {team?.createdAt
                          ? `Créée le ${new Date(team.createdAt).toLocaleDateString('fr-FR')}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu((v) => !v)}
                      className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                      title="Exporter les données de l'équipe"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exporter
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={() => {
                            handleExportCSV();
                            setShowExportMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700 rounded-t-lg"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Exporter en CSV
                        </button>
                        <button
                          onClick={() => {
                            handleExportPDF();
                            setShowExportMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700 rounded-b-lg"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Exporter en PDF
                        </button>
                      </div>
                    )}
                  </div>

                  {(user?.role === 'CEO' || user?.id === team?.managerId) && (
                    <>
                      <button
                        onClick={handleEditTeam}
                        className="flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </button>
                      <button
                        onClick={() => setConfirmDeleteTeam(true)}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* KPIs */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total heures</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{teamStats.totalHoursThisWeek}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedPeriod === 7 ? 'Cette semaine' : selectedPeriod === 30 ? 'Ce mois' : '12 derniers mois'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Moyenne</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{teamStats.averageHoursPerMember}</p>
                    <p className="text-xs text-gray-500 mt-1">Par membre</p>
                  </div>
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Actifs</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{teamStats.activeMembers}</p>
                    <p className="text-xs text-gray-500 mt-1">En ce moment</p>
                  </div>
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">En pause</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{teamStats.onBreak}</p>
                    <p className="text-xs text-gray-500 mt-1">Actuellement</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Membres */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Membres de l'équipe
              </h3>

              {(user?.role === 'CEO' || user?.id === team?.managerId) && (
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
                >
                  <UserPlus className="w-4 h-4" />
                  Ajouter un membre
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nom</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rôle</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Arrivé le</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Heures ({selectedPeriod}j)
                    </th>
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
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            m.role === 'MANAGER'
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
                      <td className="py-3 px-4 text-sm text-gray-700 font-medium">{m.hoursInPeriod}</td>
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
          </div>
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
    </Layout>
  );
}