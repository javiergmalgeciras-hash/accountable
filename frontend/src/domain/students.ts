import type { Student } from '../types';

export function normalizeStudentName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeOptionalPhone(phone: string | null | undefined): string | null {
  return phone?.trim() || null;
}

export function validateStudentName(name: string, students: Student[], editingId?: number): string | null {
  if (!normalizeStudentName(name)) return 'El nombre del alumno es obligatorio.';
  const normalized = normalizeStudentName(name);
  if (students.some((student) => student.id !== editingId && normalizeStudentName(student.name) === normalized)) return 'Ya existe un alumno con ese nombre.';
  return null;
}

export function studentUpdatePayload(student: Student, changes: Partial<Pick<Student, 'name' | 'phone' | 'groupIds'>>) {
  return { id: student.id, name: changes.name ?? student.name, phone: changes.phone ?? student.phone, groupIds: changes.groupIds ?? [...student.groupIds] };
}
