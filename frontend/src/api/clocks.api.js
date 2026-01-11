import api from './client';

/**
 * API pour la gestion des clocks (pointages) et pauses
 * Backend endpoints: /api/clocks/* et /api/clocks/{clockId}/pauses/*
 */

/**
 * Clock In - Démarrer un pointage
 * @param {number} userId - ID de l'utilisateur
 * @param {LocalDateTime} when - Heure optionnelle du pointage
 * @returns {Promise<Object>} Le clock créé
 */
export const clockIn = async (userId, when) => {
  try {
    const url = when ? `/api/users/${userId}/clocks/in?when=${when}` : `/api/users/${userId}/clocks/in`;
    const { data } = await api.post(url);
    return data;
  } catch (error) {
    console.error('[clocksApi] clockIn error:', error?.message || error);
    throw error;
  }
};

/**
 * Clock Out - Arrêter un pointage
 * @param {number} userId - ID de l'utilisateur
 * @param {LocalDateTime} when - Heure optionnelle du pointage
 * @returns {Promise<Object>} Le clock mis à jour
 */
export const clockOut = async (userId, when) => {
  try {
    const url = when ? `/api/users/${userId}/clocks/out?when=${when}` : `/api/users/${userId}/clocks/out`;
    const { data } = await api.post(url);
    return data;
  } catch (error) {
    console.error('[clocksApi] clockOut error:', error?.message || error);
    throw error;
  }
};

/**
 * Récupérer l'historique des pointages pour un utilisateur
 * @param {number} userId - ID de l'utilisateur
 * @param {number} period - Période en jours (par défaut 7)
 * @returns {Promise<Array>} Liste des clocks
 */
export const getClockHistory = async (userId, period = 7) => {
  try {
    const { data } = await api.get(`/api/users/${userId}/clocks`, {
      params: { period, page: 0, size: 100, sort: 'clockIn,desc' }
    });
    // Le backend retourne un Page<ClockDTO> avec un champ 'content'
    return data?.content || [];
  } catch (error) {
    console.error('[clocksApi] getClockHistory error:', error?.message || error);
    return [];
  }
};

/**
 * Récupérer le pointage en cours de l'utilisateur connecté
 * @param {number} userId - ID de l'utilisateur
 * @returns {Promise<Object|null>} Le clock actif ou null
 */
export const getCurrentClock = async (userId) => {
  try {
    const { data } = await api.get(`/api/users/${userId}/clocks`, {
      params: { page: 0, size: 1, sort: 'clockIn,desc' }
    });
    // Le backend retourne un Page<ClockDTO> avec un champ 'content'
    const clocks = data?.content || [];
    return clocks.find(clock => !clock.clockOut) || null;
  } catch (error) {
    console.error('[clocksApi] getCurrentClock error:', error?.message || error);
    return null;
  }
};

// =================================================================
// PAUSES
// =================================================================

/**
 * Créer une pause pendant un pointage
 * @param {number} clockId - ID du clock actif
 * @param {Object} pauseData - { reason, startTime }
 * @returns {Promise<Object>} La pause créée
 */
export const createPause = async (clockId, pauseData = {}) => {
  try {
    const { startAt, ...rest } = pauseData;
    const { data } = await api.post(`/api/clocks/${clockId}/pauses`, {
      startAt: startAt || new Date().toISOString(),
      ...rest
    });
    return data;
  } catch (error) {
    console.error('[clocksApi] createPause error:', error?.message || error);
    throw error;
  }
};

/**
 * Mettre à jour une pause (ex: terminer une pause en ajoutant endAt)
 * PATCH /api/clocks/{clockId}/pauses/{pauseId}
 * @param {number} clockId - ID du clock
 * @param {number} pauseId - ID de la pause à mettre à jour
 * @param {Object} updateData - { startAt, endAt, note }
 * @returns {Promise<Object>} La pause mise à jour
 */
export const stopPause = async (clockId, pauseId, updateData) => {
  try {
    const { data } = await api.patch(`/api/clocks/${clockId}/pauses/${pauseId}`, updateData);
    return data;
  } catch (error) {
    console.error('[clocksApi] stopPause error:', error?.message || error);
    throw error;
  }
};

/**
 * Supprimer une pause
 * DELETE /api/clocks/{clockId}/pauses/{pauseId}
 * @param {number} clockId - ID du clock
 * @param {number} pauseId - ID de la pause à supprimer
 */
