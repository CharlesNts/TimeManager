// src/api/userApi.js
import api from './client';

/**
 * Service API pour la gestion des utilisateurs
 */
export const userApi = {
  /**
   * Récupérer un utilisateur par son ID
   * GET /api/users/{id}
   */
  getById: async (id) => {
    const { data } = await api.get(`/api/users/${id}`);
    return data;
  },

  /**
   * Lister tous les utilisateurs
   * GET /api/users
   */
  list: async () => {
    const { data } = await api.get('/api/users');
    return data;
  },

  /**
   * Créer un nouvel utilisateur
   * POST /api/users
   */
  create: async (userData) => {
    const { data } = await api.post('/api/users', userData);
    return data;
  },

  /**
   * Mettre à jour un utilisateur
   * PUT /api/users/{id}
   * Note: le backend ne gère pas l'email dans l'update
   */
  update: async (id, payload) => {
    const body = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phoneNumber,
      role: payload.role
    };
    const { data } = await api.put(`/api/users/${id}`, body);
    return data;
  },

  /**
   * Supprimer un utilisateur
   * DELETE /api/users/{id}
   */
  delete: async (id) => {
    await api.delete(`/api/users/${id}`);
  },

  /**
   * Approuver un utilisateur (CEO uniquement)
   * PUT /api/users/{id}/approve
   */
  approve: async (id) => {
    await api.put(`/api/users/${id}/approve`);
  },

  /**
   * Rejeter un utilisateur (CEO uniquement)
   * PUT /api/users/{id}/reject
   */
  reject: async (id) => {
    await api.put(`/api/users/${id}/reject`);
  },

  /**
   * Lister les utilisateurs en attente d'approbation (CEO uniquement)
   * GET /api/users/pending
   */
  listPending: async () => {
    const { data } = await api.get('/api/users/pending');
    return data;
  }
};

// Exporter les fonctions individuelles pour compatibilité avec le code existant
export const getUserById = userApi.getById;
export const updateUserById = userApi.update;
export const updateUserPassword = async (id, newPassword) => {
  // Cet endpoint n'existe pas dans le backend actuel
  throw new Error('Password update endpoint not implemented in backend');
};

export default userApi;