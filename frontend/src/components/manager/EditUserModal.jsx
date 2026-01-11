// src/components/manager/EditUserModal.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * EditUserModal - Modal pour modifier un utilisateur (CEO uniquement)
 * 
 * Props:
 * - isOpen: Boolean pour afficher/masquer le modal
 * - onClose: Fonction appelée à la fermeture
 * - onSave: Fonction appelée à la sauvegarde avec les nouvelles données
 * - userData: Données de l'utilisateur à modifier (optionnel pour création)
 * 
 * Champs modifiables :
 * - Prénom, Nom
 * - Email
 * - Rôle (EMPLOYEE, MANAGER, CEO)
 * 
 * Usage:
 * <EditUserModal 
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   onSave={(data) => handleSaveUser(data)}
 *   userData={selectedUser}
 * />
 */
export default function EditUserModal({ isOpen, onClose, onSave, userData = null }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'EMPLOYEE'
  });

  // Initialiser le formulaire avec les données de l'utilisateur
  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        role: userData.role || 'EMPLOYEE'
      });
    }
  }, [userData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {userData ? 'Modifier l&apos;utilisateur' : 'Créer un utilisateur'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Prénom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              required
            />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              required
            />
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="EMPLOYEE">👤 Employé</option>
              <option value="MANAGER">👔 Manager</option>
            </select>
          </div>

          {/* Informations */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
            <p className="text-xs text-blue-700">
              <strong>Note :</strong> La modification du rôle prendra effet immédiatement.
              L&apos;utilisateur sera notifié par email du changement.
            </p>
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
            >
              Enregistrer
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
