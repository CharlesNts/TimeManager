// src/hooks/useNotificationSound.js
/**
 * Hook pour jouer des sons de notification
 * Utilise l'API Web Audio pour générer des sons sans fichiers externes
 */

// Contexte audio partagé
let audioContext = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Joue un son de notification
 * @param {string} type - Type de son: 'clockIn', 'clockOut', 'breakStart', 'breakEnd', 'success', 'error'
 */
export const playSound = (type) => {
  try {
    const ctx = getAudioContext();
    
    // Résumer le contexte si suspendu (requis par les navigateurs modernes)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Configuration selon le type de son
    switch (type) {
      case 'clockIn':
        // Son ascendant joyeux (arrivée)
        oscillator.frequency.setValueAtTime(440, ctx.currentTime); // La
        oscillator.frequency.setValueAtTime(554, ctx.currentTime + 0.1); // Do#
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.2); // Mi
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        break;

      case 'clockOut':
        // Son descendant doux (départ)
        oscillator.frequency.setValueAtTime(659, ctx.currentTime); // Mi
        oscillator.frequency.setValueAtTime(554, ctx.currentTime + 0.15); // Do#
        oscillator.frequency.setValueAtTime(440, ctx.currentTime + 0.3); // La
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;

      case 'breakStart':
        // Son relaxant (début pause) - deux notes douces
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523, ctx.currentTime); // Do
        oscillator.frequency.setValueAtTime(392, ctx.currentTime + 0.2); // Sol
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        break;

      case 'breakEnd':
        // Son énergique (fin pause) - reprise du travail
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(392, ctx.currentTime); // Sol
        oscillator.frequency.setValueAtTime(523, ctx.currentTime + 0.15); // Do
        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.35);
        break;

      case 'success':
        // Son de succès générique
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1108, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;

      case 'error':
        // Son d'erreur
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;

      default:
        // Son par défaut (bip simple)
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
    }
  } catch (error) {
    // Silently fail if audio is not supported
    console.warn('[useNotificationSound] Audio not supported:', error.message);
  }
};

/**
 * Hook React pour utiliser les sons de notification
 */
export default function useNotificationSound() {
  return { playSound };
}
