// src/api/passwordApi.js
import api from './client';

/**
 * API pour la gestion des mots de passe
 * Backend endpoints: /api/auth/password/*
 */

/**
 * Demande de réinitialisation de mot de passe
 * Envoie un email avec un lien de reset
 * @param {string} email - Email de l'utilisateur
 */
export const requestPasswordReset = async (email) => {
  try {
    await api.post('/api/auth/password/forgot', { email });
    return { success: true, message: 'Email envoyé si le compte existe' };
  } catch (err) {
    console.error('[passwordApi] requestPasswordReset failed:', err?.message || err);
    throw err;
  }
};

/**
 * Réinitialisation du mot de passe avec token
 * @param {string} token - Token reçu par email
 * @param {string} newPassword - Nouveau mot de passe
 */
export const resetPassword = async (token, newPassword) => {
  try {
    await api.post('/api/auth/password/reset', { token, newPassword });
    return { success: true, message: 'Mot de passe réinitialisé avec succès' };
  } catch (err) {
    console.error('[passwordApi] resetPassword failed:', err?.message || err);
    throw err;
  }
};

/**
 * Changement de mot de passe (utilisateur connecté)
 * POST /api/auth/password/change
 * @param {string} oldPassword - Ancien mot de passe
 * @param {string} newPassword - Nouveau mot de passe
 */
export const changePassword = async (oldPassword, newPassword) => {
  try {
    await api.post('/api/auth/password/change', {
      oldPassword,
      newPassword,
    });
    return { success: true, message: 'Mot de passe changé avec succès' };
  } catch (err) {
    console.error('[passwordApi] changePassword failed:', err?.message || err);
    throw err;
  }
};
