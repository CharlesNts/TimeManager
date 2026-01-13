import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import TeamFormModal from '../components/manager/TeamFormModal';

vi.mock('../api/client', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() }
        }
    },
}));

vi.mock('../api/teamApi', () => ({
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
}));

import api from '../api/client';
import { createTeam, updateTeam } from '../api/teamApi';

// Mock icons
vi.mock('lucide-react', () => ({
    X: () => <span data-testid="icon-close">X</span>,
    Save: () => <span data-testid="icon-save">Save</span>,
    Users: () => <span data-testid="icon-users">Users</span>,
}));

describe('TeamFormModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSave: mockOnSave,
        mode: 'create',
        userRole: 'MANAGER',
        currentUserId: 101,
    };

    const mockManagers = [
        { id: 101, firstName: 'John', lastName: 'Manager', role: 'MANAGER', email: 'john@test.com' },
        { id: 102, firstName: 'Alice', lastName: 'CEO', role: 'CEO', email: 'alice@test.com' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: mockManagers });
    });

    it('renders nothing when not open', () => {
        render(<TeamFormModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Créer une équipe')).not.toBeInTheDocument();
    });

    it('renders correctly in create mode', async () => {
        render(<TeamFormModal {...defaultProps} />);
        expect(screen.getByText('Créer une équipe')).toBeInTheDocument();
        await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/users'));
    });

    it('auto-selects current user as manager if role is MANAGER', async () => {
        render(<TeamFormModal {...defaultProps} userRole="MANAGER" currentUserId={101} />);
        // Component shows the name if currentUserId matches a loaded manager
        const managerInput = await screen.findByDisplayValue('John Manager');
        expect(managerInput).toBeDisabled();
    });

    it('allows CEO to select a manager', async () => {
        render(<TeamFormModal {...defaultProps} userRole="CEO" currentUserId={102} />);
        await waitFor(() => expect(api.get).toHaveBeenCalled());
        const select = await screen.findByRole('combobox');
        expect(select).toBeEnabled();
        fireEvent.change(select, { target: { value: '101' } });
        expect(select.value).toBe('101');
    });

    it('validates form before creating team', async () => {
        render(<TeamFormModal {...defaultProps} />);
        // Wait for the form to be ready (managers loaded)
        await waitFor(() => expect(api.get).toHaveBeenCalled());
        // Since we are MANAGER role, the name "John Manager" should appear
        await screen.findByDisplayValue('John Manager');

        const submitBtn = screen.getByRole('button', { name: /Créer l'équipe/i });
        fireEvent.submit(submitBtn.closest('form'));

        expect(await screen.findByText(/Le nom de l'équipe est obligatoire/i)).toBeInTheDocument();
        expect(createTeam).not.toHaveBeenCalled();
    });

    it('creates a team successfully', async () => {
        createTeam.mockResolvedValueOnce({ id: 1, name: 'New Team' });
        render(<TeamFormModal {...defaultProps} />);
        await waitFor(() => expect(api.get).toHaveBeenCalled());
        await screen.findByDisplayValue('John Manager');

        fireEvent.change(screen.getByPlaceholderText(/Ex: Équipe Développement/i), { target: { value: 'New Team' } });

        const submitBtn = screen.getByRole('button', { name: /Créer l'équipe/i });
        fireEvent.click(submitBtn);

        await waitFor(() => expect(createTeam).toHaveBeenCalled());

        expect(createTeam).toHaveBeenCalledWith({
            name: 'New Team',
            description: '',
            managerId: 101
        });
        expect(mockOnSave).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('updates a team successfully', async () => {
        const teamToEdit = { id: 5, name: 'Old Team', description: 'Desc', managerId: 101 };
        updateTeam.mockResolvedValueOnce({ ...teamToEdit, name: 'Updated Team' });

        render(<TeamFormModal {...defaultProps} mode="edit" team={teamToEdit} />);

        expect(await screen.findByDisplayValue('Old Team')).toBeInTheDocument();

        // Change name
        fireEvent.change(screen.getByDisplayValue('Old Team'), { target: { value: 'Updated Team' } });

        const submitBtn = screen.getByRole('button', { name: /Enregistrer/i });
        fireEvent.click(submitBtn);

        await waitFor(() => expect(updateTeam).toHaveBeenCalled());

        expect(updateTeam).toHaveBeenCalledWith(5, {
            name: 'Updated Team',
            description: 'Desc',
            managerId: 101
        });
    });

    it('handles API errors', async () => {
        createTeam.mockRejectedValueOnce(new Error('Creation failed'));
        render(<TeamFormModal {...defaultProps} />);
        await waitFor(() => expect(api.get).toHaveBeenCalled());
        await screen.findByDisplayValue('John Manager');

        fireEvent.change(screen.getByPlaceholderText(/Ex: Équipe Développement/i), { target: { value: 'Failed Team' } });
        fireEvent.click(screen.getByRole('button', { name: /Créer l'équipe/i }));

        await waitFor(() => {
            expect(screen.getByText(/Creation failed/i)).toBeInTheDocument();
        });
    });
});
