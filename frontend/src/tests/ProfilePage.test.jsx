import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '../pages/ProfilePage';
import { forgotPassword } from '../api/passwordApi';
import { toast } from 'sonner';
import { getUserById, updateUserById } from '../api/userApi';
import { deleteUser } from '../api/userAdminApi';

// Mock AuthContext
const mockUser = { id: 1, email: 'user@primebank.com', role: 'EMPLOYEE', firstName: 'John', lastName: 'Doe', phoneNumber: '0123456789' };
const mockSetUser = vi.fn();
const mockLogout = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        setUser: mockSetUser,
        logout: mockLogout,
    }),
}));

// Mock APIs
vi.mock('../api/userApi', () => ({
    getUserById: vi.fn(),
    updateUserById: vi.fn(),
}));

vi.mock('../api/teamApi', () => ({
    fetchUserMemberships: vi.fn().mockResolvedValue([]),
}));

vi.mock('../api/userAdminApi', () => ({
    deleteUser: vi.fn(),
}));

vi.mock('../api/passwordApi', () => ({
    forgotPassword: vi.fn(),
}));

// Mock Sonner
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

// Mock Navigation
vi.mock('../utils/navigationConfig', () => ({
    getSidebarItems: () => [],
}));

// Mock Layout
vi.mock('../components/layout/Layout', () => ({
    default: ({ children }) => <div data-testid="layout">{children}</div>
}));

describe('ProfilePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getUserById.mockResolvedValue(mockUser);
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <ProfilePage />
            </BrowserRouter>
        );
    };

    it('renders profile information correctly on load', async () => {
        renderComponent();
        
        await waitFor(() => {
            expect(screen.getByText('Mon Profil')).toBeInTheDocument();
            expect(screen.getByDisplayValue('John')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
            expect(screen.getByDisplayValue('user@primebank.com')).toBeInTheDocument();
            expect(screen.getByDisplayValue('0123456789')).toBeInTheDocument();
        });
    });

    it('allows entering and exiting edit mode', async () => {
        renderComponent();
        await waitFor(() => expect(getUserById).toHaveBeenCalled());

        const editBtn = screen.getByRole('button', { name: /Modifier le profil/i });
        fireEvent.click(editBtn);

        // Buttons change to Sauvegarder and Annuler
        expect(screen.getByRole('button', { name: /Sauvegarder/i })).toBeInTheDocument();
        const cancelBtn = screen.getByRole('button', { name: /Annuler/i });
        
        fireEvent.click(cancelBtn);
        expect(screen.getByRole('button', { name: /Modifier le profil/i })).toBeInTheDocument();
    });

    it('successfully updates user information', async () => {
        const updatedUser = { ...mockUser, firstName: 'Johnny', lastName: 'Doeson' };
        updateUserById.mockResolvedValue(updatedUser);

        renderComponent();
        await waitFor(() => expect(getUserById).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: /Modifier le profil/i }));

        const firstNameInput = screen.getByLabelText(/Prénom/i);
        fireEvent.change(firstNameInput, { target: { value: 'Johnny' } });

        fireEvent.click(screen.getByRole('button', { name: /Sauvegarder/i }));

        await waitFor(() => {
            expect(updateUserById).toHaveBeenCalledWith(1, expect.objectContaining({
                firstName: 'Johnny'
            }));
            expect(mockSetUser).toHaveBeenCalled();
            expect(screen.getByText(/Profil mis à jour/i)).toBeInTheDocument();
        });
    });

    it('handles account deletion flow', async () => {
        deleteUser.mockResolvedValue({});

        renderComponent();
        await waitFor(() => expect(getUserById).toHaveBeenCalled());

        const deleteBtn = screen.getByRole('button', { name: /Supprimer mon compte/i });
        fireEvent.click(deleteBtn);

        // Should show confirmation
        expect(screen.getByText(/Êtes-vous absolument sûr\(e\) \?/i)).toBeInTheDocument();
        
        const confirmBtn = screen.getByRole('button', { name: /Confirmer la suppression/i });
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(deleteUser).toHaveBeenCalledWith(1);
            expect(mockLogout).toHaveBeenCalled();
        });
    });

    it('triggers forgotPassword when Reset button is clicked', async () => {
        renderComponent();
        await waitFor(() => expect(getUserById).toHaveBeenCalled());

        const resetBtn = screen.getByRole('button', { name: /Réinitialiser/i });
        fireEvent.click(resetBtn);

        await waitFor(() => {
            expect(forgotPassword).toHaveBeenCalledWith('user@primebank.com');
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('user@primebank.com'));
        });
    });

    it('handles forgotPassword error', async () => {
        forgotPassword.mockRejectedValueOnce(new Error('Fail'));
        renderComponent();
        await waitFor(() => expect(getUserById).toHaveBeenCalled());

        const resetBtn = screen.getByRole('button', { name: /Réinitialiser/i });
        fireEvent.click(resetBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Erreur lors de l'envoi"));
        });
    });
});