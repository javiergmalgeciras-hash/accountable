import type { AbsenceRecord, CalendarDay, Group, GroupInput, PilatesSession, RecoveryOption, Student } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail ?? 'No se pudo completar la operación.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  students: (q = '') => request<Student[]>(`/students${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createStudent: (body: { name: string; phone: string | null; groupIds: number[] }) => request<Student>('/students', json('POST', body)),
  updateStudent: (id: number, body: { name: string; phone: string | null; groupIds: number[] }) => request<Student>(`/students/${id}`, json('PUT', body)),
  deactivateStudent: (id: number) => request<void>(`/students/${id}`, { method: 'DELETE' }),
  groups: () => request<Group[]>('/groups'),
  createGroup: (body: GroupInput) => request<Group>('/groups', json('POST', body)),
  updateGroup: (id: number, body: GroupInput) => request<Group>(`/groups/${id}`, json('PUT', body)),
  sessions: (start: string, end = start, groupId?: number) => request<PilatesSession[]>(`/sessions?start=${start}&end=${end}${groupId ? `&group_id=${groupId}` : ''}`),
  session: (id: number) => request<PilatesSession>(`/sessions/${id}`),
  absences: () => request<AbsenceRecord[]>('/absences'),
  registerAbsence: (studentId: number, sessionId: number) => request('/absences', json('POST', { studentId, sessionId })),
  recoveryOptions: (absenceId: number) => request<RecoveryOption[]>(`/absences/${absenceId}/recoveries`),
  bookRecovery: (absenceId: number, sessionId: number) => request('/recoveries', json('POST', { absenceId, sessionId })),
  calendar: (start: string, end: string) => request<{ days: CalendarDay[]; sessions: PilatesSession[] }>(`/calendar?start=${start}&end=${end}`),
  setCalendarDay: (day: string, isNonWorking: boolean, note: string | null) => request<CalendarDay>(`/calendar/days/${day}`, json('PUT', { isNonWorking, note })),
  enableManualSession: (groupId: number, startsAt: string) => request<PilatesSession>('/calendar/manual-sessions', json('POST', { groupId, startsAt })),
};
