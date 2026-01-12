// src/hooks/useKeyboardShortcuts.js
import { useEffect, useCallback } from 'react';

/**
 * Hook pour gérer les raccourcis clavier globaux
 * 
 * @param {Object} shortcuts - Objet de raccourcis { 'ctrl+shift+p': callback }
 * @param {boolean} enabled - Activer/désactiver les raccourcis (défaut: true)
 * 
 * Format des touches:
 * - 'ctrl+shift+p' → Ctrl+Shift+P (ou Cmd sur Mac)
 * - 'escape' → Touche Escape
 * - 'ctrl+k' → Ctrl+K
 * 
 * Exemple:
 * useKeyboardShortcuts({
 *   'ctrl+shift+p': () => handleClockIn(),
 *   'escape': () => closeModal(),
 * });
 */
export default function useKeyboardShortcuts(shortcuts, enabled = true) {
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Ne pas intercepter si on est dans un champ de saisie
    const target = event.target;
    const tagName = target.tagName.toLowerCase();
    const isEditable = target.isContentEditable;
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    
    // Permettre Escape même dans les inputs
    if (isInput || isEditable) {
      if (event.key !== 'Escape') {
        return;
      }
    }

    // Construire la combinaison de touches
    const parts = [];
    
    // Ctrl ou Cmd (Mac)
    if (event.ctrlKey || event.metaKey) {
      parts.push('ctrl');
    }
    if (event.shiftKey) {
      parts.push('shift');
    }
    if (event.altKey) {
      parts.push('alt');
    }
    
    // Ajouter la touche principale
    const key = event.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
      parts.push(key);
    }
    
    const combo = parts.join('+');
    
    // Vérifier si ce raccourci existe
    if (shortcuts[combo]) {
      event.preventDefault();
      event.stopPropagation();
      shortcuts[combo](event);
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Liste des raccourcis disponibles avec descriptions
 * Utilisé pour afficher l'aide
 */
export const SHORTCUTS_LIST = [
  { keys: 'Ctrl+Shift+Espace', mac: '⌘+Shift+Espace', action: 'Pointer (arrivée/départ)', id: 'clock' },
  { keys: 'Ctrl+Shift+B', mac: '⌘+Shift+B', action: 'Pause (début/fin)', id: 'break' },
  { keys: 'Ctrl+Shift+L', mac: '⌘+Shift+L', action: 'Demander un congé', id: 'leave' },
  { keys: 'Ctrl+Shift+H', mac: '⌘+Shift+H', action: 'Historique des congés', id: 'history' },
  { keys: 'Ctrl+Shift+P', mac: '⌘+Shift+P', action: 'Calendrier des pointages', id: 'calendar' },
  { keys: 'Escape', mac: 'Escape', action: 'Fermer les fenêtres', id: 'escape' },
];

/**
 * Détecter si l'utilisateur est sur Mac
 */
export const isMac = () => {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};
