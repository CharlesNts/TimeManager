// src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../api/client';

/**
 * Page pour demander la réinitialisation du mot de passe
 * L'utilisateur entre son email, le backend envoie un lien de reset
 * 
 * Backend attendu: POST /auth/forgot-password { email }
 * Réponse: { message: "Email envoyé" }
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Activer quand le backend sera prêt
      // await api.post('/auth/forgot-password', { email });
      
      // Pour l'instant, simulation
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('[ForgotPassword] Email envoyé à:', email);
      
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi de l\'email');
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Email envoyé !</h2>
          <p className="text-gray-600 mb-6">
            Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Le lien est valable pendant 1 heure.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la connexion
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
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Mot de passe oublié ?</h2>
          <p className="text-gray-600 mt-2">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
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
            Cette page est prête pour l'endpoint <code>POST /auth/forgot-password</code>
          </p>
        </div>
      </div>
    </div>
  );
}
