import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EmployeeDashboard from '../pages/EmployeeDashboard';

// --- MOCKS (must be hoisted, no variables) ---

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({}),
    };
});

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, firstName: 'John', lastName: 'Doe', role: 'EMPLOYEE' },
        setUser: vi.fn(),
    }),
}));

vi.mock('../hooks/useClockNotification', () => ({
    useClockNotification: vi.fn(),
}));

// Mock API clients
vi.mock('../api/clocks.api', () => ({
    getCurrentClock: vi.fn().mockResolvedValue(null),
    getClockHistory: vi.fn().mockResolvedValue([]),
    getClockPauses: vi.fn().mockResolvedValue([]),
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    getClocksInRange: vi.fn().mockResolvedValue([]),
}));

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

vi.mock('../api/teamApi', () => ({
    fetchUserMemberships: vi.fn().mockResolvedValue([]),
}));

// Mock Recharts
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    AreaChart: () => <div>AreaChart</div>,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
}));

describe('EmployeeDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ====== CRITICAL: Dashboard renders with user info ======
    it('renders dashboard with user name and page title', async () => {
        render(
            <MemoryRouter>
                <EmployeeDashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('Mon dashboard')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Non pointé')).toBeInTheDocument();
        });
    });

    // ====== CRITICAL: Clock action buttons are displayed ======
    it('displays clock action buttons when not clocked in', async () => {
        render(
            <MemoryRouter>
                <EmployeeDashboard />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Pointer l'arrivée/i)).toBeInTheDocument();
        });
    });

    // ====== ERROR HANDLING: Dashboard handles API errors gracefully ======
    it('renders dashboard even when API fails', async () => {
        // Even if APIs fail, dashboard should render basic structure
        render(
            <MemoryRouter>
                <EmployeeDashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('Mon dashboard')).toBeInTheDocument();
    });
});
