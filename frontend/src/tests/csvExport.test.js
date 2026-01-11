import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
    exportEmployeeDashboardCSV,
    exportManagerDashboardCSV,
    exportCEODashboardCSV,
    exportTeamsListCSV,
    exportUsersListCSV
} from '../utils/csvExport';

describe('csvExport', () => {
    let createElementSpy;
    let clickSpy;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock DOM APIs for download
        clickSpy = vi.fn();
        createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
            setAttribute: vi.fn(),
            style: {},
            click: clickSpy,
        });
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => { });
        vi.spyOn(document.body, 'removeChild').mockImplementation(() => { });

        // Mock URL.createObjectURL
        globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('exportEmployeeDashboardCSV', () => {
        it('generates CSV with employee data', () => {
            const user = { firstName: 'Jean', lastName: 'Dupont' };
            const stats = { hoursCurrent: 35, minutesCurrent: 30 };
            const recentClocks = [
                { clockIn: '2025-01-15T09:00:00', clockOut: '2025-01-15T17:00:00', duration: '8h' }
            ];
            const chartData = { adherenceRate: 95.5, latenessRate: 5.0, hoursChartSeries: [] };

            exportEmployeeDashboardCSV(user, stats, recentClocks, chartData, 'Cette semaine');

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(clickSpy).toHaveBeenCalled();
        });

        it('handles empty data gracefully', () => {
            const user = { firstName: 'Test', lastName: 'User' };
            const stats = {};

            exportEmployeeDashboardCSV(user, stats);

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(clickSpy).toHaveBeenCalled();
        });

        it('includes hours chart data when available', () => {
            const user = { firstName: 'Jean', lastName: 'Dupont' };
            const stats = { hoursCurrent: 40, minutesCurrent: 0 };
            const chartData = {
                adherenceRate: 100,
                latenessRate: 0,
                hoursChartSeries: [
                    { label: 'Lun', value: 480 },
                    { label: 'Mar', value: 420 },
                ]
            };

            exportEmployeeDashboardCSV(user, stats, [], chartData);

            expect(clickSpy).toHaveBeenCalled();
        });
    });

    describe('exportManagerDashboardCSV', () => {
        it('generates CSV with manager dashboard data', () => {
            const user = { firstName: 'Marie', lastName: 'Martin' };
            const stats = { totalTeams: 3, totalMembers: 15, activeMembers: 12 };
            const teams = [
                { name: 'Équipe A', description: 'Développement', memberCount: 5 },
                { name: 'Équipe B', description: 'Marketing', memberCount: 7 },
            ];
            const chartData = {
                hoursTotals: { current: 320 },
                adherenceRate: 88.5,
                latenessRate: 8.2,
                hoursChartSeries: [],
                teamComparisonData: []
            };

            exportManagerDashboardCSV(user, stats, teams, chartData, 'Ce mois');

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(clickSpy).toHaveBeenCalled();
        });

        it('includes team comparison data', () => {
            const user = { firstName: 'Test', lastName: 'Manager' };
            const stats = {};
            const teams = [];
            const chartData = {
                teamComparisonData: [
                    { name: 'Équipe A', value: 120 },
                    { name: 'Équipe B', value: 100 },
                ]
            };

            exportManagerDashboardCSV(user, stats, teams, chartData);

            expect(clickSpy).toHaveBeenCalled();
        });
    });

    describe('exportCEODashboardCSV', () => {
        it('generates CSV with CEO/admin stats', () => {
            const user = { firstName: 'Admin', lastName: 'User' };
            const stats = {
                totalUsers: 50,
                approvedUsers: 45,
                pendingUsers: 5,
                totalTeams: 8,
                totalManagers: 5,
                activeEmployees: 40,
                latenessRate: 6.5,
                lateDays: 12
            };

            exportCEODashboardCSV(user, stats);

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(clickSpy).toHaveBeenCalled();
        });

        it('handles empty stats', () => {
            const user = { firstName: 'Admin', lastName: 'User' };
            const stats = {};

            exportCEODashboardCSV(user, stats);

            expect(clickSpy).toHaveBeenCalled();
        });
    });

    describe('exportTeamsListCSV', () => {
        it('generates CSV with teams list', () => {
            const teams = [
                { name: 'Dev Team', description: 'Developers', managerName: 'Jean Dupont', memberCount: 8 },
                { name: 'QA Team', description: 'Quality', managerName: 'Marie Martin', memberCount: 4 },
            ];
            const chartData = {
                adherenceRate: 92.0,
                teamComparisonData: [
                    { name: 'Dev Team', value: 320 },
                    { name: 'QA Team', value: 160 },
                ]
            };

            exportTeamsListCSV(teams, chartData, 'Cette semaine');

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(clickSpy).toHaveBeenCalled();
        });

        it('handles empty teams list', () => {
            exportTeamsListCSV([], {});

            expect(clickSpy).toHaveBeenCalled();
        });
    });

    describe('exportUsersListCSV', () => {
        it('generates CSV with users list', () => {
            const users = [
                { lastName: 'Dupont', firstName: 'Jean', email: 'jean@test.com', phoneNumber: '0612345678', role: 'EMPLOYEE', status: 'APPROVED' },
                { lastName: 'Martin', firstName: 'Marie', email: 'marie@test.com', phoneNumber: '0698765432', role: 'MANAGER', status: 'APPROVED' },
            ];

            exportUsersListCSV(users);

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(clickSpy).toHaveBeenCalled();
        });

        it('handles users with missing fields', () => {
            const users = [
                { lastName: 'Test' }, // Missing most fields
                { firstName: 'User', email: 'user@test.com' },
            ];

            exportUsersListCSV(users);

            expect(clickSpy).toHaveBeenCalled();
        });

        it('handles empty users list', () => {
            exportUsersListCSV([]);

            expect(clickSpy).toHaveBeenCalled();
        });
    });
});
