// src/api/teamApi.js
import api from './client';

/**
 * Mappe un TeamDTO en objet pratique pour le front.
 */
const mapTeamDTO = (t) => ({
  id: t.id,
  name: t.name,
  description: t.description || '',
  managerId: t.manager?.id ?? null,
  managerName: t.manager ? `${t.manager.firstName} ${t.manager.lastName}` : '—',
  createdAt: t.createdAt || null,
  memberCount: typeof t.memberCount === 'number' ? t.memberCount : null,
});

/** GET /api/teams?managerId=:id */
export async function fetchTeamsByManager(managerId) {
  const { data } = await api.get('/api/teams', { params: { managerId } });
  return Array.isArray(data) ? data.map(mapTeamDTO) : [];
}

/** GET /api/users/{userId}/teams  (retourne TeamMemberDTO[]) */
export async function fetchUserMemberships(userId) {
  const { data } = await api.get(`/api/users/${userId}/teams`);
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => row.team)
    .filter(Boolean)
    .map(mapTeamDTO);
}

/** GET /api/users  (pour CEO: on récupère tous les MANAGERs) */
export async function fetchAllManagers() {
  const { data } = await api.get('/api/users');
  if (!Array.isArray(data)) return [];
  return data.filter((u) => u.role === 'MANAGER');
}

/** GET /api/teams/{teamId}/members (TeamMemberDTO[]) -> .length */
export async function fetchTeamMemberCount(teamId) {
  const { data } = await api.get(`/api/teams/${teamId}/members`);
  return Array.isArray(data) ? data.length : 0;
}

/**
 * Charge les équipes selon le rôle:
 * - CEO : toutes les équipes
 * - MANAGER : ses propres équipes
 * - EMPLOYEE : ses équipes (membership)
 */
export async function fetchTeamsForCurrentUser(user) {
  if (!user) return [];

  let teams = [];

  if (user.role === 'CEO') {
    const managers = await fetchAllManagers();
    const results = await Promise.all(
      managers.map((m) => fetchTeamsByManager(m.id))
    );
    const map = new Map();
    results.flat().forEach((t) => map.set(t.id, t));
    teams = Array.from(map.values());
  } else if (user.role === 'MANAGER') {
    teams = await fetchTeamsByManager(user.id);
  } else {
    teams = await fetchUserMemberships(user.id);
  }

  // Ajoute le nombre de membres
  const counts = await Promise.all(
    teams.map((t) => fetchTeamMemberCount(t.id).catch(() => 0))
  );
  return teams.map((t, i) => ({ ...t, memberCount: counts[i] }));
}

/** CRUD */
export async function createTeam(payload) {
  const { data } = await api.post('/api/teams', payload);
  return mapTeamDTO(data);
}

export async function updateTeam(teamId, payload) {
  const { data } = await api.put(`/api/teams/${teamId}`, payload);
  return mapTeamDTO(data);
}

export async function deleteTeam(teamId) {
  await api.delete(`/api/teams/${teamId}`);
}