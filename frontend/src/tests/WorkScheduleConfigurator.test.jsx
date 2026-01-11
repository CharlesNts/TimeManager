import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkScheduleConfigurator from '../components/manager/WorkScheduleConfigurator';
import { scheduleTemplatesApi } from '../api/scheduleTemplatesApi';

// Mock scheduleTemplatesApi
vi.mock('../api/scheduleTemplatesApi', () => ({
    scheduleTemplatesApi: {
        create: vi.fn(),
        update: vi.fn(),
    },
}));

describe('WorkScheduleConfigurator', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const defaultProps = {
        open: true,
        onClose: mockOnClose,
        teamId: 1,
        teamName: 'Team Alpha',
        schedule: null,
        onSave: mockOnSave,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders create mode with default values', async () => {
        render(<WorkScheduleConfigurator {...defaultProps} />);

        expect(screen.getByText(/Configuration des horaires de travail/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Nom du planning/i)).toHaveValue('Planning Team Alpha');

        // Default days selected (Mon-Fri)
        expect(screen.getByText('Lundi')).toBeInTheDocument();
        expect(screen.getByText('Mardi')).toBeInTheDocument();
    });

    it('validates empty schedule name', async () => {
        render(<WorkScheduleConfigurator {...defaultProps} />);

        const nameInput = screen.getByLabelText(/Nom du planning/i);
        fireEvent.change(nameInput, { target: { value: '' } });

        fireEvent.click(screen.getByText(/Enregistrer/i));

        await waitFor(() => {
            expect(screen.getByText(/Le nom du planning est obligatoire/i)).toBeInTheDocument();
        });

        expect(scheduleTemplatesApi.create).not.toHaveBeenCalled();
    });

    it('validates at least one work day selected', async () => {
        render(<WorkScheduleConfigurator {...defaultProps} />);

        // Click "Exclure weekend" first to have only weekdays
        // Then deselect all remaining days
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
        days.forEach(day => {
            fireEvent.click(screen.getByText(day));
        });

        fireEvent.click(screen.getByText(/Enregistrer/i));

        await waitFor(() => {
            expect(screen.getByText(/Sélectionnez au moins un jour de travail/i)).toBeInTheDocument();
        });
    });

    it('handles successful schedule creation', async () => {
        scheduleTemplatesApi.create.mockResolvedValue({ id: 1, name: 'Test Planning' });
        render(<WorkScheduleConfigurator {...defaultProps} />);

        fireEvent.click(screen.getByText(/Enregistrer/i));

        await waitFor(() => {
            expect(scheduleTemplatesApi.create).toHaveBeenCalled();
            expect(mockOnSave).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('renders edit mode with existing schedule', async () => {
        const existingSchedule = {
            id: 10,
            name: 'Existing Planning',
            teamId: 1,
            active: true,
            weeklyPatternJson: JSON.stringify({
                mon: [['08:00', '16:00']],
                tue: [['08:00', '16:00']],
                wed: [['08:00', '16:00']],
            })
        };

        render(<WorkScheduleConfigurator {...defaultProps} schedule={existingSchedule} />);

        expect(screen.getByText(/Modifier le planning/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Nom du planning/i)).toHaveValue('Existing Planning');
        expect(screen.getByText(/3 jours de travail par semaine/i)).toBeInTheDocument();
    });
});
