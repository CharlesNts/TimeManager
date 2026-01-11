import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import api from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    }
}));

// Test component to access auth context
function TestConsumer() {
    const { user, isAuthenticated, logout, login, hasRole } = useAuth();
    return (
        <div>
            <div data-testid="is-authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
            <div data-testid="user-name">{user?.firstName || 'none'}</div>
            <div data-testid="user-role">{user?.role || 'none'}</div>
            <div data-testid="is-employee">{hasRole('EMPLOYEE') ? 'yes' : 'no'}</div>
            <button onClick={logout}>Logout</button>
            <button onClick={() => login({ id: 1, firstName: 'Test', role: 'EMPLOYEE' })}>Login</button>
        </div>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    // ====== CRITICAL FLOW: User not authenticated without token ======
    it('shows user as not authenticated when no token exists', async () => {
        api.get.mockRejectedValue(new Error('No token'));

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
            expect(screen.getByTestId('user-name')).toHaveTextContent('none');
        });
    });

    // ====== CRITICAL FLOW: User authenticated with valid token ======
    it('authenticates user when valid token exists', async () => {
        localStorage.setItem('access_token', 'valid-token');
        api.get.mockResolvedValue({
            data: { id: 1, firstName: 'John', lastName: 'Doe', role: 'EMPLOYEE', active: true }
        });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
            expect(screen.getByTestId('user-name')).toHaveTextContent('John');
            expect(screen.getByTestId('user-role')).toHaveTextContent('EMPLOYEE');
        });

        expect(api.get).toHaveBeenCalledWith('/auth/me');
    });

    // ====== CRITICAL FLOW: Logout clears token and user ======
    it('clears user and token on logout', async () => {
        localStorage.setItem('access_token', 'valid-token');
        api.get.mockResolvedValue({
            data: { id: 1, firstName: 'John', role: 'EMPLOYEE', active: true }
        });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
        });

        // Click logout
        const user = userEvent.setup();
        await user.click(screen.getByText('Logout'));

        await waitFor(() => {
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
        });

        // Token should be removed
        expect(localStorage.getItem('access_token')).toBeNull();
    });

    // ====== SECURITY: Inactive account gets logged out ======
    it('logs out inactive accounts', async () => {
        localStorage.setItem('access_token', 'valid-token');
        api.get.mockResolvedValue({
            data: { id: 1, firstName: 'John', role: 'EMPLOYEE', active: false }
        });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
        });

        // Token should be cleared for inactive accounts
        expect(localStorage.getItem('access_token')).toBeNull();
    });

    // ====== SECURITY: Invalid/expired token gets cleared ======
    it('clears invalid tokens', async () => {
        localStorage.setItem('access_token', 'invalid-token');
        api.get.mockRejectedValue(new Error('Token expired'));

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
        });

        expect(localStorage.getItem('access_token')).toBeNull();
    });

    // ====== ROLE CHECK: hasRole works correctly ======
    it('hasRole correctly identifies user role', async () => {
        localStorage.setItem('access_token', 'valid-token');
        api.get.mockResolvedValue({
            data: { id: 1, firstName: 'John', role: 'EMPLOYEE', active: true }
        });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-employee')).toHaveTextContent('yes');
        });
    });

    // ====== LOGIN: login function sets user ======
    it('login function sets user correctly', async () => {
        api.get.mockRejectedValue(new Error('No token')); // Start logged out

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
        });

        // Simulate login
        const user = userEvent.setup();
        await user.click(screen.getByText('Login'));

        await waitFor(() => {
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
            expect(screen.getByTestId('user-name')).toHaveTextContent('Test');
        });
    });
});
