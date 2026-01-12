// src/tests/EmployeeLeavesWidget.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmployeeLeavesWidget from '../components/employee/EmployeeLeavesWidget';
import * as leavesApi from '../api/leavesApi';

// Mock the API
vi.mock('../api/leavesApi', async () => {
  const actual = await vi.importActual('../api/leavesApi');
  return {
    ...actual,
    getEmployeeLeaves: vi.fn(),
    cancelLeave: vi.fn(),
  };
});

describe('EmployeeLeavesWidget', () => {
  const mockUserId = 123;
  const mockOnRequestLeave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche un loader pendant le chargement', () => {
    leavesApi.getEmployeeLeaves.mockImplementation(() => new Promise(() => {}));
    render(<EmployeeLeavesWidget userId={mockUserId} onRequestLeave={mockOnRequestLeave} />);
    
    expect(screen.getByText('Mes congés')).toBeInTheDocument();
  });

  it('affiche les congés de l\'employé', async () => {
    const mockLeaves = [
      {
        id: 1,
        type: 'PAID',
        startAt: '2026-01-20T00:00:00',
        endAt: '2026-01-24T00:00:00',
        status: 'PENDING',
        reason: 'Vacances de janvier',
      },
      {
        id: 2,
        type: 'SICK',
        startAt: '2026-01-10T00:00:00',
        endAt: '2026-01-12T00:00:00',
        status: 'APPROVED',
        reason: 'Maladie',
        managerNote: 'Bon rétablissement',
      },
    ];

    leavesApi.getEmployeeLeaves.mockResolvedValue(mockLeaves);

    render(<EmployeeLeavesWidget userId={mockUserId} onRequestLeave={mockOnRequestLeave} />);

    await waitFor(() => {
      // Seul le congé PENDING est compté comme "en attente"
      expect(screen.getByText('1 demande en attente')).toBeInTheDocument();
    });

    expect(screen.getByText('Congé payé')).toBeInTheDocument();
    // Le bouton historique montre le total
    expect(screen.getByText(/Voir tout l'historique/)).toBeInTheDocument();
  });

  it('affiche un message quand il n\'y a pas de congés', async () => {
    leavesApi.getEmployeeLeaves.mockResolvedValue([]);

    render(<EmployeeLeavesWidget userId={mockUserId} onRequestLeave={mockOnRequestLeave} />);

    await waitFor(() => {
      expect(screen.getByText('Aucune demande de congé')).toBeInTheDocument();
    });
  });

  it('permet de demander un nouveau congé', async () => {
    leavesApi.getEmployeeLeaves.mockResolvedValue([]);

    render(<EmployeeLeavesWidget userId={mockUserId} onRequestLeave={mockOnRequestLeave} />);

    await waitFor(() => {
      expect(screen.getByText('Demander un congé')).toBeInTheDocument();
    });

    const button = screen.getByText('Demander un congé');
    fireEvent.click(button);

    expect(mockOnRequestLeave).toHaveBeenCalledTimes(1);
  });

  it('permet d\'annuler un congé en attente', async () => {
    const mockLeaves = [
      {
        id: 1,
        type: 'PAID',
        startAt: '2026-01-20T00:00:00',
        endAt: '2026-01-24T00:00:00',
        status: 'PENDING',
        reason: 'Vacances de janvier',
      },
    ];

    leavesApi.getEmployeeLeaves.mockResolvedValue(mockLeaves);
    leavesApi.cancelLeave.mockResolvedValue({});
    window.confirm = vi.fn(() => true);

    render(<EmployeeLeavesWidget userId={mockUserId} onRequestLeave={mockOnRequestLeave} />);

    await waitFor(() => {
      expect(screen.getByText('Annuler')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Annuler');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(leavesApi.cancelLeave).toHaveBeenCalledWith(1, mockUserId);
    });
  });

  it('affiche une erreur en cas de problème de chargement', async () => {
    leavesApi.getEmployeeLeaves.mockRejectedValue(new Error('Network error'));

    render(<EmployeeLeavesWidget userId={mockUserId} onRequestLeave={mockOnRequestLeave} />);

    await waitFor(() => {
      expect(screen.getByText('Erreur lors du chargement des congés')).toBeInTheDocument();
    });
  });
});
