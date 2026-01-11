import React, { useState, useEffect } from 'react';
import { UserPlus, X, Search, Check } from 'lucide-react';
import api from '../../api/client';

/**
 * Modal pour ajouter des membres à une équipe
 * Affiche la liste des utilisateurs disponibles avec recherche
 * 
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {function} onClose - Callback de fermeture
 * @param {function} onAddMember - Callback d'ajout de membre (userId)
 * @param {Array} currentMembers - Liste des membres actuels (pour les exclure)
 * @param {Array} availableUsers - Liste des utilisateurs disponibles (optionnel, sinon chargé depuis API)
 */
const AddMemberModal = ({ 
  isOpen, 
  onClose, 
  onAddMember,
  currentMembers = [],
  availableUsers = null // Si null, on charge depuis l'API
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Charger les utilisateurs depuis l'API si non fournis en props
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOpen) return;
      
      // Si availableUsers fourni en props, on les utilise
      if (availableUsers !== null) {
        setUsers(availableUsers);
        return;
      }
      
      // Sinon, charger depuis l'API
      setLoadingUsers(true);
      try {
        const { data } = await api.get('/api/users');
        setUsers(data || []);
      } catch (err) {
        console.error('[AddMemberModal] Erreur chargement users:', err);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [isOpen, availableUsers]);

  if (!isOpen) return null;

  // Filtrer les utilisateurs déjà membres
  const currentMemberIds = currentMembers.map(m => m.userId || m.id || m.user?.id).filter(Boolean);
  const usersToShow = users.filter(
    user => !currentMemberIds.includes(user.id)
  );

  // Filtrer par recherche
  const filteredUsers = usersToShow.filter(user =>
    `${user.firstName} ${user.lastName} ${user.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = () => {
    selectedUsers.forEach(userId => onAddMember(userId));
    setSelectedUsers([]);
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-sm max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Ajouter des membres
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          {selectedUsers.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {selectedUsers.length} utilisateur(s) sélectionné(s)
            </p>
          )}
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingUsers ? (
            <div className="text-center py-8 text-gray-500">Chargement des utilisateurs...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Aucun utilisateur trouvé' : 'Tous les utilisateurs sont déjà membres'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`
                    flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all
                    ${selectedUsers.includes(user.id)
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-sm">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded
                      ${user.role === 'CEO' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'MANAGER' ? 'bg-gray-200 text-gray-700' :
                        'bg-gray-100 text-gray-600'}
                    `}>
                      {user.role}
                    </span>
                    {selectedUsers.includes(user.id) && (
                      <div className="h-6 w-6 rounded-full bg-gray-900 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Ajouter {selectedUsers.length > 0 && `(${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
