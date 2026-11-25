import { useState } from 'react';
import { api } from '../api/client';
import { availabilityLabel, occupancyLabel, sessionState } from '../domain/sessions';
import { formatSessionDateInterval, formatSessionInterval } from '../domain/schedules';
import type { PilatesSession } from '../types';

type Props = { session: PilatesSession; onChanged: () => void };

export function SessionCard({ session, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<PilatesSession['students'][number] | null>(null);
  const [busyStudent, setBusyStudent] = useState<number | null>(null);
  const [error, setError] = useState('');
  const state = sessionState(session);
  const time = formatSessionInterval(session.startsAt, session.durationMinutes);

  async function register() {
    if (!selectedStudent) return;
    const studentId = selectedStudent.id;
    setBusyStudent(studentId);
    setError('');
    try {
      await api.registerAbsence(studentId, session.id);
      setSelectedStudent(null);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar la ausencia.');
      setSelectedStudent(null);
    } finally {
      setBusyStudent(null);
    }
  }

  return (
    <article className="session-row">
      <time className="session-time" dateTime={session.startsAt}>{time}</time>
      <div className="timeline-dot" aria-hidden="true" />
      <div className="session-card">
        <button className="session-summary" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="session-main">
            <strong>{session.group.modality} · {session.group.level}</strong>
            <span className="session-group">{session.group.name} · {session.students.length} {session.students.length === 1 ? 'alumno asignado' : 'alumnos asignados'}</span>
            <span className={`status-pill ${state} session-availability`}>{availabilityLabel(session)}</span>
            <span className="occupancy-line">
              <span className="occupancy-copy"><b>{session.occupancy} de {session.capacity}</b> ocupadas</span>
              <span className="meter" aria-hidden="true"><span style={{ width: `${session.capacity ? (session.occupancy / session.capacity) * 100 : 0}%` }} /></span>
              {session.absences.length || session.recoveries.length ? <span className="session-changes">
                {session.absences.length > 0 && <span className="status-pill absence">{session.absences.length} {session.absences.length === 1 ? 'ausencia' : 'ausencias'}</span>}
                {session.recoveries.length > 0 && <span className="status-pill recovery">{session.recoveries.length} {session.recoveries.length === 1 ? 'recuperación' : 'recuperaciones'}</span>}
              </span> : <span className="session-note">{session.freeSeats === 0 ? 'Sin plazas libres' : 'Clase habitual'}</span>}
            </span>
          </span>
          <span className="session-mark" aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        {open && (
          <div className="session-detail">
            <h3>Alumnos de la sesión</h3>
            <ul className="roster-list">
              {session.students.map((student) => (
                <li key={student.id}>
                  <span>{student.name}{student.absent && <span className="status-text"> · Ausencia</span>}</span>
                  {!student.absent && <button className="button small secondary" type="button" disabled={busyStudent !== null} onClick={() => setSelectedStudent(student)}>Registrar ausencia</button>}
                </li>
              ))}
            </ul>
            {session.students.length === 0 && <p className="muted">Todavía no hay alumnos asignados a esta sesión.</p>}
            {error && <p className="error-message" role="alert">{error}</p>}
            <p className="muted occupancy-description">{occupancyLabel(session)}.</p>
          </div>
        )}
      </div>
      {selectedStudent && <div className="dialog-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={`absence-confirm-${session.id}`}>
        <h2 id={`absence-confirm-${session.id}`}>Confirmar ausencia</h2>
        <p>Se registrará la ausencia de <strong>{selectedStudent.name}</strong> en esta clase:</p>
        <div className="confirmation-summary"><strong>{session.group.name} · {session.group.level} · {session.group.modality}</strong><span>{formatSessionDateInterval(session.startsAt, session.durationMinutes)}</span><span>{occupancyLabel(session)}</span></div>
        <p>La solicitud se acepta con al menos 24 horas de antelación y libera una plaza.</p>
        <div className="form-actions"><button className="button primary" type="button" disabled={busyStudent !== null} onClick={() => void register()}>{busyStudent === selectedStudent.id ? 'Guardando…' : 'Confirmar ausencia'}</button><button className="button secondary" type="button" disabled={busyStudent !== null} onClick={() => setSelectedStudent(null)}>Volver</button></div>
      </section></div>}
    </article>
  );
}
