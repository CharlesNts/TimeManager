import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import Layout from '../components/layout/Layout';

/**
 * Page 404 - Page non trouvée
 */
const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
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
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Retour
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black rounded-lg text-white font-medium hover:bg-gray-800 transition-colors"
            >
              <Home className="h-5 w-5" />
              Accueil
            </button>
          </div>

          {/* Suggestions */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Pages populaires :</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/teams')}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Équipes
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Profil
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
