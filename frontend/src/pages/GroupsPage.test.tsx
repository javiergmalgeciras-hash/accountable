import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupsPage } from './GroupsPage';
import type { Group, GroupInput, Student } from '../types';

const apiMock = vi.hoisted(() => ({
  groups: vi.fn(),
  students: vi.fn(),
  sessions: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
}));

vi.mock('../api/client', () => ({ api: apiMock }));

const student: Student = { id: 7, name: 'Alumna de prueba', phone: null, active: true, groupIds: [] };

const existingGroup: Group = {
  id: 23,
  name: 'Grupo existente',
  level: 'Inicial',
  modality: 'Reformer',
  weekday: 0,
  startTime: '09:00',
  weeklySchedule: [
    { weekday: 0, startTime: '09:00', durationMinutes: 60 },
    { weekday: 2, startTime: '11:00', durationMinutes: 75 },
  ],
  recurrence: 'Semanal',
  capacity: 8,
  studentIds: [],
  active: true,
};

function setField(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function setDuration(weekday: number, value: string) {
  fireEvent.change(screen.getByLabelText('Duración (min)', { selector: `#group-duration-${weekday}` }), { target: { value } });
}

function submitForm() {
  const form = screen.getByRole('button', { name: /Crear grupo|Guardar cambios/ }).closest('form');
  if (!form) throw new Error('No se encontró el formulario de grupo.');
  fireEvent.submit(form);
}

function setGroups(groups: Group[]) {
  apiMock.groups.mockResolvedValue(groups);
  apiMock.students.mockResolvedValue([student]);
  apiMock.sessions.mockResolvedValue([]);
  apiMock.createGroup.mockResolvedValue({} as Group);
  apiMock.updateGroup.mockResolvedValue({} as Group);
}

describe('creación y edición de horarios de grupo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setGroups([]);
  });

  it('selecciona días rápidamente, copia hora y duración, y envía horarios independientes', async () => {
    const user = userEvent.setup();
    render(<GroupsPage />);

    await user.click(screen.getByRole('button', { name: 'Todos los días' }));
    expect(document.querySelectorAll('.weekly-schedule-day input:checked')).toHaveLength(7);
    await user.click(screen.getByRole('button', { name: 'Lunes a viernes' }));
    expect(document.querySelectorAll('.weekly-schedule-day input:checked')).toHaveLength(5);

    await user.type(screen.getByLabelText('Nombre del grupo'), 'Grupo de prueba');
    setField('Hora de inicio · Lunes', '09:00');
    setDuration(0, '60');
    await user.selectOptions(screen.getByLabelText('Copiar horario de'), '0');
    await user.click(screen.getByRole('button', { name: 'Copiar al resto' }));

    expect(screen.getByLabelText('Hora de inicio · Martes')).toHaveValue('09:00');
    expect(screen.getByLabelText('Duración (min)', { selector: '#group-duration-1' })).toHaveValue(60);
    setField('Hora de inicio · Martes', '10:30');
    expect(screen.getByText('10:30–11:30')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Crear grupo' }));
    await waitFor(() => expect(apiMock.createGroup).toHaveBeenCalledTimes(1));
    expect(apiMock.createGroup).toHaveBeenCalledWith(expect.objectContaining({
      weeklySchedule: [
        { weekday: 0, startTime: '09:00', durationMinutes: 60 },
        { weekday: 1, startTime: '10:30', durationMinutes: 60 },
        { weekday: 2, startTime: '09:00', durationMinutes: 60 },
        { weekday: 3, startTime: '09:00', durationMinutes: 60 },
        { weekday: 4, startTime: '09:00', durationMinutes: 60 },
      ],
    } satisfies Partial<GroupInput>));
  });

  it('exige al menos un día y una duración para cada día nuevo', async () => {
    const user = userEvent.setup();
    const { container } = render(<GroupsPage />);
    await user.type(screen.getByLabelText('Nombre del grupo'), 'Grupo incompleto');

    const selected = container.querySelector<HTMLInputElement>('.weekly-schedule-day input:checked');
    if (!selected) throw new Error('Se esperaba un día seleccionado por defecto.');
    await user.click(selected);
    submitForm();
    expect(await screen.findByRole('alert')).toHaveTextContent('Selecciona al menos un día');
    expect(apiMock.createGroup).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Todos los días' }));
    submitForm();
    expect(await screen.findByRole('alert')).toHaveTextContent('Indica la duración en minutos');
    expect(apiMock.createGroup).not.toHaveBeenCalled();
  });

  it('edita la hora y duración de un día existente y envía los cambios', async () => {
    const user = userEvent.setup();
    setGroups([existingGroup]);
    render(<GroupsPage />);
    await user.click(await screen.findByRole('button', { name: 'Editar grupo' }));

    setField('Hora de inicio · Miércoles', '11:30');
    setDuration(2, '90');
    expect(screen.getByText('11:30–13:00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(apiMock.updateGroup).toHaveBeenCalledTimes(1));
    expect(apiMock.updateGroup).toHaveBeenCalledWith(23, expect.objectContaining({
      weeklySchedule: [
        { weekday: 0, startTime: '09:00', durationMinutes: 60 },
        { weekday: 2, startTime: '11:30', durationMinutes: 90 },
      ],
    } satisfies Partial<GroupInput>));
  });

  it('permite conservar la duración pendiente de un grupo antiguo, pero exige duración en días añadidos', async () => {
    const user = userEvent.setup();
    const legacyGroup: Group = {
      ...existingGroup,
      weeklySchedule: [{ weekday: 1, startTime: '09:00', durationMinutes: null }],
      weekday: 1,
    };
    setGroups([legacyGroup]);
    const { container } = render(<GroupsPage />);
    await user.click(await screen.findByRole('button', { name: 'Editar grupo' }));
    expect(container.querySelector('.legacy-duration-note')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Miércoles' }));

    submitForm();
    expect(await screen.findByRole('alert')).toHaveTextContent('Indica la duración en minutos para cada día nuevo');
    expect(apiMock.updateGroup).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox', { name: 'Miércoles' }));
    fireEvent.change(screen.getByLabelText('Duración (min)', { selector: '#group-duration-1' }), { target: { value: '' } });
    submitForm();
    await waitFor(() => expect(apiMock.updateGroup).toHaveBeenCalledTimes(1));
    expect(apiMock.updateGroup).toHaveBeenCalledWith(23, expect.objectContaining({
      weeklySchedule: [{ weekday: 1, startTime: '09:00', durationMinutes: null }],
    } satisfies Partial<GroupInput>));
  });
});
