// src/hooks/useClockNotification.js
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook pour afficher une notification si l'utilisateur n'a pas pointé aujourd'hui
 * 
 * @param {boolean} hasClockedInToday - Indique si l'utilisateur a déjà pointé aujourd'hui
 * @param {string} userRole - Rôle de l'utilisateur (pour ne notifier que les employés)
 * @returns {object} - { showNotification, dismissNotification }
 */
export function useClockNotification(hasClockedInToday, userRole = 'employee') {
  const [notificationShown, setNotificationShown] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Ne notifier que les employés/managers qui doivent pointer
    if (userRole === 'ceo') return;
    
    // Vérifier si déjà pointé aujourd'hui
    if (hasClockedInToday) return;
    
    // Vérifier si déjà dismissed aujourd'hui (stocké dans sessionStorage)
    const dismissedToday = sessionStorage.getItem('clock-notification-dismissed');
    const today = new Date().toDateString();
    
    if (dismissedToday === today) {
      setIsDismissed(true);
      return;
    }
    
    // Attendre 1 seconde avant d'afficher (pour laisser la page charger)
    if (!notificationShown && !isDismissed) {
      const timer = setTimeout(() => {
        toast.warning('Rappel de pointage', {
          description: "Vous n'avez pas encore pointé aujourd'hui. N'oubliez pas de pointer votre arrivée !",
          duration: 5000, // Auto-dismiss après 5 secondes
        });
        setNotificationShown(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [hasClockedInToday, userRole, notificationShown, isDismissed]);

  const handleDismiss = () => {
    const today = new Date().toDateString();
    sessionStorage.setItem('clock-notification-dismissed', today);
    setIsDismissed(true);
  };

  const showNotification = () => {
    setNotificationShown(false);
    setIsDismissed(false);
    sessionStorage.removeItem('clock-notification-dismissed');
  };

  return {
    showNotification,
    dismissNotification: handleDismiss,
    isNotificationDismissed: isDismissed
  };
}
