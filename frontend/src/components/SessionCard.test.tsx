import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SessionCard } from './SessionCard';
import type { PilatesSession } from '../types';

const session: PilatesSession = {
  id: 5,
  startsAt: '2026-11-18T09:30:00',
  capacity: 8,
  occupancy: 6,
  freeSeats: 2,
  status: 'Disponible',
  enabled: true,
  manual: false,
  group: { id: 3, name: 'Grupo mañana', level: 'Inicial', modality: 'Reformer' },
  students: [{ id: 9, name: 'Alumna ficticia', phone: null, absent: false }],
  absences: [{ id: 2, studentId: 10, name: 'Otra alumna' }],
  recoveries: [{ id: 4, studentId: 11, name: 'Recuperación ficticia' }],
  labels: ['Ausencia', 'Recuperación'],
};

describe('tarjeta de sesión', () => {
  it('muestra horario, grupo, nivel, modalidad y ocupación en texto', () => {
    render(<SessionCard session={session} onChanged={vi.fn()} />);
    expect(screen.getByText('09:30')).toBeInTheDocument();
    expect(screen.getByText('Reformer · Inicial')).toBeInTheDocument();
    expect(screen.getByText('Grupo mañana · 1 alumno asignado')).toBeInTheDocument();
    expect(screen.getByText('6 de 8')).toBeInTheDocument();
    expect(screen.getAllByText('2 plazas libres')).toHaveLength(1);
  });

  it('distingue las ausencias y las recuperaciones y permite consultar participantes', () => {
    render(<SessionCard session={session} onChanged={vi.fn()} />);
    expect(screen.getByText('1 ausencia')).toBeInTheDocument();
    expect(screen.getByText('1 recuperación')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reformer · Inicial/ }));
    expect(screen.getByText('Alumna ficticia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar ausencia' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ausencia' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Confirmar ausencia');
    expect(screen.getByRole('dialog')).toHaveTextContent('Alumna ficticia');
  });
});
