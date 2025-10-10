// src/pages/TeamDetail.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import TeamFormModal from '../components/manager/TeamFormModal';
import AddMemberModal from '../components/manager/AddMemberModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import PeriodSelector from '../components/manager/PeriodSelector';
import { 
  ArrowLeft, 
  Users, 
  UserCircle, 
  Clock, 
  Calendar,
  TrendingUp,
  Edit,
  Trash2,
  Download
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
  const { user } = useAuth();

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

  // État pour le modal d'édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, member: null });
  
  // État pour la période sélectionnée
  const [selectedPeriod, setSelectedPeriod] = useState(7); // 7 jours par défaut

  // Liste des utilisateurs disponibles pour ajouter (simulation)
  const availableUsers = [
    { id: 9, firstName: "Marc", lastName: "Dubois", email: "marc.dubois@primebank.com", role: "EMPLOYEE" },
    { id: 10, firstName: "Claire", lastName: "Leroy", email: "claire.leroy@primebank.com", role: "EMPLOYEE" },
    { id: 11, firstName: "Nicolas", lastName: "Fontaine", email: "nicolas.fontaine@primebank.com", role: "EMPLOYEE" },
  ];

  // Navigation sidebar selon le rôle
  const sidebarItems = getSidebarItems(user?.role);

  const handleBack = () => {
    navigate('/teams');
  };

  const handleEditTeam = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveTeam = (teamData) => {
    console.log('Modifier équipe avec les données:', teamData);
    // Plus tard: appeler l'API PUT /api/teams/:id
    // Exemple: await fetch(`/api/teams/${teamId}`, { method: 'PUT', body: JSON.stringify(teamData) })
  };

  const handleAddMember = (userId) => {
    console.log('Ajouter membre:', userId);
    // Plus tard: API POST /api/teams/:teamId/members avec { userId }
  };

  const handleRemoveMember = (member) => {
    setConfirmDelete({ isOpen: true, member });
  };

  const confirmRemoveMember = () => {
    console.log('Retirer membre:', confirmDelete.member.id);
    // Plus tard: API DELETE /api/teams/:teamId/members/:userId
    setConfirmDelete({ isOpen: false, member: null });
  };

  /**
   * Exporter les données de l'équipe en CSV
   * MOCK : Génère un CSV avec les données actuelles
   * Plus tard : appellera l'API GET /api/teams/:teamId/export?period={period}&format=csv
   */
  const handleExportCSV = () => {
    console.log(`📥 Export CSV pour la période: ${selectedPeriod} jours`);
    
    // En-têtes du CSV
    const headers = ['Nom', 'Prénom', 'Rôle', 'Date d\'arrivée', 'Heures (période)', 'Statut', 'Dernier pointage'];
    
    // Données des membres
    const rows = members.map(member => [
      member.lastName,
      member.firstName,
      member.role === 'MANAGER' ? 'Manager' : 'Employé',
      new Date(member.joinedAt).toLocaleDateString('fr-FR'),
      member.hoursThisWeek,
      member.status === 'active' ? 'Actif' : member.status === 'break' ? 'Pause' : 'Hors ligne',
      member.lastClockIn
    ]);
    
    // Créer le contenu CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Créer un blob et télécharger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `equipe_${teamData.name}_${selectedPeriod}j_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Plus tard, cette fonction appellera :
    // const response = await fetch(`/api/teams/${teamId}/export?period=${selectedPeriod}&format=csv`);
    // const blob = await response.blob();
    // ... téléchargement du blob
  };

  /**
   * Exporter les données de l'équipe en PDF
   * MOCK : Simule un export PDF
   * Plus tard : appellera l'API GET /api/teams/:teamId/export?period={period}&format=pdf
   */
  const handleExportPDF = () => {
    console.log(`📥 Export PDF pour la période: ${selectedPeriod} jours`);
    
    // MOCK : Pour l'instant, on simule juste
    // En production, le backend générera le PDF
    alert(`🚧 Export PDF en cours de développement\n\nLe backend générera un PDF avec:\n- Informations de l'équipe\n- KPIs de la période (${selectedPeriod} jours)\n- Liste des membres et leurs statistiques\n- Graphiques (optionnel)`);
    
    // Plus tard, cette fonction appellera :
    // const response = await fetch(`/api/teams/${teamId}/export?period=${selectedPeriod}&format=pdf`);
    // const blob = await response.blob();
    // const url = URL.createObjectURL(blob);
    // const link = document.createElement('a');
    // link.href = url;
    // link.download = `equipe_${teamData.name}_${selectedPeriod}j_${new Date().toISOString().split('T')[0]}.pdf`;
    // link.click();
  };

  /**
   * Menu déroulant pour choisir le format d'export
   */
  const [showExportMenu, setShowExportMenu] = useState(false);

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
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
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

              {/* Boutons d'action */}
              <div className="flex items-center space-x-3">
                {/* Menu Export avec dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    title="Exporter les données de l'équipe"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exporter
                  </button>
                  
                  {/* Dropdown menu */}
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={() => {
                          handleExportCSV();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700 rounded-t-lg"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exporter en CSV
                      </button>
                      <button
                        onClick={() => {
                          handleExportPDF();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700 rounded-b-lg"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exporter en PDF
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleEditTeam}
                  className="flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </button>
              </div>
            </div>
          </div>

          {/* KPIs de l'équipe */}
          <div className="space-y-6">
            
            {/* Sélecteur de période */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <PeriodSelector 
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
            </div>

            {/* Cartes KPI */}
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
          </div>

          {/* Tableau des membres */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Membres de l'équipe
              </h3>
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Ajouter un membre
              </button>
            </div>

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
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          member.role === 'MANAGER' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {member.role === 'MANAGER' ? 'Manager' : 'Employé'}
                        </span>
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
                      <td className="py-3 px-4 text-right">
                        {member.role !== 'MANAGER' && (
                          <button
                            onClick={() => handleRemoveMember(member)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Retirer du groupe"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Modal de modification d'équipe */}
      <TeamFormModal
        isOpen={isEditModalOpen}
        mode="edit"
        team={teamData}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveTeam}
      />

      {/* Modal d'ajout de membre */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onAddMember={handleAddMember}
        currentMembers={members}
        availableUsers={availableUsers}
      />

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, member: null })}
        onConfirm={confirmRemoveMember}
        title="Retirer ce membre ?"
        message={`Êtes-vous sûr de vouloir retirer ${confirmDelete.member?.firstName} ${confirmDelete.member?.lastName} de cette équipe ?`}
        confirmText="Retirer"
        cancelText="Annuler"
        variant="danger"
      />
    </Layout>
  );
}
