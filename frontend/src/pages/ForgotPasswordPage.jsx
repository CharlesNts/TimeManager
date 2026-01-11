import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { forgotPassword } from '../api/passwordApi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setError('');
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      // Even if email is not found, security best practice often says "If account exists...",
      // but if the API returns an error, we can show it or a generic message.
      // The backend controller says: "Always 200, even if email not found", so we shouldn't fail often.
      setError('Une erreur est survenue. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/LoginBG.png')" }}
    >
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Mot de passe oublié</CardTitle>
          <p className="text-sm text-gray-600 text-center">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Email envoyé</h3>
                <p className="text-sm text-gray-600">
                  Si un compte est associé à <strong>{email}</strong>, vous recevrez un email contenant les instructions pour réinitialiser votre mot de passe.
                </p>
              </div>
              <Button asChild className="w-full" variant="outline">
                <Link to="/login">Retour à la connexion</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email professionnel</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@primebank.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer le lien'
                )}
              </Button>

              <div className="text-center">
                <Link to="/login" className="inline-flex items-center text-sm text-gray-600 hover:text-black">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}