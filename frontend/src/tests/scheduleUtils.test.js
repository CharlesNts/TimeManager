import { describe, it, expect } from 'vitest';
import {
    parseWeeklyPattern,
    getScheduledMinutesForDate,
    calculateScheduledMinutesFromTemplate,
    calculateScheduledMinutesForTeams,
    calculateAdherenceFromMaps
} from '../utils/scheduleUtils';

describe('scheduleUtils', () => {
    describe('parseWeeklyPattern', () => {
        it('parses a JSON string pattern', () => {
            const pattern = '{"mon": [["09:00", "17:00"]], "tue": [["09:00", "17:00"]]}';
            const result = parseWeeklyPattern(pattern);
            expect(result).toHaveProperty('mon');
            expect(result).toHaveProperty('tue');
        });

        it('returns the object if already parsed', () => {
            const pattern = { mon: [['09:00', '17:00']] };
            const result = parseWeeklyPattern(pattern);
            expect(result).toEqual(pattern);
        });

        it('returns null for null input', () => {
            expect(parseWeeklyPattern(null)).toBeNull();
        });

        it('returns null for invalid JSON', () => {
            expect(parseWeeklyPattern('invalid json')).toBeNull();
        });
    });

    describe('getScheduledMinutesForDate', () => {
        const pattern = {
            mon: [['09:00', '17:00']],
            tue: [['09:00', '17:00']],
            wed: [['09:00', '17:00']],
            thu: [['09:00', '17:00']],
            fri: [['09:00', '17:00']],
            sat: [],
            sun: []
        };

        it('returns scheduled minutes for a work day', () => {
            const monday = new Date(2025, 0, 13); // Monday
            const minutes = getScheduledMinutesForDate(monday, pattern);
            expect(minutes).toBe(480); // 8 hours
        });

        it('returns 0 for a non-work day', () => {
            const saturday = new Date(2025, 0, 18); // Saturday
            const minutes = getScheduledMinutesForDate(saturday, pattern);
            expect(minutes).toBe(0);
        });

        it('returns 0 for null pattern', () => {
            const monday = new Date(2025, 0, 13);
            expect(getScheduledMinutesForDate(monday, null)).toBe(0);
        });

        it('returns 0 for null date', () => {
            expect(getScheduledMinutesForDate(null, pattern)).toBe(0);
        });

        it('handles multiple time slots per day', () => {
            const patternWithBreak = {
                mon: [['09:00', '12:00'], ['13:00', '17:00']] // Morning + afternoon
            };
            const monday = new Date(2025, 0, 13);
            const minutes = getScheduledMinutesForDate(monday, patternWithBreak);
            expect(minutes).toBe(420); // 3 + 4 = 7 hours
        });

        it('applies time limit when provided', () => {
            const monday = new Date(2025, 0, 13);
            const limitAt12 = new Date(2025, 0, 13, 12, 0, 0);
            const minutes = getScheduledMinutesForDate(monday, pattern, limitAt12);
            expect(minutes).toBe(180); // 9:00-12:00 = 3 hours
        });
    });

    describe('calculateScheduledMinutesFromTemplate', () => {
        const scheduleTemplate = {
            weeklyPatternJson: JSON.stringify({
                mon: [['09:00', '17:00']],
                tue: [['09:00', '17:00']],
                wed: [['09:00', '17:00']],
                thu: [['09:00', '17:00']],
                fri: [['09:00', '17:00']],
                sat: [],
                sun: []
            })
        };

        it('calculates total minutes for a week', () => {
            const startDate = new Date(2025, 0, 13); // Monday
            const endDate = new Date(2025, 0, 17, 23, 59, 59); // Friday end of day
            const result = calculateScheduledMinutesFromTemplate(startDate, endDate, scheduleTemplate);

            expect(result.totalMinutes).toBe(2400); // 5 days * 8 hours = 40 hours = 2400 minutes
            expect(Object.keys(result.dailyMap).length).toBe(5);
        });

        it('returns empty result for missing template', () => {
            const startDate = new Date(2025, 0, 13);
            const endDate = new Date(2025, 0, 17);
            const result = calculateScheduledMinutesFromTemplate(startDate, endDate, null);

            expect(result.totalMinutes).toBe(0);
            expect(Object.keys(result.dailyMap).length).toBe(0);
        });

        it('returns empty result for missing weeklyPatternJson', () => {
            const startDate = new Date(2025, 0, 13);
            const endDate = new Date(2025, 0, 17);
            const result = calculateScheduledMinutesFromTemplate(startDate, endDate, {});

            expect(result.totalMinutes).toBe(0);
        });

        it('excludes weekends from calculation', () => {
            const startDate = new Date(2025, 0, 13); // Monday
            const endDate = new Date(2025, 0, 19); // Sunday (includes Sat/Sun)
            const result = calculateScheduledMinutesFromTemplate(startDate, endDate, scheduleTemplate);

            expect(result.totalMinutes).toBe(2400); // Still 5 work days
        });
    });

    describe('calculateScheduledMinutesForTeams', () => {
        const schedulesByTeamId = {
            1: {
                weeklyPatternJson: JSON.stringify({
                    mon: [['09:00', '17:00']],
                    tue: [['09:00', '17:00']],
                    wed: [['09:00', '17:00']],
                    thu: [['09:00', '17:00']],
                    fri: [['09:00', '17:00']]
                })
            }
        };

        it('calculates minutes multiplied by team member count', () => {
            const teams = [{ id: 1 }];
            const teamMembersMap = { 1: [101, 102, 103] }; // 3 members
            const startDate = new Date(2025, 0, 13); // Monday
            const endDate = new Date(2025, 0, 13, 23, 59, 59); // Same day end of day

            const result = calculateScheduledMinutesForTeams(
                startDate, endDate, teams, schedulesByTeamId, teamMembersMap
            );

            expect(result.totalMinutes).toBe(1440); // 480 * 3 members
        });

        it('returns empty result for team without schedule', () => {
            const teams = [{ id: 2 }]; // No schedule for team 2
            const teamMembersMap = { 2: [101, 102] };
            const startDate = new Date(2025, 0, 13);
            const endDate = new Date(2025, 0, 13);

            const result = calculateScheduledMinutesForTeams(
                startDate, endDate, teams, schedulesByTeamId, teamMembersMap
            );

            expect(result.totalMinutes).toBe(0);
        });

        it('returns empty result for team without members', () => {
            const teams = [{ id: 1 }];
            const teamMembersMap = { 1: [] }; // No members
            const startDate = new Date(2025, 0, 13);
            const endDate = new Date(2025, 0, 13);

            const result = calculateScheduledMinutesForTeams(
                startDate, endDate, teams, schedulesByTeamId, teamMembersMap
            );

            expect(result.totalMinutes).toBe(0);
        });
    });

    describe('calculateAdherenceFromMaps', () => {
        it('calculates 100% adherence when worked equals scheduled', () => {
            const dailyWorkedMap = { '2025-01-13': 480 };
            const dailyScheduledMap = { '2025-01-13': 480 };

            const result = calculateAdherenceFromMaps(dailyWorkedMap, dailyScheduledMap);

            expect(result.rate).toBe(100);
            expect(result.overlapMinutes).toBe(480);
            expect(result.scheduledMinutes).toBe(480);
        });

        it('calculates partial adherence', () => {
            const dailyWorkedMap = { '2025-01-13': 240 };
            const dailyScheduledMap = { '2025-01-13': 480 };

            const result = calculateAdherenceFromMaps(dailyWorkedMap, dailyScheduledMap);

            expect(result.rate).toBe(50);
            expect(result.overlapMinutes).toBe(240);
        });

        it('caps adherence at 100% even if worked more', () => {
            const dailyWorkedMap = { '2025-01-13': 600 };
            const dailyScheduledMap = { '2025-01-13': 480 };

            const result = calculateAdherenceFromMaps(dailyWorkedMap, dailyScheduledMap);

            expect(result.rate).toBe(100);
            expect(result.overlapMinutes).toBe(480); // Capped at scheduled
        });

        it('handles missing work days', () => {
            const dailyWorkedMap = {};
            const dailyScheduledMap = { '2025-01-13': 480 };

            const result = calculateAdherenceFromMaps(dailyWorkedMap, dailyScheduledMap);

            expect(result.rate).toBe(0);
            expect(result.overlapMinutes).toBe(0);
        });

        it('returns 0 rate for empty scheduled map', () => {
            const dailyWorkedMap = { '2025-01-13': 480 };
            const dailyScheduledMap = {};

            const result = calculateAdherenceFromMaps(dailyWorkedMap, dailyScheduledMap);

            expect(result.rate).toBe(0);
        });

        it('aggregates across multiple days', () => {
            const dailyWorkedMap = {
                '2025-01-13': 480,
                '2025-01-14': 240
            };
            const dailyScheduledMap = {
                '2025-01-13': 480,
                '2025-01-14': 480
            };

            const result = calculateAdherenceFromMaps(dailyWorkedMap, dailyScheduledMap);

            expect(result.overlapMinutes).toBe(720); // 480 + 240
            expect(result.scheduledMinutes).toBe(960);
            expect(result.rate).toBe(75); // 720/960 = 75%
        });
    });
});
