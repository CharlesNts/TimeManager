import api from './client';

/**
 * Fetch all schedule templates for a team
 * 
 * @param {number} teamId - The team ID
 * @returns {Promise<Array>} List of schedule templates
 */
export async function fetchScheduleTemplates(teamId) {
  try {
    const { data } = await api.get(`/api/schedule-templates/team/${teamId}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('[scheduleApi] fetchScheduleTemplates error:', error?.message);
    return [];
  }
}

/**
 * Create a new schedule template
 * 
 * @param {Object} template - { teamId, name, active, weeklyPatternJson }
 * @returns {Promise<Object>} Created template
 */
export async function createScheduleTemplate(template) {
  try {
    const { data } = await api.post('/api/schedule-templates', template);
    return data;
  } catch (error) {
    console.error('[scheduleApi] createScheduleTemplate error:', error?.message);
    throw error;
  }
}

/**
 * Activate a schedule template
 * 
 * @param {number} templateId - The template ID to activate
 * @returns {Promise<Object>} Activated template
 */
export async function activateScheduleTemplate(templateId) {
  try {
    const { data } = await api.post(`/api/schedule-templates/${templateId}/activate`);
    return data;
  } catch (error) {
    console.error('[scheduleApi] activateScheduleTemplate error:', error?.message);
    throw error;
  }
}

/**
 * Parse weeklyPatternJson string to object
 * 
 * @param {string} jsonString - JSON string from backend
 * @returns {Object} Parsed pattern or default
 */
export function parseWeeklyPattern(jsonString) {
  try {
    return jsonString ? JSON.parse(jsonString) : getDefaultPattern();
  } catch {
    return getDefaultPattern();
  }
}

/**
 * Get default weekly pattern (Monday-Friday, 9am-5:30pm)
 * 
 * @returns {Object} Default pattern
 */
export function getDefaultPattern() {
  return {
    workDays: [1, 2, 3, 4, 5], // Monday-Friday
    startTime: '09:00',
    endTime: '17:30',
    excludedDates: [],
  };
}
