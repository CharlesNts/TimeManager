// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';

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
      
      console.log('🔐 Réponse login:', res.data);
      const { tokenType, accessToken, expiresIn } = res.data;
      console.log('🔑 Token reçu:', accessToken?.substring(0, 20) + '...');

      // Stocker le token AVANT d'appeler /auth/me
      localStorage.setItem('access_token', accessToken);
      if (expiresIn) {
        const expiresAt = Date.now() + expiresIn * 1000;
        localStorage.setItem('token_expires_at', expiresAt.toString());
      }

      console.log('👤 Appel /auth/me (l\'interceptor va ajouter le token automatiquement)');
      // ⚠️ Ne PAS passer de headers explicites, l'interceptor s'en charge !
      const me = await api.get('/auth/me');
      console.log('✅ Profil chargé:', me.data);
      setUser(me.data);

      // 4) Navigation + fallback dur si un guard bloque
      try {
        navigate('/my-clocks', { replace: true });
      } catch {
        window.location.replace('/my-clocks');
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
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Connexion</CardTitle>
          <p className="text-sm text-gray-600 text-center">Accédez à votre espace Time Manager</p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="prenom.nom@primebank.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <a href="/forgot-password" className="text-sm text-gray-600 hover:text-black">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Pas de compte ? <a href="/register" className="text-black font-medium hover:underline">S'inscrire</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}