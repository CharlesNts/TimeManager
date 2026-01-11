import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../pages/LoginPage';
import api from '../api/client';

// Mocks
const mockNavigate = vi.fn();
// Mocking react-router-dom
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mocking AuthContext
const mockSetUser = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({ setUser: mockSetUser }),
}));

// Mocking API
vi.mock('../api/client', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        }
    },
}));

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        const localStorageMock = (function () {
            let store = {};
            return {
                getItem: vi.fn((key) => store[key] || null),
                setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
                clear: vi.fn(() => { store = {}; }),
                removeItem: vi.fn((key) => { delete store[key]; }),
            };
        })();

        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true
        });
    });

    it('renders login form correctly', () => {
        render(<LoginPage />);
        expect(screen.getByLabelText(/Email professionnel/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Mot de passe/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Se connecter/i })).toBeInTheDocument();
    });

    it('validates email domain', async () => {
        render(<LoginPage />);
        const emailInput = screen.getByLabelText(/Email professionnel/i);

        fireEvent.change(emailInput, { target: { value: 'wrong@gmail.com' } });
        fireEvent.submit(screen.getByTestId('login-form'));

        await waitFor(() => {
            expect(screen.getByText(/Seuls les emails @primebank.com sont autorisés/i)).toBeInTheDocument();
        });
        expect(api.post).not.toHaveBeenCalled();
    });

    it('validates password length', async () => {
        render(<LoginPage />);
        const emailInput = screen.getByLabelText(/Email professionnel/i);
        const passwordInput = screen.getByLabelText(/Mot de passe/i);

        fireEvent.change(emailInput, { target: { value: 'test@primebank.com' } });
        fireEvent.change(passwordInput, { target: { value: '12345' } }); // too short
        fireEvent.submit(screen.getByTestId('login-form'));

        await waitFor(() => {
            expect(screen.getByText(/Le mot de passe doit contenir au moins 6 caractères/i)).toBeInTheDocument();
        });
        expect(api.post).not.toHaveBeenCalled();
    });

    it('handles successful login', async () => {
        // Setup API mocks
        api.post.mockResolvedValueOnce({
            data: { accessToken: 'fake_token_123', expiresIn: 3600 }
        });
        api.get.mockResolvedValueOnce({
            data: { id: 1, email: 'test@primebank.com', role: 'EMPLOYEE', active: true }
        });

        render(<LoginPage />);
        const emailInput = screen.getByLabelText(/Email professionnel/i);
        const passwordInput = screen.getByLabelText(/Mot de passe/i);

        fireEvent.change(emailInput, { target: { value: 'test@primebank.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.submit(screen.getByTestId('login-form'));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/auth/login', {
                email: 'test@primebank.com',
                password: 'password123',
            });
        });

        await waitFor(() => {
            expect(localStorage.getItem('access_token')).toBe('fake_token_123');
            expect(api.get).toHaveBeenCalledWith('/auth/me');
            expect(mockSetUser).toHaveBeenCalledWith({ id: 1, email: 'test@primebank.com', role: 'EMPLOYEE', active: true });
            expect(mockNavigate).toHaveBeenCalledWith('/my-clocks', { replace: true });
        });
    });

    it('handles login error', async () => {
        api.post.mockRejectedValueOnce({
            response: { status: 401, data: { message: 'Unauthorized' } }
        });

        render(<LoginPage />);
        const emailInput = screen.getByLabelText(/Email professionnel/i);
        const passwordInput = screen.getByLabelText(/Mot de passe/i);

        fireEvent.change(emailInput, { target: { value: 'fail@primebank.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
        fireEvent.submit(screen.getByTestId('login-form'));

        await waitFor(() => {
            expect(screen.getByText(/Identifiants incorrects/i)).toBeInTheDocument();
        });
    });
});
