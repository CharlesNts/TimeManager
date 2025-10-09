// src/pages/EmployeeDashboard.jsx
import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import KPICard from '../components/dashboard/KPIcard.jsx';
import ClockActions from '../components/employee/ClockActions';
import ClockHistory from '../components/employee/ClockHistory';

import { 
  Clock, 
  AlertTriangle, 
  Briefcase, 
  TrendingUp,
  LayoutDashboard, 
  Users, 
  UserCircle, 
  BarChart3 
} from 'lucide-react';

/**
 * Page EmployeeDashboard - Dashboard personnel de l'employé
 * 
 * Contient:
 * - 4 KPIs (heures semaine, retards, moyenne, comparaison)
 * - Zone d'actions Clock In/Out
 * - Historique des pointages
 * 
 * Cette page est accessible à tous les utilisateurs (employé, manager, CEO)
 */
export default function EmployeeDashboard() {
  // États pour le mode développement (simulation de rôles)
  const [currentRole, setCurrentRole] = useState('EMPLOYEE');
  const [currentUserId, setCurrentUserId] = useState(1);

  // Configuration de la navigation sidebar - Adapté selon le rôle
  const sidebarItems = [
    { 
      icon: LayoutDashboard, 
      label: "Mon Dashboard", 
      path: "/dashboard"
    },
    // Équipes visible uniquement pour MANAGER et CEO
    ...(currentRole === 'MANAGER' || currentRole === 'CEO' ? [{
      icon: Users, 
      label: "Équipes", 
      path: "/teams"
    }] : []),
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

  return (
    <Layout 
      sidebarItems={sidebarItems}
      pageTitle="Mon dashboard"
      userName="Jonathan GROMAT"
      userRole="Employé"
      currentRole={currentRole}
      onRoleChange={setCurrentRole}
      currentUserId={currentUserId}
      onUserIdChange={setCurrentUserId}
    >
      <div className="p-8 space-y-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Section KPIs */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Mes statistiques
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              
              <KPICard 
                title="Heures cette semaine"
                value="28h 45m"
                icon={Clock}
              >
                <p className="text-xs text-gray-500 mt-1">Du lun au ven</p>
              </KPICard>

              <KPICard 
                title="Taux de retards ce mois"
                value="2"
                icon={AlertTriangle}
              >
                <p className="text-xs text-orange-500 mt-1">⚠️ 2 retards</p>
              </KPICard>
              
              <KPICard 
                title="Moyenne hebdomadaire"
                value="35h 12m"
                icon={Briefcase}
              >
                <p className="text-xs text-gray-500 mt-1">Sur le mois</p>
              </KPICard>

              <KPICard 
                title="Comparaison"
                value="+2.1%"
                icon={TrendingUp}
              >
                <p className="text-xs text-green-500 mt-1">vs semaine passée</p>
              </KPICard>

            </div>
          </section>

          {/* Section Actions et Historique */}
          <section className="grid lg:grid-cols-3 gap-6">
            
            {/* Zone Clock In/Out - Prend 1 colonne */}
            <div className="lg:col-span-1">
              <ClockActions />
            </div>

            {/* Historique - Prend 2 colonnes */}
            <div className="lg:col-span-2">
              <ClockHistory />
            </div>

          </section>

        </div>
      </div>
    </Layout>
  );
}
