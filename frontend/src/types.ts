export type Student = { id: number; name: string; phone: string | null; active: boolean; groupIds: number[] };
export type WeeklySchedule = { weekday: number; startTime: string; durationMinutes: number | null };
export type GroupInput = {
  name: string; level: string; modality: string; weeklySchedule: WeeklySchedule[];
  recurrence: string; capacity: number; studentIds: number[];
};
export type Group = {
  id: number; name: string; level: string; modality: string; weekday: number; startTime: string;
  weeklySchedule: WeeklySchedule[]; recurrence: string; capacity: number; studentIds: number[]; active: boolean;
};
export type SessionPerson = { id: number; name: string; phone: string | null; absent: boolean };
export type SessionChange = { id: number; studentId: number; name: string; confirmedAt?: string; registeredAt?: string };
export type PilatesSession = {
  id: number; startsAt: string; durationMinutes?: number | null; capacity: number; occupancy: number; freeSeats: number; status: string;
  enabled: boolean; manual: boolean; group: { id: number; name: string; level: string; modality: string };
  students: SessionPerson[]; absences: SessionChange[]; recoveries: SessionChange[]; labels: string[];
};
export type AbsenceRecord = {
  id: number; studentId: number; studentName: string; sessionId: number; sessionStartsAt: string; sessionDurationMinutes?: number | null;
  groupName: string; level: string; modality: string; registeredAt: string; recoveryCount: number;
};
export type RecoveryOption = {
  id: number; startsAt: string; durationMinutes?: number | null; capacity: number; occupancy: number; freeSeats: number; deadline: string;
  group: { id: number; name: string; level: string; modality: string };
};
export type CalendarDay = { date: string; isNonWorking: boolean; note: string | null };
