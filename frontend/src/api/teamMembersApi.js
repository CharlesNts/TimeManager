// src/api/teamMembersApi.js
import api from './client';

/** GET /api/teams/:teamId/members */
export async function fetchTeamMembers(teamId) {
  const { data } = await api.get(`/api/teams/${teamId}/members`);
  return Array.isArray(data) ? data : [];
}

/** POST /api/teams/:teamId/members/:userId */
export async function addMember(teamId, userId) {
  const { data } = await api.post(`/api/teams/${teamId}/members/${userId}`);
  return data;
}

/** DELETE /api/teams/:teamId/members/:userId */
export async function removeMember(teamId, userId) {
  await api.delete(`/api/teams/${teamId}/members/${userId}`);
}