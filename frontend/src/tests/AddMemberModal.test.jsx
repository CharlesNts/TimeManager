import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AddMemberModal from '../components/manager/AddMemberModal';
import api from '../api/client';

// Mock api
vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
    },
}));

// Mock icons
vi.mock('lucide-react', () => ({
    UserPlus: () => <span data-testid="icon-user-plus">UserPlus</span>,
    X: () => <span data-testid="icon-x">X</span>,
    Search: () => <span data-testid="icon-search">Search</span>,
    Check: () => <span data-testid="icon-check">Check</span>,
}));

describe('AddMemberModal', () => {
    const mockOnClose = vi.fn();
    const mockOnAddMember = vi.fn();

    const mockUsers = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'EMPLOYEE' },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', role: 'MANAGER' },
        { id: 3, firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com', role: 'EMPLOYEE' },
    ];

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onAddMember: mockOnAddMember,
        currentMembers: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: mockUsers });
    });

    it('renders nothing when closed', () => {
        render(<AddMemberModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Ajouter des membres')).not.toBeInTheDocument();
    });

    it('renders correctly and fetches users when open', async () => {
        render(<AddMemberModal {...defaultProps} />);

        expect(screen.getByText('Ajouter des membres')).toBeInTheDocument();

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/api/users');
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
    });

    it('filters users based on search term', async () => {
        render(<AddMemberModal {...defaultProps} />);

        await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText('Rechercher un utilisateur...');
        fireEvent.change(searchInput, { target: { value: 'Jane' } });

        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('filters out existing members', async () => {
        const currentMembers = [{ userId: 1, name: 'John Doe' }]; // John is id 1
        render(<AddMemberModal {...defaultProps} currentMembers={currentMembers} />);

        await waitFor(() => expect(api.get).toHaveBeenCalled());

        // John should not be in the list
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('selecting users enables the add button', async () => {
        render(<AddMemberModal {...defaultProps} />);

        await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

        const addButton = screen.getByRole('button', { name: /Ajouter/i });
        expect(addButton).toBeDisabled();

        // Click John
        fireEvent.click(screen.getByText('John Doe'));

        expect(addButton).toBeEnabled();
        expect(addButton).toHaveTextContent('Ajouter (1)');

        // Click Jane
        fireEvent.click(screen.getByText('Jane Smith'));
        expect(addButton).toHaveTextContent('Ajouter (2)');

        // Unclick John
        fireEvent.click(screen.getByText('John Doe'));
        expect(addButton).toHaveTextContent('Ajouter (1)');
    });

    it('calls onAddMember for selected users', async () => {
        render(<AddMemberModal {...defaultProps} />);

        await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

        fireEvent.click(screen.getByText('John Doe'));
        fireEvent.click(screen.getByText('Jane Smith'));

        const addButton = screen.getByRole('button', { name: /Ajouter/i });
        fireEvent.click(addButton);

        expect(mockOnAddMember).toHaveBeenCalledTimes(2);
        expect(mockOnAddMember).toHaveBeenCalledWith(1);
        expect(mockOnAddMember).toHaveBeenCalledWith(2);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('uses availableUsers prop if provided', async () => {
        const customUsers = [{ id: 99, firstName: 'Custom', lastName: 'User', role: 'CEO' }];
        render(<AddMemberModal {...defaultProps} availableUsers={customUsers} />);

        expect(api.get).not.toHaveBeenCalled();
        expect(screen.getByText('Custom User')).toBeInTheDocument();
    });
});
