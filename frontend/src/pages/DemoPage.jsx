// src/pages/DemoPage.jsx
import React from 'react';
import Layout from '../components/layout/Layout';
import KPICard from '../components/dashboard/KPIcard.jsx';

//  Quelques icônes depuis la librairie lucide-react
import { Clock, AlertTriangle, Briefcase, LayoutDashboard, Users, UserCircle, BarChart3 } from 'lucide-react';

export default function DemoPage() {
  // Configuration des items de navigation pour la Sidebar
  // Maintenant on utilise des "path" au lieu de "onClick" et "active"
  const sidebarItems = [
    { 
      icon: LayoutDashboard, 
      label: "Dashboard", 
      path: "/dashboard" // URL vers le dashboard (à créer)
    },
    { 
      icon: Users, 
      label: "Équipes", 
      path: "/teams" // URL vers les équipes (à créer)
    },
    { 
      icon: UserCircle, 
      label: "Profil", 
      path: "/profile" // URL vers le profil (à créer)
    },
    { 
      icon: BarChart3, 
      label: "Démo", 
      path: "/demo" // Cette page !
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
        <div className="max-w-7xl mx-auto">
          
          {/* Section pour les KPICards */}
          <section className="mb-12">
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
              />
              
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
          
        </div>
      </div>
    </Layout>
  );
}
