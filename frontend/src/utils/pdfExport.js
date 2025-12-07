// src/utils/pdfExport.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawBarChart, drawLineChart, formatHours } from './pdfChartUtils';

/**
 * Génère un PDF pour le dashboard Employé
 * @param {Object} user - Utilisateur connecté
 * @param {Object} stats - Statistiques du dashboard
 * @param {Array} recentClocks - Historique récent des pointages
 * @param {Object} chartData - Données des graphiques
 * @param {string} granularityLabel - Label de la granularité
 */
export const exportEmployeeDashboardPDF = (user, stats, recentClocks = [], chartData = {}, granularityLabel = 'Cette semaine') => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  // En-tête
  doc.setFontSize(20);
  doc.text('TimeManager - Rapport Personnel', 14, 20);

  doc.setFontSize(10);
  doc.text(`Employé: ${user.firstName} ${user.lastName}`, 14, 28);
  doc.text(`Période: ${granularityLabel}`, 14, 34);
  doc.text(`Généré le ${today}`, 14, 40);

  // Ligne de séparation
  doc.setLineWidth(0.5);
  doc.line(14, 44, 196, 44);

  // KPIs
  let currentY = 52;
  const kpiWidth = 85;
  const kpiGap = 8;
  const kpiStartX = 14;

  // KPI 1: Heures travaillées
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpiStartX, currentY, kpiWidth, 28, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Heures travaillées', kpiStartX + 4, currentY + 10);
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  const hours = stats.hoursCurrent || 0;
  const mins = stats.minutesCurrent || 0;
  doc.text(`${hours}h${String(mins).padStart(2, '0')}`, kpiStartX + 4, currentY + 22);
  doc.setFont(undefined, 'normal');

  // KPI 2: Adhérence
  const kpi2X = kpiStartX + kpiWidth + kpiGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi2X, currentY, kpiWidth, 28, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Adhérence planning', kpi2X + 4, currentY + 10);
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text(`${(chartData.adherenceRate || 0).toFixed(0)}%`, kpi2X + 4, currentY + 22);
  doc.setFont(undefined, 'normal');

  currentY += 32;

  // Helper tips
  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.text('> Heures travaillees : Total des heures pointees sur la periode selectionnee', kpiStartX, currentY);
  currentY += 4;
  doc.text('> Adherence : Pourcentage de respect du planning prevu', kpiStartX, currentY);
  currentY += 8;
  doc.setTextColor(0);

  // Graphique: Heures par période
  if (chartData.hoursChartSeries && chartData.hoursChartSeries.length > 0) {
    currentY = drawLineChart(doc, chartData.hoursChartSeries, 14, currentY, 180, 45, {
      title: 'Évolution des heures travaillées',
      valueFormatter: (v) => `${Math.round(v / 60 * 10) / 10}h`,
      color: [37, 99, 235],
    });
  }

  currentY += 3;

  // Graphique: Adhérence
  if (chartData.adherenceChartSeries && chartData.adherenceChartSeries.length > 0) {
    currentY = drawLineChart(doc, chartData.adherenceChartSeries, 14, currentY, 180, 45, {
      title: 'Évolution de l\'adhérence',
      valueFormatter: (v) => `${Math.round(v)}%`,
      color: [16, 185, 129],
    });
  }

  currentY += 5;

  // Historique des pointages
  if (recentClocks.length > 0 && currentY < 220) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text('HISTORIQUE RÉCENT', 14, currentY);
    doc.setFont(undefined, 'normal');

    const clocksData = recentClocks.slice(0, 8).map(c => [
      new Date(c.clockIn).toLocaleDateString('fr-FR'),
      new Date(c.clockIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      c.clockOut ? new Date(c.clockOut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'En cours',
      c.duration || '-',
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Date', 'Entrée', 'Sortie', 'Durée']],
      body: clocksData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0], fontSize: 9 },
      styles: { fontSize: 8 },
    });
  }

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('TimeManager © 2025 - Document confidentiel', 105, 285, { align: 'center' });

  // Téléchargement
  doc.save(`dashboard_${user.firstName}_${user.lastName}_${today.replace(/\//g, '-')}.pdf`);
};

/**
 * Génère un PDF pour le dashboard Manager
 * @param {Object} user - Utilisateur connecté
 * @param {Object} stats - Statistiques du dashboard
 * @param {Array} teams - Liste des équipes
 * @param {Object} chartData - Données des graphiques
 * @param {string} granularityLabel - Label de la granularité (ex: "Cette semaine")
 */
