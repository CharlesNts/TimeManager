import React from 'react';
import { FileQuestion, Users, ClipboardList, Search, Inbox } from 'lucide-react';

/**
 * Composant EmptyState - État vide avec illustration et CTA
 * 
 * @param {string} icon - Type d'icône (users, search, inbox, clipboard, custom)
 * @param {React.Component} customIcon - Icône personnalisée Lucide
 * @param {string} title - Titre principal
 * @param {string} description - Description
 * @param {string} actionText - Texte du bouton d'action
 * @param {function} onAction - Callback du bouton d'action
 * @param {React.Node} children - Contenu personnalisé (remplace le bouton par défaut)
 */
const EmptyState = ({ 
  icon = 'inbox',
  customIcon: CustomIcon,
  title = "Aucune donnée",
  description = "Il n'y a rien à afficher pour le moment",
  actionText,
  onAction,
  children
}) => {
  const icons = {
    users: Users,
    search: Search,
    inbox: Inbox,
    clipboard: ClipboardList,
    default: FileQuestion
  };

  const Icon = CustomIcon || icons[icon] || icons.default;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icône */}
      <div className="mb-6 p-4 rounded-full bg-gray-100">
        <Icon className="h-16 w-16 text-gray-400" />
      </div>

      {/* Texte */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 max-w-md mb-6">
        {description}
      </p>

      {/* Action */}
      {children || (actionText && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          {actionText}
        </button>
      ))}
    </div>
  );
};

export default EmptyState;
