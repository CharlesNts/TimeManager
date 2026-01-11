// src/components/layout/Layout.jsx
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * Composant Layout réutilisable - Structure principale de l'application
 * 
 * Props:
 * - children: Le contenu de la page à afficher
 * - sidebarItems: Items de navigation pour la Sidebar
 * - pageTitle: Titre de la page pour le Header
 * - userName: Nom de l'utilisateur
 * - userRole: Rôle de l'utilisateur (optionnel)
 * - userAvatar: Avatar de l'utilisateur (optionnel)
 * 
 * Exemple d'utilisation:
 * <Layout 
 *   sidebarItems={navigationItems}
 *   pageTitle="Mon dashboard"
 *   userName="Jonathan GROMAT"
 *   userRole="Manager"
 * >
 *   <div>Contenu de ma page ici</div>
 * </Layout>
 */
export default function Layout({
  children,
  sidebarItems = [],
  pageTitle = "Dashboard",
  userName = "Utilisateur",
  userRole = null,
  userAvatar = null
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar à gauche */}
      <Sidebar items={sidebarItems} />

      {/* Zone principale (Header + Contenu) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header en haut */}
        <Header
          title={pageTitle}
          userName={userName}
          userRole={userRole}
          userAvatar={userAvatar}
        />

        {/* Contenu scrollable */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
