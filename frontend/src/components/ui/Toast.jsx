import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Composant Toast - Notifications temporaires
 * 
 * @param {string} type - Type de notification (success, error, warning, info)
 * @param {string} message - Message à afficher
 * @param {string} title - Titre optionnel
 * @param {number} duration - Durée d'affichage en ms (défaut: 4000)
 * @param {function} onClose - Callback de fermeture
 */
const Toast = ({ 
  type = 'info', 
  message, 
  title,
  duration = 4000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Attendre la fin de l'animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      iconColor: 'text-green-500',
      textColor: 'text-green-900'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      iconColor: 'text-red-500',
      textColor: 'text-red-900'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
      iconColor: 'text-orange-500',
      textColor: 'text-orange-900'
    },
    info: {
      icon: Info,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-900',
      iconColor: 'text-gray-900',
      textColor: 'text-gray-900'
    }
  };

  const { icon: Icon, bgColor, borderColor, iconColor, textColor } = config[type];

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-md w-full pointer-events-auto
        transition-all duration-300 ease-in-out transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`${bgColor} ${borderColor} border-l-4 rounded-lg shadow-lg p-4`}>
        <div className="flex items-start">
          <Icon className={`${iconColor} h-6 w-6 mt-0.5 flex-shrink-0`} />
          <div className="ml-3 flex-1">
            {title && (
              <h3 className={`text-sm font-semibold ${textColor} mb-1`}>
                {title}
              </h3>
            )}
            <p className={`text-sm ${textColor}`}>
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className={`ml-4 ${iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Provider de Toast avec gestion de la file d'attente
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Exposer addToast via window pour utilisation globale (optionnel)
  useEffect(() => {
    window.showToast = addToast;
    return () => {
      delete window.showToast;
    };
  }, []);

  return (
    <>
      {children}
      <div className="fixed top-0 right-0 p-4 space-y-4 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
};

/**
 * Hook pour utiliser les toasts
 */
export const useToast = () => {
  const showToast = (type, message, title, duration) => {
    if (window.showToast) {
      window.showToast({ type, message, title, duration });
    }
  };

  return {
    success: (message, title, duration) => showToast('success', message, title, duration),
    error: (message, title, duration) => showToast('error', message, title, duration),
    warning: (message, title, duration) => showToast('warning', message, title, duration),
    info: (message, title, duration) => showToast('info', message, title, duration),
  };
};

export default Toast;
