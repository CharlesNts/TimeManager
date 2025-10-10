// src/pages/EmployeeDashboard.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSidebarItems } from '../utils/navigationConfig';
import Layout from '../components/layout/Layout';
import KPICard from '../components/dashboard/KPICard.jsx';
import ClockActions from '../components/employee/ClockActions';
import ClockHistory from '../components/employee/ClockHistory';
import PeriodSelector from '../components/manager/PeriodSelector';

import { 
  Clock, 
  AlertTriangle, 
  Briefcase, 
  TrendingUp
} from 'lucide-react';

/**
 * Page EmployeeDashboard - Dashboard personnel de l'employé
 * 
 * Contient:
 * - 4 KPIs (heures semaine, retards, moyenne, comparaison)
 * - Zone d'actions Clock In/Out
 * - Historique des pointages
 * 
 * Cette page est accessible à tous les utilisateurs authentifiés
 */
export default function EmployeeDashboard() {
  const { user } = useAuth();
  
  // Configuration de la navigation sidebar selon le rôle
  const sidebarItems = getSidebarItems(user?.role);

  // MOCK : Vérifier si l'utilisateur a pointé aujourd'hui
  // Plus tard : cette donnée viendra de l'API (dernier Clock In de la journée)
  const [hasClockedInToday, setHasClockedInToday] = useState(false);
  
  // État pour la période de l'historique
  const [selectedPeriod, setSelectedPeriod] = useState(7); // 7 jours par défaut

  return (
    <Layout 
      sidebarItems={sidebarItems}
      pageTitle="Mon dashboard"
      userName={`${user?.firstName} ${user?.lastName}`}
      userRole={user?.role}
    >
      <div className="p-8 space-y-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Notification si pas encore pointé aujourd'hui */}
          {!hasClockedInToday && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-800">
                    ⏰ Vous n'avez pas encore pointé aujourd'hui
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    N'oubliez pas de pointer votre arrivée pour que vos heures soient comptabilisées.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section Actions de pointage */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Actions de pointage
            </h2>
            <ClockActions />
          </section>
          
          {/* Section Statistiques */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Mes statistiques
              </h2>
              {/* Sélecteur de période */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <PeriodSelector 
                  selectedPeriod={selectedPeriod}
                  onPeriodChange={setSelectedPeriod}
                />
              </div>
            </div>
            
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
                <p className="text-xs text-orange-500 mt-1">⚠️ 2 retards ce mois</p>
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

          {/* Section Historique */}
          <section>
            <ClockHistory period={selectedPeriod} />
          </section>

        </div>
      </div>
    </Layout>
  );
}
