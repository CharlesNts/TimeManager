// src/api/userApi.js
import api from './client';

// Récupérer un profil
export const getUserById = async (id) => {
  const { data } = await api.get(`/api/users/${id}`);
  return data;
};

// Mettre à jour un profil (firstName, lastName, phoneNumber, role)
// ⚠️ Côté backend, l’update ne gère pas l’email -> on NE l’envoie pas.
export const updateUserById = async (id, payload) => {
  const body = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    phoneNumber: payload.phoneNumber,
    role: payload.role, // si tu ne veux pas exposer le changement de rôle, enlève cette ligne
  };
  const { data } = await api.put(`/api/users/${id}`, body);
  return data;
};

// (Optionnel) changer le mot de passe si tu ajoutes l’endpoint backend /api/users/{id}/password
export const updateUserPassword = async (id, newPassword) => {
  const { data } = await api.post(`/api/users/${id}/password`, { password: newPassword });
  return data;
};