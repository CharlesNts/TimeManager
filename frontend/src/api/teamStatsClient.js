// src/api/teamStatsClient.js
import api from './client';

// Helpers (Europe/Paris)
const toParis = (d) => new Date(new Date(d).toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => {
  const p = toParis(d);
  return `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}T${pad(p.getHours())}:${pad(p.getMinutes())}:${pad(p.getSeconds())}`;
};
const startOfDay = (d) => { const x = toParis(d); x.setHours(0,0,0,0); return x; };
const endOfDay   = (d) => { const x = toParis(d); x.setHours(23,59,59,999); return x; };
const minutesBetween = (a, b) => Math.max(0, Math.round((b - a) / 60000));
const fmtHm = (mins) => `${Math.floor(mins/60)}h ${pad(mins%60)}m`;

/** API existantes */
const getTeam = async (teamId) => (await api.get(`/api/teams/${teamId}`)).data;
const getMembers = async (teamId) => (await api.get(`/api/teams/${teamId}/members`)).data; // TeamMemberDTO[]
const getClocksRange = async (userId, from, to) =>
  (await api.get(`/api/users/${userId}/clocks/range`, { params: { from, to } })).data || [];
const getLastClock = async (userId) =>
  (await api.get(`/api/users/${userId}/clocks`, { params: { page: 0, size: 1, sort: 'clockIn,desc' } })).data?.content?.[0] ?? null;

/**
 * Calcule les KPIs d'équipe côté client.
 * - totalHoursThisWeek
 * - averageHoursPerMember
 * - activeMembers (clock ouvert)
 * - onBreak (placeholder = 0, sauf si tu ajoutes une API pause)
 * Et renvoie aussi la liste des membres enrichie de "hoursThisWeek" et "lastClockIn"/status.
 */
export async function fetchTeamStatsAndMembersClient(teamId, periodDays = 7) {
  const [team, tmRows] = await Promise.all([getTeam(teamId), getMembers(teamId)]);

  const members = tmRows
    .map(row => row.user)
    .filter(Boolean);

  // Fenêtre période
  const now = new Date();
  const from = startOfDay(new Date(now));
  from.setDate(from.getDate() - (periodDays - 1));
  const to = endOfDay(now);

  // Pour chaque membre: clocks période + dernier clock
  const perMember = await Promise.all(members.map(async (m) => {
    const [clocks, last] = await Promise.all([
      getClocksRange(m.id, toISO(from), toISO(to)).catch(() => []),
      getLastClock(m.id).catch(() => null),
    ]);

    const workedMin = clocks.reduce((acc, c) => {
      const inD = toParis(new Date(c.clockIn));
      const outD = c.clockOut ? toParis(new Date(c.clockOut)) : toParis(new Date());
      return acc + minutesBetween(inD, outD);
    }, 0);

    // Status simple: actif si dernier clock sans clockOut
    const status = last && !last.clockOut ? 'active' : 'offline';
    const lastClockIn =
      last ? toParis(new Date(last.clockIn)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) : '-';

    return {
      ...m,
      hoursThisPeriodMin: workedMin,
      hoursThisPeriod: fmtHm(workedMin),
      status,
      lastClockIn,
      joinedAt: rowJoinedAt(tmRows, m.id),
      role: m.role,
    };
  }));

  // KPIs d'équipe
  const totalMin = perMember.reduce((a, b) => a + b.hoursThisPeriodMin, 0);
  const count = perMember.length || 1;
  const activeMembers = perMember.filter(x => x.status === 'active').length;
  const onBreak = 0; // pas d’API pause pour l’instant

  return {
    team,
    members: perMember,
    stats: {
      totalHours: fmtHm(totalMin),
      averageHoursPerMember: fmtHm(Math.round(totalMin / count)),
      activeMembers,
      onBreak,
    }
  };
}

// Récupère joinedAt depuis la ligne TeamMember correspondante (si dispo)
function rowJoinedAt(tmRows, userId) {
  const row = tmRows.find(r => r.user?.id === userId);
  return row?.joinedAt || null;
}