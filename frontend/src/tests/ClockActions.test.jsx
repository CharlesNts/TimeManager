import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClockActions from '../components/employee/ClockActions';
import * as clocksApi from '../api/clocks.api';

// Mock the clocks API
vi.mock('../api/clocks.api', () => ({
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    getCurrentClock: vi.fn(),
    getClockHistory: vi.fn(),
    getClockPauses: vi.fn(),
    createPause: vi.fn(),
    stopPause: vi.fn(),
}));

describe('ClockActions', () => {
    const mockUserId = 1;
    const mockOnChanged = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        clocksApi.getCurrentClock.mockResolvedValue(null);
        clocksApi.getClockHistory.mockResolvedValue([]);
        clocksApi.getClockPauses.mockResolvedValue([]);
    });

    it('renders "Hors service" when not clocked in', async () => {
        render(<ClockActions userId={mockUserId} onChanged={mockOnChanged} />);

        await waitFor(() => {
            expect(screen.getByText('Hors service')).toBeInTheDocument();
        });

        expect(screen.getByText(/Pointer l'arrivée/i)).not.toBeDisabled();
        expect(screen.getByText(/Pointer le départ/i)).toBeDisabled();
    });

    it('renders "Au travail" when clocked in without pause', async () => {
        const mockClock = { id: 100, clockIn: new Date().toISOString(), clockOut: null };
        clocksApi.getCurrentClock.mockResolvedValue(mockClock);
        clocksApi.getClockPauses.mockResolvedValue([]);

        render(<ClockActions userId={mockUserId} onChanged={mockOnChanged} />);

        await waitFor(() => {
            expect(screen.getByText('Au travail')).toBeInTheDocument();
        });

        expect(screen.getByText(/Pointer l'arrivée/i)).toBeDisabled();
        expect(screen.getByText(/Pointer le départ/i)).not.toBeDisabled();
    });

    it('renders "En pause" when on break', async () => {
        const mockClock = { id: 100, clockIn: new Date().toISOString(), clockOut: null };
        const mockActivePause = { id: 1, startAt: new Date().toISOString(), endAt: null };
        clocksApi.getCurrentClock.mockResolvedValue(mockClock);
        clocksApi.getClockPauses.mockResolvedValue([mockActivePause]);

        render(<ClockActions userId={mockUserId} onChanged={mockOnChanged} />);

        await waitFor(() => {
            expect(screen.getAllByText('En pause')[0]).toBeInTheDocument();
        });
    });

    it('handles clock in action', async () => {
        const newClock = { id: 101, clockIn: new Date().toISOString(), clockOut: null };
        clocksApi.clockIn.mockResolvedValue(newClock);

        render(<ClockActions userId={mockUserId} onChanged={mockOnChanged} />);

        await waitFor(() => {
            expect(screen.getByText('Hors service')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Pointer l'arrivée/i));

        await waitFor(() => {
            expect(clocksApi.clockIn).toHaveBeenCalledWith(mockUserId);
            expect(mockOnChanged).toHaveBeenCalled();
        });
    });

    it('handles clock out action', async () => {
        const mockClock = { id: 100, clockIn: new Date().toISOString(), clockOut: null };
        clocksApi.getCurrentClock.mockResolvedValue(mockClock);
        clocksApi.clockOut.mockResolvedValue({ ...mockClock, clockOut: new Date().toISOString() });

        render(<ClockActions userId={mockUserId} onChanged={mockOnChanged} />);

        await waitFor(() => {
            expect(screen.getByText('Au travail')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Pointer le départ/i));

        await waitFor(() => {
            expect(clocksApi.clockOut).toHaveBeenCalledWith(mockUserId);
            expect(mockOnChanged).toHaveBeenCalled();
        });
    });

    it('handles start pause action', async () => {
        const mockClock = { id: 100, clockIn: new Date().toISOString(), clockOut: null };
        clocksApi.getCurrentClock.mockResolvedValue(mockClock);
        clocksApi.getClockPauses.mockResolvedValue([]);
        clocksApi.createPause.mockResolvedValue({ id: 1, startAt: new Date().toISOString() });

        render(<ClockActions userId={mockUserId} onChanged={mockOnChanged} />);

        await waitFor(() => {
            expect(screen.getByText('Au travail')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Commencer une pause/i));

        await waitFor(() => {
            expect(clocksApi.createPause).toHaveBeenCalled();
        });
    });
});