export const exportManagerDashboardPDF = (user, stats, teams = [], chartData = {}, granularityLabel = 'Cette semaine') => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  // En-tête
  doc.setFontSize(20);
  doc.text('TimeManager - Dashboard Manager', 14, 20);

  doc.setFontSize(10);
  doc.text(`${user.firstName} ${user.lastName}`, 14, 28);
  doc.text(`Période: ${granularityLabel}`, 14, 34);
  doc.text(`Généré le ${today}`, 14, 40);

  // Ligne de séparation
  doc.setLineWidth(0.5);
  doc.line(14, 44, 196, 44);

  // KPIs en boxes
  let currentY = 52;

  // Ligne de KPIs
  const kpiWidth = 42;
  const kpiGap = 4;
  const kpiStartX = 14;

  // KPI 1: Équipes
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpiStartX, currentY, kpiWidth, 28, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Mes équipes', kpiStartX + 4, currentY + 10);
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text(stats.totalTeams?.toString() || '0', kpiStartX + 4, currentY + 22);
  doc.setFont(undefined, 'normal');

  // KPI 2: Membres
  const kpi2X = kpiStartX + kpiWidth + kpiGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi2X, currentY, kpiWidth, 28, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Total membres', kpi2X + 4, currentY + 10);
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text(stats.totalMembers?.toString() || '0', kpi2X + 4, currentY + 22);
  doc.setFont(undefined, 'normal');

  // KPI 3: Heures moyennes
  const kpi3X = kpi2X + kpiWidth + kpiGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi3X, currentY, kpiWidth, 28, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Heures moy./période', kpi3X + 4, currentY + 10);
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  const hoursAvg = chartData.hoursTotals?.current || 0;
  const hoursText = `${Math.floor(hoursAvg)}h${Math.round((hoursAvg % 1) * 60).toString().padStart(2, '0')}`;
  doc.text(hoursText, kpi3X + 4, currentY + 22);
  doc.setFont(undefined, 'normal');

  // KPI 4: Adhérence
  const kpi4X = kpi3X + kpiWidth + kpiGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi4X, currentY, kpiWidth, 28, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Adhérence moy.', kpi4X + 4, currentY + 10);
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text(`${(chartData.adherenceRate || 0).toFixed(0)}%`, kpi4X + 4, currentY + 22);
  doc.setFont(undefined, 'normal');

  currentY += 32;

  // Helper tips
  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.text('> Heures moy. : Moyenne des heures travaillees par periode affichee dans le graphique', kpiStartX, currentY);
  currentY += 4;
  doc.text('> Adherence : Pourcentage moyen de respect des plannings sur la periode', kpiStartX, currentY);
  currentY += 8;
  doc.setTextColor(0);

  // Graphique: Heures par période
  if (chartData.hoursChartSeries && chartData.hoursChartSeries.length > 0) {
    currentY = drawLineChart(doc, chartData.hoursChartSeries, 14, currentY, 180, 50, {
      title: 'Évolution des heures travaillées',
      valueFormatter: (v) => `${Math.round(v / 60 * 10) / 10}h`,
      color: [37, 99, 235],
    });
  }

  currentY += 5;

  // Graphique: Comparaison équipes
  if (chartData.teamComparisonData && chartData.teamComparisonData.length > 0) {
    currentY = drawBarChart(doc, chartData.teamComparisonData, 14, currentY, 180, 60, {
      title: 'Comparaison des équipes (heures)',
      valueFormatter: (v) => `${v}h`,
      primaryColor: [37, 99, 235],
      secondaryColor: [148, 163, 184],
    });
  }

  currentY += 5;

  // Liste des équipes (tableau)
  if (teams.length > 0 && currentY < 220) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text('MES ÉQUIPES', 14, currentY);
    doc.setFont(undefined, 'normal');

    const teamsData = teams.slice(0, 8).map(t => [
      t.name,
      t.description?.substring(0, 30) || '-',
      (t.members?.length || t.memberCount || 0).toString(),
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Nom', 'Description', 'Membres']],
      body: teamsData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0], fontSize: 9 },
      styles: { fontSize: 8 },
    });
  }

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('TimeManager © 2025 - Document confidentiel', 105, 285, { align: 'center' });

  // Téléchargement
  doc.save(`dashboard_manager_${user.firstName}_${user.lastName}_${today.replace(/\//g, '-')}.pdf`);
};

