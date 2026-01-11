import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../pages/RegisterPage';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// Mock axios
vi.mock('axios');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('RegisterPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderRegister = () => render(
        <MemoryRouter>
            <RegisterPage />
        </MemoryRouter>
    );

    it('renders registration form', () => {
        renderRegister();
        expect(screen.getByLabelText(/^Prénom/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Nom/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email professionnel/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Créer mon compte/i })).toBeInTheDocument();
    });

    it('validates email domain', async () => {
        renderRegister();
        // Use placeholder or specific label text to avoid ambiguity
        fireEvent.change(screen.getByPlaceholderText(/prenom.nom@primebank.com/i), { target: { value: 'test@gmail.com' } });
        fireEvent.submit(screen.getByTestId('register-form'));

        await waitFor(() => {
            expect(screen.getByText(/Seuls les emails @primebank.com sont autorisés/i)).toBeInTheDocument();
        });
    });

    it('validates password length', async () => {
        renderRegister();
        fireEvent.change(screen.getByPlaceholderText(/prenom.nom@primebank.com/i), { target: { value: 'test@primebank.com' } });
        fireEvent.change(screen.getByLabelText(/^Mot de passe/i), { target: { value: 'short' } });
        fireEvent.submit(screen.getByTestId('register-form'));

        await waitFor(() => {
            expect(screen.getByText(/Le mot de passe doit contenir au moins 8 caractères/i)).toBeInTheDocument();
        });
    });

    it('validates password match', async () => {
        renderRegister();
        fireEvent.change(screen.getByPlaceholderText(/prenom.nom@primebank.com/i), { target: { value: 'test@primebank.com' } });
        fireEvent.change(screen.getByLabelText(/^Mot de passe/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/^Confirmer/i), { target: { value: 'different' } });
        fireEvent.submit(screen.getByTestId('register-form'));

        await waitFor(() => {
            expect(screen.getByText(/Les mots de passe ne correspondent pas/i)).toBeInTheDocument();
        });
    });

    it('handles successful registration', async () => {
        axios.post.mockResolvedValueOnce({ data: { message: 'Success' } });
        renderRegister();

        fireEvent.change(screen.getByLabelText(/^Prénom/i), { target: { value: 'John' } });
        fireEvent.change(screen.getByLabelText(/^Nom/i), { target: { value: 'Doe' } });
        fireEvent.change(screen.getByPlaceholderText(/prenom.nom@primebank.com/i), { target: { value: 'john.doe@primebank.com' } });
        fireEvent.change(screen.getByLabelText(/^Mot de passe/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/^Confirmer/i), { target: { value: 'password123' } });

        fireEvent.submit(screen.getByTestId('register-form'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalled();
            expect(screen.getByText(/Compte créé/i)).toBeInTheDocument();
        });

        // Wait for redirection
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        }, { timeout: 3000 });
    });
});
