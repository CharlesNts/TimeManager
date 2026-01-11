import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '../components/ui/button';

/**
 * Page 404 - Page non trouvée
 */
const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md bg-white border border-gray-200 rounded-lg shadow-sm px-8 py-12">
          {/* Illustration 404 */}
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-gray-900 mb-4">404</h1>
            <div className="flex justify-center">
              <Search className="h-20 w-20 text-gray-300" />
            </div>
          </div>

          {/* Texte */}
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Page non trouvée
          </h2>
          <p className="text-gray-600 mb-8">
            Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
            >
              <Home className="h-5 w-5 mr-2" />
              Accueil
            </Button>
          </div>

          {/* Suggestions */}
        </div>
      </div>
  );
};

export default NotFoundPage;
