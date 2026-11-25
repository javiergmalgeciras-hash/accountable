import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbsencesPage } from './AbsencesPage';
import type { AbsenceRecord } from '../types';

const apiMock = vi.hoisted(() => ({
  absences: vi.fn(),
  recoveryOptions: vi.fn(),
  bookRecovery: vi.fn(),
}));

vi.mock('../api/client', () => ({ api: apiMock }));

const absence: AbsenceRecord = {
  id: 1,
  studentId: 7,
  studentName: 'Alumna de prueba',
  sessionId: 12,
  sessionStartsAt: '2026-11-17T08:00:00',
  sessionDurationMinutes: 60,
  groupName: 'Reformer mañana',
  level: 'Inicial',
  modality: 'Reformer',
  registeredAt: '2026-11-15T08:00:00',
  recoveryCount: 0,
  deadline: '2026-11-24',
};

describe('búsqueda de recuperaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.absences.mockResolvedValue([absence]);
    apiMock.recoveryOptions.mockResolvedValue([]);
  });

  it('muestra el plazo aunque no haya sesiones compatibles', async () => {
    render(<AbsencesPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Buscar recuperación' }));

    expect(await screen.findByText(/hasta el 24 de noviembre incluido/)).toBeInTheDocument();
    expect(screen.getByText('No hay sesiones con plaza dentro del plazo.')).toBeInTheDocument();
  });
});
