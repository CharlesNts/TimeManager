// src/api/reportsApi.js
import api from './client';

/**
 * Service API pour la génération de rapports et statistiques avancées
 */
export const reportsApi = {
  /**
   * Obtenir un aperçu général des rapports
   * GET /api/reports/overview
   */
  getOverview: async (zoneId = null) => {
    const { data } = await api.get('/api/reports/overview', {
      params: zoneId ? { zone: zoneId } : {}
    });
    return data;
  },

  /**
   * Obtenir les moyennes d'heures par équipe pour la semaine
   * GET /api/reports/teams/avg-hours-week
   */
  getTeamWeeklyAverages: async (zoneId = null) => {
    const { data } = await api.get('/api/reports/teams/avg-hours-week', {
      params: zoneId ? { zone: zoneId } : {}
    });
    return data;
  },

  /**
   * Vérifier si un utilisateur est en retard
   * GET /api/reports/users/{userId}/is-late
   */
  checkUserLateness: async (userId, options = {}) => {
    const { date, threshold = '09:05', zoneId } = options;
    const { data } = await api.get(`/api/reports/users/${userId}/is-late`, {
      params: { date, threshold, zone: zoneId }
    });
    return data;
  },

  /**
   * Obtenir le taux de retard d'un utilisateur pour un mois
   * GET /api/reports/users/{userId}/lateness-rate
   */
  getUserLatenessRate: async (userId, yearMonth, options = {}) => {
    const { threshold = '09:05', zoneId } = options;
    const { data } = await api.get(`/api/reports/users/${userId}/lateness-rate`, {
      params: { yearMonth, threshold, zone: zoneId }
    });
    return data;
  },

  /**
   * Obtenir les heures travaillées pour un utilisateur sur une période
   * GET /api/reports/users/{userId}/hours
   */
  getUserHours: async (userId, from, to, zoneId = null) => {
    const { data } = await api.get(`/api/reports/users/${userId}/hours`, {
      params: { from, to, zone: zoneId }
    });
    return data;
  },

  /**
   * Obtenir des statistiques détaillées pour un utilisateur
   * Combinaison de plusieurs endpoints pour un rapport complet
   */
  getUserDetailedStats: async (userId, from, to, zoneId = null) => {
    const [hours, latenessRate] = await Promise.all([
      reportsApi.getUserHours(userId, from, to, zoneId),
      reportsApi.getUserLatenessRate(userId, from.substring(0, 7), { zoneId })
    ]);
    
    return {
      hours,
      latenessRate,
      period: { from, to }
    };
  },

  /**
   * Obtenir des statistiques pour une équipe
   * Combine plusieurs endpoints pour un rapport d'équipe complet
   */
  getTeamStats: async () => {
    // Note: Le backend n'a pas d'endpoint direct pour les stats d'équipe
    // Cette fonction pourrait être implémentée en agrégeant les données utilisateurs
    // ou en ajoutant un endpoint backend dédié
    throw new Error('Team stats endpoint not implemented in backend');
  }
};

export default reportsApi;