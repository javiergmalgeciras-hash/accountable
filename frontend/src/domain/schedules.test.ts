import { describe, expect, it } from 'vitest';
import { formatSessionDateInterval, formatSessionInterval, formatWeeklyInterval } from './schedules';

describe('formato de horarios semanales', () => {
  it('calcula el intervalo a partir de la hora y duración del día', () => {
    expect(formatWeeklyInterval('09:00', 60)).toBe('09:00–10:00');
    expect(formatWeeklyInterval('11:00', 75)).toBe('11:00–12:15');
  });

  it('identifica como pendiente la duración de un horario antiguo sin ese dato', () => {
    expect(formatWeeklyInterval('09:00', null)).toBe('09:00 · Duración pendiente');
  });

  it('representa el cambio de día cuando la duración cruza medianoche', () => {
    expect(formatWeeklyInterval('23:30', 90)).toBe('23:30–01:00 (+1 día)');
  });
});

describe('formato de sesiones', () => {
  it('muestra el intervalo de una sesión concreta y conserva la hora si falta duración', () => {
    expect(formatSessionInterval('2026-11-18T09:30:00', 60)).toBe('09:30–10:30');
    expect(formatSessionInterval('2026-11-18T09:30:00', null)).toBe('09:30');
  });

  it('indica si la sesión termina al día siguiente', () => {
    expect(formatSessionInterval('2026-11-18T23:30:00', 90)).toBe('23:30–01:00 (+1 día)');
  });

  it('incluye fecha e intervalo en la lista de próximas sesiones', () => {
    expect(formatSessionDateInterval('2026-11-18T09:30:00', 60)).toContain('09:30–10:30');
    expect(formatSessionDateInterval('2026-11-18T09:30:00', 60)).toContain('18 de noviembre');
  });
});
