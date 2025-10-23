// src/hooks/useNotifications.js
import { useState, useEffect } from 'react';

/**
 * Hook pour gérer les notifications dans le header
 * 
 * @param {boolean} hasClockedInToday - Indique si l'utilisateur a pointé aujourd'hui
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {object} - { notifications, markAsRead, addNotification }
 */
export function useNotifications(hasClockedInToday, userRole = 'employee') {
  const [notifications, setNotifications] = useState([]);

  // Initialiser les notifications au chargement
  useEffect(() => {
    const storedNotifications = localStorage.getItem('notifications');
    if (storedNotifications) {
      try {
        const parsed = JSON.parse(storedNotifications);
        setNotifications(parsed);
      } catch (e) {
        console.error('Erreur lors du parsing des notifications:', e);
      }
    }
  }, []);

  // Ajouter une notification de pointage si pas pointé
  useEffect(() => {
    // Ne notifier que les employés/managers
    if (userRole === 'ceo') return;
    
    // Si déjà pointé, supprimer la notification de pointage
    if (hasClockedInToday) {
      setNotifications(prev => {
        const filtered = prev.filter(n => n.type !== 'clock-reminder');
        localStorage.setItem('notifications', JSON.stringify(filtered));
        return filtered;
      });
      return;
    }

    // Vérifier si la notification existe déjà aujourd'hui et l'ajouter si besoin
    const today = new Date().toDateString();
    
    setNotifications(prev => {
      const hasClockReminderToday = prev.some(
        n => n.type === 'clock-reminder' && n.date === today
      );

      if (hasClockReminderToday) {
        return prev; // Pas de changement, évite la boucle
      }

      const newNotification = {
        id: `clock-reminder-${Date.now()}`,
        type: 'clock-reminder',
        icon: '⚠️',
        title: 'Rappel de pointage',
        message: "Vous n'avez pas encore pointé aujourd'hui. N'oubliez pas de pointer votre arrivée !",
        time: 'À l\'instant',
        read: false,
        date: today
      };

      const updated = [newNotification, ...prev];
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  }, [hasClockedInToday, userRole]);

  // Marquer une notification comme lue
  const markAsRead = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  // Ajouter une notification manuelle
  const addNotification = (notification) => {
    const newNotification = {
      id: `notif-${Date.now()}`,
      read: false,
      time: 'À l\'instant',
      date: new Date().toDateString(),
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  // Nettoyer les anciennes notifications (plus de 7 jours)
  useEffect(() => {
    const cleanOldNotifications = () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      setNotifications(prev => {
        const filtered = prev.filter(n => {
          const notifDate = new Date(n.date);
          return notifDate >= sevenDaysAgo;
        });
        
        if (filtered.length !== prev.length) {
          localStorage.setItem('notifications', JSON.stringify(filtered));
        }
        
        return filtered;
      });
    };

    cleanOldNotifications();
    // Nettoyer tous les jours
    const interval = setInterval(cleanOldNotifications, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    markAsRead,
    addNotification
  };
}
