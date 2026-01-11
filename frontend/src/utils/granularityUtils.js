/**
 * Utilities for handling time granularities (day, week, month, year)
 * Helps calculate periods and aggregate data by granularity
 */

import { toParis, startOfDay, startOfWeekMon, addDays } from './dateUtils';

/**
 * Get period info based on granularity type
 * @param {string} granularity - 'day' | 'week' | 'month' | 'year'
 * @returns {object} - { periodCount, displayCount, label, format }
 */
export const getPeriodInfo = (granularity) => {
  const info = {
    // Semaine : 7 derniers jours, 1 point par jour
    week: { periodCount: 7, displayCount: 7, label: 'Cette semaine', format: 'YYYY-MM-DD', groupBy: 'day' },
    // Mois : 4 dernières semaines, 1 point par semaine
    month: { periodCount: 4, displayCount: 4, label: 'Ce mois', format: 'Sem {week}', groupBy: 'week' },
    // Année : 12 derniers mois, 1 point par mois
    year: { periodCount: 12, displayCount: 12, label: 'Cette année', format: 'MMM', groupBy: 'month' }
  };
  return info[granularity] || info.week;
};

/**
 * Calculate the start and end dates for the current and previous periods
 * @param {string} granularity - 'day' | 'week' | 'month' | 'year'
 * @returns {object} - { currentStart, currentEnd, previousStart, previousEnd, periodCount }
 */
export const calculatePeriodDates = (granularity) => {
  const now = toParis(new Date());
  const info = getPeriodInfo(granularity);
  const periodCount = info.periodCount;

  if (granularity === 'day') {
    // Current: today
    // Previous: 7 days before
    const currentEnd = startOfDay(now);
    const currentStart = addDays(currentEnd, -(periodCount - 1));
    const previousEnd = addDays(currentStart, -1);
    const previousStart = addDays(previousEnd, -(periodCount - 1));
    return { currentStart, currentEnd, previousStart, previousEnd, periodCount };
  }

  if (granularity === 'week') {
    // Current: 4 dernières semaines complètes à partir de cette semaine
    const currentEnd = startOfDay(now);
    const currentStart = addDays(startOfWeekMon(now), -((periodCount - 1) * 7));
    // Previous: periodCount semaines avant la période actuelle
    const prevPeriodEnd = addDays(currentStart, -1);
    const prevPeriodStart = addDays(prevPeriodEnd, -((periodCount - 1) * 7));
    return { currentStart, currentEnd, previousStart: prevPeriodStart, previousEnd: prevPeriodEnd, periodCount };
  }

  if (granularity === 'month') {
    // Current: 12 derniers mois complets
    const currentEnd = startOfDay(now);
    const currentStart = new Date(now.getFullYear(), now.getMonth() - (periodCount - 1), 1);
    currentStart.setHours(0, 0, 0, 0);
    // Previous: periodCount mois avant la période actuelle
    const prevMonthEnd = addDays(currentStart, -1);
    const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth() - (periodCount - 1), 1);
    prevMonthStart.setHours(0, 0, 0, 0);
    return { currentStart, currentEnd, previousStart: prevMonthStart, previousEnd: prevMonthEnd, periodCount };
  }

  if (granularity === 'year') {
    // Current: 5 dernières années complètes
    const currentEnd = startOfDay(now);
    const currentStart = new Date(now.getFullYear() - (periodCount - 1), 0, 1);
    currentStart.setHours(0, 0, 0, 0);
    // Previous: periodCount années avant la période actuelle
    const prevYearEnd = addDays(currentStart, -1);
    const prevYearStart = new Date(prevYearEnd.getFullYear() - (periodCount - 1), 0, 1);
    prevYearStart.setHours(0, 0, 0, 0);
    return { currentStart, currentEnd, previousStart: prevYearStart, previousEnd: prevYearEnd, periodCount };
  }

  return { currentStart: now, currentEnd: now, previousStart: now, previousEnd: now, periodCount };
};

/**
 * Get array of period boundaries for charting
 * @param {string} granularity - 'day' | 'week' | 'month' | 'year'
 * @param {Date} startDate - Start of analysis period
 * @param {Date} endDate - End of analysis period
 * @returns {Array} - Array of { startDate, endDate, label } for each period
 */
export const getPeriodBoundaries = (granularity, startDate, endDate) => {
  const periods = [];

  if (granularity === 'day') {
    let current = new Date(startDate);
    let iterations = 0;
    const MAX_ITERATIONS = 366; // Safety guard against infinite loops
    while (current <= endDate && iterations < MAX_ITERATIONS) {
      const dayStart = startOfDay(current);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      periods.push({
        startDate: dayStart,
        endDate: dayEnd,
        label: current.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' })
      });
      current.setDate(current.getDate() + 1);
      iterations++;
    }
    return periods;
  }

  if (granularity === 'week') {
    let current = startOfWeekMon(startDate);
    let iterations = 0;
    const MAX_ITERATIONS = 53; // Safety guard against infinite loops
    while (current <= endDate && iterations < MAX_ITERATIONS) {
      const weekStart = startOfWeekMon(current);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const weekNum = Math.ceil((current.getDate()) / 7);
      periods.push({
        startDate: weekStart,
        endDate: weekEnd,
        label: `S${weekNum}`
      });
      current.setDate(current.getDate() + 7);
      iterations++;
    }
    return periods;
  }

  if (granularity === 'month') {
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    let iterations = 0;
    const MAX_ITERATIONS = 120; // Safety guard against infinite loops (10 years)
    while (current <= endDate && iterations < MAX_ITERATIONS) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      periods.push({
        startDate: monthStart,
        endDate: monthEnd,
        label: monthStart.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      });
      current.setMonth(current.getMonth() + 1);
      iterations++;
    }
    return periods;
  }

  if (granularity === 'year') {
    let current = new Date(startDate.getFullYear(), 0, 1);
    let iterations = 0;
    const MAX_ITERATIONS = 100; // Safety guard against infinite loops
    while (current <= endDate && iterations < MAX_ITERATIONS) {
      const yearStart = new Date(current.getFullYear(), 0, 1);
      yearStart.setHours(0, 0, 0, 0);
      const yearEnd = new Date(current.getFullYear(), 11, 31);
      yearEnd.setHours(23, 59, 59, 999);
      periods.push({
        startDate: yearStart,
        endDate: yearEnd,
        label: yearStart.getFullYear().toString()
      });
      current.setFullYear(current.getFullYear() + 1);
      iterations++;
    }
    return periods;
  }

  return [];
};

