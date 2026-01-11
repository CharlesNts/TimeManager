// src/components/manager/TeamFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Save, Users } from 'lucide-react';
import api from '../../api/client';
import { createTeam, updateTeam } from '../../api/teamApi';

/**
 * Composant TeamFormModal - Modal pour créer ou modifier une équipe
 * 
 * Props:
 * - isOpen: Boolean - Modal ouvert ou fermé
 * - onClose: Function - Appelée quand on ferme le modal
 * - onSave: Function - Appelée quand on sauvegarde (reçoit teamData)
 * - team: Object (optionnel) - Données de l'équipe à modifier (si null = création)
 * - mode: 'create' | 'edit' - Mode du formulaire
 * - userRole: 'MANAGER' | 'CEO' - Rôle de l'utilisateur connecté
 * - currentUserId: Long - ID de l'utilisateur connecté
 * 
 * Règles métier:
 * - MANAGER: managerId est automatiquement l'utilisateur connecté (pas de choix)
 * - CEO: peut choisir n'importe quel manager dans la liste
 * 
 * Basé sur la table Teams:
 * - name: String
 * - description: String
 * - managerId: Long (FK vers Users avec role MANAGER ou CEO)
 * 
 * Exemple:
 * <TeamFormModal 
 *   isOpen={true}
 *   mode="create"
 *   userRole="MANAGER"
 *   currentUserId={5}
 *   onClose={() => setIsOpen(false)}
 *   onSave={(data) => console.log(data)}
 * />
 */
export default function TeamFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  team = null,
  mode = 'create',
  userRole = 'MANAGER',
  currentUserId = null
}) {
  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    managerId: ''
  });

  const [, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Liste des managers disponibles - Chargée depuis l'API
  const [availableManagers, setAvailableManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  // Charger les managers depuis l'API (MANAGER et CEO uniquement)
  useEffect(() => {
    const fetchManagers = async () => {
      if (!isOpen) return; // Ne charge que si le modal est ouvert
      
      setLoadingManagers(true);
      try {
        const { data } = await api.get('/api/users');
        // Filtrer uniquement MANAGER et CEO
        const managers = (data || []).filter(u => u.role === 'MANAGER' || u.role === 'CEO');
        setAvailableManagers(managers);
      } catch (err) {
        console.error('[TeamFormModal] Erreur chargement managers:', err);
        setAvailableManagers([]);
      } finally {
        setLoadingManagers(false);
      }
    };
    fetchManagers();
  }, [isOpen]);

  // Remplir le formulaire si mode édition
  useEffect(() => {
    if (team && mode === 'edit') {
      setFormData({
        name: team.name || '',
        description: team.description || '',
        managerId: team.managerId || ''
      });
    } else if (mode === 'create') {
      // Si MANAGER, définir automatiquement managerId = currentUserId
      setFormData({
        name: '',
        description: '',
        managerId: userRole === 'MANAGER' ? currentUserId : ''
      });
    }
  }, [team, mode, isOpen, userRole, currentUserId]);

  // Gérer les changements dans les inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Le nom de l\'équipe est obligatoire');
      return;
    }
    
    if (!formData.managerId) {
      setError('Un manager doit être sélectionné');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        managerId: parseInt(formData.managerId),
      };
      
      let savedTeam;
      if (mode === 'create') {
        savedTeam = await createTeam(payload);
      } else {
        savedTeam = await updateTeam(team.id, payload);
      }
      
      if (onSave) onSave(savedTeam);
      onClose();
      
    } catch (err) {
      console.error('Erreur sauvegarde équipe:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // Ne rien afficher si le modal n'est pas ouvert
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay sombre */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'create' ? 'Créer une équipe' : 'Modifier l\'équipe'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Message d'erreur */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            {/* Nom de l'équipe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l&apos;équipe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Équipe Développement"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Décrivez le rôle et les responsabilités de l&apos;équipe..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              />
            </div>

            {/* Sélection du manager */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manager <span className="text-red-500">*</span>
              </label>
              
              {userRole === 'CEO' ? (
                // CEO peut choisir n'importe quel manager
                <>
                  <select
                    name="managerId"
                    value={formData.managerId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    required
                    disabled={loadingManagers}
                  >
                    <option value="">{loadingManagers ? 'Chargement...' : 'Sélectionner un manager'}</option>
                    {availableManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.firstName} {manager.lastName} ({manager.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Seuls les utilisateurs avec le rôle &quot;Manager&quot; ou &quot;CEO&quot; peuvent être sélectionnés
                  </p>
                </>
              ) : (
                // MANAGER : managerId fixé automatiquement
                <>
                  <input
                    type="text"
                    value={
                      currentUserId && availableManagers.length > 0
                        ? (() => {
                            const currentManager = availableManagers.find(m => m.id === currentUserId);
                            return currentManager 
                              ? `${currentManager.firstName} ${currentManager.lastName}` 
                              : 'Vous-même';
                          })()
                        : loadingManagers ? 'Chargement...' : 'Vous-même'
                    }
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    En tant que Manager, vous êtes automatiquement le manager de cette équipe
                  </p>
                </>
              )}
            </div>
            
            {/* Section Planning Obligatoire */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Planning de travail <span className="text-red-500">*</span>
              </label>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-3">
                  Le planning de travail sera configuré après la création de l&apos;équipe. Une boîte de dialogue vous permettra de le configurer immédiatement.
                </p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded-lg font-medium flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {mode === 'create' ? 'Créer l\'équipe' : 'Enregistrer'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </>
  );
}
