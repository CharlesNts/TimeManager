// src/pages/UsersListPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import EditUserModal from '../components/manager/EditUserModal';
import ExportMenu from '../components/ui/ExportMenu';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { exportUsersListPDF } from '../utils/pdfExport';
import { exportUsersListCSV } from '../utils/csvExport';
import {
  Check,
  X,
  Edit,
  Trash2,
  Filter,
  Clock,
} from 'lucide-react';

import {
  fetchUsers,
  fetchPendingUsers,
  approveUser,
  rejectUser,
  updateUser,
  deleteUser,
} from '../api/userAdminApi';

/**
 * Page UsersListPage - Gestion des utilisateurs (CEO uniquement)
 *
 * Back-end actuel :
 *  - UserDTO ne possède pas "status" ; on derive un statut depuis "active" :
 *      active === true  -> "APPROVED"
 *      active === false -> "PENDING" (pas de distinction "REJECTED" côté modèle)
 */
export default function UsersListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sidebarItems = getSidebarItems(user?.role);

  // Filtres
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Données
  const [rows, setRows] = useState([]); // liste complète
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Modal d'édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setErr('');
    try {
      const [allUsers, pending] = await Promise.all([
        fetchUsers(),
        fetchPendingUsers(),
      ]);
  
      // Construire l’ensemble des IDs en attente (PENDING)
      const pendingIds = new Set(pending.map((u) => u.id));
  
      // Mapper les users et dériver le statut via pendingIds
      const mapped = allUsers.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        status: pendingIds.has(u.id) ? 'PENDING' : 'APPROVED',
        createdAt: u.createdAt || new Date().toISOString(),
        phoneNumber: u.phoneNumber || '',
      }));
  
      setRows(mapped);
    } catch (e) {
      setErr(e?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Filtrage
  const filteredUsers = useMemo(() => {
    return rows.filter((r) => {
      if (filterRole !== 'ALL' && r.role !== filterRole) return false;
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
      return true;
    });
  }, [rows, filterRole, filterStatus]);

  // Actions
  const handleApprove = async (userId) => {
    try {
      await approveUser(userId);
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec de l’approbation');
    }
  };

  const handleReject = async (userId) => {
    try {
      await rejectUser(userId);
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec du rejet');
    }
  };

  const handleEdit = (userId) => {
    const u = rows.find((x) => x.id === userId);
    if (!u) return;
    setSelectedUser({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      phoneNumber: u.phoneNumber,
      email: u.email,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (formData) => {
    if (!selectedUser) return;
    try {
      // formData attendu : { firstName, lastName, role, phoneNumber }
      await updateUser(selectedUser.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec de la mise à jour');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await deleteUser(userId);
      await loadAll();
    } catch (e) {
      alert(e?.message || 'Échec de la suppression');
    }
  };

  // Badges
  const getRoleBadge = (role) => {
    return (
      <Badge variant={role === 'CEO' ? 'default' : role === 'MANAGER' ? 'secondary' : 'outline'}>
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Approuvé',
      REJECTED: 'Rejeté',
    };
    return (
      <Badge variant={status === 'APPROVED' ? 'default' : status === 'PENDING' ? 'destructive' : 'outline'}>
        {labels[status] || status}
      </Badge>
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
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Gestion des utilisateurs</h2>
              <div className="flex items-center space-x-6 text-sm">
                <span className="text-gray-600">Total : <strong>{rows.length}</strong> utilisateurs</span>
                <span className="text-orange-600">En attente : <strong>{rows.filter((u) => u.status === 'PENDING').length}</strong></span>
                <span className="text-green-600">Approuvés : <strong>{rows.filter((u) => u.status === 'APPROVED').length}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ExportMenu 
                onExportCSV={() => exportUsersListCSV(filteredUsers)} 
                onExportPDF={() => exportUsersListPDF(filteredUsers)} 
                variant="outline" 
              />
              <Button onClick={() => navigate('/users/create')} variant="default">Créer un utilisateur</Button>
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
                {/* "REJECTED" non géré côté modèle — on laisse l’option si tu ajoutes plus tard */}
              </select>
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-lg shadow-sm border">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">Chargement…</div>
            ) : err ? (
              <div className="p-6 text-sm text-red-600">{err}</div>
            ) : (
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
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white font-bold text-sm">
                                {(u.firstName || '-')[0]}{(u.lastName || '-')[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {u.firstName} {u.lastName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{u.email}</td>
                        <td className="py-3 px-4">{getRoleBadge(u.role)}</td>
                        <td className="py-3 px-4">{getStatusBadge(u.status)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Voir dashboard */}
                            <Button
                              onClick={() => navigate(`/employee/${u.id}/dashboard`)}
                              variant="ghost"
                              size="icon"
                              title="Voir le dashboard"
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                            
                            {u.status === 'PENDING' && (
                              <>
                                <Button onClick={() => handleApprove(u.id)} variant="ghost" size="icon" title="Approuver">
                                  <Check className="w-5 h-5 text-green-600" />
                                </Button>
                                <Button onClick={() => handleReject(u.id)} variant="ghost" size="icon" title="Rejeter">
                                  <X className="w-5 h-5 text-red-600" />
                                </Button>
                              </>
                            )}
                            <Button onClick={() => handleEdit(u.id)} variant="ghost" size="icon" title="Modifier">
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                            {u.id !== user?.id && (
                              <Button onClick={() => handleDelete(u.id)} variant="ghost" size="icon" title="Supprimer">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredUsers.length && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          Aucun utilisateur trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de modification */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
        userData={selectedUser}
      />
    </Layout>
  );
}