/**
 * Génère un PDF pour le dashboard CEO
 * @param {Object} user - Utilisateur connecté
 * @param {Object} stats - Statistiques globales
 * @param {Array} pendingUsers - Utilisateurs en attente
 * @param {Array} recentTeams - Équipes récentes
 */
export const exportCEODashboardPDF = (user, stats, pendingUsers = [], recentTeams = []) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  // En-tête
  doc.setFontSize(20);
  doc.text('TimeManager - Dashboard CEO', 14, 20);

  doc.setFontSize(10);
  doc.text(`${user.firstName} ${user.lastName}`, 14, 28);
  doc.text(`Généré le ${today}`, 14, 34);

  // Ligne de séparation
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  // Statistiques globales
  doc.setFontSize(14);
  doc.text('VUE D\'ENSEMBLE ENTREPRISE', 14, 48);

  const statsData = [
    ['Total employes', stats.totalUsers?.toString() || '0'],
    ['Utilisateurs approuves', stats.approvedUsers?.toString() || '0'],
    ['En attente d\'approbation', stats.pendingUsers?.toString() || '0'],
    ['Total equipes', stats.totalTeams?.toString() || '0'],
    ['Managers', stats.totalManagers?.toString() || '0'],
    ['Employes actifs', 'Endpoint manquant'],
  ];

  autoTable(doc, {
    startY: 52,
    head: [['Indicateur', 'Valeur']],
    body: statsData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0] },
  });

  // Utilisateurs en attente
  if (pendingUsers.length > 0) {
    doc.setFontSize(14);
    doc.text('UTILISATEURS EN ATTENTE', 14, doc.lastAutoTable.finalY + 15);

    const pendingData = pendingUsers.map(u => [
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.role || 'EMPLOYEE',
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Nom', 'Email', 'Rôle demandé']],
      body: pendingData,
      theme: 'striped',
      headStyles: { fillColor: [255, 153, 0] },
    });
  }

  // Équipes récentes
  if (recentTeams.length > 0) {
    doc.setFontSize(14);
    doc.text('EQUIPES RECENTES', 14, doc.lastAutoTable.finalY + 15);

    const teamsData = recentTeams.map(t => [
      t.name,
      t.manager ? `${t.manager.firstName} ${t.manager.lastName}` : '—',
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Nom', 'Manager']],
      body: teamsData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] },
    });
  }

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('TimeManager © 2025 - Document confidentiel', 105, 285, { align: 'center' });

  // Téléchargement
  doc.save(`dashboard_ceo_${today.replace(/\//g, '-')}.pdf`);
};

/**
 * Génère un PDF pour la liste des utilisateurs
 * @param {Array} users - Liste des utilisateurs
 */
export const exportUsersListPDF = (users = []) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  // En-tête
  doc.setFontSize(20);
  doc.text('TimeManager - Liste des Utilisateurs', 14, 20);

  doc.setFontSize(10);
  doc.text(`Date: ${today}`, 14, 28);
  doc.text(`Total: ${users.length} utilisateurs`, 14, 34);

  // Ligne de séparation
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  // Statistiques rapides
  const approved = users.filter(u => u.status === 'APPROVED').length;
  const pending = users.filter(u => u.status === 'PENDING').length;
  const rejected = users.filter(u => u.status === 'REJECTED').length;

  doc.setFontSize(14);
  doc.text('VUE D\'ENSEMBLE', 14, 48);

  const statsData = [
    ['Utilisateurs approuvés', approved.toString()],
    ['En attente', pending.toString()],
    ['Rejetés', rejected.toString()],
  ];

  autoTable(doc, {
    startY: 52,
    head: [['Statut', 'Nombre']],
    body: statsData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0] },
  });

  // Liste des utilisateurs
  doc.setFontSize(14);
  doc.text('LISTE COMPLETE', 14, doc.lastAutoTable.finalY + 15);

  const usersData = users.map(u => [
    `${u.firstName} ${u.lastName}`,
    u.email,
    u.phoneNumber || '-',
    u.role || 'EMPLOYEE',
    u.status || 'PENDING',
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Nom', 'Email', 'Téléphone', 'Rôle', 'Statut']],
    body: usersData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0] },
    styles: { fontSize: 8 },
    columnStyles: {
      1: { cellWidth: 50 }, // Email plus large
    },
  });

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('TimeManager © 2025 - Document confidentiel', 105, 285, { align: 'center' });

  // Téléchargement
  doc.save(`users_list_${today.replace(/\//g, '-')}.pdf`);
};

