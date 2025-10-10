import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Composant Spinner - Indicateur de chargement circulaire
 * 
 * @param {string} size - Taille (sm, md, lg, xl) (défaut: "md")
 * @param {string} color - Couleur (blue, gray, white) (défaut: "blue")
 * @param {string} text - Texte optionnel à afficher
 */
export const Spinner = ({ size = 'md', color = 'blue', text }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colorClasses = {
    blue: 'text-gray-900',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`} />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
};

/**
 * Composant LoadingOverlay - Overlay de chargement plein écran
 */
export const LoadingOverlay = ({ text = "Chargement..." }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm">
      <Spinner size="lg" text={text} />
    </div>
  );
};

/**
 * Composant Skeleton - Placeholder animé pour le chargement de contenu
 * 
 * @param {string} variant - Type de skeleton (text, title, avatar, card, table-row)
 * @param {number} lines - Nombre de lignes pour le variant text
 */
export const Skeleton = ({ variant = 'text', lines = 3 }) => {
  const baseClass = "animate-pulse bg-gray-200 rounded";

  switch (variant) {
    case 'text':
      return (
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`${baseClass} h-4`}
              style={{ width: i === lines - 1 ? '60%' : '100%' }}
            />
          ))}
        </div>
      );

    case 'title':
      return <div className={`${baseClass} h-8 w-64 mb-4`} />;

    case 'avatar':
      return <div className={`${baseClass} h-12 w-12 rounded-full`} />;

    case 'card':
      return (
        <div className={`${baseClass} h-48 w-full`} />
      );

    case 'table-row':
      return (
        <div className="flex gap-4 py-3">
          <div className={`${baseClass} h-10 w-10 rounded`} />
          <div className="flex-1 space-y-2">
            <div className={`${baseClass} h-4 w-3/4`} />
            <div className={`${baseClass} h-3 w-1/2`} />
          </div>
          <div className={`${baseClass} h-8 w-24`} />
        </div>
      );

    default:
      return <div className={`${baseClass} h-4 w-full`} />;
  }
};

/**
 * Composant TableSkeleton - Skeleton pour tableau complet
 */
export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="table-row" />
      ))}
    </div>
  );
};

/**
 * Composant CardSkeleton - Skeleton pour carte
 */
export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <Skeleton variant="title" />
      <Skeleton variant="text" lines={4} />
      <div className="flex gap-2">
        <div className="animate-pulse bg-gray-200 rounded h-9 w-24" />
        <div className="animate-pulse bg-gray-200 rounded h-9 w-24" />
      </div>
    </div>
  );
};

/**
 * Composant LoadingButton - Bouton avec état de chargement
 */
export const LoadingButton = ({ 
  loading, 
  children, 
  disabled, 
  className = "",
  ...props 
}) => {
  return (
    <button
      disabled={loading || disabled}
      className={`relative ${className} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
      {...props}
    >
      {loading && (
        <Loader2 className="absolute left-3 h-4 w-4 animate-spin" />
      )}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </button>
  );
};

export default {
  Spinner,
  LoadingOverlay,
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  LoadingButton
};
