// src/pages/TeamsList.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TeamCard from '../components/manager/TeamCard';
import TeamFormModal from '../components/manager/TeamFormModal';
import { Plus, Users, LayoutDashboard, UserCircle, BarChart3, LogIn, UserPlus } from 'lucide-react';

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

  // États pour le mode développement (simulation de rôles)
  const [currentRole, setCurrentRole] = useState('CEO'); // 'EMPLOYEE' | 'MANAGER' | 'CEO'
  const [currentUserId, setCurrentUserId] = useState(1);

  // État pour le modal de création
  const [isModalOpen, setIsModalOpen] = useState(false);
  const sidebarItems = [
    { 
      icon: LogIn, 
      label: "Connexion", 
      path: "/login"
    },
    { 
      icon: UserPlus, 
      label: "Inscription", 
      path: "/register"
    },
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
      userName="Jonathan GROMAT"
      userRole="Manager"
      currentRole={currentRole}
      onRoleChange={setCurrentRole}
      currentUserId={currentUserId}
      onUserIdChange={setCurrentUserId}
    >
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Message si EMPLOYEE tente d'accéder */}
          {currentRole === 'EMPLOYEE' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800 font-medium">
                ⚠️ Cette page est réservée aux Managers et CEO
              </p>
              <p className="text-sm text-red-600 mt-2">
                En tant qu'employé, vous n'avez pas accès à la gestion des équipes
              </p>
            </div>
          )}

          {/* Contenu normal pour MANAGER et CEO */}
          {(currentRole === 'MANAGER' || currentRole === 'CEO') && (
            <>
              {/* Header avec bouton Créer */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {currentRole === 'CEO' ? 'Gestion des équipes' : 'Mes équipes'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredTeams.length} {filteredTeams.length > 1 ? 'équipes' : 'équipe'}
              </p>
            </div>

            {/* Bouton Créer une équipe - Visible pour MANAGER et CEO */}
            {(currentRole === 'MANAGER' || currentRole === 'CEO') && (
              <button
                onClick={handleCreateTeam}
                className="flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium"
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer une équipe
              </button>
            )}
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
            </>
          )}

        </div>
      </div>

      {/* Modal de création d'équipe */}
      <TeamFormModal
        isOpen={isModalOpen}
        mode="create"
        userRole={currentRole}
        currentUserId={currentUserId}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTeam}
      />
    </Layout>
  );
}
