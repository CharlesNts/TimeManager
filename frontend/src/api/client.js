// src/api/client.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Anti-cache SAFE: on ajoute un paramètre _ts pour les GET
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const method = (config.method || 'get').toLowerCase();
  if (method === 'get') {
    config.params = { ...(config.params || {}), _ts: Date.now() };
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      'Erreur réseau';
    return Promise.reject({ ...err, message });
  }
);

export default api;