// src/pages/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import { User, Mail, Phone, Briefcase, Key, Save, Loader2, CheckCircle2, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { getUserById, updateUserById /*, updateUserPassword*/ } from '../api/userApi';
import { forgotPassword } from '../api/passwordApi';
import { deleteUser } from '../api/userAdminApi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarItems = getSidebarItems(user?.role);

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'EMPLOYEE',
  });

  const [, setUserTeams] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [ok, setOk]             = useState('');

    // Charger depuis l'API
  useEffect(() => {
    let cancel = false;
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError(''); setOk('');
      try {
        const [userData, teamsData] = await Promise.all([
          getUserById(user.id),
          import('../api/teamApi').then(mod => mod.fetchUserMemberships(user.id)).catch(() => [])
        ]);
        
        if (!cancel) {
          setProfileData({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            phoneNumber: userData.phoneNumber || '',
            role: userData.role || 'EMPLOYEE',
          });
          setUserTeams(teamsData);
        }
      } catch (e) {
        if (!cancel) setError(e?.message || 'Erreur de chargement du profil');
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    load();
    return () => { cancel = true; };
  }, [user?.id]);

  const handleInputChange = (field, value) => {
    setError(''); setOk('');
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setError(''); setOk('');
    try {
      // ⚠️ Le backend ne met pas à jour l’email; on n’envoie pas `email`
      const updated = await updateUserById(user.id, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phoneNumber: profileData.phoneNumber,
        role: profileData.role, // enlève ceci si tu ne souhaites pas exposer le changement de rôle
      });

      // Mettre à jour le contexte (utile pour l’en-tête / sidebar)
      setUser(prev => prev ? { ...prev,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phoneNumber: updated.phoneNumber,
        role: updated.role,
      } : prev);

      setOk('Profil mis à jour');
      setIsEditing(false);
    } catch (e) {
      setError(e?.message || 'Échec de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(''); setOk('');
    // On rechargera au besoin; sinon garde l’état courant
  };

  const handleResetPassword = async () => {
    if (!profileData.email) return;
    try {
      setError(''); setOk('');
      await forgotPassword(profileData.email);
      toast.success(`Un email de réinitialisation a été envoyé à ${profileData.email}`);
    } catch (e) {
      setError("Erreur lors de l'envoi de l'email de réinitialisation.");
      toast.error("Erreur lors de l'envoi de l'email");
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      await deleteUser(user.id);
      // Déconnecter l'utilisateur et le rediriger
      logout();
      navigate('/login');
    } catch (e) {
      setError(e?.message || 'Échec de la suppression du compte');
      setConfirmDelete(false);
    }
  };

  return (
    <Layout 
      sidebarItems={sidebarItems}
      pageTitle="Mon profil"
      userName={`${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()}
      userRole={profileData.role}
    >
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* En-tête de page */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mon Profil</h1>
            <p className="text-gray-500 mt-1">
              Gérez vos informations personnelles et vos équipes
            </p>
          </div>

          {/* Bandeaux feedback */}
          {error && (
            <Card className="border-l-4 border-red-500 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm font-medium text-red-900">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {ok && (
            <Card className="border-l-4 border-green-500 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-900">{ok}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Header avec nom et rôle */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {loading ? '...' : `${profileData.firstName?.[0] || ''}${profileData.lastName?.[0] || ''}`}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {loading ? 'Chargement…' : `${profileData.firstName} ${profileData.lastName}`}
                    </h2>
                    <Badge variant={profileData.role === 'ADMIN' ? 'default' : profileData.role === 'MANAGER' ? 'secondary' : 'outline'} className="mt-1">
                      {profileData.role === 'MANAGER' ? 'Manager' : profileData.role === 'ADMIN' ? 'CEO' : 'Employé'}
                    </Badge>
                  </div>
                </div>
                {!isEditing && !loading && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    disabled={loading}
                    variant="default"
                    size="default"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifier le profil
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Infos perso */}
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Gérez vos informations de contact et d&apos;identification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Chargement…
                </div>
              ) : (
                <div className="space-y-4">
                {/* Prénom */}
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="flex items-center gap-2">
                    <User className="w-4 h-4" /> Prénom
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                {/* Nom */}
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="flex items-center gap-2">
                    <User className="w-4 h-4" /> Nom
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                {/* Email (lecture seule) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">L&apos;email n&apos;est pas modifiable ici.</p>
                </div>

                {/* Téléphone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Téléphone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phoneNumber || ''}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                {/* Rôle (non modifiable) */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Rôle
                  </Label>
                  <Input
                    id="role"
                    type="text"
                    value={profileData.role === 'MANAGER' ? 'Manager' : profileData.role === 'ADMIN' ? 'CEO' : 'Employé'}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Le rôle ne peut être modifié que par un Administrateur.
                  </p>
                </div>
              </div>
            )}

              {/* Boutons d'action */}
              {isEditing && !loading && (
                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    variant="default"
                    className="flex-1"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Sauvegarder
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={saving}
                    variant="outline"
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sécurité */}
          <Card>
            <CardHeader>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>
                Gérez la sécurité de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mot de passe */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-900">Mot de passe</p>
                  <p className="text-sm text-muted-foreground mt-1">Modifié il y a 30 jours</p>
                </div>
                <Button
                  onClick={handleResetPassword}
                  variant="outline"
                >
                  <Key className="w-4 h-4" />
                  Réinitialiser
                </Button>
              </div>

              {/* Suppression de compte */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-900">Supprimer mon compte</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                    </p>
                  </div>
                </div>
                
                {confirmDelete ? (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-900 mb-3">
                      ⚠️ Êtes-vous absolument sûr(e) ?
                    </p>
                    <p className="text-xs text-red-800 mb-4">
                      Cette action supprimera définitivement votre compte et toutes les données associées. 
                      Vous serez déconnecté(e) immédiatement.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleDeleteAccount}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Confirmer la suppression
                      </Button>
                      <Button
                        onClick={() => setConfirmDelete(false)}
                        variant="outline"
                        size="sm"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmDelete(true)}
                    variant="outline"
                    className="mt-4 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer mon compte
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
}