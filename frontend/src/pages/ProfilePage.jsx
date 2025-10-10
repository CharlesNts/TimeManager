// src/pages/ProfilePage.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Key,
  Save
} from 'lucide-react';

/**
 * Page ProfilePage - Profil utilisateur
 * 
 * Accessible à tous les utilisateurs authentifiés
 * Affiche et permet de modifier:
 * - Photo de profil
 * - Informations personnelles
 * - Mot de passe
 * 
 * Pour l'instant en mode démo (données statiques)
 */
export default function ProfilePage() {
  const { user } = useAuth();
  
  // Configuration de la navigation sidebar selon le rôle
  const sidebarItems = getSidebarItems(user?.role);

  // État local pour les données du profil (mode démo)
  // Correspond à la table Users
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || 'Jonathan',
    lastName: user?.lastName || 'GROMAT',
    email: user?.email || 'jonathan.gromat@primebank.com',
    phoneNumber: '+33 6 12 34 56 78',
    role: user?.role || 'MANAGER' // Enum: EMPLOYEE, MANAGER, CEO
  });

  const [isEditing, setIsEditing] = useState(false);

  // Gérer les changements dans les champs
  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Sauvegarder les modifications
  const handleSave = () => {
    console.log('Sauvegarde du profil:', profileData);
    setIsEditing(false);
    // Plus tard: appel API pour sauvegarder
  };

  // Annuler les modifications
  const handleCancel = () => {
    setIsEditing(false);
    // Plus tard: recharger les données depuis l'API
  };

  // Réinitialiser le mot de passe
  const handleResetPassword = () => {
    console.log('Réinitialisation du mot de passe');
    // Plus tard: ouvrir un modal ou naviguer vers une page dédiée
  };

  return (
    <Layout 
      sidebarItems={sidebarItems}
      pageTitle="Mon profil"
      userName={`${profileData.firstName} ${profileData.lastName}`}
      userRole={profileData.role}
    >
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* En-tête avec nom et bouton modifier */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {profileData.firstName} {profileData.lastName}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {profileData.role === 'MANAGER' ? 'Manager' : 
                   profileData.role === 'CEO' ? 'CEO' : 'Employé'}
                </p>
              </div>

              {/* Bouton Modifier */}
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-black text-white rounded-lg font-medium"
                >
                  Modifier le profil
                </button>
              )}
            </div>
          </div>

          {/* Carte Informations personnelles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Informations personnelles
            </h3>

            <div className="space-y-4">
              {/* Prénom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Prénom
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}
                />
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Nom
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={profileData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}
                />
              </div>

              {/* Rôle (non modifiable) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Briefcase className="w-4 h-4 inline mr-2" />
                  Rôle
                </label>
                <input
                  type="text"
                  value={profileData.role === 'MANAGER' ? 'Manager' : 
                         profileData.role === 'CEO' ? 'CEO' : 'Employé'}
                  disabled={true}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Le rôle ne peut être modifié que par le CEO
                </p>
              </div>
            </div>

            {/* Boutons d'action en mode édition */}
            {isEditing && (
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg font-medium"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-white text-gray-900 border-2 border-gray-900 rounded-lg font-medium"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>

          {/* Carte Sécurité */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sécurité
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Mot de passe</p>
                <p className="text-sm text-gray-500 mt-1">
                  Modifié il y a 30 jours
                </p>
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
