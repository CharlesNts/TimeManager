// src/pages/UsersListPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import EditUserModal from '../components/manager/EditUserModal';
import { 
  Check,
  X,
  Edit,
  Trash2,
  Filter
} from 'lucide-react';

/**
 * Page UsersListPage - Gestion des utilisateurs (CEO uniquement)
 * 
 * Fonctionnalités :
 * - Liste de tous les utilisateurs
 * - Approuver/Rejeter les nouvelles inscriptions (status PENDING)
 * - Modifier les informations (prénom, nom, rôle)
 * - Supprimer un compte
 * - Filtrer par rôle et statut
 * 
 * Basé sur la table Users avec champ status :
 * - PENDING : En attente d'approbation
 * - APPROVED : Approuvé, peut se connecter
 * - REJECTED : Rejeté, compte désactivé
 */
export default function UsersListPage() {
  const { user } = useAuth();
  
  // Filtres
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal d'édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Configuration de la navigation sidebar selon le rôle
  const sidebarItems = getSidebarItems(user?.role);

  // Données de démo - Plus tard depuis API GET /api/users
  const users = [
    {
      id: 1,
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@primebank.com',
      role: 'CEO',
      status: 'APPROVED',
      createdAt: '2024-01-15',
      approvedAt: '2024-01-15'
    },
    {
      id: 2,
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie.martin@primebank.com',
      role: 'MANAGER',
      status: 'APPROVED',
      createdAt: '2024-02-01',
      approvedAt: '2024-02-01'
    },
    {
      id: 3,
      firstName: 'Pierre',
      lastName: 'Durand',
      email: 'pierre.durand@primebank.com',
      role: 'EMPLOYEE',
      status: 'PENDING',
      createdAt: '2025-10-09',
      approvedAt: null
    },
    {
      id: 4,
      firstName: 'Sophie',
      lastName: 'Bernard',
      email: 'sophie.bernard@primebank.com',
      role: 'EMPLOYEE',
      status: 'APPROVED',
      createdAt: '2024-03-10',
      approvedAt: '2024-03-11'
    },
    {
      id: 5,
      firstName: 'Luc',
      lastName: 'Petit',
      email: 'luc.petit@primebank.com',
      role: 'EMPLOYEE',
      status: 'PENDING',
      createdAt: '2025-10-10',
      approvedAt: null
    },
  ];

  // Filtrage
  const filteredUsers = users.filter(user => {
    if (filterRole !== 'ALL' && user.role !== filterRole) return false;
    if (filterStatus !== 'ALL' && user.status !== filterStatus) return false;
    return true;
  });

  // Actions
  const handleApprove = (userId) => {
    console.log('Approuver user:', userId);
    // Plus tard: API PUT /api/users/:id/approve
  };

  const handleReject = (userId) => {
    console.log('Rejeter user:', userId);
    // Plus tard: API PUT /api/users/:id/reject
  };

  const handleEdit = (userId) => {
    const userToEdit = users.find(u => u.id === userId);
    setSelectedUser(userToEdit);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = (formData) => {
    console.log('Sauvegarder user:', selectedUser.id, formData);
    // Plus tard: API PUT /api/users/:id avec formData
    // Mettre à jour la liste locale ou refetch
  };

  const handleDelete = (userId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      console.log('Supprimer user:', userId);
      // Plus tard: API DELETE /api/users/:id
    }
  };

  // Badges
  const getRoleBadge = (role) => {
    const styles = {
      CEO: 'bg-purple-100 text-purple-800',
      MANAGER: 'bg-blue-100 text-blue-800',
      EMPLOYEE: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[role]}`}>
        {role}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-orange-100 text-orange-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Approuvé',
      REJECTED: 'Rejeté'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <Layout 
      sidebarItems={sidebarItems}
      pageTitle="Gestion des utilisateurs"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header avec stats */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Gestion des utilisateurs
            </h2>
            <div className="flex items-center space-x-6 text-sm">
              <span className="text-gray-600">
                Total : <strong>{users.length}</strong> utilisateurs
              </span>
              <span className="text-orange-600">
                En attente : <strong>{users.filter(u => u.status === 'PENDING').length}</strong>
              </span>
              <span className="text-green-600">
                Approuvés : <strong>{users.filter(u => u.status === 'APPROVED').length}</strong>
              </span>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtres :</span>
              
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="ALL">Tous les rôles</option>
                <option value="EMPLOYEE">Employés</option>
                <option value="MANAGER">Managers</option>
                <option value="CEO">CEO</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="APPROVED">Approuvés</option>
                <option value="REJECTED">Rejetés</option>
              </select>
            </div>
          </div>

          {/* Tableau des utilisateurs */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Utilisateur</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rôle</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Inscription</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((userItem) => (
                    <tr key={userItem.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white font-bold text-sm">
                              {userItem.firstName[0]}{userItem.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {userItem.firstName} {userItem.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {userItem.email}
                      </td>
                      <td className="py-3 px-4">
                        {getRoleBadge(userItem.role)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(userItem.status)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(userItem.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          {userItem.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(userItem.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded"
                                title="Approuver"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleReject(userItem.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                title="Rejeter"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEdit(userItem.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {userItem.id !== user?.id && (
                            <button
                              onClick={() => handleDelete(userItem.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucun utilisateur trouvé</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de modification */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveUser}
        userData={selectedUser}
      />
    </Layout>
  );
}
