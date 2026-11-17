import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { SessionCard } from '../components/SessionCard';
import { dateKey, formatDay, mondayOf, shiftDate } from '../domain/dates';
import type { PilatesSession } from '../types';

type Props = { selectedDate: Date; view: 'day' | 'week'; onDateChange: (date: Date) => void; onViewChange: (view: 'day' | 'week') => void };

export function AgendaPage({ selectedDate, view, onDateChange, onViewChange }: Props) {
  const [sessions, setSessions] = useState<PilatesSession[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const start = view === 'week' ? mondayOf(selectedDate) : selectedDate;
  const end = view === 'week' ? shiftDate(start, 6) : selectedDate;
  const startKey = dateKey(start);
  const endKey = dateKey(end);

  async function load() {
    setLoading(true);
    try { setSessions(await api.sessions(startKey, endKey)); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar la agenda.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [startKey, endKey]);

  const free = sessions.reduce((total, session) => total + session.freeSeats, 0);
  const full = sessions.filter((session) => session.freeSeats === 0).length;
  const grouped = useMemo(() => sessions.reduce<Record<string, PilatesSession[]>>((result, session) => {
    const key = session.startsAt.slice(0, 10);
    result[key] ??= [];
    result[key].push(session);
    return result;
  }, {}), [sessions]);

  function move(amount: number) { onDateChange(shiftDate(selectedDate, view === 'week' ? amount * 7 : amount)); }

  const title = view === 'week'
    ? `${formatDay(start, { day: 'numeric', month: 'long' })} – ${formatDay(end, { day: 'numeric', month: 'long', year: 'numeric' })}`
    : formatDay(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="page-content agenda-page">
      <div className="page-heading">
        <div><h1>Agenda</h1><p>Consulta las clases y gestiona los cambios del día.</p></div>
        <div className="date-controls" aria-label="Cambiar fecha de agenda">
          <button className="icon-button" aria-label={view === 'week' ? 'Semana anterior' : 'Día anterior'} onClick={() => move(-1)}>‹</button>
          <strong className="date-label">{title}</strong>
          <button className="icon-button" aria-label={view === 'week' ? 'Semana siguiente' : 'Día siguiente'} onClick={() => move(1)}>›</button>
          <div className="segmented" aria-label="Vista de agenda">
            <button className={view === 'day' ? 'selected' : ''} aria-pressed={view === 'day'} onClick={() => onViewChange('day')}>Día</button>
            <button className={view === 'week' ? 'selected' : ''} aria-pressed={view === 'week'} onClick={() => onViewChange('week')}>Semana</button>
          </div>
        </div>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {view === 'day' ? (
        <>
          <section className="day-overview" aria-label="Resumen de la agenda">
            <div className="today-label"><strong>Hoy</strong><span>{formatDay(selectedDate)}</span></div>
            <div className="overview-stat"><strong>{sessions.length}</strong><span>clases</span></div>
            <div className="overview-stat"><strong>{free}</strong><span>plazas libres</span></div>
            <div className="overview-stat"><strong>{full}</strong><span>{full === 1 ? 'completa' : 'completas'}</span></div>
          </section>
          <div className="agenda-layout">
            <section className="session-list-section" aria-labelledby="sessions-heading">
              <div className="section-heading"><h2 id="sessions-heading">Sesiones de hoy</h2><span>Ordenadas por hora</span></div>
              {loading ? <p className="muted">Cargando sesiones…</p> : sessions.length === 0 ? <div className="empty-state"><h3>No hay sesiones para esta fecha</h3><p>Prueba con otro día o revisa los grupos y sus horarios.</p></div> : <div className="timeline">{sessions.map((session) => <SessionCard key={session.id} session={session} onChanged={() => void load()} />)}</div>}
            </section>
            <aside className="agenda-aside">
              <section className="panel changes-panel"><h2>Cambios del día</h2>
                {sessions.flatMap((session) => [
                  ...session.absences.map((change) => ({ ...change, kind: 'Ausencia', session })),
                  ...session.recoveries.map((change) => ({ ...change, kind: 'Recuperación', session })),
                ]).length === 0 ? <p className="muted">Todavía no hay ausencias ni recuperaciones.</p> : sessions.flatMap((session) => [
                  ...session.absences.map((change) => ({ ...change, kind: 'Ausencia', session })),
                  ...session.recoveries.map((change) => ({ ...change, kind: 'Recuperación', session })),
                ]).map((change) => <div className="change-item" key={`${change.kind}-${change.id}`}><div><strong>{change.name}</strong><span className={`status-pill ${change.kind === 'Ausencia' ? 'absence' : 'recovery'}`}>{change.kind}</span></div><p>{change.session.group.name}<br />{new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(change.session.startsAt))}</p></div>)}
              </section>
              <section className="panel legend-panel"><h2>Estados</h2><ul className="legend-list"><li><i className="available-dot" />Disponible</li><li><i className="full-dot" />Completa</li><li><i className="absence-dot" />Ausencia</li><li><i className="recovery-dot" />Recuperación</li></ul></section>
            </aside>
          </div>
        </>
      ) : (
        <section className="week-board" aria-label="Agenda semanal">
          {Array.from({ length: 7 }, (_, offset) => {
            const date = shiftDate(start, offset);
            const daySessions = grouped[dateKey(date)] ?? [];
            return <div className={`week-column ${dateKey(date) === dateKey(selectedDate) ? 'current' : ''}`} key={dateKey(date)}>
              <button className="week-day-heading" onClick={() => { onDateChange(date); onViewChange('day'); }}><strong>{formatDay(date, { weekday: 'long' })}</strong><span>{formatDay(date, { day: 'numeric', month: 'short' })}</span><small>{daySessions.length} {daySessions.length === 1 ? 'clase' : 'clases'}</small></button>
              <div className="week-sessions">{daySessions.length ? daySessions.map((session) => <button key={session.id} className="week-session" onClick={() => { onDateChange(date); onViewChange('day'); }}><strong>{new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(session.startsAt))}</strong><span>{session.group.modality}</span><small>{session.group.level}</small><b>{session.occupancy} / {session.capacity}</b><em>{session.freeSeats === 0 ? 'Completa' : `${session.freeSeats} libres`}</em></button>) : <p className="muted">Sin sesiones</p>}</div>
            </div>;
          })}
        </section>
      )}
    </div>
  );
}
