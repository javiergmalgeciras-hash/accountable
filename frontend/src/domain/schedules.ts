import { dateKey } from './dates';

function clockLabel(totalMinutes: number): string {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatWeeklyInterval(startTime: string, durationMinutes: number | null | undefined): string {
  if (durationMinutes == null) return `${startTime} · Duración pendiente`;
  const [hours, minutes] = startTime.split(':').map(Number);
  const endTotal = hours * 60 + minutes + durationMinutes;
  const nextDay = Math.floor(endTotal / (24 * 60));
  return `${startTime}–${clockLabel(endTotal)}${nextDay ? ` (+${nextDay} día${nextDay > 1 ? 's' : ''})` : ''}`;
}

export function formatSessionInterval(startsAt: string, durationMinutes: number | null | undefined): string {
  const start = new Date(startsAt);
  const startLabel = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(start);
  if (durationMinutes == null) return startLabel;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const endLabel = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(end);
  return `${startLabel}–${endLabel}${dateKey(end) !== dateKey(start) ? ' (+1 día)' : ''}`;
}

export function formatSessionDateInterval(startsAt: string, durationMinutes: number | null | undefined): string {
  const start = new Date(startsAt);
  const day = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(start);
  return `${day} · ${formatSessionInterval(startsAt, durationMinutes)}`;
}
