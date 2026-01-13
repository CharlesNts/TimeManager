// src/pages/ProfilePage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import { User, Mail, Phone, Key, Save, Loader2, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react';
import { getUserById, updateUserById } from '../api/userApi';
import { forgotPassword } from '../api/passwordApi';
import { deleteUser } from '../api/userAdminApi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarItems = getSidebarItems(user?.role);

  const [profileData, setProfileData] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', role: 'EMPLOYEE' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [ok, setOk]             = useState('');

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError(''); setOk('');
    try {
      const userData = await getUserById(user.id);
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
        role: userData.role || 'EMPLOYEE',
      });
    } catch (e) { setError(e?.message || 'Erreur de chargement du profil'); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true); setError(''); setOk('');
    try {
      const updated = await updateUserById(user.id, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phoneNumber: profileData.phoneNumber,
        role: profileData.role,
      });
      setUser(prev => prev ? { ...prev, ...updated } : prev);
      setOk('Profil mis à jour');
      setIsEditing(false);
    } catch (e) { setError(e?.message || 'Échec de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const handleResetPassword = async () => {
    if (!profileData.email) return;
    try {
      setError(''); setOk('');
      await forgotPassword(profileData.email);
      toast.success(`Un email de réinitialisation a été envoyé à ${profileData.email}`);
    } catch (e) {
      setError("Erreur lors de l'envoi de l'email");
      toast.error("Erreur lors de l'envoi de l'email");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(user.id);
      logout();
      navigate('/login');
    } catch (e) { setError(e?.message || 'Échec de la suppression du compte'); }
  };

  return (
    <Layout sidebarItems={sidebarItems} pageTitle="Mon profil" userName={`${profileData.firstName} ${profileData.lastName}`} userRole={profileData.role}>
      <div className="p-8"><div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mon Profil</h1>
        
        {error && <FeedbackCard type="error" message={error} icon={<AlertCircle className="w-5 h-5 text-red-600" />} />}
        {ok && <FeedbackCard type="success" message={ok} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} />}

        <ProfileHeader data={profileData} loading={loading} isEditing={isEditing} onEdit={() => setIsEditing(true)} />
        
        <PersonalInfoCard 
          data={profileData} 
          loading={loading} 
          isEditing={isEditing} 
          saving={saving}
          onChange={(f, v) => { setError(''); setOk(''); setProfileData(p => ({ ...p, [f]: v })); }}
          onSave={handleSave}
          onCancel={() => { setIsEditing(false); setError(''); setOk(''); }}
        />

        <SecurityCard onReset={handleResetPassword} onDelete={handleDeleteAccount} />
      </div></div>
    </Layout>
  );
}

// --- Sub-components ---

function FeedbackCard({ type, message, icon }) {
  const cls = type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50';
  return (
    <Card className={`border-l-4 ${cls}`}>
      <CardContent className="p-4 flex items-center gap-2">{icon}<p className="text-sm font-medium">{message}</p></CardContent>
    </Card>
  );
}
FeedbackCard.propTypes = { type: PropTypes.string, message: PropTypes.string, icon: PropTypes.node };

function ProfileHeader({ data, loading, isEditing, onEdit }) {
  const initials = loading ? '...' : `${data.firstName?.[0] || ''}${data.lastName?.[0] || ''}`;
  return (
    <Card><CardContent className="p-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 rounded-full flex items-center justify-center text-white font-bold text-2xl">{initials}</div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{loading ? 'Chargement…' : `${data.firstName} ${data.lastName}`}</h2>
          <Badge variant={data.role === 'ADMIN' ? 'default' : data.role === 'MANAGER' ? 'secondary' : 'outline'} className="mt-1">
            {data.role === 'MANAGER' ? 'Manager' : data.role === 'ADMIN' ? 'CEO' : 'Employé'}
          </Badge>
        </div>
      </div>
      {!isEditing && !loading && <Button onClick={onEdit} variant="default"><Edit2 className="w-4 h-4 mr-2" />Modifier le profil</Button>}
    </CardContent></Card>
  );
}
ProfileHeader.propTypes = { data: PropTypes.object.isRequired, loading: PropTypes.bool.isRequired, isEditing: PropTypes.bool.isRequired, onEdit: PropTypes.func.isRequired };

function PersonalInfoCard({ data, loading, isEditing, saving, onChange, onSave, onCancel }) {
  if (loading) return <Card className="p-6 flex items-center text-muted-foreground"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Chargement…</Card>;
  return (
    <Card>
      <CardHeader><CardTitle>Informations personnelles</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProfileField id="firstName" label="Prénom" icon={<User className="w-4 h-4" />} value={data.firstName} disabled={!isEditing} onChange={v => onChange('firstName', v)} />
          <ProfileField id="lastName" label="Nom" icon={<User className="w-4 h-4" />} value={data.lastName} disabled={!isEditing} onChange={v => onChange('lastName', v)} />
          <ProfileField id="email" label="Email" icon={<Mail className="w-4 h-4" />} value={data.email} disabled />
          <ProfileField id="phone" label="Téléphone" icon={<Phone className="w-4 h-4" />} value={data.phoneNumber} disabled={!isEditing} onChange={v => onChange('phoneNumber', v)} />
        </div>
        {isEditing && (
          <div className="flex gap-3 mt-6">
            <Button onClick={onSave} disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Sauvegarder</Button>
            <Button onClick={onCancel} disabled={saving} variant="outline" className="flex-1">Annuler</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
PersonalInfoCard.propTypes = { data: PropTypes.object.isRequired, loading: PropTypes.bool, isEditing: PropTypes.bool, saving: PropTypes.bool, onChange: PropTypes.func, onSave: PropTypes.func, onCancel: PropTypes.func };

function ProfileField({ id, label, icon, value, disabled, onChange }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">{icon}{label}</Label>
      <Input id={id} value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled} />
    </div>
  );
}
ProfileField.propTypes = { id: PropTypes.string, label: PropTypes.string, icon: PropTypes.node, value: PropTypes.string, disabled: PropTypes.bool, onChange: PropTypes.func };

function SecurityCard({ onReset, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Card>
      <CardHeader><CardTitle>Sécurité</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <div><p className="text-sm font-medium">Mot de passe</p><p className="text-xs text-muted-foreground">Réinitialisez votre mot de passe par email</p></div>
          <Button onClick={onReset} variant="outline"><Key className="w-4 h-4 mr-2" />Réinitialiser</Button>
        </div>
        <div>
          <p className="text-sm font-medium text-red-900">Supprimer mon compte</p>
          {confirm ? (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-900 mb-3">⚠️ Êtes-vous absolument sûr(e) ?</p>
              <p className="text-xs text-red-800 mb-4">Cette action supprimera définitivement votre compte et toutes les données associées. Vous serez déconnecté(e) immédiatement.</p>
              <div className="flex gap-3">
                <Button onClick={onDelete} variant="destructive" size="sm">Confirmer la suppression</Button>
                <Button onClick={() => setConfirm(false)} variant="outline" size="sm">Annuler</Button>
              </div>
            </div>
          ) : <Button onClick={() => setConfirm(true)} variant="outline" className="mt-4 text-red-600 border-red-300 hover:bg-red-50">Supprimer mon compte</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
SecurityCard.propTypes = { onReset: PropTypes.func, onDelete: PropTypes.func };
