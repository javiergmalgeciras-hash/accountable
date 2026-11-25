import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgendaPage } from './AgendaPage';
import { dateKey, formatDay } from '../domain/dates';
import type { PilatesSession } from '../types';

const apiMock = vi.hoisted(() => ({ sessions: vi.fn() }));

vi.mock('../api/client', () => ({ api: apiMock }));

function makeSession(startsAt: string): PilatesSession {
  return {
    id: 1,
    startsAt,
    durationMinutes: 60,
    capacity: 8,
    occupancy: 1,
    freeSeats: 7,
    status: 'Disponible',
    enabled: true,
    manual: false,
    group: { id: 2, name: 'Grupo de prueba', level: 'Inicial', modality: 'Reformer' },
    students: [],
    absences: [{ id: 3, studentId: 4, name: 'Alumna de prueba' }],
    recoveries: [],
    labels: ['Ausencia'],
  };
}

function AgendaHarness() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  return <AgendaPage selectedDate={selectedDate} view={view} onDateChange={setSelectedDate} onViewChange={setView} onOpenAbsences={() => undefined} />;
}

describe('fecha seleccionada en la agenda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.sessions.mockImplementation(async (start: string) => [makeSession(`${start}T09:00:00`)]);
  });

  it('deja de llamar hoy a la agenda y a sus cambios tras avanzar un día', async () => {
    render(<AgendaHarness />);
    expect(await screen.findByText('Hoy')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Día siguiente' }));

    expect(await screen.findByText('Fecha seleccionada')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Hoy')).not.toBeInTheDocument());
    const requestedDate = apiMock.sessions.mock.calls.at(-1)?.[0] as string;
    const expectedChangeDate = formatDay(new Date(`${requestedDate}T09:00:00`), { weekday: 'short', day: 'numeric', month: 'short' });
    const changeDetails = document.querySelector('.changes-panel .change-item p');
    expect(changeDetails).toHaveTextContent(`${expectedChangeDate}, 09:00`);
    expect(dateKey(new Date(`${requestedDate}T12:00:00`))).toBe(requestedDate);
  });
});