/**
 * Génère un PDF pour le détail d'une équipe
 * @param {Object} team - Équipe
 * @param {Array} members - Liste des membres
 * @param {Object} chartData - Données des graphiques
 * @param {string} granularityLabel - Label de la granularité
 */
export const exportTeamDetailPDF = (team, members = [], chartData = {}, granularityLabel = 'Cette semaine') => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  // En-tête
  doc.setFontSize(20);
  doc.text(`TimeManager - Équipe ${team.name}`, 14, 20);

  doc.setFontSize(10);
  doc.text(`Description: ${team.description || '-'}`, 14, 28);
  doc.text(`Période: ${granularityLabel}`, 14, 34);
  doc.text(`Généré le ${today}`, 14, 40);

  // Ligne de séparation
  doc.setLineWidth(0.5);
  doc.line(14, 44, 196, 44);

  // KPIs
  let currentY = 52;
  const kpiWidth = 58;
  const kpiGap = 6;
  const kpiStartX = 14;

  // KPI 1: Membres
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpiStartX, currentY, kpiWidth, 28, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Membres', kpiStartX + 4, currentY + 10);
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text(members.length.toString(), kpiStartX + 4, currentY + 22);
  doc.setFont(undefined, 'normal');

  // KPI 2: Heures moyennes
  const kpi2X = kpiStartX + kpiWidth + kpiGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi2X, currentY, kpiWidth, 28, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Heures moy./période', kpi2X + 4, currentY + 10);
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  const hoursAvg = chartData.hoursTotals?.current || 0;
  const hoursText = `${Math.floor(hoursAvg)}h${Math.round((hoursAvg % 1) * 60).toString().padStart(2, '0')}`;
  doc.text(hoursText, kpi2X + 4, currentY + 22);
  doc.setFont(undefined, 'normal');

  // KPI 3: Adhérence
  const kpi3X = kpi2X + kpiWidth + kpiGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi3X, currentY, kpiWidth, 28, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Adhérence moyenne', kpi3X + 4, currentY + 10);
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text(`${(chartData.adherenceRate || 0).toFixed(0)}%`, kpi3X + 4, currentY + 22);
  doc.setFont(undefined, 'normal');

  currentY += 32;

  // Helper tips
  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.text('> Heures moy. : Moyenne des heures travaillees par l\'equipe sur chaque periode du graphique', kpiStartX, currentY);
  currentY += 4;
  doc.text('> Adherence : Pourcentage moyen de respect des plannings par l\'equipe', kpiStartX, currentY);
  currentY += 8;
  doc.setTextColor(0);

  // Graphique: Heures par période
  if (chartData.hoursChartSeries && chartData.hoursChartSeries.length > 0) {
    currentY = drawLineChart(doc, chartData.hoursChartSeries, 14, currentY, 180, 45, {
      title: 'Évolution des heures travaillées',
      valueFormatter: (v) => `${Math.round(v / 60 * 10) / 10}h`,
      color: [37, 99, 235],
    });
  }

  currentY += 3;

  // Graphique: Comparaison membres
  if (chartData.memberComparisonData && chartData.memberComparisonData.length > 0) {
    currentY = drawBarChart(doc, chartData.memberComparisonData, 14, currentY, 180, 50, {
      title: 'Comparaison des membres (heures)',
      valueFormatter: (v) => `${v}h`,
      primaryColor: [37, 99, 235],
      secondaryColor: [148, 163, 184],
    });
  }

  currentY += 5;

  // Liste des membres
  if (members.length > 0 && currentY < 220) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text('MEMBRES DE L\'ÉQUIPE', 14, currentY);
    doc.setFont(undefined, 'normal');

    const membersData = members.slice(0, 10).map(m => [
      `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.email || '-',
      m.role || 'MEMBER',
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Nom', 'Rôle']],
      body: membersData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0], fontSize: 9 },
      styles: { fontSize: 8 },
    });
  }

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('TimeManager © 2025 - Document confidentiel', 105, 285, { align: 'center' });

  // Téléchargement
  doc.save(`equipe_${team.name.replace(/\s+/g, '_')}_${today.replace(/\//g, '-')}.pdf`);
};
