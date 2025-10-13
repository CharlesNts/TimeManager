// src/pages/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import { User, Mail, Phone, Briefcase, Key, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getUserById, updateUserById /*, updateUserPassword*/ } from '../api/userApi';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const sidebarItems = getSidebarItems(user?.role);

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'EMPLOYEE',
  });

  const [userTeams, setUserTeams] = useState([]);
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

  const handleResetPassword = () => {
    // Si tu ajoutes l’endpoint POST /api/users/{id}/password côté backend, tu peux décommenter ci-dessous
    // const newPass = prompt('Nouveau mot de passe :');
    // if (!newPass) return;
    // updateUserPassword(user.id, newPass)
    //   .then(() => setOk('Mot de passe mis à jour'))
    //   .catch(e => setError(e?.message || 'Échec de la mise à jour du mot de passe'));
    alert("Action à implémenter côté backend (POST /api/users/{id}/password)"); 
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

          {/* Bandeaux feedback */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> {error}
            </div>
          )}
          {ok && (
            <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" /> {ok}
            </div>
          )}

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {loading ? 'Chargement…' : `${profileData.firstName} ${profileData.lastName}`}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {profileData.role === 'MANAGER' ? 'Manager' : profileData.role === 'CEO' ? 'CEO' : 'Employé'}
                </p>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-black text-white rounded-lg font-medium disabled:opacity-60"
                >
                  Modifier le profil
                </button>
              )}
            </div>
          </div>

          {/* Infos perso */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Informations personnelles</h3>

            {loading ? (
              <div className="text-sm text-gray-500 flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Chargement…
              </div>
            ) : (
              <div className="space-y-4">
                {/* Prénom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" /> Prénom
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg ${isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" /> Nom
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg ${isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>

                {/* Email (lecture seule – backend ne l’update pas via PUT) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" /> Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">L’email n’est pas modifiable ici.</p>
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" /> Téléphone
                  </label>
                  <input
                    type="tel"
                    value={profileData.phoneNumber || ''}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg ${isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>

                {/* Rôle (non modifiable dans l’UI) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Briefcase className="w-4 h-4 inline mr-2" /> Rôle
                  </label>
                  <input
                    type="text"
                    value={profileData.role === 'MANAGER' ? 'Manager' : profileData.role === 'CEO' ? 'CEO' : 'Employé'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le rôle ne peut être modifié que par le CEO.
                  </p>
                </div>
              </div>
            )}

            {/* Boutons d’action */}
            {isEditing && !loading && (
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg font-medium disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Sauvegarder
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-white text-gray-900 border-2 border-gray-900 rounded-lg font-medium"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>

          {/* Mes équipes */}
          {userTeams.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mes équipes</h3>
              <div className="space-y-3">
                {userTeams.map((team) => (
                  <div
                    key={team.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md cursor-pointer transition"
                    onClick={() => window.location.href = `/teams/${team.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{team.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{team.description || 'Aucune description'}</p>
                        <p className="text-xs text-gray-400 mt-1">Manager : {team.managerName}</p>
                      </div>
                      <Briefcase className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sécurité */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sécurité</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Mot de passe</p>
                <p className="text-sm text-gray-500 mt-1">Modifié il y a 30 jours</p>
              </div>
              <button
                onClick={handleResetPassword}
                className="flex items-center px-4 py-2 bg-white text-gray-900 border-2 border-gray-900 rounded-lg font-medium"
              >
                <Key className="w-4 h-4 mr-2" />
                Réinitialiser
              </button>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}