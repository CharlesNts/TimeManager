import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getPeriodInfo,
    calculatePeriodDates,
    getPeriodBoundaries,
    getDisplayPeriodBoundaries,
    getDisplayPeriodBoundariesShifted
} from '../utils/granularityUtils';

describe('granularityUtils', () => {
    describe('getPeriodInfo', () => {
        it('returns week info for "week" granularity', () => {
            const info = getPeriodInfo('week');
            expect(info.periodCount).toBe(7);
            expect(info.displayCount).toBe(7);
            expect(info.groupBy).toBe('day');
        });

        it('returns month info for "month" granularity', () => {
            const info = getPeriodInfo('month');
            expect(info.periodCount).toBe(4);
            expect(info.displayCount).toBe(4);
            expect(info.groupBy).toBe('week');
        });

        it('returns year info for "year" granularity', () => {
            const info = getPeriodInfo('year');
            expect(info.periodCount).toBe(12);
            expect(info.displayCount).toBe(12);
            expect(info.groupBy).toBe('month');
        });

        it('defaults to week for unknown granularity', () => {
            const info = getPeriodInfo('unknown');
            expect(info.periodCount).toBe(7);
        });
    });

    describe('calculatePeriodDates', () => {
        it('returns date objects for week granularity', () => {
            const result = calculatePeriodDates('week');
            expect(result.currentStart).toBeInstanceOf(Date);
            expect(result.currentEnd).toBeInstanceOf(Date);
            expect(result.previousStart).toBeInstanceOf(Date);
            expect(result.previousEnd).toBeInstanceOf(Date);
            expect(result.periodCount).toBeDefined();
        });

        it('returns date objects for month granularity', () => {
            const result = calculatePeriodDates('month');
            expect(result.currentStart).toBeInstanceOf(Date);
            expect(result.currentEnd).toBeInstanceOf(Date);
        });

        it('returns date objects for year granularity', () => {
            const result = calculatePeriodDates('year');
            expect(result.currentStart).toBeInstanceOf(Date);
            expect(result.currentEnd).toBeInstanceOf(Date);
        });

        it('currentStart is before currentEnd', () => {
            const result = calculatePeriodDates('month');
            expect(result.currentStart.getTime()).toBeLessThan(result.currentEnd.getTime());
        });
    });

    describe('getPeriodBoundaries', () => {
        it('returns array of periods for day granularity', () => {
            const startDate = new Date(2025, 0, 1);
            const endDate = new Date(2025, 0, 7);
            const periods = getPeriodBoundaries('day', startDate, endDate);

            expect(Array.isArray(periods)).toBe(true);
            expect(periods.length).toBe(7);
            periods.forEach(period => {
                expect(period).toHaveProperty('startDate');
                expect(period).toHaveProperty('endDate');
                expect(period).toHaveProperty('label');
            });
        });

        it('returns array of periods for week granularity', () => {
            const startDate = new Date(2025, 0, 1);
            const endDate = new Date(2025, 0, 31);
            const periods = getPeriodBoundaries('week', startDate, endDate);

            expect(Array.isArray(periods)).toBe(true);
            expect(periods.length).toBeGreaterThan(0);
        });

        it('returns array of periods for month granularity', () => {
            const startDate = new Date(2025, 0, 1);
            const endDate = new Date(2025, 11, 31);
            const periods = getPeriodBoundaries('month', startDate, endDate);

            expect(Array.isArray(periods)).toBe(true);
            expect(periods.length).toBe(12);
        });

        it('returns array of periods for year granularity', () => {
            const startDate = new Date(2020, 0, 1);
            const endDate = new Date(2025, 11, 31);
            const periods = getPeriodBoundaries('year', startDate, endDate);

            expect(Array.isArray(periods)).toBe(true);
            expect(periods.length).toBe(6); // 2020-2025
        });

        it('returns empty array for unknown granularity', () => {
            const startDate = new Date(2025, 0, 1);
            const endDate = new Date(2025, 0, 31);
            const periods = getPeriodBoundaries('unknown', startDate, endDate);

            expect(periods).toEqual([]);
        });

        it('handles same start and end date', () => {
            const date = new Date(2025, 0, 15);
            const periods = getPeriodBoundaries('day', date, date);

            expect(periods.length).toBe(1);
        });

        it('does not infinite loop with edge case dates', () => {
            const startDate = new Date(2025, 0, 1);
            const endDate = new Date(2025, 0, 1);

            // This should complete quickly without hanging
            const periods = getPeriodBoundaries('day', startDate, endDate);
            expect(periods.length).toBeLessThanOrEqual(366);
        });
    });

    describe('getDisplayPeriodBoundaries', () => {
        it('returns array for week granularity', () => {
            const periods = getDisplayPeriodBoundaries('week');
            expect(Array.isArray(periods)).toBe(true);
            expect(periods.length).toBe(7);
        });

        it('returns array for month granularity', () => {
            const periods = getDisplayPeriodBoundaries('month');
            expect(Array.isArray(periods)).toBe(true);
            expect(periods.length).toBe(4);
        });

        it('returns array for year granularity', () => {
            const periods = getDisplayPeriodBoundaries('year');
            expect(Array.isArray(periods)).toBe(true);
            expect(periods.length).toBe(12);
        });
    });

    describe('getDisplayPeriodBoundariesShifted', () => {
        it('returns shifted periods for day granularity', () => {
            const periods = getDisplayPeriodBoundariesShifted('day', 1);
            expect(Array.isArray(periods)).toBe(true);
        });

        it('returns shifted periods for week granularity', () => {
            const periods = getDisplayPeriodBoundariesShifted('week', 1);
            expect(Array.isArray(periods)).toBe(true);
        });

        it('returns shifted periods for month granularity', () => {
            const periods = getDisplayPeriodBoundariesShifted('month', 1);
            expect(Array.isArray(periods)).toBe(true);
        });

        it('returns shifted periods for year granularity', () => {
            const periods = getDisplayPeriodBoundariesShifted('year', 1);
            expect(Array.isArray(periods)).toBe(true);
        });
    });
});
