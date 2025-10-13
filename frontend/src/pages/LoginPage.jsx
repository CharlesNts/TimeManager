// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.endsWith('@primebank.com')) {
      setError('Seuls les emails @primebank.com sont autorisés'); return;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères'); return;
    }

    try {
      setLoading(true);
      setError('');

      // 1) Login → token
      const res = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
      });
      const { tokenType, accessToken, expiresIn } = res.data;

      // 2) Stockage token
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('token_type', tokenType);
      localStorage.setItem('expires_in', String(expiresIn));

      // 3) Charger le profil et MAJ contexte
      const me = await api.get('/auth/me');
      setUser(me.data);

      // 4) Navigation + fallback dur si un guard bloque
      try {
        navigate('/dashboard', { replace: true });
      } catch {
        window.location.replace('/dashboard');
      }
    } catch (err) {
      console.error('❌ Erreur de connexion:', err);
      if (err.response) {
        if (err.response.status === 401) setError('Identifiants incorrects');
        else if (err.response.status === 403) setError('Accès refusé');
        else setError(err.response.data?.message || 'Erreur serveur');
      } else {
        setError('Impossible de contacter le serveur');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">PB</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Connexion</h1>
        <p className="text-sm text-gray-600 text-center mb-8">Accédez à votre espace Time Manager</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email professionnel</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="prenom.nom@primebank.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <a href="/forgot-password" className="text-sm text-gray-600 hover:text-black">
                Mot de passe oublié ?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connexion...
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Pas de compte ? <a href="/register" className="text-black font-medium hover:underline">S'inscrire</a>
          </p>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            💡 <strong>Flux :</strong> /auth/login → stock token → /auth/me → setUser → navigate('/dashboard')
          </p>
        </div>
      </div>
    </div>
  );
}