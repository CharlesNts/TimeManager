// src/utils/csvExport.js

/**
 * Convertit un tableau de données en CSV
 * @param {Array<Array>} data - Tableau 2D de données
 * @returns {string} - Chaîne CSV
 */
const arrayToCSV = (data) => {
  return data.map(row =>
    row.map(cell => {
      // Échapper les guillemets et entourer de guillemets si nécessaire
      const cellStr = String(cell ?? '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
};

/**
 * Télécharge un fichier CSV
 * @param {string} content - Contenu CSV
 * @param {string} filename - Nom du fichier
 */
const downloadCSV = (content, filename) => {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exporte le dashboard Employé en CSV
 * @param {Object} user - Utilisateur connecté
 * @param {Object} stats - Statistiques du dashboard
 * @param {Array} recentClocks - Historique récent des pointages
 * @param {Object} chartData - Données des graphiques
 * @param {string} granularityLabel - Label de la granularité
 */
export const exportEmployeeDashboardCSV = (user, stats, recentClocks = [], chartData = {}, granularityLabel = 'Cette semaine') => {
  const today = new Date().toLocaleDateString('fr-FR');

  const data = [
    ['TimeManager - Rapport Personnel'],
    [''],
    ['Employé', `${user.firstName} ${user.lastName}`],
    ['Période', granularityLabel],
    ['Date génération', today],
    [''],
    ['=== STATISTIQUES ==='],
    ['Indicateur', 'Valeur'],
    ['Heures travaillées', `${stats.hoursCurrent || 0}h${String(stats.minutesCurrent || 0).padStart(2, '0')}`],
    ['Adhérence planning', `${(chartData.adherenceRate || 0).toFixed(1)}%`],
    [''],
    ['> Heures travaillees = Total des heures pointees sur la periode'],
    ['> Adherence = Pourcentage de respect du planning prevu'],
    [''],
    ['=== ÉVOLUTION DES HEURES ==='],
    ['Période', 'Heures'],
  ];

  // Ajouter les données du graphique d'heures
  if (chartData.hoursChartSeries && chartData.hoursChartSeries.length > 0) {
    chartData.hoursChartSeries.forEach(point => {
      const hours = typeof point.value === 'number' ? (point.value / 60).toFixed(1) + 'h' : '-';
      data.push([point.label || '-', hours]);
    });
  }

  data.push(['']);
  data.push(['=== HISTORIQUE RÉCENT ===']);
  data.push(['Date', 'Entrée', 'Sortie', 'Durée']);

  recentClocks.slice(0, 20).forEach(c => {
    data.push([
      new Date(c.clockIn).toLocaleDateString('fr-FR'),
      new Date(c.clockIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      c.clockOut ? new Date(c.clockOut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'En cours',
      c.duration || '-',
    ]);
  });

  const csv = arrayToCSV(data);
  downloadCSV(csv, `dashboard_${user.firstName}_${user.lastName}_${today.replace(/\//g, '-')}.csv`);
};

/**
 * Exporte le dashboard Manager en CSV
 * @param {Object} user - Utilisateur connecté
 * @param {Object} stats - Statistiques du dashboard
 * @param {Array} teams - Liste des équipes
 * @param {Object} chartData - Données des graphiques
 * @param {string} granularityLabel - Label de la granularité
 */
export const exportManagerDashboardCSV = (user, stats, teams = [], chartData = {}, granularityLabel = 'Cette semaine') => {
  const today = new Date().toLocaleDateString('fr-FR');

  // Format hours helper
  const formatHours = (h) => {
    if (typeof h !== 'number') return '0h00';
    const hours = Math.floor(h);
    const mins = Math.round((h % 1) * 60);
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const data = [
    ['TimeManager - Dashboard Manager'],
    [''],
    ['Manager', `${user.firstName} ${user.lastName}`],
    ['Période', granularityLabel],
    ['Date génération', today],
    [''],
    ['=== VUE D\'ENSEMBLE ==='],
    ['Indicateur', 'Valeur'],
    ['Mes équipes', stats.totalTeams?.toString() || '0'],
    ['Total membres', stats.totalMembers?.toString() || '0'],
    ['Membres actifs', stats.activeMembers?.toString() || '0'],
    ['Heures moyennes/période', formatHours(chartData.hoursTotals?.current || 0)],
    ['Adhérence moyenne', `${(chartData.adherenceRate || 0).toFixed(1)}%`],
    [''],
    ['=== ÉVOLUTION DES HEURES ==='],
    ['Période', 'Heures'],
  ];

  // Ajouter les données du graphique d'heures
  if (chartData.hoursChartSeries && chartData.hoursChartSeries.length > 0) {
    chartData.hoursChartSeries.forEach(point => {
      const hours = typeof point.value === 'number' ? (point.value / 60).toFixed(1) + 'h' : '-';
      data.push([point.label || '-', hours]);
    });
  }

  data.push(['']);
  data.push(['=== COMPARAISON ÉQUIPES ===']);
  data.push(['Équipe', 'Heures']);

  // Ajouter les données de comparaison
  if (chartData.teamComparisonData && chartData.teamComparisonData.length > 0) {
    chartData.teamComparisonData.forEach(item => {
      data.push([item.name || '-', `${item.value || 0}h`]);
    });
  }

  data.push(['']);
  data.push(['=== MES ÉQUIPES ===']);
  data.push(['Nom', 'Description', 'Membres']);

  teams.forEach(t => {
    data.push([
      t.name,
      t.description || '-',
      (t.members?.length || t.memberCount || 0).toString(),
    ]);
  });

  const csv = arrayToCSV(data);
  downloadCSV(csv, `dashboard_manager_${user.firstName}_${user.lastName}_${today.replace(/\//g, '-')}.csv`);
};

/**
 * Exporte le dashboard CEO en CSV
 * @param {Object} user - Utilisateur connecté
 * @param {Object} stats - Statistiques globales
 * @param {Array} pendingUsers - Utilisateurs en attente
 * @param {Array} recentTeams - Équipes récentes
 */
export const exportCEODashboardCSV = (user, stats, pendingUsers = [], recentTeams = []) => {
  const today = new Date().toLocaleDateString('fr-FR');

  const data = [
    ['TimeManager - Dashboard CEO'],
    [''],
    ['CEO', `${user.firstName} ${user.lastName}`],
    ['Date génération', today],
    [''],
    ['=== VUE D\'ENSEMBLE ENTREPRISE ==='],
    ['Indicateur', 'Valeur'],
    ['Total employes', stats.totalUsers?.toString() || '0'],
    ['Utilisateurs approuves', stats.approvedUsers?.toString() || '0'],
    ['En attente d\'approbation', stats.pendingUsers?.toString() || '0'],
    ['Total equipes', stats.totalTeams?.toString() || '0'],
    ['Managers', stats.totalManagers?.toString() || '0'],
    ['Employes actifs', 'Endpoint manquant'],
    [''],
    ['=== UTILISATEURS EN ATTENTE ==='],
    ['Nom', 'Email', 'Rôle demandé'],
  ];

  pendingUsers.forEach(u => {
    data.push([
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.role || 'EMPLOYEE',
    ]);
  });

  data.push(['']);
  data.push(['=== EQUIPES RECENTES ===']);
  data.push(['Nom', 'Manager']);

  recentTeams.forEach(t => {
    data.push([
      t.name,
      t.manager ? `${t.manager.firstName} ${t.manager.lastName}` : '—',
    ]);
  });

  const csv = arrayToCSV(data);
  downloadCSV(csv, `dashboard_ceo_${today.replace(/\//g, '-')}.csv`);
};

/**
 * Exporte la liste des utilisateurs en CSV
 * @param {Array} users - Liste des utilisateurs
 */
export const exportUsersListCSV = (users = []) => {
  const today = new Date().toLocaleDateString('fr-FR');

  const data = [
    ['TimeManager - Liste des Utilisateurs'],
    [''],
    ['Date génération', today],
    ['Total utilisateurs', users.length.toString()],
    [''],
    ['Nom', 'Prénom', 'Email', 'Téléphone', 'Rôle', 'Statut'],
  ];

  users.forEach(u => {
    data.push([
      u.lastName || '',
      u.firstName || '',
      u.email || '',
      u.phoneNumber || '',
      u.role || 'EMPLOYEE',
      u.status || 'PENDING',
    ]);
  });

  const csv = arrayToCSV(data);
  downloadCSV(csv, `users_list_${today.replace(/\//g, '-')}.csv`);
};
