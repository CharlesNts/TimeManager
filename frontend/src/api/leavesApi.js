// src/api/leavesApi.js
import api from './client';

/**
 * API pour la gestion des congés (leaves)
 * Backend endpoints: /api/leaves/*
 */

/**
 * Types de congés disponibles
 */
export const LEAVE_TYPES = {
  PAID_LEAVE: 'PAID_LEAVE',           // Congé payé
  SICK_LEAVE: 'SICK_LEAVE',           // Arrêt maladie
  UNPAID_LEAVE: 'UNPAID_LEAVE',       // Congé sans solde
  PARENTAL_LEAVE: 'PARENTAL_LEAVE',   // Congé parental
  OTHER: 'OTHER',                      // Autre
};

/**
 * Statuts des demandes de congé
 */
export const LEAVE_STATUS = {
  PENDING: 'PENDING',       // En attente
  APPROVED: 'APPROVED',     // Approuvé
  REJECTED: 'REJECTED',     // Rejeté
  CANCELLED: 'CANCELLED',   // Annulé
};

/**
 * Demander un congé (Employé)
 * POST /api/leaves?employeeId={employeeId}
 * @param {number} employeeId - ID de l'employé
 * @param {object} leaveData - { type, startAt, endAt, reason }
 */
export const requestLeave = async (employeeId, leaveData) => {
  try {
    const { data } = await api.post(`/api/leaves?employeeId=${employeeId}`, {
      type: leaveData.type,
      startAt: leaveData.startAt,
      endAt: leaveData.endAt,
      reason: leaveData.reason,
    });
    return data;
  } catch (error) {
    console.error('[leavesApi] requestLeave error:', error?.message || error);
    throw error;
  }
};

/**
 * Annuler sa propre demande de congé (Employé, si PENDING)
 * POST /api/leaves/{leaveId}/cancel?employeeId={employeeId}
 * @param {number} leaveId - ID de la demande
 * @param {number} employeeId - ID de l'employé
 */
export const cancelLeave = async (leaveId, employeeId) => {
  try {
    const { data } = await api.post(`/api/leaves/${leaveId}/cancel?employeeId=${employeeId}`);
    return data;
  } catch (error) {
    console.error('[leavesApi] cancelLeave error:', error?.message || error);
    throw error;
  }
};

/**
 * Approuver une demande de congé (Manager/CEO)
 * POST /api/leaves/{leaveId}/decision
 * @param {number} leaveId - ID de la demande
 * @param {string} note - Note optionnelle
 */
export const approveLeave = async (leaveId, note = '') => {
  try {
    const { data } = await api.post(`/api/leaves/${leaveId}/decision`, {
      decision: 'APPROVED',
      note,
    });
    return data;
  } catch (error) {
    console.error('[leavesApi] approveLeave error:', error?.message || error);
    throw error;
  }
};

/**
 * Rejeter une demande de congé (Manager/CEO)
 * POST /api/leaves/{leaveId}/decision
 * @param {number} leaveId - ID de la demande
 * @param {string} note - Raison du rejet (requis)
 */
export const rejectLeave = async (leaveId, note) => {
  try {
    const { data } = await api.post(`/api/leaves/${leaveId}/decision`, {
      decision: 'REJECTED',
      note,
    });
    return data;
  } catch (error) {
    console.error('[leavesApi] rejectLeave error:', error?.message || error);
    throw error;
  }
};

/**
 * Récupérer toutes les demandes d'un employé
 * GET /api/leaves?employeeId={employeeId}
 * @param {number} employeeId - ID de l'employé
 */
export const getEmployeeLeaves = async (employeeId) => {
  try {
    const { data } = await api.get(`/api/leaves?employeeId=${employeeId}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[leavesApi] getEmployeeLeaves error:', error?.message || error);
    throw error;
  }
};

/**
 * Récupérer toutes les demandes en attente (pour les managers/CEO)
 * GET /api/leaves/pending
 */
export const getPendingLeaves = async () => {
  try {
    const { data } = await api.get('/api/leaves/pending');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[leavesApi] getPendingLeaves error:', error?.message || error);
    throw error;
  }
};

/**
 * Utilitaires
 */

// Traduire le type de congé en français
export const getLeaveTypeLabel = (type) => {
  const labels = {
    [LEAVE_TYPES.PAID_LEAVE]: 'Congé payé',
    [LEAVE_TYPES.SICK_LEAVE]: 'Arrêt maladie',
    [LEAVE_TYPES.UNPAID_LEAVE]: 'Congé sans solde',
    [LEAVE_TYPES.PARENTAL_LEAVE]: 'Congé parental',
    [LEAVE_TYPES.OTHER]: 'Autre',
  };
  return labels[type] || type;
};

// Traduire le statut en français
export const getLeaveStatusLabel = (status) => {
  const labels = {
    [LEAVE_STATUS.PENDING]: 'En attente',
    [LEAVE_STATUS.APPROVED]: 'Approuvé',
    [LEAVE_STATUS.REJECTED]: 'Rejeté',
    [LEAVE_STATUS.CANCELLED]: 'Annulé',
  };
  return labels[status] || status;
};

// Calculer le nombre de jours de congé
export const calculateLeaveDays = (startAt, endAt) => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le dernier jour
  return diffDays;
};

export default {
  requestLeave,
  cancelLeave,
  approveLeave,
  rejectLeave,
  getEmployeeLeaves,
  getPendingLeaves,
  getLeaveTypeLabel,
  getLeaveStatusLabel,
  calculateLeaveDays,
  LEAVE_TYPES,
  LEAVE_STATUS,
};
