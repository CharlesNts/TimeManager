// src/pages/CEODashboard.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import {
  Users,
  UserCheck,
  Building2,
  AlertCircle,
} from 'lucide-react';
import api from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import KPICard from '../components/dashboard/KPICard';
import ExportMenu from '../components/ui/ExportMenu';
import { exportCEODashboardPDF } from '../utils/pdfExport';
import { exportCEODashboardCSV } from '../utils/csvExport';

export default function CEODashboard() {
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

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user || user.role !== 'CEO') return;

      setLoading(true);
      try {
        // Charger tous les utilisateurs et utilisateurs en attente
        const [usersRes, pendingRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/users/users/pending')
        ]);

        const users = Array.isArray(usersRes.data) ? usersRes.data : [];
        const pendingList = Array.isArray(pendingRes.data) ? pendingRes.data : [];

        // Calculer les stats utilisateurs
        const managers = users.filter(u => u.role === 'MANAGER');
        const employees = users.filter(u => u.role === 'EMPLOYEE');
        const approvedCount = users.length;

        // Charger toutes les équipes
        const managerAndCEOIds = users
          .filter(u => u.role === 'MANAGER' || u.role === 'CEO')
          .map(u => u.id);

        const teamPromises = managerAndCEOIds.map(id =>
          api.get('/api/teams', { params: { managerId: id } })
            .then(res => Array.isArray(res.data) ? res.data : [])
            .catch(() => [])
        );
        const teamArrays = await Promise.all(teamPromises);
        const teamsFlat = teamArrays.flat();

        // Déduplication par id
        const uniqueTeams = Array.from(
          new Map(teamsFlat.map(t => [t.id, t])).values()
        );

        setStats({
          totalUsers: approvedCount + pendingList.length,
          pendingUsers: pendingList.length,
          approvedUsers: approvedCount,
          totalTeams: uniqueTeams.length,
          totalManagers: managers.length,
          activeEmployees: employees.length,
        });

      } catch (err) {
        console.error('[CEODashboard] Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  const handleExportPDF = () => {
    exportCEODashboardPDF(user, stats);
  };

  const handleExportCSV = () => {
    exportCEODashboardCSV(user, stats);
  };

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle="Dashboard Admin"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role === 'CEO' ? 'ADMIN' : user?.role}
    >
      <div className="p-8 space-y-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Admin</h1>
                <p className="text-gray-500 mt-1">
                  Vue d&apos;ensemble globale de l&apos;entreprise
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
                {/* KPIs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <KPICard
                    title="Total employés"
                    value={stats.totalUsers}
                    icon={Users}
                    chartColor="var(--color-desktop)"
                  />
                  <KPICard
                    title="En attente"
                    value={stats.pendingUsers}
                    icon={AlertCircle}
                    chartColor="var(--color-mobile)"
                  />
                  <KPICard
                    title="Approuvés"
                    value={stats.approvedUsers}
                    icon={UserCheck}
                    chartColor="var(--color-desktop)"
                  />
                  <KPICard
                    title="Total Équipes"
                    value={stats.totalTeams}
                    icon={Building2}
                    chartColor="var(--color-mobile)"
                  />
                  <KPICard
                    title="Managers"
                    value={stats.totalManagers}
                    icon={Users}
                    chartColor="var(--color-desktop)"
                  />
                  <KPICard
                    title="Employés actifs"
                    value={stats.activeEmployees}
                    icon={UserCheck}
                    chartColor="var(--color-mobile)"
                  />
                </div>

                {/* Info Box */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Statistiques détaillées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Pour consulter les statistiques détaillées par équipe, rendez-vous sur la page <strong>Gestion des équipes</strong>.
                      Pour les statistiques par utilisateur, consultez la page <strong>Gestion des utilisateurs</strong>.
                    </p>
                  </CardContent>
                </Card>

              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
