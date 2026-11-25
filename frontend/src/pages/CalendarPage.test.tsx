import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarPage } from './CalendarPage';
import type { CalendarDay } from '../types';

const apiMock = vi.hoisted(() => ({
  calendar: vi.fn(),
  groups: vi.fn(),
  setCalendarDay: vi.fn(),
  enableManualSession: vi.fn(),
}));

vi.mock('../api/client', () => ({ api: apiMock }));

const selectedDate = '2027-01-15';
const holiday: CalendarDay = { date: selectedDate, isNonWorking: true, note: 'Festivo futuro' };

describe('periodo del calendario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.calendar.mockImplementation(async (start: string) => ({
      days: start === selectedDate ? [holiday] : [],
      sessions: [],
    }));
    apiMock.groups.mockResolvedValue([]);
    apiMock.setCalendarDay.mockResolvedValue(holiday);
    apiMock.enableManualSession.mockResolvedValue({});
  });

  it('muestra días no lectivos al seleccionar una fecha fuera del periodo inicial', async () => {
    render(<CalendarPage />);

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: selectedDate } });

    expect(await screen.findByText('Festivo futuro')).toBeInTheDocument();
    await waitFor(() => expect(apiMock.calendar).toHaveBeenLastCalledWith(selectedDate, '2027-02-25'));
  });
});
