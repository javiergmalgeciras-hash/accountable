import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { dateKey, shiftDate } from '../domain/dates';
import { formatSessionDateInterval } from '../domain/schedules';
import type { CalendarDay, Group, PilatesSession } from '../types';

export function CalendarPage() {
  const today = new Date();
  const todayKey = dateKey(today);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [sessions, setSessions] = useState<PilatesSession[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [day, setDay] = useState(dateKey(shiftDate(today, 1)));
  const [calendarStart, setCalendarStart] = useState(todayKey);
  const [note, setNote] = useState('');
  const [groupId, setGroupId] = useState<number | ''>('');
  const [startsAt, setStartsAt] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function load(start = calendarStart) {
    try {
      const end = dateKey(shiftDate(new Date(`${start}T12:00:00`), 41));
      const [calendar, listedGroups] = await Promise.all([api.calendar(start, end), api.groups()]);
      setDays(calendar.days); setSessions(calendar.sessions); setGroups(listedGroups);
      if (groupId === '' && listedGroups.length) setGroupId(listedGroups[0].id);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar el calendario.'); }
  }
  useEffect(() => { void load(); }, [calendarStart]);

  async function markDay(event: FormEvent) {
    event.preventDefault(); setError('');
    try { await api.setCalendarDay(day, true, note.trim() || null); setNotice('El día quedó marcado como no lectivo.'); await load(day); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el día.'); }
  }

  async function enableSession(event: FormEvent) {
    event.preventDefault(); setError('');
    if (groupId === '') return;
    try {
      const sessionDay = startsAt.slice(0, 10);
      await api.enableManualSession(groupId, new Date(startsAt).toISOString());
      setNotice('Se habilitó una sesión para el día no lectivo.');
      setDay(sessionDay); setCalendarStart(sessionDay); setStartsAt(''); await load(sessionDay);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo habilitar la sesión.'); }
  }

  return (
    <div className="page-content">
      <div className="page-heading"><div><h1>Calendario del centro</h1><p>Marca días no lectivos y habilita sesiones cuando corresponda.</p></div><span className="count-label">Seis semanas desde la fecha elegida</span></div>
      {error && <p className="error-message" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
      <div className="management-layout calendar-layout">
        <div className="calendar-forms">
          <section className="panel form-panel"><h2>Marcar día no lectivo</h2><form onSubmit={(event) => void markDay(event)}><label htmlFor="calendar-day">Fecha</label><input id="calendar-day" type="date" required value={day} onChange={(event) => { setDay(event.target.value); setCalendarStart(event.target.value); }} /><small className="form-hint">El calendario muestra seis semanas desde esta fecha.</small><label htmlFor="calendar-note">Nota <span className="optional">Opcional</span></label><input id="calendar-note" maxLength={200} placeholder="Por ejemplo, festivo local" value={note} onChange={(event) => setNote(event.target.value)} /><button className="button primary" type="submit">Guardar día no lectivo</button></form></section>
          <section className="panel form-panel"><h2>Habilitar sesión manual</h2><p className="form-hint">Esta acción crea una sesión concreta. No cambia automáticamente las recurrencias del grupo.</p><form onSubmit={(event) => void enableSession(event)}><label htmlFor="manual-group">Grupo</label><select id="manual-group" required value={groupId} onChange={(event) => setGroupId(Number(event.target.value))}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.level} · {group.modality}</option>)}</select><label htmlFor="manual-start">Fecha y hora</label><input id="manual-start" type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /><button className="button secondary" type="submit" disabled={groups.length === 0}>Habilitar sesión</button></form></section>
        </div>
        <section className="panel calendar-panel">
          <h2>Días no lectivos y sesiones</h2>
          {days.length === 0 && <p className="muted">No hay días no lectivos marcados para este periodo.</p>}
          {days.map((item) => <article className="calendar-day-item" key={item.date}>
            <div className="calendar-day-heading"><div><strong>{new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${item.date}T12:00:00`))}</strong>{item.note && <span>{item.note}</span>}</div><span className="status-pill absence">No lectivo</span></div>
            <ul>{sessions.filter((session) => session.startsAt.startsWith(item.date)).map((session) => <li key={session.id}>
              <span>{formatSessionDateInterval(session.startsAt, session.durationMinutes)} · {session.group.name}</span>
              <span>{session.manual ? 'Habilitada manualmente' : 'Sesión recurrente'} · {session.occupancy} de {session.capacity}</span>
            </li>)}</ul>
          </article>)}
        </section>
      </div>
    </div>
  );
}
