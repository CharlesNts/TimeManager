// src/pages/TeamsList.jsx
import React from 'react';
import Layout from '../components/layout/Layout';
import TeamCard from '../components/manager/TeamCard';
import { Plus, Users, LayoutDashboard, UserCircle, BarChart3 } from 'lucide-react';

/**
 * Page TeamsList - Liste de toutes les équipes
 * 
 * Accessible aux Managers et CEO
 * Affiche:
 * - Un bouton pour créer une nouvelle équipe
 * - Une grille de cartes d'équipes
 * - Les stats de chaque équipe
 * 
 * Pour l'instant avec des données de démo
 */
export default function TeamsList() {
  // Configuration de la navigation sidebar
  const sidebarItems = [
    { 
      icon: LayoutDashboard, 
      label: "Mon Dashboard", 
      path: "/dashboard"
    },
    { 
      icon: Users, 
      label: "Équipes", 
      path: "/teams"
    },
    { 
      icon: UserCircle, 
      label: "Profil", 
      path: "/profile"
    },
    { 
      icon: BarChart3, 
      label: "Démo", 
      path: "/demo"
    },
  ];

  // Données de démo - Plus tard viendront de l'API
  const teams = [
    {
      id: 1,
      name: "Équipe Développement",
      memberCount: 8,
      avgHours: "35h 30m",
      trend: "+3.2%"
    },
    {
      id: 2,
      name: "Équipe Marketing",
      memberCount: 5,
      avgHours: "32h 15m",
      trend: "+1.5%"
    },
    {
      id: 3,
      name: "Équipe Support",
      memberCount: 12,
      avgHours: "38h 45m",
      trend: "-2.1%"
    },
    {
      id: 4,
      name: "Équipe RH",
      memberCount: 3,
      avgHours: "35h 00m",
      trend: "+0.8%"
    },
    {
      id: 5,
      name: "Équipe Finance",
      memberCount: 6,
      avgHours: "36h 20m",
      trend: "+4.5%"
    },
    {
      id: 6,
      name: "Équipe Design",
      memberCount: 4,
      avgHours: "33h 50m",
      trend: "+2.3%"
    },
  ];

  // Fonction pour gérer le clic sur une équipe
  const handleTeamClick = (teamId) => {
    console.log(`Naviguer vers le dashboard de l'équipe ${teamId}`);
    // Plus tard: navigate(`/teams/${teamId}`)
  };

  // Fonction pour créer une nouvelle équipe
  const handleCreateTeam = () => {
    console.log("Ouvrir le formulaire de création d'équipe");
    // Plus tard: ouvrir un modal ou naviguer vers /teams/new
  };

  return (
    <Layout 
      sidebarItems={sidebarItems}
      pageTitle="Mes équipes"
      userName="Jonathan GROMAT"
      userRole="Manager"
    >
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header avec bouton Créer */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Gestion des équipes
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {teams.length} {teams.length > 1 ? 'équipes' : 'équipe'} au total
              </p>
            </div>

            {/* Bouton Créer une équipe */}
            <button
              onClick={handleCreateTeam}
              className="flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer une équipe
            </button>
          </div>

          {/* Grille des équipes */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                teamName={team.name}
                memberCount={team.memberCount}
                avgHours={team.avgHours}
                trend={team.trend}
                onClick={() => handleTeamClick(team.id)}
              />
            ))}
          </div>

          {/* Message si aucune équipe */}
          {teams.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune équipe pour le moment
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Commencez par créer votre première équipe
              </p>
              <button
                onClick={handleCreateTeam}
                className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium"
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer une équipe
              </button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
