import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import { resetPassword } from '../api/passwordApi';

// Mocking passwordApi
vi.mock('../api/passwordApi', () => ({
    resetPassword: vi.fn(),
}));

// Mocking react-router-dom hooks
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams('');

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [mockSearchParams, vi.fn()],
    };
});

describe('ResetPasswordPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchParams = new URLSearchParams('');
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <ResetPasswordPage />
            </BrowserRouter>
        );
    };

    it('renders invalid link message when token is missing', () => {
        mockSearchParams = new URLSearchParams('');
        renderComponent();
        expect(screen.getByText(/Lien invalide/i)).toBeInTheDocument();
    });

    it('renders the reset form when token is present', () => {
        mockSearchParams = new URLSearchParams('token=valid-token');
        renderComponent();
        expect(screen.getByLabelText(/^Nouveau mot de passe$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Confirmer le mot de passe$/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Mettre à jour le mot de passe/i })).toBeInTheDocument();
    });

    it('validates password mismatch', async () => {
        mockSearchParams = new URLSearchParams('token=valid-token');
        renderComponent();

        fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe$/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/^Confirmer le mot de passe$/i), { target: { value: 'password456' } });
        fireEvent.click(screen.getByRole('button', { name: /Mettre à jour/i }));

        await waitFor(() => {
            expect(screen.getByText(/Les mots de passe ne correspondent pas/i)).toBeInTheDocument();
        });
        expect(resetPassword).not.toHaveBeenCalled();
    });

    it('validates short password', async () => {
        mockSearchParams = new URLSearchParams('token=valid-token');
        renderComponent();

        fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe$/i), { target: { value: '123' } });
        fireEvent.change(screen.getByLabelText(/^Confirmer le mot de passe$/i), { target: { value: '123' } });
        fireEvent.click(screen.getByRole('button', { name: /Mettre à jour/i }));

        await waitFor(() => {
            expect(screen.getByText(/Le mot de passe doit contenir au moins 6 caractères/i)).toBeInTheDocument();
        });
        expect(resetPassword).not.toHaveBeenCalled();
    });

    it('handles successful reset', async () => {
        mockSearchParams = new URLSearchParams('token=valid-token');
        resetPassword.mockResolvedValueOnce();
        
        renderComponent();

        fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe$/i), { target: { value: 'newpassword123' } });
        fireEvent.change(screen.getByLabelText(/^Confirmer le mot de passe$/i), { target: { value: 'newpassword123' } });
        fireEvent.click(screen.getByRole('button', { name: /Mettre à jour/i }));

        await waitFor(() => {
            expect(resetPassword).toHaveBeenCalledWith('valid-token', 'newpassword123');
        });

        await waitFor(() => {
            expect(screen.getByText(/Mot de passe modifié/i)).toBeInTheDocument();
        });
        
        // We verify the success state is shown. 
        // Testing the exact setTimeout redirect is often flaky in unit tests without fake timers,
        // but verifying the API call and UI change is the critical part.
    });

    it('handles API error (invalid token)', async () => {
        mockSearchParams = new URLSearchParams('token=expired-token');
        resetPassword.mockRejectedValueOnce(new Error('Invalid token'));

        renderComponent();

        fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe$/i), { target: { value: 'newpassword123' } });
        fireEvent.change(screen.getByLabelText(/^Confirmer le mot de passe$/i), { target: { value: 'newpassword123' } });
        fireEvent.click(screen.getByRole('button', { name: /Mettre à jour/i }));

        await waitFor(() => {
            expect(screen.getByText(/Le lien a expiré ou est invalide/i)).toBeInTheDocument();
        });
    });
});