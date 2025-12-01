// src/api/client.js
import axios from 'axios';

// Configuration de l'URL de base de l'API
// En dev: on utilise le proxy Vite (chemin relatif), donc on laisse vide ou '/'
// En prod: utiliser VITE_API_URL si le backend est ailleurs
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Anti-cache SAFE: on ajoute un paramètre _ts pour les GET
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔐 [Interceptor] Token ajouté:', token.substring(0, 30) + '...', 'pour', config.url);
  } else {
    console.warn('⚠️ [Interceptor] Aucun token trouvé dans localStorage');
  }

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