/**
 * Get period boundaries for display only (exact count of periods to show)
 * @param {string} granularity - 'day' | 'week' | 'month' | 'year'
 * @returns {Array} - Array of { startDate, endDate, label } for display
 */
export const getDisplayPeriodBoundaries = (granularity) => {
  const now = toParis(new Date());
  const info = getPeriodInfo(granularity);
  const displayCount = info.displayCount;
  const periods = [];

  if (granularity === 'week') {
    // Semaine : 7 derniers jours (granularité par jour)
    for (let i = displayCount - 1; i >= 0; i--) {
      const date = addDays(now, -i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      periods.push({
        startDate: dayStart,
        endDate: dayEnd,
        label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      });
    }
    return periods;
  }

  if (granularity === 'month') {
    // Mois : 4 dernières semaines (granularité par semaine)
    let weekDate = startOfWeekMon(now);
    for (let i = displayCount - 1; i >= 0; i--) {
      const wStart = startOfWeekMon(addDays(weekDate, -(i * 7)));
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);
      // Display week date range: "2-8 déc"
      const label = `${wStart.getDate()}-${wEnd.getDate()} ${wEnd.toLocaleDateString('fr-FR', { month: 'short' })}`;
      periods.push({
        startDate: wStart,
        endDate: wEnd,
        label
      });
    }
    return periods;
  }

  if (granularity === 'year') {
    // Année : 12 derniers mois (granularité par mois)
    const monthsFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    for (let i = displayCount - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      mStart.setHours(0, 0, 0, 0);
      const mEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      mEnd.setHours(23, 59, 59, 999);
      const monthName = monthsFr[mStart.getMonth()];
      periods.push({
        startDate: mStart,
        endDate: mEnd,
        label: monthName
      });
    }
    return periods;
  }

  return [];
};

/**
 * Get display period boundaries shifted by a number of periods into the past
 * Used for comparing with previous period
 * @param {string} granularity - 'day' | 'week' | 'month' | 'year'
 * @param {number} periodOffset - How many periods to go back
 * @returns {Array} - Array of { startDate, endDate, label } for display
 */
export const getDisplayPeriodBoundariesShifted = (granularity, periodOffset = 1) => {
  const now = toParis(new Date());
  const info = getPeriodInfo(granularity);
  const displayCount = info.displayCount;
  const periods = [];

  if (granularity === 'day') {
    const shiftDays = displayCount * periodOffset;
    for (let i = displayCount - 1; i >= 0; i--) {
      const date = addDays(now, -(shiftDays + i));
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      periods.push({
        startDate: dayStart,
        endDate: dayEnd,
        label: date.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    return periods;
  }

  if (granularity === 'week') {
    let weekDate = startOfWeekMon(now);
    const shiftWeeks = displayCount * periodOffset;
    for (let i = displayCount - 1; i >= 0; i--) {
      const wStart = startOfWeekMon(addDays(weekDate, -((shiftWeeks + i) * 7)));
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);
      // Display week date range: "20 jan - 26 jan"
      const label = `${wStart.getDate()} - ${wEnd.getDate()} ${wEnd.toLocaleDateString('fr-FR', { month: 'short' })}`;
      periods.push({
        startDate: wStart,
        endDate: wEnd,
        label
      });
    }
    return periods;
  }

  if (granularity === 'month') {
    const monthsFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    for (let i = displayCount - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (displayCount * periodOffset + i), 1);
      const mStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      mStart.setHours(0, 0, 0, 0);
      const mEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      mEnd.setHours(23, 59, 59, 999);
      const monthName = monthsFr[mStart.getMonth()];
      const year = mStart.getFullYear().toString().slice(-2);
      periods.push({
        startDate: mStart,
        endDate: mEnd,
        label: `${monthName}-${year}`
      });
    }
    return periods;
  }

  if (granularity === 'year') {
    for (let i = displayCount - 1; i >= 0; i--) {
      const yearDate = new Date(now.getFullYear() - (displayCount * periodOffset + i), 0, 1);
      const yStart = new Date(yearDate.getFullYear(), 0, 1);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(yearDate.getFullYear(), 11, 31);
      yEnd.setHours(23, 59, 59, 999);
      periods.push({
        startDate: yStart,
        endDate: yEnd,
        label: yStart.getFullYear().toString()
      });
    }
    return periods;
  }

  return [];
};
