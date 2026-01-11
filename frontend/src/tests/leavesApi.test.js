import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api/client';
import {
    requestLeave,
    cancelLeave,
    approveLeave,
    rejectLeave,
    getEmployeeLeaves,
    getPendingLeaves,
    getLeavesInWindow,
    updateLeave,
    deleteLeave,
    getLeaveTypeLabel,
    getLeaveStatusLabel,
    calculateLeaveDays,
    LEAVE_TYPES,
    LEAVE_STATUS
} from '../api/leavesApi';

// Mock the API client
vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    }
}));

describe('leavesApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ====== CONSTANTS ======
    describe('Constants', () => {
        it('exports LEAVE_TYPES', () => {
            expect(LEAVE_TYPES.PAID).toBe('PAID');
            expect(LEAVE_TYPES.SICK).toBe('SICK');
            expect(LEAVE_TYPES.UNPAID).toBe('UNPAID');
            expect(LEAVE_TYPES.TRAINING).toBe('TRAINING');
            expect(LEAVE_TYPES.OTHER).toBe('OTHER');
        });

        it('exports LEAVE_STATUS', () => {
            expect(LEAVE_STATUS.PENDING).toBe('PENDING');
            expect(LEAVE_STATUS.APPROVED).toBe('APPROVED');
            expect(LEAVE_STATUS.REJECTED).toBe('REJECTED');
            expect(LEAVE_STATUS.CANCELLED).toBe('CANCELLED');
        });
    });

    // ====== LEAVE REQUESTS ======
    describe('requestLeave', () => {
        it('creates a leave request', async () => {
            const mockLeave = { id: 1, type: 'PAID', status: 'PENDING' };
            api.post.mockResolvedValue({ data: mockLeave });

            const leaveData = {
                type: 'PAID',
                startAt: '2025-01-20',
                endAt: '2025-01-25',
                reason: 'Vacances'
            };

            const result = await requestLeave(1, leaveData);

            expect(api.post).toHaveBeenCalledWith('/api/leaves?employeeId=1', leaveData);
            expect(result).toEqual(mockLeave);
        });

        it('throws on error', async () => {
            api.post.mockRejectedValue(new Error('Request failed'));

            await expect(requestLeave(1, {})).rejects.toThrow('Request failed');
        });
    });

    describe('cancelLeave', () => {
        it('cancels a pending leave request', async () => {
            const mockLeave = { id: 1, status: 'CANCELLED' };
            api.post.mockResolvedValue({ data: mockLeave });

            const result = await cancelLeave(1, 100);

            expect(api.post).toHaveBeenCalledWith('/api/leaves/1/cancel?employeeId=100');
            expect(result).toEqual(mockLeave);
        });
    });

    describe('approveLeave', () => {
        it('approves a leave request', async () => {
            const mockLeave = { id: 1, status: 'APPROVED' };
            api.post.mockResolvedValue({ data: mockLeave });

            const result = await approveLeave(1, 'Bon voyage!');

            expect(api.post).toHaveBeenCalledWith('/api/leaves/1/decision', {
                decision: 'APPROVED',
                note: 'Bon voyage!'
            });
            expect(result).toEqual(mockLeave);
        });
    });

    describe('rejectLeave', () => {
        it('rejects a leave request with note', async () => {
            const mockLeave = { id: 1, status: 'REJECTED' };
            api.post.mockResolvedValue({ data: mockLeave });

            const result = await rejectLeave(1, 'Période non autorisée');

            expect(api.post).toHaveBeenCalledWith('/api/leaves/1/decision', {
                decision: 'REJECTED',
                note: 'Période non autorisée'
            });
            expect(result).toEqual(mockLeave);
        });
    });

    // ====== FETCHING LEAVES ======
    describe('getEmployeeLeaves', () => {
        it('returns employee leaves', async () => {
            const mockLeaves = [{ id: 1 }, { id: 2 }];
            api.get.mockResolvedValue({ data: mockLeaves });

            const result = await getEmployeeLeaves(1);

            expect(api.get).toHaveBeenCalledWith('/api/leaves?employeeId=1');
            expect(result).toEqual(mockLeaves);
        });

        it('throws on error', async () => {
            api.get.mockRejectedValue(new Error('Not found'));

            await expect(getEmployeeLeaves(1)).rejects.toThrow('Not found');
        });
    });

    describe('getPendingLeaves', () => {
        it('returns pending leaves for managers', async () => {
            const mockLeaves = [{ id: 1, status: 'PENDING' }];
            api.get.mockResolvedValue({ data: mockLeaves });

            const result = await getPendingLeaves();

            expect(api.get).toHaveBeenCalledWith('/api/leaves/pending');
            expect(result).toEqual(mockLeaves);
        });
    });

    describe('getLeavesInWindow', () => {
        it('returns leaves in date window', async () => {
            const mockLeaves = [{ id: 1 }];
            api.get.mockResolvedValue({ data: mockLeaves });

            const result = await getLeavesInWindow(1, '2025-01-01', '2025-01-31');

            expect(api.get).toHaveBeenCalledWith('/api/leaves/window', {
                params: { employeeId: 1, from: '2025-01-01', to: '2025-01-31' }
            });
            expect(result).toEqual(mockLeaves);
        });
    });

    describe('updateLeave', () => {
        it('updates a pending leave', async () => {
            const mockLeave = { id: 1, type: 'SICK' };
            api.put.mockResolvedValue({ data: mockLeave });

            const updateData = {
                type: 'SICK',
                startAt: '2025-01-20',
                endAt: '2025-01-22',
                reason: 'Maladie'
            };

            const result = await updateLeave(1, updateData);

            expect(api.put).toHaveBeenCalledWith('/api/leaves/1', updateData);
            expect(result).toEqual(mockLeave);
        });
    });

    describe('deleteLeave', () => {
        it('deletes a leave and returns true', async () => {
            api.delete.mockResolvedValue({});

            const result = await deleteLeave(1);

            expect(api.delete).toHaveBeenCalledWith('/api/leaves/1');
            expect(result).toBe(true);
        });
    });

    // ====== UTILITY FUNCTIONS ======
    describe('getLeaveTypeLabel', () => {
        it('returns French label for each type', () => {
            expect(getLeaveTypeLabel('PAID')).toBe('Congé payé');
            expect(getLeaveTypeLabel('SICK')).toBe('Arrêt maladie');
            expect(getLeaveTypeLabel('UNPAID')).toBe('Congé sans solde');
            expect(getLeaveTypeLabel('TRAINING')).toBe('Formation');
            expect(getLeaveTypeLabel('OTHER')).toBe('Autre');
        });

        it('returns input for unknown type', () => {
            expect(getLeaveTypeLabel('UNKNOWN')).toBe('UNKNOWN');
        });
    });

    describe('getLeaveStatusLabel', () => {
        it('returns French label for each status', () => {
            expect(getLeaveStatusLabel('PENDING')).toBe('En attente');
            expect(getLeaveStatusLabel('APPROVED')).toBe('Approuvé');
            expect(getLeaveStatusLabel('REJECTED')).toBe('Rejeté');
            expect(getLeaveStatusLabel('CANCELLED')).toBe('Annulé');
        });

        it('returns input for unknown status', () => {
            expect(getLeaveStatusLabel('UNKNOWN')).toBe('UNKNOWN');
        });
    });

    describe('calculateLeaveDays', () => {
        it('calculates days including first and last day', () => {
            expect(calculateLeaveDays('2025-01-20', '2025-01-20')).toBe(1); // Same day
            expect(calculateLeaveDays('2025-01-20', '2025-01-22')).toBe(3); // 3 days
            expect(calculateLeaveDays('2025-01-20', '2025-01-25')).toBe(6); // 6 days
        });
    });
});
