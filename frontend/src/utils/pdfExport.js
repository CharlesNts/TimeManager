// src/utils/pdfExport.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Génère un PDF pour le dashboard Employé
 * @param {Object} user - Utilisateur connecté
 * @param {Object} stats - Statistiques du dashboard
 * @param {Array} recentClocks - Historique récent des pointages
 * @param {number} period - Période en jours (7, 30, etc.)
 */
export const exportEmployeeDashboardPDF = (user, stats, recentClocks = [], period = 7) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');
  const periodLabel = period === 7 ? 'Semaine' : period === 30 ? 'Mois' : `${period} jours`;

  // En-tête
  doc.setFontSize(20);
  doc.text('TimeManager - Rapport Personnel', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Employe: ${user.firstName} ${user.lastName}`, 14, 28);
  doc.text(`Periode: ${periodLabel}`, 14, 34);
  doc.text(`Date: ${today}`, 14, 40);

  // Ligne de séparation
  doc.setLineWidth(0.5);
  doc.line(14, 44, 196, 44);

  // Statistiques clés
  doc.setFontSize(14);
  doc.text('STATISTIQUES', 14, 54);

  const statsData = [
    ['Heures cette semaine', stats.hoursWeek || '0h 00m'],
    ['Heures ce mois', stats.hoursWeek || '0h 00m'], // Même valeur car basé sur période sélectionnée
    ['Moyenne quotidienne', stats.avgWeek || '0h 00m'],
    ['Statut actuel', 'Hors ligne'], // Pas de statut actuel dans les stats
  ];

  autoTable(doc, {
    startY: 58,
    head: [['Indicateur', 'Valeur']],
    body: statsData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0] },
  });

  // Historique des pointages
  if (recentClocks.length > 0) {
    doc.setFontSize(14);
    doc.text('HISTORIQUE DES POINTAGES', 14, doc.lastAutoTable.finalY + 15);

    const clocksData = recentClocks.slice(0, 10).map(c => [
      new Date(c.clockIn).toLocaleDateString('fr-FR'),
      new Date(c.clockIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      c.clockOut ? new Date(c.clockOut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'En cours',
      c.duration || '-',
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Date', 'Entrée', 'Sortie', 'Durée']],
      body: clocksData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] },
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
 */
export const exportManagerDashboardPDF = (user, stats, teams = []) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  // En-tête
  doc.setFontSize(20);
  doc.text('TimeManager - Dashboard Manager', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`${user.firstName} ${user.lastName}`, 14, 28);
  doc.text(`Généré le ${today}`, 14, 34);

  // Ligne de séparation
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  // Statistiques globales
  doc.setFontSize(14);
  doc.text('VUE D\'ENSEMBLE', 14, 48);

  const statsData = [
    ['Mes équipes', stats.totalTeams?.toString() || '0'],
    ['Total membres', stats.totalMembers?.toString() || '0'],
    ['Membres actifs', stats.activeMembers?.toString() || '0'],
    ['Heures cette semaine', `${stats.totalHoursThisWeek || 0}h`],
  ];

  autoTable(doc, {
    startY: 52,
    head: [['Indicateur', 'Valeur']],
    body: statsData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0] },
  });

  // Liste des équipes
  if (teams.length > 0) {
    doc.setFontSize(14);
    doc.text('MES EQUIPES', 14, doc.lastAutoTable.finalY + 15);

    const teamsData = teams.map(t => [
      t.name,
      t.description || 'Aucune description',
      t.memberCount?.toString() || '0',
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Nom', 'Description', 'Membres']],
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
