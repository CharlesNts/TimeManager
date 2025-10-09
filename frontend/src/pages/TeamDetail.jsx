// src/pages/TeamDetail.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { 
  ArrowLeft, 
  Users, 
  UserCircle, 
  Clock, 
  Calendar,
  TrendingUp,
  LayoutDashboard, 
  BarChart3 
} from 'lucide-react';

/**
 * Page TeamDetail - Détails d'une équipe
 * 
 * Affiche:
 * - Informations de l'équipe (nom, description, manager)
 * - Statistiques globales de l'équipe
 * - Liste des membres avec leurs statistiques individuelles
 * 
 * Basé sur les tables:
 * - Teams (id, name, description, managerId)
 * - TeamMember (userId, teamId, joinedAt)
 * - Users (pour les infos des membres)
 * - Clocks (pour calculer les heures travaillées)
 */
export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();

  // Données de démo - Plus tard viendront de l'API GET /api/teams/:id
  const teamData = {
    id: teamId,
    name: "Équipe Développement",
    description: "Développement de logiciels et applications",
    managerName: "Jean Dupont",
    managerId: 1,
    createdAt: "2024-01-15",
    memberCount: 8
  };

  // Statistiques d'équipe - Calculées depuis les Clocks
  const teamStats = {
    totalHoursThisWeek: "284h 30m",
    averageHoursPerMember: "35h 34m",
    activeMembers: 8,
    onBreak: 1
  };

  // Liste des membres - Depuis TeamMember + Users + calculs depuis Clocks
  const members = [
    {
      id: 1,
      firstName: "Jean",
      lastName: "Dupont",
      role: "MANAGER",
      joinedAt: "2024-01-15",
      hoursThisWeek: "38h 30m",
      status: "active", // Basé sur le dernier Clock
      lastClockIn: "09:00"
    },
    {
      id: 2,
      firstName: "Marie",
      lastName: "Martin",
      role: "EMPLOYEE",
      joinedAt: "2024-02-01",
      hoursThisWeek: "35h 45m",
      status: "active",
      lastClockIn: "08:45"
    },
    {
      id: 3,
      firstName: "Pierre",
      lastName: "Durand",
      role: "EMPLOYEE",
      joinedAt: "2024-02-15",
      hoursThisWeek: "36h 15m",
      status: "break",
      lastClockIn: "09:10"
    },
    {
      id: 4,
      firstName: "Sophie",
      lastName: "Bernard",
      role: "EMPLOYEE",
      joinedAt: "2024-03-01",
      hoursThisWeek: "34h 20m",
      status: "active",
      lastClockIn: "09:05"
    },
    {
      id: 5,
      firstName: "Luc",
      lastName: "Petit",
      role: "EMPLOYEE",
      joinedAt: "2024-03-10",
      hoursThisWeek: "37h 10m",
      status: "active",
      lastClockIn: "08:50"
    },
    {
      id: 6,
      firstName: "Emma",
      lastName: "Robert",
      role: "EMPLOYEE",
      joinedAt: "2024-04-01",
      hoursThisWeek: "35h 00m",
      status: "offline",
      lastClockIn: "-"
    },
    {
      id: 7,
      firstName: "Thomas",
      lastName: "Moreau",
      role: "EMPLOYEE",
      joinedAt: "2024-04-15",
      hoursThisWeek: "33h 50m",
      status: "active",
      lastClockIn: "09:15"
    },
    {
      id: 8,
      firstName: "Julie",
      lastName: "Simon",
      role: "EMPLOYEE",
      joinedAt: "2024-05-01",
      hoursThisWeek: "33h 20m",
      status: "active",
      lastClockIn: "09:00"
    }
  ];

  // Navigation sidebar pour managers
  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Équipes', path: '/teams', active: true },
    { icon: BarChart3, label: 'Statistiques', path: '/stats' },
    { icon: UserCircle, label: 'Profil', path: '/profile' },
  ];

  const handleBack = () => {
    navigate('/teams');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
            Actif
          </span>
        );
      case 'break':
        return (
          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
            Pause
          </span>
        );
      case 'offline':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            Hors ligne
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Layout 
      sidebarItems={sidebarItems}
      pageTitle={teamData.name}
      userName="Jonathan GROMAT"
      userRole="Manager"
    >
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Bouton retour */}
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour aux équipes
          </button>

          {/* Carte Informations de l'équipe */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{teamData.name}</h2>
                  <p className="text-gray-600 mt-1">{teamData.description}</p>
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                    <span className="flex items-center">
                      <UserCircle className="w-4 h-4 mr-1" />
                      Manager: <span className="font-medium ml-1">{teamData.managerName}</span>
                    </span>
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {teamData.memberCount} membres
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Créée le {new Date(teamData.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs de l'équipe */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total heures cette semaine */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total heures</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{teamStats.totalHoursThisWeek}</p>
                  <p className="text-xs text-gray-500 mt-1">Cette semaine</p>
                </div>
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Moyenne par membre */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Moyenne</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{teamStats.averageHoursPerMember}</p>
                  <p className="text-xs text-gray-500 mt-1">Par membre</p>
                </div>
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Membres actifs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Actifs</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{teamStats.activeMembers}</p>
                  <p className="text-xs text-gray-500 mt-1">En ce moment</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* En pause */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En pause</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{teamStats.onBreak}</p>
                  <p className="text-xs text-gray-500 mt-1">Actuellement</p>
                </div>
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Tableau des membres */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Membres de l'équipe
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nom</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rôle</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Arrivé le</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Heures semaine</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Dernier pointage</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {member.role === 'MANAGER' ? 'Manager' : 'Employé'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(member.joinedAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 font-medium">
                        {member.hoursThisWeek}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {member.lastClockIn}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(member.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
