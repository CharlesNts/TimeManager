import { describe, it, expect } from 'vitest';
import {
    toParis,
    pad,
    toISO,
    dateToISO,
    startOfDay,
    endOfDay,
    startOfWeekMon,
    endOfWeekSun,
    firstDayOfMonth,
    lastDayOfMonth,
    addDays,
    minutesBetween,
    minutesSinceMidnightParis
} from '../utils/dateUtils';

describe('dateUtils', () => {
    describe('pad', () => {
        it('pads single digit numbers with leading zero', () => {
            expect(pad(1)).toBe('01');
            expect(pad(9)).toBe('09');
        });

        it('does not pad double digit numbers', () => {
            expect(pad(10)).toBe('10');
            expect(pad(31)).toBe('31');
        });
    });

    describe('toParis', () => {
        it('converts a date to Paris timezone', () => {
            const date = new Date('2025-01-15T12:00:00Z'); // 12:00 UTC
            const parisDate = toParis(date);
            expect(parisDate).toBeInstanceOf(Date);
            // In Jan (Standard time), Paris is UTC+1, so 13:00
            expect(parisDate.getHours()).toBe(13);
        });
    });

    describe('toISO', () => {
        it('formats date as ISO string with time (LocalDateTime format)', () => {
            // Use absolute ISO to ensure 9:30 Paris
            const date = new Date('2025-01-15T09:30:45+01:00');
            const isoStr = toISO(date);
            expect(isoStr).toBe('2025-01-15T09:30:45');
        });
    });

    describe('dateToISO', () => {
        it('formats date as ISO date string only (no time)', () => {
            const date = new Date('2025-01-15T09:30:45+01:00');
            const isoStr = dateToISO(date);
            expect(isoStr).toBe('2025-01-15');
        });
    });

    describe('startOfDay', () => {
        it('sets time to 00:00:00.000', () => {
            const date = new Date(2025, 0, 15, 14, 30, 45);
            const result = startOfDay(date);
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
        });
    });

    describe('endOfDay', () => {
        it('sets time to 23:59:59.999', () => {
            const date = new Date(2025, 0, 15, 9, 0, 0);
            const result = endOfDay(date);
            expect(result.getHours()).toBe(23);
            expect(result.getMinutes()).toBe(59);
            expect(result.getSeconds()).toBe(59);
        });
    });

    describe('startOfWeekMon', () => {
        it('returns Monday for a Wednesday', () => {
            const wednesday = new Date(2025, 0, 15); // Jan 15, 2025 is Wed
            const monday = startOfWeekMon(wednesday);
            expect(monday.getDay()).toBe(1); // Monday
            expect(monday.getDate()).toBe(13); // Jan 13
        });

        it('returns Monday for a Sunday', () => {
            const sunday = new Date(2025, 0, 19); // Jan 19, 2025 is Sun
            const monday = startOfWeekMon(sunday);
            expect(monday.getDay()).toBe(1);
            expect(monday.getDate()).toBe(13); // Goes back to previous Monday
        });

        it('returns same day for a Monday', () => {
            const monday = new Date(2025, 0, 13); // Jan 13, 2025 is Mon
            const result = startOfWeekMon(monday);
            expect(result.getDay()).toBe(1);
            expect(result.getDate()).toBe(13);
        });
    });

    describe('endOfWeekSun', () => {
        it('returns Sunday 23:59:59 for a Wednesday', () => {
            const wednesday = new Date(2025, 0, 15);
            const sunday = endOfWeekSun(wednesday);
            expect(sunday.getDay()).toBe(0); // Sunday
            expect(sunday.getDate()).toBe(19);
            expect(sunday.getHours()).toBe(23);
        });
    });

    describe('firstDayOfMonth', () => {
        it('returns the first day of the month', () => {
            const date = new Date(2025, 5, 15); // June 15
            const first = firstDayOfMonth(date);
            expect(first.getDate()).toBe(1);
            expect(first.getMonth()).toBe(5); // June
        });
    });

    describe('lastDayOfMonth', () => {
        it('returns the last day of the month', () => {
            const date = new Date(2025, 0, 15); // Jan 15
            const last = lastDayOfMonth(date);
            expect(last.getDate()).toBe(31); // January has 31 days
        });

        it('handles February correctly', () => {
            const date = new Date(2025, 1, 10); // Feb 10, 2025
            const last = lastDayOfMonth(date);
            expect(last.getDate()).toBe(28); // 2025 is not a leap year
        });

        it('handles leap year February', () => {
            const date = new Date(2024, 1, 10); // Feb 10, 2024
            const last = lastDayOfMonth(date);
            expect(last.getDate()).toBe(29); // 2024 is a leap year
        });
    });

    describe('addDays', () => {
        it('adds positive days', () => {
            const date = new Date(2025, 0, 15);
            const result = addDays(date, 5);
            expect(result.getDate()).toBe(20);
        });

        it('subtracts when negative days', () => {
            const date = new Date(2025, 0, 15);
            const result = addDays(date, -5);
            expect(result.getDate()).toBe(10);
        });

        it('handles month boundaries', () => {
            const date = new Date(2025, 0, 30); // Jan 30
            const result = addDays(date, 5);
            expect(result.getMonth()).toBe(1); // February
            expect(result.getDate()).toBe(4);
        });
    });

    describe('minutesBetween', () => {
        it('calculates minutes between two dates', () => {
            const a = new Date(2025, 0, 15, 9, 0);
            const b = new Date(2025, 0, 15, 10, 30);
            expect(minutesBetween(a, b)).toBe(90);
        });

        it('returns 0 for negative difference', () => {
            const a = new Date(2025, 0, 15, 10, 0);
            const b = new Date(2025, 0, 15, 9, 0);
            expect(minutesBetween(a, b)).toBe(0);
        });
    });

    describe('minutesSinceMidnightParis', () => {
        it('calculates minutes since midnight', () => {
            // Use an absolute ISO string to avoid local timezone shifts on CI
            // Jan 15, 2025 at 02:30 Paris (Standard Time is UTC+1)
            const date = new Date('2025-01-15T02:30:00+01:00');
            const minutes = minutesSinceMidnightParis(date);
            expect(minutes).toBe(150); // 2*60 + 30
        });
    });
});
