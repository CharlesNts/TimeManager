// src/pages/ManagerDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import {
  Users,
  User,
  Clock,
  TrendingUp,
  Building2,
  UserPlus,
  Plus,
  AlertCircle,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react';
import api from '../api/client';
import { exportManagerDashboardPDF } from '../utils/pdfExport';
import { exportManagerDashboardCSV } from '../utils/csvExport';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import KPICard from '../components/dashboard/KPICard';
import ExportMenu from '../components/ui/ExportMenu';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sidebarItems = getSidebarItems(user?.role);

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalMembers: 0,
    activeMembers: 0,
    totalHoursThisWeek: 0,
  });

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user || user.role !== 'MANAGER') return;
      
      setLoading(true);
      try {
        // Charger les équipes du manager
        const { data: myTeams } = await api.get('/api/teams', {
          params: { managerId: user.id }
        });
        
        const teamsArray = Array.isArray(myTeams) ? myTeams : [];
        
        // Pour chaque équipe, charger les membres
        const teamsWithMembers = await Promise.all(
          teamsArray.map(async (team) => {
            try {
              const { data: members } = await api.get(`/api/teams/${team.id}/members`);
              return {
                ...team,
                members: Array.isArray(members) ? members : [],
                memberCount: Array.isArray(members) ? members.length : 0,
              };
            } catch {
              return { ...team, members: [], memberCount: 0 };
            }
          })
        );

        // Calculer les stats globales
        const totalMembers = teamsWithMembers.reduce((sum, t) => sum + t.memberCount, 0);
        
        // Calculer les membres actifs (ceux qui ont une session ouverte)
        const allMembers = teamsWithMembers.flatMap(t => t.members);
        let activeMembersCount = 0;
        let totalMinutesThisWeek = 0;
        
        // Pour chaque membre, vérifier son dernier clock
        await Promise.all(
          allMembers.map(async (member) => {
            const userId = member.user?.id ?? member.userId;
            if (!userId) return;
            
            try {
              // Récupérer le dernier clock
              const { data: clocks } = await api.get(`/api/users/${userId}/clocks`, {
                params: { page: 0, size: 1, sort: 'clockIn,desc' }
              });
              const lastClock = clocks?.content?.[0];
              
              // Si le dernier clock n'a pas de clockOut, l'utilisateur est actif
              if (lastClock && !lastClock.clockOut) {
                activeMembersCount++;
              }
              
              // Calculer les heures de cette semaine
              const now = new Date();
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - 6); // 7 derniers jours
              startOfWeek.setHours(0, 0, 0, 0);
              
              const { data: weekClocks } = await api.get(`/api/users/${userId}/clocks/range`, {
                params: {
                  from: startOfWeek.toISOString(),
                  to: now.toISOString()
                }
              });
              
              if (Array.isArray(weekClocks)) {
                weekClocks.forEach(clock => {
                  const clockIn = new Date(clock.clockIn);
                  const clockOut = clock.clockOut ? new Date(clock.clockOut) : now;
                  const minutes = Math.round((clockOut - clockIn) / 60000);
                  totalMinutesThisWeek += Math.max(0, minutes);
                });
              }
            } catch (err) {
              console.warn(`[ManagerDashboard] Erreur pour membre ${userId}:`, err);
            }
          })
        );
        
        const totalHours = Math.floor(totalMinutesThisWeek / 60);
        
        setTeams(teamsWithMembers);
        setStats({
          totalTeams: teamsWithMembers.length,
          totalMembers,
          activeMembers: activeMembersCount,
          totalHoursThisWeek: totalHours,
        });

      } catch (err) {
        console.error('[ManagerDashboard] Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  const handleExportPDF = () => {
    exportManagerDashboardPDF(user, stats, teams);
  };

  const handleExportCSV = () => {
    exportManagerDashboardCSV(user, stats, teams);
  };

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle="Dashboard Manager"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8 space-y-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Manager</h1>
                <p className="text-gray-500 mt-1">
                  Gérez vos équipes et suivez les performances
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportMenu 
                  onExportPDF={handleExportPDF}
                  onExportCSV={handleExportCSV}
                  variant="outline"
                />
                <Button
                  onClick={() => navigate('/teams')}
                  variant="default"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Créer une équipe
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Chargement...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPIs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title="Mes Équipes"
                  value={stats.totalTeams}
                  icon={Building2}
                />
                <KPICard
                  title="Total Membres"
                  value={stats.totalMembers}
                  icon={Users}
                />
                <KPICard
                  title="Actifs maintenant"
                  value={stats.activeMembers}
                  icon={TrendingUp}
                />
                <KPICard
                  title="Heures cette semaine"
                  value={`${stats.totalHoursThisWeek}h`}
                  icon={Clock}
                />
              </div>

              {/* Layout en 2 colonnes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Colonne gauche : Actions rapides (33%) */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Actions rapides
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Button
                          onClick={() => navigate('/teams')}
                          variant="default"
                          className="w-full justify-start"
                          size="lg"
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Gérer mes équipes
                        </Button>
                        <Button
                          onClick={() => navigate('/profile')}
                          variant="outline"
                          className="w-full justify-start"
                          size="lg"
                        >
                          <User className="w-4 h-4 mr-2" />
                          Mon profil
                        </Button>
                        <Button
                          onClick={() => navigate('/my-clocks')}
                          variant="outline"
                          className="w-full justify-start"
                          size="lg"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Mes pointages
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Colonne droite : Liste des équipes (67%) */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Vos équipes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>

                {teams.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucune équipe pour le moment
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Commencez par créer votre première équipe
                    </p>
                    <button
                      onClick={() => navigate('/teams')}
                      className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Créer une équipe
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map(team => (
                      <div
                        key={team.id}
                        onClick={() => navigate(`/teams/${team.id}`)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md cursor-pointer transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{team.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{team.description || 'Aucune description'}</p>
                            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                              <span className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                {team.memberCount} {team.memberCount > 1 ? 'membres' : 'membre'}
                              </span>
                            </div>
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
