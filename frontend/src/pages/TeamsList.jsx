// src/pages/TeamsList.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import TeamCard from '../components/manager/TeamCard';
import TeamFormModal from '../components/manager/TeamFormModal';
import { Plus } from 'lucide-react';

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
  const navigate = useNavigate();
  const { user } = useAuth();

  // État pour le modal de création
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Configuration de la navigation sidebar selon le rôle
  const sidebarItems = getSidebarItems(user?.role);

  // Données de démo - Plus tard viendront de l'API
  // Correspond à la table Teams + calculs
  const teams = [
    {
      id: 1,
      name: "Équipe Développement",
      description: "Développement de logiciels",
      memberCount: 8,
      managerId: 1, // Jean Dupont
      managerName: "Jean Dupont"
    },
    {
      id: 2,
      name: "Équipe Marketing",
      description: "Marketing digital",
      memberCount: 5,
      managerId: 2, // Marie Martin
      managerName: "Marie Martin"
    },
    {
      id: 3,
      name: "Équipe Support",
      description: "Support client",
      memberCount: 12,
      managerId: 3, // Pierre Durand
      managerName: "Pierre Durand"
    },
    {
      id: 4,
      name: "Équipe RH",
      description: "Ressources humaines",
      memberCount: 3,
      managerId: 4, // Sophie Bernard
      managerName: "Sophie Bernard"
    },
    {
      id: 5,
      name: "Équipe Finance",
      description: "Gestion financière",
      memberCount: 6,
      managerId: 5, // Luc Petit
      managerName: "Luc Petit"
    },
    {
      id: 6,
      name: "Équipe Design",
      description: "Design & UX",
      memberCount: 4,
      managerId: 6, // Emma Robert
      managerName: "Emma Robert"
    },
  ];

  // Fonction pour gérer le clic sur une équipe
  const handleTeamClick = (teamId) => {
    navigate(`/teams/${teamId}`);
  };

  // Fonction pour créer une nouvelle équipe
  const handleCreateTeam = () => {
    setIsModalOpen(true);
  };

  // Filtrer les équipes selon le rôle
  // CEO : voit toutes les équipes
  // MANAGER : voit uniquement les équipes dont il est le manager
  const filteredTeams = currentRole === 'CEO' 
    ? teams 
    : teams.filter(team => team.managerId === currentUserId);

  // Fonction de sauvegarde d'une équipe
  const handleSaveTeam = (teamData) => {
    console.log('Créer équipe avec les données:', teamData);
    // Plus tard: appeler l'API POST /api/teams
    // Exemple: await fetch('/api/teams', { method: 'POST', body: JSON.stringify(teamData) })
  };

  return (
    <Layout 
      sidebarItems={sidebarItems}
      pageTitle="Mes équipes"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header avec bouton Créer */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Gestion des équipes</h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredTeams.length} {filteredTeams.length > 1 ? 'équipes' : 'équipe'}
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
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                teamName={team.name}
                description={team.description}
                memberCount={team.memberCount}
                managerName={team.managerName}
                onClick={() => handleTeamClick(team.id)}
              />
            ))}
          </div>

          {/* Message si aucune équipe */}
          {filteredTeams.length === 0 && (
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

      {/* Modal de création d'équipe */}
      <TeamFormModal
        isOpen={isModalOpen}
        mode="create"
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTeam}
      />
    </Layout>
  );
}