export const deletePause = async (clockId, pauseId) => {
  try {
    await api.delete(`/api/clocks/${clockId}/pauses/${pauseId}`);
    return true;
  } catch (error) {
    console.error('[clocksApi] deletePause error:', error?.message || error);
    throw error;
  }
};

/**
 * Récupérer toutes les pauses pour un clock spécifique
 * @param {number} clockId - ID du clock
 * @returns {Promise<Array>} Liste des pauses
 */
export const getClockPauses = async (clockId) => {
  try {
    const { data } = await api.get(`/api/clocks/${clockId}/pauses`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[clocksApi] getClockPauses error:', error?.message || error);
    return [];
  }
};

/**
 * Calculer le temps total des pauses pour un clock
 * @param {Array} pauses - Liste des pauses
 * @returns {number} Temps total en minutes
 */
export const calculateTotalPauseTime = (pauses) => {
  if (!pauses || !Array.isArray(pauses)) return 0;

  return pauses.reduce((total, pause) => {
    if (pause.startTime && pause.endTime) {
      const start = new Date(pause.startTime);
      const end = new Date(pause.endTime);
      const duration = (end - start) / (1000 * 60); // en minutes
      return total + duration;
    }
    return total;
  }, 0);
};

/**
 * Calculer le temps de travail net pour un clock
 * @param {Object} clock - Clock avec startTime et endTime
 * @param {Array} pauses - Liste des pauses
 * @returns {number} Temps de travail net en minutes
 */
export const calculateNetWorkTime = (clock, pauses = []) => {
  if (!clock || !clock.startTime || !clock.endTime) return 0;

  const start = new Date(clock.startTime);
  const end = new Date(clock.endTime);
  const totalWorkTime = (end - start) / (1000 * 60); // en minutes
  const totalPauseTime = calculateTotalPauseTime(pauses);

  return Math.max(0, totalWorkTime - totalPauseTime);
};

/**
 * Récupérer les pointages pour un utilisateur sur une période donnée
 * WORKAROUND: The backend /range endpoint crashes (500) due to LazyInitializationException.
 * We use the paginated endpoint instead and filter client-side.
 * @param {number} userId - ID de l'utilisateur
 * @param {string} from - Date de début (ISO)
 * @param {string} to - Date de fin (ISO)
 * @returns {Promise<Array>} Liste des clocks
 */
export const getClocksInRange = async (userId, from, to) => {
  const allClocks = [];
  let page = 0;
  let keepFetching = true;
  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Add 1 day buffer to toDate to ensure we catch everything on the boundary
  const safeToDate = new Date(toDate);
  safeToDate.setHours(23, 59, 59, 999);

  while (keepFetching) {
    try {
      const { data } = await api.get(`/api/users/${userId}/clocks`, {
        params: { 
          page: page, 
          size: 50, 
          sort: 'clockIn,desc' 
        },
      });
      
      const content = data?.content || [];
      if (content.length === 0) {
        keepFetching = false;
        break;
      }

      let olderFound = false;
      for (const clock of content) {
        const clockDate = new Date(clock.clockIn);
        
        if (clockDate < fromDate) {
             olderFound = true;
        } else if (clockDate <= safeToDate) {
          allClocks.push(clock);
        }
      }

      if (data.last || olderFound) {
        keepFetching = false;
      }
      page++;
      if (page > 50) keepFetching = false; // Safety limit

    } catch (error) {
      console.warn('[clocksApi] getClocksInRange workaround error:', error?.message || error);
      keepFetching = false;
    }
  }
  
  return allClocks;
};

/**
 * Récupérer les pointages avec pagination
 * GET /api/users/{userId}/clocks?page=0&size=20&sort=clockIn,desc
 * @param {number} userId - ID de l'utilisateur
 * @param {Object} params - Paramètres de pagination
 * @returns {Promise<Object>} Page de clocks avec content
 */
export const getClocksWithPagination = async (userId, params = {}) => {
  try {
    const { data } = await api.get(`/api/users/${userId}/clocks`, {
      params: { page: 0, size: 20, sort: 'clockIn,desc', ...params }
    });
    return data;
  } catch (error) {
    console.error('[clocksApi] getClocksWithPagination error:', error?.message || error);
    return { content: [], totalElements: 0 };
  }
};
