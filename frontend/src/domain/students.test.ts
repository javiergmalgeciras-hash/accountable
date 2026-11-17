import { describe, expect, it } from 'vitest';
import { normalizeOptionalPhone, normalizeStudentName, studentUpdatePayload, validateStudentName } from './students';
import type { Student } from '../types';

const records: Student[] = [
  { id: 12, name: 'María López', phone: null, active: true, groupIds: [3, 8] },
];

describe('reglas visibles de alumnos', () => {
  it('acepta el teléfono vacío como dato opcional', () => {
    expect(normalizeOptionalPhone('   ')).toBeNull();
    expect(normalizeOptionalPhone(' 600 100 200 ')).toBe('600 100 200');
  });

  it('rechaza nombres vacíos y duplicados al normalizar espacios y mayúsculas', () => {
    expect(validateStudentName('   ', records)).toBe('El nombre del alumno es obligatorio.');
    expect(normalizeStudentName('  MARÍA   LÓPEZ ')).toBe('maría lópez');
    expect(validateStudentName('  MARÍA   LÓPEZ ', records)).toBe('Ya existe un alumno con ese nombre.');
  });

  it('permite editar su propio nombre sin cambiar el ID ni los grupos asignados', () => {
    const result = studentUpdatePayload(records[0], { name: 'María López García' });
    expect(result).toEqual({ id: 12, name: 'María López García', phone: null, groupIds: [3, 8] });
  });
});
