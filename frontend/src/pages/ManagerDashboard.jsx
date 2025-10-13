// src/pages/ManagerDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import {
  Users,
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
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Vue d'ensemble de vos équipes</h2>
              <p className="text-sm text-gray-600 mt-1">
                Gérez vos équipes et suivez les performances
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPDF}
                className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600"
              >
                <FileDown className="w-5 h-5 mr-2" />
                PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                CSV
              </button>
              <button
                onClick={() => navigate('/teams')}
                className="flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer une équipe
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-600">Chargement...</div>
          ) : (
            <>
              {/* KPIs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Total Équipes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Mes Équipes</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalTeams}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Total Membres */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Membres</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalMembers}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Membres Actifs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Actifs maintenant</p>
                      <p className="text-3xl font-bold text-green-600 mt-1">{stats.activeMembers}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Heures cette semaine */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Heures cette semaine</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalHoursThisWeek}h</p>
                    </div>
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Liste des équipes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Vos équipes
                </h3>

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
              </div>

              {/* Actions rapides - Compactes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Actions rapides</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('/teams')}
                    className="flex items-center px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Gérer mes équipes
                  </button>
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Mon profil
                  </button>
                  <button
                    onClick={() => navigate('/my-clocks')}
                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Mes pointages
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
