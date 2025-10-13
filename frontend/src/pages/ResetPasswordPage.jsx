// src/pages/ResetPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/client';

/**
 * Page pour réinitialiser le mot de passe avec un token
 * URL: /reset-password?token=xxx
 * 
 * Backend attendu: POST /auth/reset-password { token, newPassword }
 * Réponse: { message: "Mot de passe réinitialisé" }
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token manquant ou invalide');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      // TODO: Activer quand le backend sera prêt
      // await api.post('/auth/reset-password', { token, newPassword: password });
      
      // Pour l'instant, simulation
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('[ResetPassword] Mot de passe réinitialisé avec token:', token);
      
      setSuccess(true);
      
      // Redirection après 3 secondes
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Mot de passe réinitialisé !</h2>
          <p className="text-gray-600 mb-6">
            Votre mot de passe a été modifié avec succès.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Redirection vers la page de connexion...
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Se connecter maintenant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Nouveau mot de passe</h2>
          <p className="text-gray-600 mt-2">
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!token && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              Le lien de réinitialisation est invalide ou expiré.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              required
              disabled={!token}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répétez le mot de passe"
              required
              disabled={!token}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium mb-1">Critères du mot de passe :</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>
                • Au moins 8 caractères
              </li>
              <li className={password && confirmPassword && password === confirmPassword ? 'text-green-600' : ''}>
                • Les deux mots de passe correspondent
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour à la connexion
            </Link>
          </div>
        </form>

        {/* Info backend */}
        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            🚧 <strong>Backend pas encore implémenté</strong><br />
            Cette page est prête pour l'endpoint <code>POST /auth/reset-password</code>
          </p>
        </div>
      </div>
    </div>
  );
}
