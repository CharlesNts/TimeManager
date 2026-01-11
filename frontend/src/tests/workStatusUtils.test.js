import { describe, it, expect } from 'vitest';
import {
    isApprovedLeaveDay,
    isScheduledWorkDay,
    getExpectedHoursForDay,
    getTotalWorkedMinutesForDay,
    calculateDayStatus,
    getStatusStyle
} from '../utils/workStatusUtils';

describe('workStatusUtils', () => {
    describe('isApprovedLeaveDay', () => {
        it('returns false for empty leaves array', () => {
            const date = new Date(2025, 0, 15);
            expect(isApprovedLeaveDay(date, [])).toBe(false);
        });

        it('returns false for null leaves', () => {
            const date = new Date(2025, 0, 15);
            expect(isApprovedLeaveDay(date, null)).toBe(false);
        });

        it('returns true when date falls within a leave period', () => {
            const date = new Date(2025, 0, 15);
            const leaves = [
                { startDate: '2025-01-10', endDate: '2025-01-20' }
            ];
            expect(isApprovedLeaveDay(date, leaves)).toBe(true);
        });

        it('returns false when date is outside leave period', () => {
            const date = new Date(2025, 0, 25);
            const leaves = [
                { startDate: '2025-01-10', endDate: '2025-01-20' }
            ];
            expect(isApprovedLeaveDay(date, leaves)).toBe(false);
        });

        it('returns true for exact start date', () => {
            const date = new Date(2025, 0, 10);
            const leaves = [
                { startDate: '2025-01-10', endDate: '2025-01-20' }
            ];
            expect(isApprovedLeaveDay(date, leaves)).toBe(true);
        });

        it('returns true for exact end date', () => {
            const date = new Date(2025, 0, 20);
            const leaves = [
                { startDate: '2025-01-10', endDate: '2025-01-20' }
            ];
            expect(isApprovedLeaveDay(date, leaves)).toBe(true);
        });
    });

    describe('isScheduledWorkDay', () => {
        const schedule = { workDays: [1, 2, 3, 4, 5] }; // Mon-Fri

        it('returns true for a weekday in schedule', () => {
            const monday = new Date(2025, 0, 13); // Monday
            expect(isScheduledWorkDay(monday, schedule)).toBe(true);
        });

        it('returns false for weekend not in schedule', () => {
            const saturday = new Date(2025, 0, 18); // Saturday
            expect(isScheduledWorkDay(saturday, schedule)).toBe(false);
        });

        it('returns false for null schedule', () => {
            const monday = new Date(2025, 0, 13);
            expect(isScheduledWorkDay(monday, null)).toBe(false);
        });

        it('returns false for schedule without workDays', () => {
            const monday = new Date(2025, 0, 13);
            expect(isScheduledWorkDay(monday, {})).toBe(false);
        });
    });

    describe('getExpectedHoursForDay', () => {
        it('calculates minutes from startTime and endTime', () => {
            const schedule = { startTime: '09:00', endTime: '17:30' };
            expect(getExpectedHoursForDay(new Date(), schedule)).toBe(510); // 8.5 hours
        });

        it('returns 0 for missing schedule', () => {
            expect(getExpectedHoursForDay(new Date(), null)).toBe(0);
        });

        it('returns 0 for missing times', () => {
            expect(getExpectedHoursForDay(new Date(), {})).toBe(0);
        });

        it('handles different time formats', () => {
            const schedule = { startTime: '08:00', endTime: '16:00' };
            expect(getExpectedHoursForDay(new Date(), schedule)).toBe(480); // 8 hours
        });
    });

    describe('getTotalWorkedMinutesForDay', () => {
        it('returns 0 for empty clocks', () => {
            expect(getTotalWorkedMinutesForDay([])).toBe(0);
        });

        it('returns 0 for null clocks', () => {
            expect(getTotalWorkedMinutesForDay(null)).toBe(0);
        });

        it('sums totalMinutes from all clock entries', () => {
            const clocks = [
                { totalMinutes: 240 },
                { totalMinutes: 120 }
            ];
            expect(getTotalWorkedMinutesForDay(clocks)).toBe(360);
        });

        it('handles clocks without totalMinutes', () => {
            const clocks = [
                { totalMinutes: 240 },
                {}
            ];
            expect(getTotalWorkedMinutesForDay(clocks)).toBe(240);
        });
    });

    describe('calculateDayStatus', () => {
        const schedule = {
            workDays: [1, 2, 3, 4, 5],
            startTime: '09:00',
            endTime: '17:00'
        };

        it('returns "day-off" for approved leave day', () => {
            const date = new Date(2025, 0, 15); // Wednesday
            const leaves = [{ startDate: '2025-01-10', endDate: '2025-01-20' }];
            expect(calculateDayStatus(date, [], schedule, leaves)).toBe('day-off');
        });

        it('returns "no-data" for non-work day', () => {
            const saturday = new Date(2025, 0, 18);
            expect(calculateDayStatus(saturday, [], schedule, [])).toBe('no-data');
        });

        it('returns "absent" for work day with no clocks', () => {
            const monday = new Date(2025, 0, 13);
            expect(calculateDayStatus(monday, [], schedule, [])).toBe('absent');
        });

        it('returns "complete" when worked enough hours', () => {
            const monday = new Date(2025, 0, 13);
            const clocks = [{ totalMinutes: 480 }]; // 8 hours
            expect(calculateDayStatus(monday, clocks, schedule, [])).toBe('complete');
        });

        it('returns "partial" when worked some but not enough', () => {
            const monday = new Date(2025, 0, 13);
            const clocks = [{ totalMinutes: 240 }]; // 4 hours
            expect(calculateDayStatus(monday, clocks, schedule, [])).toBe('partial');
        });
    });

    describe('getStatusStyle', () => {
        it('returns today style when isToday is true', () => {
            const style = getStatusStyle('complete', true);
            expect(style.bg).toBe('bg-blue-100');
            expect(style.border).toContain('border-blue');
        });

        it('returns complete style', () => {
            const style = getStatusStyle('complete');
            expect(style.bg).toBe('bg-green-100');
        });

        it('returns partial style', () => {
            const style = getStatusStyle('partial');
            expect(style.bg).toBe('bg-orange-100');
        });

        it('returns absent style', () => {
            const style = getStatusStyle('absent');
            expect(style.bg).toBe('bg-red-100');
        });

        it('returns day-off style', () => {
            const style = getStatusStyle('day-off');
            expect(style.bg).toBe('bg-gray-100');
        });

        it('returns weekend style', () => {
            const style = getStatusStyle('weekend');
            expect(style.bg).toBe('bg-gray-50');
        });

        it('returns planned-work style', () => {
            const style = getStatusStyle('planned-work');
            expect(style.bg).toBe('bg-white');
        });

        it('returns default style for unknown status', () => {
            const style = getStatusStyle('unknown');
            expect(style.bg).toBe('bg-white');
        });
    });
});
