import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamsList from '../pages/TeamsList';
import { MemoryRouter } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import api from '../api/client';
import * as teamApi from '../api/teamApi';
import scheduleTemplatesApi from '../api/scheduleTemplatesApi';

// Mock API client
vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

// Mock teamApi
vi.mock('../api/teamApi', () => ({
    fetchTeamsForCurrentUser: vi.fn(),
    deleteTeam: vi.fn(),
}));

// Mock scheduleTemplatesApi
vi.mock('../api/scheduleTemplatesApi', () => ({
    default: {
        getActiveForTeam: vi.fn(),
    },
    getActiveScheduleTemplate: vi.fn(),
}));

// Mock Recharts
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    BarChart: () => <div data-testid="bar-chart" />,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Cell: () => null,
    AreaChart: () => <div data-testid="area-chart" />,
    Area: () => null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('TeamsList', () => {
    const mockUser = { id: 1, firstName: 'CEO', lastName: 'User', role: 'CEO' };
    const mockTeams = [
        { id: 1, name: 'Team Alpha', description: 'Alpha description', managerName: 'Manager One', memberCount: 5 },
        { id: 2, name: 'Team Beta', description: 'Beta description', managerName: 'Manager Two', memberCount: 3 },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // CEO flow uses direct api.get calls in load()
        api.get.mockImplementation((url) => {
            if (url === '/api/users') return Promise.resolve({ data: [{ id: 10, role: 'MANAGER', firstName: 'M', lastName: 'one' }] });
            if (url === '/api/teams') return Promise.resolve({ data: mockTeams });
            if (url.match(/\/api\/teams\/\d+\/members/)) return Promise.resolve({ data: [] });
            if (url.match(/\/api\/users\/\d+\/clocks\/range/)) return Promise.resolve({ data: [] });
            return Promise.resolve({ data: [] });
        });

        teamApi.fetchTeamsForCurrentUser.mockResolvedValue(mockTeams);
        scheduleTemplatesApi.getActiveForTeam.mockResolvedValue(null);
    });

    const renderComponent = (user = mockUser) => render(
        <AuthContext.Provider value={{ user }}>
            <MemoryRouter>
                <TeamsList />
            </MemoryRouter>
        </AuthContext.Provider>
    );

    it('renders teams and stats for CEO', async () => {
        renderComponent();

        expect(screen.getByText(/Chargement/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Team Alpha')).toBeInTheDocument();
            expect(screen.getByText('Team Beta')).toBeInTheDocument();
            expect(screen.getByText('5 personnes')).toBeInTheDocument();
            expect(screen.getByText('3 personnes')).toBeInTheDocument();
        });

        // Check stats cards are present for CEO
        expect(screen.getAllByText(/Statistiques des équipes/i)[0]).toBeInTheDocument();
    });

    it('renders teams for MANAGER without stats', async () => {
        const managerUser = { id: 10, firstName: 'Manager', lastName: 'User', role: 'MANAGER' };
        renderComponent(managerUser);

        await waitFor(() => {
            expect(screen.getByText('Team Alpha')).toBeInTheDocument();
        });

        expect(screen.queryByText(/Statistiques des équipes/i)).not.toBeInTheDocument();
    });

    it('handles team deletion', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        teamApi.deleteTeam.mockResolvedValueOnce(true);
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Team Alpha')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByTitle(/Supprimer l'équipe/i);
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(teamApi.deleteTeam).toHaveBeenCalledWith(1);
        });
    });

    it('navigates to team detail on click', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Team Alpha')).toBeInTheDocument();
        });

        const viewDetailsButtons = screen.getAllByText(/Voir détails/i);
        fireEvent.click(viewDetailsButtons[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/teams/1');
    });

    it('shows empty state when no teams', async () => {
        api.get.mockImplementation(() => Promise.resolve({ data: [] }));
        teamApi.fetchTeamsForCurrentUser.mockResolvedValue([]);
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/Aucune équipe pour le moment/i)).toBeInTheDocument();
        });
    });
});
