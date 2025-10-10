// src/components/dashboard/KPICard.jsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

// Ce composant est réutilisable. Il accepte des "props" pour afficher différentes informations.
// Props:
// - title: Le titre de la carte (ex: "Heures cette semaine")
// - value: La valeur à afficher (ex: "28h 45m")
// - icon: Une icône (optionnelle)
// - children: Pour ajouter des détails supplémentaires comme un graphique (optionnel)

export default function KPICard({ title, value, icon, children }) {
  const IconComponent = icon; // Permet d'utiliser l'icône passée en prop comme un composant

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">
          {title}
        </CardTitle>
        {IconComponent && <IconComponent className="h-4 w-4 text-gray-400" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
        </div>
        {children && <div className="mt-2">{children}</div>}
      </CardContent>
    </Card>
  );
}
