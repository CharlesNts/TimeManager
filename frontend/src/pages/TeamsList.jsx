// src/pages/TeamsList.jsx
import React, { useEffect, useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import TeamCard from '../components/manager/TeamCard';
import TeamFormModal from '../components/manager/TeamFormModal';
import ExportMenu from '../components/ui/ExportMenu';
import api from '../api/client';
import {
  fetchTeamsForCurrentUser,
  createTeam,
  updateTeam,
  deleteTeam,
} from '../api/teamApi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export default function TeamsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sidebarItems = getSidebarItems(user?.role);

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedTeam, setSelectedTeam] = useState(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setErr('');
    try {
      // CEO doit voir TOUTES les équipes.
      if (user?.role === 'CEO') {
        // 1) Récupérer tous les utilisateurs
        const { data: allUsers } = await api.get('/api/users');

        // 2) Garder MANAGERs ET CEOs (car CEOs peuvent être managers d'équipes)
        const managerIds = (allUsers || [])
          .filter((u) => u.role === 'MANAGER' || u.role === 'CEO')
          .map((u) => u.id);

        // 3) Pour chaque manager/CEO, récupérer ses équipes via /api/teams?managerId=:id
        const perManager = await Promise.all(
          managerIds.map((id) =>
            api
              .get('/api/teams', { params: { managerId: id } })
              .then((res) => Array.isArray(res.data) ? res.data : [])
              .catch(() => [])
          )
        );

        // 4) Fusion + déduplication par id
        const merged = perManager.flat();
        const byId = new Map();
        for (const t of merged) {
          if (t && t.id != null) byId.set(t.id, t);
        }
        const allTeams = Array.from(byId.values());

        // 5) Normalisation minimale pour l'affichage (managerName / memberCount optionnels)
        const normalized = allTeams.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          managerName: t.manager ? `${t.manager.firstName} ${t.manager.lastName}` : '—',
          memberCount: t.memberCount ?? t.membersCount ?? 0,
        }));

        setTeams(normalized);
      } else {
        // MANAGER : ses équipes ; EMPLOYEE : les équipes dont il est membre (handled par fetchTeamsForCurrentUser)
        const data = await fetchTeamsForCurrentUser(user);
        setTeams(data);
      }
    } catch (e) {
      setErr(e.message || 'Erreur lors du chargement des équipes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const handleTeamClick = (teamId) => {
    navigate(`/teams/${teamId}`);
  };

  const handleCreateTeam = () => {
    setModalMode('create');
    setSelectedTeam(null);
    setIsModalOpen(true);
  };

  const handleEditTeam = (team) => {
    setModalMode('edit');
    setSelectedTeam(team);
    setIsModalOpen(true);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) return;
    try {
      await deleteTeam(teamId);
      await load();
    } catch (e) {
      alert(e.message || 'Suppression impossible');
    }
  };

  const handleSaveTeam = async (teamData) => {
    // teamData attendu depuis TeamFormModal: { name, description, managerId }
    try {
      // Préparer le payload pour le backend
      // Le backend attend un TeamDTO avec { name, description, manager: UserDTO }
      // On envoie { name, description, managerId } et le backend mappera
      const payload = {
        name: teamData.name,
        description: teamData.description,
        managerId: teamData.managerId || user?.id, // Fallback sur user.id si managerId absent
      };

      if (modalMode === 'create') {
        await createTeam(payload);
      } else if (selectedTeam) {
        await updateTeam(selectedTeam.id, payload);
      }
      setIsModalOpen(false);
      await load();
    } catch (e) {
      alert(e.message || 'Enregistrement impossible');
    }
  };

  const visibleTeams = teams; // déjà filtrées par rôle côté front via fetchTeamsForCurrentUser

  return (
    <Layout
      sidebarItems={sidebarItems}
      pageTitle="Mes équipes"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestion des équipes</h1>
              {!loading && (
                <p className="text-gray-500 mt-1">
                  {visibleTeams.length} {visibleTeams.length > 1 ? 'équipes' : 'équipe'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Export Menu */}
              <ExportMenu
                onExportPDF={() => console.log('Export PDF')}
                onExportCSV={() => console.log('Export CSV')}
                variant="outline"
              />

              {/* Bouton Créer (CEO et MANAGER peuvent créer, ajuste selon ta règle) */}
              {user?.role === 'CEO' && (
                <Button
                  onClick={handleCreateTeam}
                  variant="default"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une équipe
                </Button>
              )}
            </div>
          </div>

          {/* States */}
          {loading && <div className="text-gray-600">Chargement…</div>}
          {err && <div className="text-red-600 mb-4">{err}</div>}

          {/* Grille */}
          {!loading && visibleTeams.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  teamName={team.name}
                  description={team.description}
                  memberCount={team.memberCount ?? 0}
                  managerName={team.managerName}
                  onClick={() => handleTeamClick(team.id)}
                  onEdit={() => handleEditTeam(team)}
                  onDelete={() => handleDeleteTeam(team.id)}
                  // Par défaut: seul le CEO peut éditer/supprimer
                  showActions={user?.role === 'CEO'}
                />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && !visibleTeams.length && !err && (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="mb-2">
                  Aucune équipe pour le moment
                </CardTitle>
                <CardDescription className="mb-4">
                  {user?.role === 'CEO'
                    ? 'Commencez par créer votre première équipe'
                    : "Vous n'êtes membre d'aucune équipe"}
                </CardDescription>
                {user?.role === 'CEO' && (
                  <Button
                    onClick={handleCreateTeam}
                    variant="default"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer une équipe
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal création/édition */}
      <TeamFormModal
        isOpen={isModalOpen}
        mode={modalMode}
        teamData={selectedTeam}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTeam}
        userRole={user?.role}
        currentUserId={user?.id}
      />
    </Layout>
  );
}