import api from './client';

/**
 * Fetch daily hours for a user over a date range
 * Uses the backend /api/reports/users/{userId}/hours endpoint
 * 
 * @param {number} userId - The user ID
 * @param {Date} from - Start date (inclusive)
 * @param {Date} to - End date (inclusive)
 * @returns {Promise<Object>} { userId, from, to, hours }
 */
export async function fetchUserHours(userId, from, to) {
  try {
    const fromISO = from.toISOString();
    const toISO = to.toISOString();
    const { data } = await api.get(`/api/reports/users/${userId}/hours`, {
      params: { from: fromISO, to: toISO },
    });
    return data;
  } catch (error) {
    console.warn('[statsApi] fetchUserHours error:', error?.message);
    return null;
  }
}

/**
 * Fetch lateness rate for a user in a specific month
 * Uses the backend /api/reports/users/{userId}/lateness-rate endpoint
 *
 * @param {number} userId - The user ID
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12)
 * @param {string} threshold - Time threshold for "late" (default "09:05")
 * @returns {Promise<Object>} { userId, month, threshold, totalDaysWithClock, lateDays, rate }
 */
export async function fetchUserLatenessRate(userId, year, month, threshold = "09:05") {
  try {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const { data } = await api.get(`/api/reports/users/${userId}/lateness-rate`, {
      params: { yearMonth, threshold },
    });
    return data;
  } catch (error) {
    console.warn('[statsApi] fetchUserLatenessRate error:', error?.message);
    return null;
  }
}

/**
 * Fetch statistics for a team
 * Uses the backend /api/teams/{teamId}/stats endpoint
 *
 * @param {number} teamId - The team ID
 * @returns {Promise<Object>} Team statistics
 */
export async function fetchTeamStatistics(teamId) {
  try {
    const { data } = await api.get(`/api/teams/${teamId}/stats`);
    return data;
  } catch (error) {
    console.warn('[statsApi] fetchTeamStatistics error:', error?.message);
    return null;
  }
}

/**
 * Generate mock daily stats for UI development
 * Simulates realistic daily hours data
 * 
 * @param {number} period - Number of days
 * @param {number} totalMinutes - Total minutes for the period
 * @returns {Array<{date, minutesWorked, minutesAvg}>}
 */
export function generateMockDailyStats(period, totalMinutes) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (period - 1));

  const dailyStats = [];
  const avgDailyMin = Math.round(totalMinutes / period);

  for (let i = 0; i < period; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // Simulate realistic variation around the average
    const variance = (Math.sin(i * 0.7) + Math.random() * 0.3 - 0.15) * 0.25;
    const minutesWorked = Math.max(0, Math.round(avgDailyMin * (1 + variance)));
    const minutesAvg = avgDailyMin; // Running average stays constant for now

    dailyStats.push({
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      minutesWorked,
      minutesAvg,
    });
  }

  return dailyStats;
}

/**
 * Build series data for a chart from daily stats
 * Handles both ISO dates and pre-computed labels
 *
 * @param {Array<{date, minutesWorked}>} dailyStats - Daily statistics with date (ISO or label) and minutesWorked
 * @param {number} maxPoints - Maximum number of points to display
 * @param {number} period - Period count (not in days, but in periods)
 * @returns {Array<{value, label}>}
 */
export function buildChartSeries(dailyStats, maxPoints = 12, period = 7) {
  if (!dailyStats || dailyStats.length === 0) {
    return [];
  }

  const points = Math.max(2, Math.min(maxPoints, Math.min(period, dailyStats.length)));
  const step = Math.max(1, Math.floor(dailyStats.length / points));
  const series = [];

  const daysFr = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  const monthsFr = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];

  for (let i = 0; i < points; i++) {
    const idx = Math.min(i * step, dailyStats.length - 1);
    const stat = dailyStats[idx];

    let label = '';
    // If date is already a label (not ISO format), use it directly
    // Labels look like: "S43", "janv.-25", "2025", "lun. 23 oct.", "20 - 26 jan", "janv.", "févr.", etc.
    // French month abbreviations: janv., févr., mars, avr., mai, juin, juil., août, sept., oct., nov., déc.
    const frenchMonthAbbrev = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const isLabel = stat.date && (
      frenchMonthAbbrev.includes(stat.date) ||  // French month abbreviations
      stat.date.includes('S') ||                 // Week format like "S43"
      stat.date.includes(' - ') ||              // Date range like "20 - 26 jan"
      /^\d{4}$/.test(stat.date) ||               // Year like "2025"
      stat.date.match(/\d{1,2}\s\w/) ||          // Date format like "23 oct."
      stat.date.match(/^[a-zéû]+\.\s\d{1,2}/)   // Day format like "lun. 23"
    );
    if (isLabel) {
      label = stat.date;
    } else if (stat.date) {
      // Parse as ISO date and generate label based on period
      const date = new Date(stat.date);
      if (period <= 7) {
        label = daysFr[date.getDay()];
      } else if (period <= 31) {
        label = date.getDate().toString();
      } else {
        label = monthsFr[date.getMonth()];
      }
    } else {
      label = '';
    }

    series.push({
      value: stat.minutesWorked,
      label,
    });
  }

  return series;
}
