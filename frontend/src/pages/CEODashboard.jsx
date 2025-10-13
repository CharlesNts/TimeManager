// src/pages/CEODashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Building2,
  AlertCircle,
  BarChart3,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import api from '../api/client';

export default function CEODashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sidebarItems = getSidebarItems(user?.role);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalTeams: 0,
    totalManagers: 0,
    activeEmployees: 0,
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [recentTeams, setRecentTeams] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user || user.role !== 'CEO') return;
      
      setLoading(true);
      try {
        // Charger tous les utilisateurs
        const { data: allUsers } = await api.get('/api/users');
        
        // Calculer les stats utilisateurs
        const pending = allUsers.filter(u => u.status === 'PENDING');
        const approved = allUsers.filter(u => u.status === 'APPROVED');
        const managers = allUsers.filter(u => u.role === 'MANAGER');
        const employees = allUsers.filter(u => u.role === 'EMPLOYEE' && u.status === 'APPROVED');

        // Charger toutes les équipes (via tous les managers)
        const managerIds = managers.map(m => m.id);
        const teamPromises = managerIds.map(id =>
          api.get('/api/teams', { params: { managerId: id } })
            .then(res => Array.isArray(res.data) ? res.data : [])
            .catch(() => [])
        );
        const teamArrays = await Promise.all(teamPromises);
        const allTeams = teamArrays.flat();
        
        // Déduplication par id
        const uniqueTeams = Array.from(
          new Map(allTeams.map(t => [t.id, t])).values()
        );

        setStats({
          totalUsers: allUsers.length,
          pendingUsers: pending.length,
          approvedUsers: approved.length,
          totalTeams: uniqueTeams.length,
          totalManagers: managers.length,
          activeEmployees: employees.length,
        });

        setPendingUsers(pending.slice(0, 5)); // Top 5 en attente
        setRecentTeams(uniqueTeams.slice(0, 5)); // Top 5 équipes récentes

      } catch (err) {
        console.error('[CEODashboard] Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  const handleApprove = async (userId) => {
    try {
      await api.put(`/api/users/${userId}/approve`);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setStats(prev => ({
        ...prev,
        pendingUsers: prev.pendingUsers - 1,
        approvedUsers: prev.approvedUsers + 1,
      }));
    } catch (err) {
      alert(err.message || 'Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (userId) => {
    try {
      await api.put(`/api/users/${userId}/reject`);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setStats(prev => ({
        ...prev,
        pendingUsers: prev.pendingUsers - 1,
      }));
    } catch (err) {
      alert(err.message || 'Erreur lors du rejet');
    }
  };

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle="Dashboard CEO"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Vue d'ensemble globale</h2>
            <p className="text-sm text-gray-600 mt-1">
              Statistiques et indicateurs clés de l'entreprise
            </p>
          </div>

          {loading ? (
            <div className="text-gray-600">Chargement...</div>
          ) : (
            <>
              {/* KPIs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Total Utilisateurs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Utilisateurs</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Utilisateurs en attente */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">En attente d'approbation</p>
                      <p className="text-3xl font-bold text-orange-600 mt-1">{stats.pendingUsers}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Utilisateurs approuvés */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Utilisateurs approuvés</p>
                      <p className="text-3xl font-bold text-green-600 mt-1">{stats.approvedUsers}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Total Équipes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Équipes</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalTeams}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Total Managers */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Managers</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalManagers}</p>
                    </div>
                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Employés actifs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Employés actifs</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeEmployees}</p>
                    </div>
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Utilisateurs en attente */}
              {pendingUsers.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                      Utilisateurs en attente d'approbation
                    </h3>
                    <button
                      onClick={() => navigate('/users')}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Voir tous
                    </button>
                  </div>

                  <div className="space-y-3">
                    {pendingUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {u.firstName?.[0]}{u.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApprove(u.id)}
                            className="flex items-center px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approuver
                          </button>
                          <button
                            onClick={() => handleReject(u.id)}
                            className="flex items-center px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Équipes récentes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Équipes récentes
                  </h3>
                  <button
                    onClick={() => navigate('/teams')}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Voir toutes
                  </button>
                </div>

                {recentTeams.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune équipe créée</p>
                ) : (
                  <div className="space-y-3">
                    {recentTeams.map(t => (
                      <div
                        key={t.id}
                        onClick={() => navigate(`/teams/${t.id}`)}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{t.name}</p>
                            <p className="text-sm text-gray-500">
                              Manager: {t.manager ? `${t.manager.firstName} ${t.manager.lastName}` : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions rapides */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => navigate('/users')}
                    className="flex items-center justify-center px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Gérer les utilisateurs
                  </button>
                  <button
                    onClick={() => navigate('/teams')}
                    className="flex items-center justify-center px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
                  >
                    <Building2 className="w-5 h-5 mr-2" />
                    Gérer les équipes
                  </button>
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center justify-center px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Mon profil
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
