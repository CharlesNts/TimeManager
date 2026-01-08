import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UsersListPage from '../pages/UsersListPage';
import { MemoryRouter } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import api from '../api/client';
import * as userAdminApi from '../api/userAdminApi';
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

// Mock userAdminApi
vi.mock('../api/userAdminApi', () => ({
    fetchUsers: vi.fn(),
    fetchPendingUsers: vi.fn(),
    approveUser: vi.fn(),
    rejectUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
}));

// Mock scheduleTemplatesApi
vi.mock('../api/scheduleTemplatesApi', () => ({
    default: {
        getActiveForTeam: vi.fn(),
    },
    getActiveScheduleTemplate: vi.fn(),
}));

// Mock Recharts to avoid rendering issues in JSDOM
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    AreaChart: () => <div data-testid="area-chart" />,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('UsersListPage', () => {
    const mockUser = { id: 1, firstName: 'Admin', lastName: 'User', role: 'CEO' };

    const mockUsersData = [
        { id: 1, firstName: 'Admin', lastName: 'User', email: 'admin@primebank.com', role: 'CEO', createdAt: '2025-01-01T10:00:00Z' },
        { id: 2, firstName: 'John', lastName: 'Doe', email: 'john@primebank.com', role: 'EMPLOYEE', createdAt: '2025-01-02T10:00:00Z' },
        { id: 3, firstName: 'Jane', lastName: 'Smith', email: 'jane@primebank.com', role: 'MANAGER', createdAt: '2025-01-03T10:00:00Z' },
    ];

    const mockPendingUsers = [
        { id: 4, firstName: 'Pending', lastName: 'User', email: 'pending@primebank.com' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        userAdminApi.fetchUsers.mockResolvedValue(mockUsersData.concat(mockPendingUsers));
        userAdminApi.fetchPendingUsers.mockResolvedValue(mockPendingUsers);

        // Default stats mocks to avoid errors during background loading
        api.get.mockImplementation((url) => {
            if (url === '/api/users') return Promise.resolve({ data: mockUsersData });
            if (url.match(/\/api\/users\/\d+\/clocks\/range/)) return Promise.resolve({ data: [] });
            if (url === '/api/teams') return Promise.resolve({ data: [] });
            return Promise.resolve({ data: [] });
        });
        scheduleTemplatesApi.getActiveForTeam.mockResolvedValue(null);
    });

    const renderComponent = () => render(
        <AuthContext.Provider value={{ user: mockUser }}>
            <MemoryRouter>
                <UsersListPage />
            </MemoryRouter>
        </AuthContext.Provider>
    );

    it('renders page title and user list', async () => {
        renderComponent();

        expect(screen.getByText(/Chargement/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getAllByText(/Gestion des utilisateurs/i)[0]).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
    });

    it('filters users by role', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: 'MANAGER' } });

        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('filters users by status', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Pending User')).toBeInTheDocument();
        });

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[1], { target: { value: 'PENDING' } });

        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Pending User')).toBeInTheDocument();
    });

    it('handles user approval', async () => {
        userAdminApi.approveUser.mockResolvedValueOnce(true);
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Pending User')).toBeInTheDocument();
        });

        const approveButton = screen.getByTitle(/Approuver/i);
        fireEvent.click(approveButton);

        await waitFor(() => {
            expect(userAdminApi.approveUser).toHaveBeenCalledWith(4);
            expect(userAdminApi.fetchUsers).toHaveBeenCalledTimes(2); // Initial + reload
        });
    });

    it('handles user rejection (delete)', async () => {
        window.confirm = vi.fn(() => true);
        userAdminApi.deleteUser.mockResolvedValueOnce(true);
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Pending User')).toBeInTheDocument();
        });

        const rejectButton = screen.getByTitle(/Rejeter/i);
        fireEvent.click(rejectButton);

        await waitFor(() => {
            expect(userAdminApi.deleteUser).toHaveBeenCalledWith(4);
        });
    });

    it('navigates to create user page', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/Créer un utilisateur/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Créer un utilisateur/i));
        expect(mockNavigate).toHaveBeenCalledWith('/users/create');
    });
});
