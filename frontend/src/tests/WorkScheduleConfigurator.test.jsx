import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WorkScheduleConfigurator from '../components/manager/WorkScheduleConfigurator';
import { scheduleTemplatesApi } from '../api/scheduleTemplatesApi';

// Mock the API
vi.mock('../api/scheduleTemplatesApi', () => ({
    scheduleTemplatesApi: {
        create: vi.fn(),
        update: vi.fn(),
    },
}));

// Mock UI components to simplify DOM
vi.mock('../components/ui/dialog', () => ({
    Dialog: ({ open, children }) => open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
    DialogTitle: ({ children }) => <h2>{children}</h2>,
    DialogDescription: ({ children }) => <p>{children}</p>,
    DialogFooter: ({ children }) => <div data-testid="dialog-footer">{children}</div>,
}));

vi.mock('../components/ui/button', () => ({
    Button: ({ children, onClick, disabled, type }) => (
        <button onClick={onClick} disabled={disabled} type={type || 'button'}>
            {children}
        </button>
    ),
}));

vi.mock('../components/ui/input', () => ({
    Input: (props) => <input {...props} />,
}));

vi.mock('../components/ui/label', () => ({
    Label: ({ children, htmlFor }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('../components/ui/checkbox', () => ({
    Checkbox: ({ checked, onCheckedChange }) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            data-testid="checkbox"
        />
    ),
}));

describe('WorkScheduleConfigurator', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const defaultProps = {
        open: true,
        onClose: mockOnClose,
        teamId: '123',
        teamName: 'Test Team',
        onSave: mockOnSave,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly in creation mode', () => {
        render(<WorkScheduleConfigurator {...defaultProps} />);

        expect(screen.getByText('Configuration des horaires de travail')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Planning Test Team')).toBeInTheDocument();
    });

    it('renders correctly in edit mode', () => {
        const schedule = {
            id: 'sch_1',
            name: 'Existing Schedule',
            weeklyPatternJson: JSON.stringify({
                mon: [['08:00', '16:00']],
                wed: [['08:00', '16:00']]
            }),
            teamId: '123',
            active: true
        };

        render(<WorkScheduleConfigurator {...defaultProps} schedule={schedule} />);

        expect(screen.getByText('Modifier le planning')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Existing Schedule')).toBeInTheDocument();
        // Monday and Wednesday should be checked (mock implementation details might vary, but logic is tested)
        // We can check if times are set
        // Note: The component parsing logic sets state. We can check if input values reflect that.
        // The component sets startTime/endTime globally for simplicity in the UI shown. 
        // It picks the first available time from the pattern.
        expect(screen.getByDisplayValue('08:00')).toBeInTheDocument();
        expect(screen.getByDisplayValue('16:00')).toBeInTheDocument();
    });

    it('validates form before saving', async () => {
        render(<WorkScheduleConfigurator {...defaultProps} />);

        // Clear name
        const nameInput = screen.getByDisplayValue('Planning Test Team');
        fireEvent.change(nameInput, { target: { value: '' } });

        const saveButton = screen.getByText('Enregistrer');
        fireEvent.click(saveButton);

        expect(screen.getByText('Le nom du planning est obligatoire')).toBeInTheDocument();
        expect(scheduleTemplatesApi.create).not.toHaveBeenCalled();
    });

    it('saves a new schedule successfully', async () => {
        scheduleTemplatesApi.create.mockResolvedValueOnce({ id: 'new_1' });

        render(<WorkScheduleConfigurator {...defaultProps} />);

        // Default values are already set (Mon-Fri 09:00-17:30)
        const saveButton = screen.getByText('Enregistrer');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(scheduleTemplatesApi.create).toHaveBeenCalled();
        });

        // Check payload
        const callArg = scheduleTemplatesApi.create.mock.calls[0][0];
        expect(callArg).toMatchObject({
            teamId: '123',
            name: 'Planning Test Team',
            active: false
        });
        // Check pattern specific structure
        const pattern = JSON.parse(callArg.weeklyPatternJson);
        expect(pattern.mon).toBeDefined(); // Monday is default
        expect(pattern.sat).toBeUndefined(); // Sat default off

        expect(mockOnSave).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('updates an existing schedule successfully', async () => {
        const schedule = {
            id: 'sch_1',
            name: 'Old Name',
            weeklyPatternJson: JSON.stringify({ mon: [['09:00', '17:00']] }),
            teamId: '123',
            active: true
        };
        scheduleTemplatesApi.update.mockResolvedValueOnce({ ...schedule, name: 'New Name' });

        render(<WorkScheduleConfigurator {...defaultProps} schedule={schedule} />);

        // Change name
        const nameInput = screen.getByDisplayValue('Old Name');
        fireEvent.change(nameInput, { target: { value: 'New Name' } });

        const saveButton = screen.getByText('Modifier');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(scheduleTemplatesApi.update).toHaveBeenCalled();
        });

        const callArgs = scheduleTemplatesApi.update.mock.calls[0];
        expect(callArgs[0]).toBe('sch_1');
        expect(callArgs[1].name).toBe('New Name');

        expect(mockOnSave).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles API errors gracefully', async () => {
        scheduleTemplatesApi.create.mockRejectedValueOnce(new Error('API Failure'));

        render(<WorkScheduleConfigurator {...defaultProps} />);

        const saveButton = screen.getByText('Enregistrer');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText('API Failure')).toBeInTheDocument();
        });
    });
});
