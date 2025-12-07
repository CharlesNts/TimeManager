// src/pages/CEODashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import {
  Users,
  UserCheck,
  Building2,
  AlertCircle,
  BarChart3,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import api from '../api/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import KPIChartCard from '../components/dashboard/KPIChartCard';
import ExportMenu from '../components/ui/ExportMenu';
import { exportCEODashboardPDF } from '../utils/pdfExport';
import { exportCEODashboardCSV } from '../utils/csvExport';

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
        // Charger tous les utilisateurs et utilisateurs en attente
        // Note : /api/users retourne tous les users avec active=true (approuvés par CEO)
        //        /api/users/active ferait la même chose
        const [usersRes, pendingRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/users/users/pending')
        ]);
        
        const allUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
        const pendingList = Array.isArray(pendingRes.data) ? pendingRes.data : [];
        
        console.log('[CEODashboard] All users:', allUsers);
        console.log('[CEODashboard] Pending users:', pendingList);
        
        // Calculer les stats utilisateurs
        const managers = allUsers.filter(u => u.role === 'MANAGER');
        const employees = allUsers.filter(u => u.role === 'EMPLOYEE');
        const approvedCount = allUsers.length; // Les users dans /api/users sont déjà approuvés
        
        console.log('[CEODashboard] Managers:', managers);
        console.log('[CEODashboard] Employees:', employees);

        // Charger toutes les équipes (via tous les managers + CEO)
        // On inclut aussi les CEO car ils peuvent être managers d'équipes
        const managerAndCEOIds = allUsers
          .filter(u => u.role === 'MANAGER' || u.role === 'CEO')
          .map(u => u.id);
          
        const teamPromises = managerAndCEOIds.map(id =>
          api.get('/api/teams', { params: { managerId: id } })
            .then(res => Array.isArray(res.data) ? res.data : [])
            .catch(() => [])
        );
        const teamArrays = await Promise.all(teamPromises);
        const allTeams = teamArrays.flat();
        
        console.log('[CEODashboard] Manager/CEO IDs:', managerAndCEOIds);
        console.log('[CEODashboard] Team arrays:', teamArrays);
        console.log('[CEODashboard] All teams (flat):', allTeams);
        
        // Déduplication par id
        const uniqueTeams = Array.from(
          new Map(allTeams.map(t => [t.id, t])).values()
        );
        
        console.log('[CEODashboard] Unique teams:', uniqueTeams);

        setStats({
          totalUsers: approvedCount + pendingList.length, // Total = approuvés + en attente
          pendingUsers: pendingList.length,
          approvedUsers: approvedCount,
          totalTeams: uniqueTeams.length,
          totalManagers: managers.length,
          activeEmployees: employees.length, // Tous les employés approuvés
        });

        setPendingUsers(pendingList.slice(0, 5)); // Top 5 en attente
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
      await api.put(`/api/users/users/${userId}/approve`);
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
      await api.put(`/api/users/users/${userId}/reject`);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setStats(prev => ({
        ...prev,
        pendingUsers: prev.pendingUsers - 1,
      }));
    } catch (err) {
      alert(err.message || 'Erreur lors du rejet');
    }
  };

  const handleExportPDF = () => {
    exportCEODashboardPDF(user, stats, pendingUsers, recentTeams);
  };

  const handleExportCSV = () => {
    exportCEODashboardCSV(user, stats, pendingUsers, recentTeams);
  };

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle="Dashboard Admin"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8 space-y-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Admin</h1>
                <p className="text-gray-500 mt-1">
                  Vue d&apos;ensemble globale des statistiques et indicateurs clés de l&apos;entreprise
                </p>
              </div>
              <ExportMenu 
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                variant="default"
              />
            </div>
          </div>

          <div className="space-y-6">

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Chargement...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPIs Grid - 3 colonnes x 2 lignes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPIChartCard
                  title="Total employés"
                  value={stats.totalUsers}
                  icon={Users}
                  chartColor="var(--color-desktop)"
                />
                <KPIChartCard
                  title="En attente"
                  value={stats.pendingUsers}
                  icon={AlertCircle}
                  chartColor="var(--color-mobile)"
                />
                <KPIChartCard
                  title="Approuvés"
                  value={stats.approvedUsers}
                  icon={UserCheck}
                  chartColor="var(--color-desktop)"
                />
                <KPIChartCard
                  title="Total Équipes"
                  value={stats.totalTeams}
                  icon={Building2}
                  chartColor="var(--color-mobile)"
                />
                <KPIChartCard
                  title="Managers"
                  value={stats.totalManagers}
                  icon={Users}
                  chartColor="var(--color-desktop)"
                />
                <KPIChartCard
                  title="Employés actifs"
                  value={stats.activeEmployees}
                  icon={UserCheck}
                  chartColor="var(--color-mobile)"
                />
              </div>

              {/* Layout en 2 colonnes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Colonne gauche : Actions rapides (33%) */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Actions rapides
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Button
                          onClick={() => navigate('/users')}
                          variant="default"
                          className="w-full justify-start"
                          size="lg"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Gérer les utilisateurs
                        </Button>
                        <Button
                          onClick={() => navigate('/teams')}
                          variant="outline"
                          className="w-full justify-start"
                          size="lg"
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Gérer les équipes
                        </Button>
                        <Button
                          onClick={() => navigate('/profile')}
                          variant="outline"
                          className="w-full justify-start"
                          size="lg"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Mon profil
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Colonne droite : Utilisateurs en attente + Équipes récentes (67%) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Utilisateurs en attente */}
                  {pendingUsers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            Utilisateurs en attente
                          </CardTitle>
                          <Button
                            onClick={() => navigate('/users')}
                            variant="link"
                            size="sm"
                          >
                            Voir tous
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
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
                                <Button
                                  onClick={() => handleApprove(u.id)}
                                  variant="default"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approuver
                                </Button>
                                <Button
                                  onClick={() => handleReject(u.id)}
                                  variant="destructive"
                                  size="sm"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Rejeter
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Équipes récentes */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          Équipes récentes
                        </CardTitle>
                        <Button
                          onClick={() => navigate('/teams')}
                          variant="link"
                          size="sm"
                        >
                          Voir toutes
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {recentTeams.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune équipe créée</p>
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
                                  <p className="text-sm text-muted-foreground">
                                    Manager: {t.manager ? `${t.manager.firstName} ${t.manager.lastName}` : '—'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
