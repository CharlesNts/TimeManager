// src/pages/DemoPage.jsx
import React from 'react';
import Layout from '../components/layout/Layout';
import KPICard from '../components/dashboard/KPIcard.jsx';
import ClockActions from '../components/employee/ClockActions';
import ClockHistory from '../components/employee/ClockHistory';
import TeamCard from '../components/manager/TeamCard';

//  Quelques icônes depuis la librairie lucide-react
import { Clock, AlertTriangle, Briefcase, LayoutDashboard, Users, UserCircle, BarChart3, LogIn, UserPlus } from 'lucide-react';

export default function DemoPage() {
  // Configuration des items de navigation pour la Sidebar
  // Maintenant on utilise des "path" au lieu de "onClick" et "active"
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
      label: "Dashboard", 
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

  return (
    <Layout 
      sidebarItems={sidebarItems}
      pageTitle="Vitrine des Composants"
      userName="Jonathan GROMAT"
      userRole="Développeur"
    >
      {/* Le contenu de la page va ici - c'est ce qui s'affiche dans la zone principale */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Section pour les KPICards */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Cartes de KPI (`KPICard.jsx`)
            </h2>
            
            {/* ON UTILISE LE COMPOSANT PLUSIEURS FOIS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              
              <KPICard 
                title="Heures travaillées cette semaine"
                value="28h 45m"
                icon={Clock}
              />

              <KPICard 
                title="Taux de retards ce mois"
                value="2"
                icon={AlertTriangle}
              >
                <p className="text-xs text-orange-500">⚠️ Sur 20 jours travaillés</p>
              </KPICard>
              
              <KPICard 
                title="Moyenne hebdomadaire"
                value="35h 12m"
                icon={Briefcase}
              >
                {/* On peut ajouter des détails */}
                <p className="text-xs text-green-500">+2.1% vs semaine passée</p>
              </KPICard>

            </div>
          </section>

          {/* Section pour ClockActions */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Actions de pointage (`ClockActions.jsx`)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Composant permettant à l'employé de pointer son arrivée, départ et pauses.
              Affiche le statut actuel et l'historique des actions.
            </p>
            <div className="max-w-md">
              <ClockActions />
            </div>
          </section>

          {/* Section pour ClockHistory */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Historique des pointages (`ClockHistory.jsx`)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Tableau affichant l'historique complet des pointages avec date, heures et statut.
            </p>
            <ClockHistory />
          </section>

          {/* Section pour TeamCard */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Carte d'équipe (`TeamCard.jsx`)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Composant pour afficher les informations d'une équipe (nom, membres, stats).
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <TeamCard 
                teamName="Équipe Développement"
                memberCount={8}
                avgHours="35h 30m"
                trend="+3.2%"
                onClick={() => console.log("Équipe Dev cliquée")}
              />
              <TeamCard 
                teamName="Équipe Marketing"
                memberCount={5}
                avgHours="32h 15m"
                trend="-1.5%"
                onClick={() => console.log("Équipe Marketing cliquée")}
              />
              <TeamCard 
                teamName="Équipe Support"
                memberCount={12}
                avgHours="38h 45m"
                trend="+2.1%"
                onClick={() => console.log("Équipe Support cliquée")}
              />
            </div>
          </section>
          
        </div>
      </div>
    </Layout>
  );
}
