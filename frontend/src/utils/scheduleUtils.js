/**
 * Utilities for calculating scheduled hours from ScheduleTemplate
 * Converts weekly pattern JSON into actual scheduled minutes for a date range
 */

/**
 * Parse the weekly pattern JSON from a ScheduleTemplate
 * @param {string|object} weeklyPatternJson - The pattern JSON (string or object)
 * @returns {object|null} - Parsed pattern or null if invalid
 */
export function parseWeeklyPattern(weeklyPatternJson) {
    if (!weeklyPatternJson) return null;

    try {
        const pattern = typeof weeklyPatternJson === 'string'
            ? JSON.parse(weeklyPatternJson)
            : weeklyPatternJson;
        return pattern;
    } catch (e) {
        console.warn('[scheduleUtils] Error parsing weekly pattern:', e);
        return null;
    }
}

// Day mappings are handled directly in getScheduledMinutesForDate

/**
 * Get the scheduled minutes for a specific date based on the weekly pattern
 * @param {Date} date - The date to check
 * @param {object} pattern - The parsed weekly pattern
 * @param {Date} [limitDate] - Optional limit time (calculation stops at this time for this date)
 * @returns {number} - Minutes scheduled for that day
 */
export function getScheduledMinutesForDate(date, pattern, limitDate = null) {
    if (!pattern || !date) return 0;

    const jsDay = date.getDay(); // 0=Sunday, 1=Monday, etc.

    // Find the day key that matches this JS day
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = dayKeys[jsDay];

    const daySchedule = pattern[dayKey];
    if (!daySchedule || !Array.isArray(daySchedule) || daySchedule.length === 0) {
        return 0; // No work scheduled for this day
    }

    let totalMinutes = 0;
    const limitMinutes = limitDate ? (limitDate.getHours() * 60 + limitDate.getMinutes()) : null;

    // Each day can have multiple time slots (e.g., morning and afternoon)
    daySchedule.forEach(slot => {
        if (Array.isArray(slot) && slot.length >= 2) {
            const [startTime, endTime] = slot;
            const startMinutes = parseTimeToMinutes(startTime);
            let endMinutes = parseTimeToMinutes(endTime);

            if (startMinutes !== null && endMinutes !== null) {
                // Apply time limit if current date matches limitDate
                if (limitMinutes !== null) {
                    // If slot starts after limit, it doesn't count
                    if (startMinutes >= limitMinutes) {
                        return;
                    }
                    // If slot ends after limit, cap it
                    if (endMinutes > limitMinutes) {
                        endMinutes = limitMinutes;
                    }
                }

                if (endMinutes > startMinutes) {
                    totalMinutes += endMinutes - startMinutes;
                }
            }
        }
    });

    return totalMinutes;
}

/**
 * Parse a time string (HH:MM) to minutes since midnight
 * @param {string} timeStr - Time string like "09:00" or "17:30"
 * @returns {number|null} - Minutes since midnight or null if invalid
 */
function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;

    const parts = timeStr.split(':');
    if (parts.length < 2) return null;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    return hours * 60 + minutes;
}

/**
 * Calculate total scheduled minutes for a date range based on schedule template
 * @param {Date} startDate - Start of the period (inclusive)
 * @param {Date} endDate - End of the period (inclusive)
 * @param {object} scheduleTemplate - The schedule template object with weeklyPatternJson
 * @returns {object} - { totalMinutes, dailyMap: { 'YYYY-MM-DD': minutes } }
 */
export function calculateScheduledMinutesFromTemplate(startDate, endDate, scheduleTemplate) {
    const result = {
        totalMinutes: 0,
        dailyMap: {}
    };

    if (!scheduleTemplate || !scheduleTemplate.weeklyPatternJson) {
        return result;
    }

    const pattern = parseWeeklyPattern(scheduleTemplate.weeklyPatternJson);
    if (!pattern) {
        return result;
    }

    // Iterate through each day in the range
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    // End date reference for comparison
    const endRef = new Date(endDate);
    // Note: We don't force endRef to 23:59:59 anymore to respect precise endDate if provided
    // However, to ensure we include the last day in the loop, we compare dates (year/month/day)

    // Helper to get day string
    const getDayStr = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const endDayStr = getDayStr(endRef);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const currentDayStr = getDayStr(current);

        // Stop if we passed the end day
        if (current > endRef && currentDayStr !== endDayStr) break;

        // Check if this is the last day to apply time limit
        // We apply limit if it's the exact same day as endDate
        const isLimitDay = currentDayStr === endDayStr;
        const limitDate = isLimitDay ? endRef : null;

        const minutes = getScheduledMinutesForDate(current, pattern, limitDate);

        if (minutes > 0) {
            const dayKey = formatDateKey(current);
            result.dailyMap[dayKey] = minutes;
            result.totalMinutes += minutes;
        }

        // Check break condition after processing
        if (currentDayStr === endDayStr) break;

        // Move to next day
        current.setDate(current.getDate() + 1);
    }

    return result;
}

/**
 * Calculate scheduled minutes for multiple teams and their members
 * Used by ManagerDashboard which manages multiple teams
 * @param {Date} startDate - Start of the period
 * @param {Date} endDate - End of the period
 * @param {Array} teams - Array of team objects
 * @param {object} schedulesByTeamId - Map of teamId to schedule template
 * @param {object} teamMembersMap - Map of teamId to array of member userIds
 * @returns {object} - { totalMinutes, dailyMap }
 */
export function calculateScheduledMinutesForTeams(startDate, endDate, teams, schedulesByTeamId, teamMembersMap) {
    const result = {
        totalMinutes: 0,
        dailyMap: {}
    };

    teams.forEach(team => {
        const schedule = schedulesByTeamId[team.id];
        if (!schedule) return;

        const memberCount = (teamMembersMap[team.id] || []).length;
        if (memberCount === 0) return;

        const teamScheduled = calculateScheduledMinutesFromTemplate(startDate, endDate, schedule);

        // Multiply by number of members in the team
        Object.entries(teamScheduled.dailyMap).forEach(([dayKey, minutes]) => {
            const totalForDay = minutes * memberCount;
            result.dailyMap[dayKey] = (result.dailyMap[dayKey] || 0) + totalForDay;
            result.totalMinutes += totalForDay;
        });
    });

    return result;
}

/**
 * Format a date as YYYY-MM-DD for use as a map key
 * @param {Date} date 
 * @returns {string}
 */
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculate overlap between worked hours and scheduled hours for adherence
 * @param {object} dailyWorkedMap - Map of 'YYYY-MM-DD' to minutes worked
 * @param {object} dailyScheduledMap - Map of 'YYYY-MM-DD' to minutes scheduled
 * @returns {object} - { overlapMinutes, scheduledMinutes, rate }
 */
export function calculateAdherenceFromMaps(dailyWorkedMap, dailyScheduledMap) {
    let totalScheduled = 0;
    let totalOverlap = 0;

    Object.entries(dailyScheduledMap).forEach(([dayKey, scheduledMinutes]) => {
        totalScheduled += scheduledMinutes;

        const workedMinutes = dailyWorkedMap[dayKey] || 0;
        // Overlap is the minimum of worked and scheduled (can't have more than 100% adherence per day)
        const overlap = Math.min(workedMinutes, scheduledMinutes);
        totalOverlap += overlap;
    });

    const rate = totalScheduled > 0
        ? Math.min(100, (totalOverlap / totalScheduled) * 100)
        : 0;

    return {
        overlapMinutes: totalOverlap,
        scheduledMinutes: totalScheduled,
        rate
    };
}
