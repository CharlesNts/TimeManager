// src/api/leavesApi.js
import api from './client';

/**
 * API pour la gestion des congés (leaves)
 * Backend endpoints: /api/leaves/*
 */

/**
 * Types de congés disponibles
 * Doit matcher les valeurs du backend enum LeaveType
 */
export const LEAVE_TYPES = {
  PAID: 'PAID',                   // Congé payé
  SICK: 'SICK',                   // Arrêt maladie
  UNPAID: 'UNPAID',               // Congé sans solde
  TRAINING: 'TRAINING',           // Formation
  OTHER: 'OTHER',                 // Autre
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
 * Récupérer les congés dans une fenêtre de dates
 * GET /api/leaves/window?employeeId={employeeId}&from={from}&to={to}
 * @param {number} employeeId - ID de l'employé
 * @param {string} from - Date de début (YYYY-MM-DD)
 * @param {string} to - Date de fin (YYYY-MM-DD)
 */
export const getLeavesInWindow = async (employeeId, from, to) => {
  try {
    const { data } = await api.get('/api/leaves/window', {
      params: { employeeId, from, to }
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[leavesApi] getLeavesInWindow error:', error?.message || error);
    throw error;
  }
};

/**
 * Modifier une demande de congé (si PENDING)
 * PUT /api/leaves/{leaveId}
 * @param {number} leaveId - ID de la demande
 * @param {object} leaveData - { type, startAt, endAt, reason }
 */
export const updateLeave = async (leaveId, leaveData) => {
  try {
    const { data } = await api.put(`/api/leaves/${leaveId}`, {
      type: leaveData.type,
      startAt: leaveData.startAt,
      endAt: leaveData.endAt,
      reason: leaveData.reason,
    });
    return data;
  } catch (error) {
    console.error('[leavesApi] updateLeave error:', error?.message || error);
    throw error;
  }
};

/**
 * Supprimer une demande de congé (si PENDING)
 * DELETE /api/leaves/{leaveId}
 * @param {number} leaveId - ID de la demande
 */
export const deleteLeave = async (leaveId) => {
  try {
    await api.delete(`/api/leaves/${leaveId}`);
    return true;
  } catch (error) {
    console.error('[leavesApi] deleteLeave error:', error?.message || error);
    throw error;
  }
};

/**
 * Utilitaires
 */

// Traduire le type de congé en français
export const getLeaveTypeLabel = (type) => {
  const labels = {
    [LEAVE_TYPES.PAID]: 'Congé payé',
    [LEAVE_TYPES.SICK]: 'Arrêt maladie',
    [LEAVE_TYPES.UNPAID]: 'Congé sans solde',
    [LEAVE_TYPES.TRAINING]: 'Formation',
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
  getLeavesInWindow,
  updateLeave,
  deleteLeave,
  getLeaveTypeLabel,
  getLeaveStatusLabel,
  calculateLeaveDays,
  LEAVE_TYPES,
  LEAVE_STATUS,
};
