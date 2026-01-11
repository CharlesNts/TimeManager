// src/api/workShiftsApi.js
import api from './client';

/**
 * Service API pour la gestion des WorkShifts (quart de travail)
 */
export const workShiftsApi = {
  /**
   * Créer un nouveau quart de travail
   * POST /api/workshifts
   */
  create: async (workShiftData) => {
    const { data } = await api.post('/api/workshifts', workShiftData);
    return data;
  },

  /**
   * Mettre à jour un quart de travail
   * PATCH /api/workshifts/{id}
   */
  update: async (id, updateData) => {
    const { data } = await api.patch(`/api/workshifts/${id}`, updateData);
    return data;
  },

  /**
   * Assigner un employé à un quart de travail
   * PATCH /api/workshifts/{id}/assign
   */
  assignEmployee: async (id, employeeId) => {
    const { data } = await api.patch(`/api/workshifts/${id}/assign`, { employeeId });
    return data;
  },

  /**
   * Désassigner un employé d'un quart de travail
   * PATCH /api/workshifts/{id}/unassign
   */
  unassignEmployee: async (id) => {
    const { data } = await api.patch(`/api/workshifts/${id}/unassign`);
    return data;
  },

  /**
   * Lister les quarts de travail pour une équipe sur une période
   * GET /api/workshifts/team/{teamId}?from=...&to=...
   */
  listForTeam: async (teamId, from, to) => {
    const { data } = await api.get(`/api/workshifts/team/${teamId}`, {
      params: { from, to }
    });
    return data;
  },

  /**
   * Lister les quarts de travail pour un employé sur une période
   * GET /api/workshifts/employee/{employeeId}?from=...&to=...
   */
  listForEmployee: async (employeeId, from, to) => {
    const { data } = await api.get(`/api/workshifts/employee/${employeeId}`, {
      params: { from, to }
    });
    return data;
  },

  /**
   * Supprimer un quart de travail
   * DELETE /api/workshifts/{id}
   */
  delete: async (id) => {
    await api.delete(`/api/workshifts/${id}`);
  }
};

export default workShiftsApi;