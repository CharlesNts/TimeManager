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
 * @param {number} period - Période en jours (7, 30, etc.)
 */
export const exportEmployeeDashboardCSV = (user, stats, recentClocks = [], period = 7) => {
  const today = new Date().toLocaleDateString('fr-FR');
  const periodLabel = period === 7 ? 'Semaine' : period === 30 ? 'Mois' : `${period} jours`;
  
  const data = [
    ['TimeManager - Rapport Personnel'],
    [''],
    ['Employe', `${user.firstName} ${user.lastName}`],
    ['Periode', periodLabel],
    ['Date generation', today],
    [''],
    ['=== STATISTIQUES ==='],
    ['Indicateur', 'Valeur'],
    ['Heures cette semaine', stats.weekHours || '0h 00m'],
    ['Heures ce mois', stats.monthHours || '0h 00m'],
    ['Moyenne quotidienne', stats.avgDaily || '0h 00m'],
    ['Statut actuel', stats.currentStatus || 'Hors ligne'],
    [''],
    ['=== HISTORIQUE RECENT ==='],
    ['Date', 'Entrée', 'Sortie', 'Durée'],
  ];

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
 */
export const exportManagerDashboardCSV = (user, stats, teams = []) => {
  const today = new Date().toLocaleDateString('fr-FR');
  
  const data = [
    ['TimeManager - Dashboard Manager'],
    [''],
    ['Manager', `${user.firstName} ${user.lastName}`],
    ['Date génération', today],
    [''],
    ['=== VUE D\'ENSEMBLE ==='],
    ['Indicateur', 'Valeur'],
    ['Mes équipes', stats.totalTeams?.toString() || '0'],
    ['Total membres', stats.totalMembers?.toString() || '0'],
    ['Membres actifs', stats.activeMembers?.toString() || '0'],
    ['Heures cette semaine', `${stats.totalHoursThisWeek || 0}h`],
    [''],
    ['=== MES EQUIPES ==='],
    ['Nom', 'Description', 'Membres'],
  ];

  teams.forEach(t => {
    data.push([
      t.name,
      t.description || 'Aucune description',
      t.memberCount?.toString() || '0',
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
    ['Total utilisateurs', stats.totalUsers?.toString() || '0'],
    ['Utilisateurs approuvés', stats.approvedUsers?.toString() || '0'],
    ['En attente d\'approbation', stats.pendingUsers?.toString() || '0'],
    ['Total équipes', stats.totalTeams?.toString() || '0'],
    ['Managers', stats.totalManagers?.toString() || '0'],
    ['Employés actifs', stats.activeEmployees?.toString() || '0'],
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
