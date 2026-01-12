// src/hooks/useUserPreferences.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Clés des préférences disponibles
 */
export const PREFERENCE_KEYS = {
  SOUND_ENABLED: 'pref_sound_enabled',
  SOUND_VOLUME: 'pref_sound_volume',
  // Futures préférences possibles :
  // DARK_MODE: 'pref_dark_mode',
  // COMPACT_VIEW: 'pref_compact_view',
};

/**
 * Valeurs par défaut des préférences
 */
const DEFAULT_PREFERENCES = {
  [PREFERENCE_KEYS.SOUND_ENABLED]: true,
  [PREFERENCE_KEYS.SOUND_VOLUME]: 0.5, // 0 à 1
};

/**
 * Récupère une préférence depuis le localStorage
 * @param {string} key - Clé de la préférence
 * @returns {any} Valeur de la préférence ou valeur par défaut
 */
export const getPreference = (key) => {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return DEFAULT_PREFERENCES[key];
    }
    return JSON.parse(stored);
  } catch {
    return DEFAULT_PREFERENCES[key];
  }
};

/**
 * Sauvegarde une préférence dans le localStorage
 * @param {string} key - Clé de la préférence
 * @param {any} value - Valeur à sauvegarder
 */
export const setPreference = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Émettre un événement pour synchroniser les autres composants
    window.dispatchEvent(new CustomEvent('preferenceChange', { detail: { key, value } }));
  } catch (error) {
    console.warn('[useUserPreferences] Failed to save preference:', error);
  }
};

/**
 * Hook React pour gérer les préférences utilisateur
 * @param {string} key - Clé de la préférence à surveiller
 * @returns {[any, function]} [valeur, setter]
 */
export default function useUserPreferences(key) {
  const [value, setValue] = useState(() => getPreference(key));

  // Écouter les changements de préférences (pour synchroniser entre composants)
  useEffect(() => {
    const handleChange = (event) => {
      if (event.detail.key === key) {
        setValue(event.detail.value);
      }
    };

    window.addEventListener('preferenceChange', handleChange);
    return () => window.removeEventListener('preferenceChange', handleChange);
  }, [key]);

  // Setter qui sauvegarde automatiquement
  const updateValue = useCallback((newValue) => {
    setValue(newValue);
    setPreference(key, newValue);
  }, [key]);

  return [value, updateValue];
}

/**
 * Hook pour récupérer toutes les préférences de son
 */
export function useSoundPreferences() {
  const [soundEnabled, setSoundEnabled] = useUserPreferences(PREFERENCE_KEYS.SOUND_ENABLED);
  const [soundVolume, setSoundVolume] = useUserPreferences(PREFERENCE_KEYS.SOUND_VOLUME);

  return {
    soundEnabled,
    setSoundEnabled,
    soundVolume,
    setSoundVolume,
  };
}
