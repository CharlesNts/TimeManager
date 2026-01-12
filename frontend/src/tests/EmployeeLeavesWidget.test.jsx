// src/tests/EmployeeLeavesWidget.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmployeeLeavesWidget from '../components/employee/EmployeeLeavesWidget';
import * as leavesApi from '../api/leavesApi';

// Mock the API
jest.mock('../api/leavesApi');

describe('EmployeeLeavesWidget', () => {
  const mockUserId = 123;
  const mockOnRequestLeave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('affiche un loader pendant le chargement', () => {
    leavesApi.getEmployeeLeaves.mockImplementation(() => new Promise(() => {}));
    render(<EmployeeLeavesWidget userId={mockUserId} onRequestLeave={mockOnRequestLeave} />);
    
    expect(screen.getByText('Mes congés')).toBeInTheDocument();
  });

  test('affiche les congés de l\'employé', async () => {
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
      expect(screen.getByText('2 demandes')).toBeInTheDocument();
    });

    expect(screen.getByText('Congé payé')).toBeInTheDocument();
    expect(screen.getByText('Arrêt maladie')).toBeInTheDocument();
    expect(screen.getByText('En attente')).toBeInTheDocument();
    expect(screen.getByText('Approuvé')).toBeInTheDocument();
  });

  test('affiche un message quand il n\'y a pas de congés', async () => {
    leavesApi.getEmployeeLeaves.mockResolvedValue([]);

    render(<EmployeeLeavesWidget userId={mockUserId} onRequestLeave={mockOnRequestLeave} />);

    await waitFor(() => {
      expect(screen.getByText('Aucune demande de congé')).toBeInTheDocument();
    });
  });

  test('permet de demander un nouveau congé', async () => {
    leavesApi.getEmployeeLeaves.mockResolvedValue([]);

    render(<EmployeeLeavesWidget userId={mockUserId} onRequestLeave={mockOnRequestLeave} />);

    await waitFor(() => {
      expect(screen.getByText('Demander un congé')).toBeInTheDocument();
    });

    const button = screen.getByText('Demander un congé');
    fireEvent.click(button);

    expect(mockOnRequestLeave).toHaveBeenCalledTimes(1);
  });

  test('permet d\'annuler un congé en attente', async () => {
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
    window.confirm = jest.fn(() => true);

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

  test('affiche une erreur en cas de problème de chargement', async () => {
    leavesApi.getEmployeeLeaves.mockRejectedValue(new Error('Network error'));

    render(<EmployeeLeavesWidget userId={mockUserId} onRequestLeave={mockOnRequestLeave} />);

    await waitFor(() => {
      expect(screen.getByText('Erreur lors du chargement des congés')).toBeInTheDocument();
    });
  });
});
