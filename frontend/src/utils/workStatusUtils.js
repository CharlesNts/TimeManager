/**
 * Work status calculation utilities
 * Determines daily work status based on schedule, leaves, and clocks
 */

import { dateToISO } from './dateUtils';

/**
 * Check if a date falls on an approved leave day
 * @param {Date} date - Date to check
 * @param {Array} approvedLeaves - Array of approved leave objects with {startDate, endDate}
 * @returns {boolean} True if the date is covered by an approved leave
 */
export const isApprovedLeaveDay = (date, approvedLeaves) => {
  if (!approvedLeaves || approvedLeaves.length === 0) return false;

  const dateStr = dateToISO(date);

  return approvedLeaves.some(leave => {
    // Leave has startDate and endDate (format: YYYY-MM-DD or full datetime)
    const leaveStart = leave.startDate ? dateToISO(new Date(leave.startDate)) : null;
    const leaveEnd = leave.endDate ? dateToISO(new Date(leave.endDate)) : null;

    return leaveStart && leaveEnd && dateStr >= leaveStart && dateStr <= leaveEnd;
  });
};

/**
 * Check if a date is a scheduled work day
 * @param {Date} date - Date to check
 * @param {Object} schedule - Schedule object with {workDays: [1,2,3,4,5], startTime: '09:00', endTime: '17:30'}
 * @returns {boolean} True if the date is a scheduled work day (not weekend, and in workDays list)
 */
export const isScheduledWorkDay = (date, schedule) => {
  if (!schedule || !schedule.workDays) return false;

  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  return schedule.workDays.includes(dayOfWeek);
};

/**
 * Get expected working hours for a day in minutes
 * @param {Date} date - Date to check
 * @param {Object} schedule - Schedule object with {startTime: '09:00', endTime: '17:30'}
 * @returns {number} Expected minutes for this day (0 if not a work day)
 */
export const getExpectedHoursForDay = (date, schedule) => {
  if (!schedule || !schedule.startTime || !schedule.endTime) {
    return 0;
  }

  // Parse times HH:mm
  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return Math.max(0, endMinutes - startMinutes);
};

/**
 * Get total worked minutes from clocks for a specific day
 * @param {Array} dayClocks - Array of clock entries for this day
 * @returns {number} Total minutes worked
 */
export const getTotalWorkedMinutesForDay = (dayClocks) => {
  if (!dayClocks || dayClocks.length === 0) return 0;

  return dayClocks.reduce((total, clock) => {
    return total + (clock.totalMinutes || 0);
  }, 0);
};

/**
 * Calculate the work status for a specific day
 * @param {Date} date - Date to check
 * @param {Array} dayClocks - Clocks for this day (from aggregateClocksToDaily)
 * @param {Object} schedule - Schedule template with workDays, startTime, endTime
 * @param {Array} approvedLeaves - Array of approved leave objects
 * @returns {string} Status: 'complete' | 'partial' | 'absent' | 'day-off' | 'no-data'
 */
export const calculateDayStatus = (date, dayClocks, schedule, approvedLeaves) => {
  // 1. Check if it's an approved leave or day off
  if (isApprovedLeaveDay(date, approvedLeaves)) {
    return 'day-off';
  }

  // 2. Check if it's a scheduled work day
  const isWorkDay = isScheduledWorkDay(date, schedule);

  if (!isWorkDay) {
    return 'no-data'; // Not a scheduled work day (and not a weekend in calendar)
  }

  // 3. It IS a work day - check clocks
  const totalWorked = getTotalWorkedMinutesForDay(dayClocks);
  const expectedMinutes = getExpectedHoursForDay(date, schedule);

  if (totalWorked === 0 && (!dayClocks || dayClocks.length === 0)) {
    return 'absent'; // Expected to work but no clocks
  }

  if (totalWorked >= expectedMinutes) {
    return 'complete'; // Worked enough hours
  }

  if (totalWorked > 0) {
    return 'partial'; // Worked some hours but not enough
  }

  return 'absent'; // No hours worked
};

/**
 * Get color/style information for a work status
 * @param {string} status - Status from calculateDayStatus
 * @param {boolean} isToday - Whether this is today
 * @returns {Object} Style object with bg, border, text, dot properties
 */
export const getStatusStyle = (status, isToday = false) => {
  // Today has special styling regardless of status
  if (isToday) {
    return {
      bg: 'bg-blue-100',
      border: 'border-blue-500 border-4',
      text: 'text-blue-900',
      dot: 'bg-blue-500'
    };
  }

  switch (status) {
    case 'complete':
      return { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', dot: 'bg-green-500' };
    case 'partial':
      return { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', dot: 'bg-orange-500' };
    case 'absent':
      return { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', dot: 'bg-red-500' };
    case 'day-off':
      return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', dot: 'bg-gray-400' };
    case 'weekend':
      return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', dot: 'bg-gray-300' };
    case 'planned-work':
      return { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-700', dot: 'bg-gray-300' };
    default:
      return { bg: 'bg-white', border: 'border-gray-100', text: 'text-gray-300', dot: 'bg-gray-200' };
  }
};
