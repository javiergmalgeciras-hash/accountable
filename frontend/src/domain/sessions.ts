import type { PilatesSession } from '../types';

export function occupancyLabel(session: Pick<PilatesSession, 'occupancy' | 'capacity' | 'freeSeats'>): string {
  return `${session.occupancy} de ${session.capacity} ocupadas · ${session.freeSeats} ${session.freeSeats === 1 ? 'plaza libre' : 'plazas libres'}`;
}

export function availabilityLabel(session: Pick<PilatesSession, 'freeSeats'>): string {
  return session.freeSeats === 0 ? 'Completa' : `${session.freeSeats} ${session.freeSeats === 1 ? 'plaza libre' : 'plazas libres'}`;
}

export function sessionState(session: Pick<PilatesSession, 'freeSeats' | 'absences' | 'recoveries'>): 'complete' | 'absence' | 'recovery' | 'available' {
  if (session.freeSeats === 0) return 'complete';
  if (session.absences.length > 0) return 'absence';
  if (session.recoveries.length > 0) return 'recovery';
  return 'available';
}
