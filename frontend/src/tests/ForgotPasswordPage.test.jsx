import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import { forgotPassword } from '../api/passwordApi';

// Mocking react-router-dom components
// We wrap the component in BrowserRouter, so Link works. 
// But we might want to verify navigation if any.
// In this page, navigation is just Links.

// Mocking passwordApi
vi.mock('../api/passwordApi', () => ({
    forgotPassword: vi.fn(),
}));

describe('ForgotPasswordPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <ForgotPasswordPage />
            </BrowserRouter>
        );
    };

    it('renders the form correctly', () => {
        renderComponent();
        expect(screen.getByLabelText(/Email professionnel/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Envoyer le lien/i })).toBeInTheDocument();
        expect(screen.getByText(/Mot de passe oublié/i)).toBeInTheDocument();
    });

    it('handles successful submission', async () => {
        forgotPassword.mockResolvedValueOnce();

        renderComponent();
        const emailInput = screen.getByLabelText(/Email professionnel/i);
        
        fireEvent.change(emailInput, { target: { value: 'test@primebank.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Envoyer le lien/i }));

        await waitFor(() => {
            expect(forgotPassword).toHaveBeenCalledWith('test@primebank.com');
        });

        // Should show success state
        await waitFor(() => {
            expect(screen.getByText(/Email envoyé/i)).toBeInTheDocument();
            expect(screen.getByText(/Si un compte est associé à/i)).toBeInTheDocument();
        });
    });

    it('handles API error', async () => {
        forgotPassword.mockRejectedValueOnce(new Error('Network Error'));

        renderComponent();
        const emailInput = screen.getByLabelText(/Email professionnel/i);
        
        fireEvent.change(emailInput, { target: { value: 'error@primebank.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Envoyer le lien/i }));

        await waitFor(() => {
            expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
        });
    });
});
