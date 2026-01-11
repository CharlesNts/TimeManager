import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EmployeeDashboard from '../pages/EmployeeDashboard';

// --- MOCKS ---

// 1. React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({}),
    };
});

// 2. Auth Context
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, firstName: 'John', lastName: 'Doe', role: 'EMPLOYEE' },
        setUser: vi.fn(),
    }),
}));

// 3. Custom Hooks
vi.mock('../hooks/useClockNotification', () => ({
    useClockNotification: vi.fn(),
}));

// 4. API Clients
vi.mock('../api/client', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn(),
    }
}));
vi.mock('../api/reportsApi', () => ({
    default: {
        getUserHours: vi.fn().mockResolvedValue({ netHours: 0 }),
    }
}));
vi.mock('../api/scheduleTemplatesApi', () => ({
    default: {
        getActiveForTeam: vi.fn().mockResolvedValue(null),
    }
}));
// Note: teamApi is dynamic import in component, difficult to mock with static vi.mock?
// We can mock the module path if possible, or ignore if it handles error gracefully.
vi.mock('../api/teamApi', () => ({
    fetchUserMemberships: vi.fn().mockResolvedValue([]),
}));

// 5. Recharts (Heavy, canvas based)
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    AreaChart: () => <div>AreaChart</div>,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
}));

import { MemoryRouter } from 'react-router-dom';

describe('EmployeeDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the dashboard header with user name', async () => {
        render(
            <MemoryRouter>
                <EmployeeDashboard />
            </MemoryRouter>
        );

        // Check page title
        expect(screen.getByText('Mon dashboard')).toBeInTheDocument();

        // Check layout user name (from mock)
        expect(screen.getByText('John Doe')).toBeInTheDocument();

        // Check initial status logic (might show "Non pointé" if API returns empty)
        await waitFor(() => {
            expect(screen.getByText('Non pointé')).toBeInTheDocument();
        });
    });
});
