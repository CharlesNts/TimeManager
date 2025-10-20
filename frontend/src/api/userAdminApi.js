// src/api/userAdminApi.js
import api from './client';

export async function fetchUsers() {
  const { data } = await api.get('/api/users');
  return Array.isArray(data) ? data : [];
}

export async function fetchPendingUsers() {
  const { data } = await api.get('/api/users/pending');
  return Array.isArray(data) ? data : [];
}

export async function approveUser(id) {
  await api.put(`/api/users/${id}/approve`);
  return true;
}

export async function rejectUser(id) {
  await api.put(`/api/users/${id}/reject`);
  return true;
}

export async function updateUser(id, payload) {
  // payload attendu côté backend : { firstName, lastName, phoneNumber, role }
  const { data } = await api.put(`/api/users/${id}`, payload);
  return data;
}

export async function deleteUser(id) {
  await api.delete(`/api/users/${id}`);
  return true;
}

export async function createUser(payload) {
  // payload: { firstName, lastName, email, phoneNumber, password, role }
  const { data } = await api.post('/auth/register', payload);
  return data;
}