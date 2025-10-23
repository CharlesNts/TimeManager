// src/api/scheduleTemplatesApi.js
import api from './client';

/**
 * Service API pour la gestion des modèles d'horaires
 * Endpoints:
 * - POST /api/schedule-templates (create)
 * - GET /api/schedule-templates/team/{teamId} (list/get active)
 * - POST /api/schedule-templates/{id}/activate (activate)
 */

/**
 * Créer un nouveau modèle d'horaire
 * POST /api/schedule-templates
 */
export const createScheduleTemplate = async (templateData) => {
  try {
    const { data } = await api.post('/api/schedule-templates', templateData);
    return data;
  } catch (error) {
    console.error('[scheduleTemplatesApi] createScheduleTemplate error:', error?.message || error);
    throw error;
  }
};

/**
 * Activer un modèle d'horaire
 * POST /api/schedule-templates/{id}/activate
 */
export const activateScheduleTemplate = async (id) => {
  try {
    const { data } = await api.post(`/api/schedule-templates/${id}/activate`);
    return data;
  } catch (error) {
    console.error('[scheduleTemplatesApi] activateScheduleTemplate error:', error?.message || error);
    throw error;
  }
};

/**
 * Lister tous les modèles d'horaire pour une équipe
 * GET /api/schedule-templates/team/{teamId}
 */
export const listScheduleTemplatesForTeam = async (teamId) => {
  try {
    const { data } = await api.get(`/api/schedule-templates/team/${teamId}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[scheduleTemplatesApi] listScheduleTemplatesForTeam error:', error?.message || error);
    throw error;
  }
};

/**
 * Obtenir le modèle actif pour une équipe
 * GET /api/schedule-templates/team/{teamId}
 */
export const getActiveScheduleTemplate = async (teamId) => {
  try {
    const { data } = await api.get(`/api/schedule-templates/team/${teamId}`);
    if (!Array.isArray(data)) return null;
    // Retourner le premier planning actif
    const activeSchedule = data.find(schedule => schedule.active);
    return activeSchedule || (data.length > 0 ? data[0] : null);
  } catch (error) {
    console.error('[scheduleTemplatesApi] getActiveScheduleTemplate error:', error?.message || error);
    throw error;
  }
};


// Export objet pour compatibilité avec ancien code si nécessaire
export const scheduleTemplatesApi = {
  create: createScheduleTemplate,
  activate: activateScheduleTemplate,
  listForTeam: listScheduleTemplatesForTeam,
  getActiveForTeam: getActiveScheduleTemplate,
};

export default scheduleTemplatesApi;