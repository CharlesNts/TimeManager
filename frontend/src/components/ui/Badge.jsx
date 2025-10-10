import React from 'react';

/**
 * Composant Badge - Badge coloré réutilisable
 * 
 * @param {string} variant - Variante de couleur (success, error, warning, info, gray, purple, blue)
 * @param {string} size - Taille (sm, md, lg)
 * @param {string} children - Contenu du badge
 * @param {React.Component} icon - Icône Lucide optionnelle
 * @param {boolean} dot - Afficher un point coloré
 */
const Badge = ({ 
  variant = 'gray', 
  size = 'md', 
  children, 
  icon: Icon,
  dot = false,
  className = ''
}) => {
  const variants = {
    success: 'bg-green-100 text-green-700 border-green-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-orange-100 text-orange-700 border-orange-200',
    info: 'bg-gray-100 text-gray-700 border-gray-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    blue: 'bg-gray-200 text-gray-700 border-gray-300',
  };

  const dotColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-orange-500',
    info: 'bg-blue-500',
    gray: 'bg-gray-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${variants[variant]} 
        ${sizes[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`h-2 w-2 rounded-full ${dotColors[variant]}`} />
      )}
      {Icon && <Icon className={iconSizes[size]} />}
      {children}
    </span>
  );
};

/**
 * Badge de statut avec couleurs prédéfinies
 */
export const StatusBadge = ({ status }) => {
  const statusConfig = {
    PENDING: { variant: 'warning', text: 'En attente', dot: true },
    APPROVED: { variant: 'success', text: 'Approuvé', dot: true },
    REJECTED: { variant: 'error', text: 'Rejeté', dot: true },
    ACTIVE: { variant: 'success', text: 'Actif', dot: true },
    INACTIVE: { variant: 'gray', text: 'Inactif', dot: true },
  };

  const config = statusConfig[status] || { variant: 'gray', text: status, dot: false };

  return (
    <Badge variant={config.variant} dot={config.dot}>
      {config.text}
    </Badge>
  );
};

/**
 * Badge de rôle avec couleurs prédéfinies
 */
export const RoleBadge = ({ role }) => {
  const roleConfig = {
    CEO: { variant: 'purple', text: 'CEO' },
    MANAGER: { variant: 'gray', text: 'Manager' },
    EMPLOYEE: { variant: 'gray', text: 'Employé' },
  };

  const config = roleConfig[role] || { variant: 'gray', text: role };

  return (
    <Badge variant={config.variant}>
      {config.text}
    </Badge>
  );
};

export default Badge;
