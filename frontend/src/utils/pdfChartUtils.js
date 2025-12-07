// src/utils/pdfChartUtils.js
// Utilitaires pour dessiner des graphiques statiques dans jsPDF

/**
 * Formate les minutes en heures lisibles (ex: 7.5h ou 2h30)
 */
const formatHours = (minutes) => {
    if (typeof minutes !== 'number' || isNaN(minutes)) return '0h';
    const hours = minutes / 60;
    if (hours < 1) return `${Math.round(minutes)}m`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

/**
 * Dessine un graphique à barres horizontales dans le PDF
 * @param {jsPDF} doc - Instance jsPDF
 * @param {Array<{name: string, value: number}>} data - Données du graphique
 * @param {number} startX - Position X de départ
 * @param {number} startY - Position Y de départ
 * @param {number} width - Largeur totale du graphique
 * @param {number} height - Hauteur totale du graphique
 * @param {Object} options - Options (title, valueFormatter, color)
 * @returns {number} - Position Y finale après le graphique
 */
export const drawBarChart = (doc, data, startX, startY, width, height, options = {}) => {
    const {
        title = '',
        valueFormatter = (v) => v.toString(),
        primaryColor = [37, 99, 235], // Bleu
        secondaryColor = [148, 163, 184], // Gris
    } = options;

    if (!data || data.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(128);
        doc.text('Aucune donnée disponible', startX + width / 2, startY + 20, { align: 'center' });
        return startY + 40;
    }

    // Titre
    if (title) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text(title, startX, startY);
        doc.setFont(undefined, 'normal');
        startY += 8;
    }

    const barHeight = Math.min(15, (height - 10) / data.length);
    const barGap = 4;
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barAreaWidth = width - 60; // Espace pour les labels

    data.forEach((item, index) => {
        const y = startY + index * (barHeight + barGap);
        const barWidth = (item.value / maxValue) * barAreaWidth;
        const isFirst = index === 0;

        // Label (nom)
        doc.setFontSize(9);
        doc.setTextColor(60);
        const labelText = item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name;
        doc.text(labelText, startX, y + barHeight / 2 + 2);

        // Barre
        const color = isFirst ? primaryColor : secondaryColor;
        doc.setFillColor(...color);
        doc.roundedRect(startX + 50, y, Math.max(barWidth, 2), barHeight, 2, 2, 'F');

        // Valeur
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(valueFormatter(item.value), startX + 52 + barWidth + 3, y + barHeight / 2 + 2);
    });

    return startY + data.length * (barHeight + barGap) + 5;
};

/**
 * Dessine un graphique en ligne/aire avec points et valeurs
 * @param {jsPDF} doc - Instance jsPDF
 * @param {Array<{label: string, value: number}>} data - Données du graphique
 * @param {number} startX - Position X de départ
 * @param {number} startY - Position Y de départ
 * @param {number} width - Largeur totale du graphique
 * @param {number} height - Hauteur totale du graphique
 * @param {Object} options - Options (title, valueFormatter, color, unit)
 * @returns {number} - Position Y finale après le graphique
 */
export const drawLineChart = (doc, data, startX, startY, width, height, options = {}) => {
    const {
        title = '',
        valueFormatter = (v) => v.toString(),
        color = [37, 99, 235], // Bleu
        unit = '',
        showArea = true,
    } = options;

    if (!data || data.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(128);
        doc.text('Aucune donnée disponible', startX + width / 2, startY + 20, { align: 'center' });
        return startY + 40;
    }

    // Titre
    if (title) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text(title, startX, startY);
        doc.setFont(undefined, 'normal');
        startY += 10;
    }

    const chartWidth = width - 20;
    const chartHeight = height - 30;
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const valueRange = maxValue - minValue || 1;
    const pointGap = chartWidth / Math.max(data.length - 1, 1);

    // Ligne de base
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(startX, startY + chartHeight, startX + chartWidth, startY + chartHeight);

    // Points et lignes
    const points = data.map((item, index) => ({
        x: startX + index * pointGap,
        y: startY + chartHeight - ((item.value - minValue) / valueRange) * chartHeight,
        value: item.value,
        label: item.label,
    }));

    // Dessiner la ligne
    doc.setDrawColor(...color);
    doc.setLineWidth(1.5);
    for (let i = 0; i < points.length - 1; i++) {
        doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }

    // Dessiner les points et valeurs
    doc.setFillColor(...color);
    points.forEach((point, index) => {
        // Point
        doc.circle(point.x, point.y, 2.5, 'F');

        // Valeur au-dessus du point
        doc.setFontSize(7);
        doc.setTextColor(0);
        const valueText = valueFormatter(point.value) + unit;
        doc.text(valueText, point.x, point.y - 5, { align: 'center' });

        // Label en bas (afficher tous les 2 si beaucoup de points)
        const showLabel = data.length <= 7 || index % 2 === 0;
        if (showLabel) {
            doc.setFontSize(7);
            doc.setTextColor(100);
            const labelText = point.label.length > 6 ? point.label.substring(0, 6) : point.label;
            doc.text(labelText, point.x, startY + chartHeight + 8, { align: 'center' });
        }
    });

    return startY + chartHeight + 15;
};

/**
 * Dessine un mini résumé avec valeur principale et tendance
 * @param {jsPDF} doc - Instance jsPDF
 * @param {string} title - Titre
 * @param {string} value - Valeur principale
 * @param {string} subtitle - Sous-titre (ex: "vs période précédente")
 * @param {number} x - Position X
 * @param {number} y - Position Y
 * @param {number} width - Largeur de la boîte
 */
export const drawKPIBox = (doc, title, value, subtitle, x, y, width) => {
    // Boîte de fond
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, width, 30, 3, 3, 'F');

    // Titre
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(title, x + 5, y + 10);

    // Valeur
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(value, x + 5, y + 22);
    doc.setFont(undefined, 'normal');

    // Sous-titre
    if (subtitle) {
        doc.setFontSize(7);
        doc.setTextColor(128);
        doc.text(subtitle, x + width - 5, y + 22, { align: 'right' });
    }

    return y + 35;
};

export { formatHours };
