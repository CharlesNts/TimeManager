import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api/client';
import {
    clockIn,
    clockOut,
    getClockHistory,
    getCurrentClock,
    createPause,
    stopPause,
    deletePause,
    getClockPauses,
    calculateTotalPauseTime,
    calculateNetWorkTime,
    getClocksInRange,
    getClocksWithPagination
} from '../api/clocks.api';

// Mock the API client
vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    }
}));

describe('clocks.api', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ====== CLOCK IN/OUT ======
    describe('clockIn', () => {
        it('calls POST to clock in endpoint', async () => {
            const mockClock = { id: 1, clockIn: '2025-01-15T09:00:00' };
            api.post.mockResolvedValue({ data: mockClock });

            const result = await clockIn(1);

            expect(api.post).toHaveBeenCalledWith('/api/users/1/clocks/in');
            expect(result).toEqual(mockClock);
        });

        it('passes when parameter when provided', async () => {
            api.post.mockResolvedValue({ data: {} });

            await clockIn(1, '2025-01-15T09:00:00');

            expect(api.post).toHaveBeenCalledWith('/api/users/1/clocks/in?when=2025-01-15T09:00:00');
        });

        it('throws error on API failure', async () => {
            api.post.mockRejectedValue(new Error('Server error'));

            await expect(clockIn(1)).rejects.toThrow('Server error');
        });
    });

    describe('clockOut', () => {
        it('calls POST to clock out endpoint', async () => {
            const mockClock = { id: 1, clockIn: '2025-01-15T09:00:00', clockOut: '2025-01-15T17:00:00' };
            api.post.mockResolvedValue({ data: mockClock });

            const result = await clockOut(1);

            expect(api.post).toHaveBeenCalledWith('/api/users/1/clocks/out');
            expect(result).toEqual(mockClock);
        });

        it('passes when parameter when provided', async () => {
            api.post.mockResolvedValue({ data: {} });

            await clockOut(1, '2025-01-15T17:00:00');

            expect(api.post).toHaveBeenCalledWith('/api/users/1/clocks/out?when=2025-01-15T17:00:00');
        });
    });

    // ====== CLOCK HISTORY ======
    describe('getClockHistory', () => {
        it('returns clock content array', async () => {
            const mockClocks = [{ id: 1 }, { id: 2 }];
            api.get.mockResolvedValue({ data: { content: mockClocks } });

            const result = await getClockHistory(1);

            expect(result).toEqual(mockClocks);
        });

        it('returns empty array on error', async () => {
            api.get.mockRejectedValue(new Error('Network error'));

            const result = await getClockHistory(1);

            expect(result).toEqual([]);
        });

        it('uses default period of 7', async () => {
            api.get.mockResolvedValue({ data: { content: [] } });

            await getClockHistory(1);

            expect(api.get).toHaveBeenCalledWith('/api/users/1/clocks', {
                params: { period: 7, page: 0, size: 100, sort: 'clockIn,desc' }
            });
        });
    });

    describe('getCurrentClock', () => {
        it('returns active clock (no clockOut)', async () => {
            const activeClock = { id: 1, clockIn: '2025-01-15T09:00:00', clockOut: null };
            api.get.mockResolvedValue({ data: { content: [activeClock] } });

            const result = await getCurrentClock(1);

            expect(result).toEqual(activeClock);
        });

        it('returns null if no active clock', async () => {
            const completedClock = { id: 1, clockIn: '2025-01-15T09:00:00', clockOut: '2025-01-15T17:00:00' };
            api.get.mockResolvedValue({ data: { content: [completedClock] } });

            const result = await getCurrentClock(1);

            expect(result).toBeNull();
        });

        it('returns null on error', async () => {
            api.get.mockRejectedValue(new Error('Network error'));

            const result = await getCurrentClock(1);

            expect(result).toBeNull();
        });
    });

    // ====== PAUSES ======
    describe('createPause', () => {
        it('creates pause with provided data', async () => {
            const mockPause = { id: 1, startAt: '2025-01-15T12:00:00' };
            api.post.mockResolvedValue({ data: mockPause });

            const result = await createPause(100, { startAt: '2025-01-15T12:00:00' });

            expect(api.post).toHaveBeenCalledWith('/api/clocks/100/pauses', expect.objectContaining({
                startAt: '2025-01-15T12:00:00'
            }));
            expect(result).toEqual(mockPause);
        });

        it('throws on error', async () => {
            api.post.mockRejectedValue(new Error('Cannot create pause'));

            await expect(createPause(100)).rejects.toThrow();
        });
    });

    describe('stopPause', () => {
        it('patches pause with endAt', async () => {
            const mockPause = { id: 1, endAt: '2025-01-15T12:30:00' };
            api.patch.mockResolvedValue({ data: mockPause });

            const result = await stopPause(100, 1, { endAt: '2025-01-15T12:30:00' });

            expect(api.patch).toHaveBeenCalledWith('/api/clocks/100/pauses/1', { endAt: '2025-01-15T12:30:00' });
            expect(result).toEqual(mockPause);
        });
    });

    describe('deletePause', () => {
        it('deletes pause and returns true', async () => {
            api.delete.mockResolvedValue({});

            const result = await deletePause(100, 1);

            expect(api.delete).toHaveBeenCalledWith('/api/clocks/100/pauses/1');
            expect(result).toBe(true);
        });
    });

    describe('getClockPauses', () => {
        it('returns array of pauses', async () => {
            const mockPauses = [{ id: 1 }, { id: 2 }];
            api.get.mockResolvedValue({ data: mockPauses });

            const result = await getClockPauses(100);

            expect(result).toEqual(mockPauses);
        });

        it('returns empty array on error', async () => {
            api.get.mockRejectedValue(new Error('Network error'));

            const result = await getClockPauses(100);

            expect(result).toEqual([]);
        });
    });

    // ====== UTILITY FUNCTIONS ======
    describe('calculateTotalPauseTime', () => {
        it('returns 0 for null/undefined', () => {
            expect(calculateTotalPauseTime(null)).toBe(0);
            expect(calculateTotalPauseTime(undefined)).toBe(0);
        });

        it('returns 0 for empty array', () => {
            expect(calculateTotalPauseTime([])).toBe(0);
        });

        it('calculates total pause time in minutes', () => {
            const pauses = [
                { startTime: '2025-01-15T12:00:00', endTime: '2025-01-15T12:30:00' }, // 30 min
                { startTime: '2025-01-15T15:00:00', endTime: '2025-01-15T15:15:00' }, // 15 min
            ];

            const result = calculateTotalPauseTime(pauses);

            expect(result).toBe(45);
        });

        it('ignores pauses without endTime', () => {
            const pauses = [
                { startTime: '2025-01-15T12:00:00', endTime: '2025-01-15T12:30:00' }, // 30 min
                { startTime: '2025-01-15T15:00:00', endTime: null }, // ongoing, ignored
            ];

            const result = calculateTotalPauseTime(pauses);

            expect(result).toBe(30);
        });
    });

    describe('calculateNetWorkTime', () => {
        it('returns 0 for invalid clock', () => {
            expect(calculateNetWorkTime(null)).toBe(0);
            expect(calculateNetWorkTime({})).toBe(0);
            expect(calculateNetWorkTime({ startTime: '2025-01-15T09:00:00' })).toBe(0);
        });

        it('calculates net work time minus pauses', () => {
            const clock = {
                startTime: '2025-01-15T09:00:00',
                endTime: '2025-01-15T17:00:00' // 8 hours = 480 min
            };
            const pauses = [
                { startTime: '2025-01-15T12:00:00', endTime: '2025-01-15T13:00:00' }, // 60 min
            ];

            const result = calculateNetWorkTime(clock, pauses);

            expect(result).toBe(420); // 480 - 60
        });
    });

    // ====== RANGE QUERIES ======
    describe('getClocksInRange', () => {
        it('returns clocks for date range', async () => {
            const mockClocks = [{ id: 1 }];
            api.get.mockResolvedValue({ data: mockClocks });

            const result = await getClocksInRange(1, '2025-01-01', '2025-01-31');

            expect(api.get).toHaveBeenCalledWith('/api/users/1/clocks/range', {
                params: { from: '2025-01-01', to: '2025-01-31' }
            });
            expect(result).toEqual(mockClocks);
        });

        it('returns empty array on error', async () => {
            api.get.mockRejectedValue(new Error('Network error'));

            const result = await getClocksInRange(1, '2025-01-01', '2025-01-31');

            expect(result).toEqual([]);
        });
    });

    describe('getClocksWithPagination', () => {
        it('returns paginated result', async () => {
            const mockPage = { content: [{ id: 1 }], totalElements: 10 };
            api.get.mockResolvedValue({ data: mockPage });

            const result = await getClocksWithPagination(1, { page: 1 });

            expect(result).toEqual(mockPage);
        });

        it('returns empty result on error', async () => {
            api.get.mockRejectedValue(new Error('Network error'));

            const result = await getClocksWithPagination(1);

            expect(result).toEqual({ content: [], totalElements: 0 });
        });
    });
});
