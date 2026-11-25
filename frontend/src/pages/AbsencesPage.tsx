import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatDateTime } from '../domain/dates';
import { formatSessionDateInterval } from '../domain/schedules';
import type { AbsenceRecord, RecoveryOption } from '../types';

export function AbsencesPage() {
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [options, setOptions] = useState<Record<number, RecoveryOption[]>>({});
  const [searching, setSearching] = useState<number | null>(null);
  const [selected, setSelected] = useState<{ absence: AbsenceRecord; option: RecoveryOption } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try { setAbsences(await api.absences()); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las ausencias.'); }
  }
  useEffect(() => { void load(); }, []);

  async function findOptions(absence: AbsenceRecord) {
    setSearching(absence.id); setError('');
    try {
      const recoveryOptions = await api.recoveryOptions(absence.id);
      setOptions((current) => ({ ...current, [absence.id]: recoveryOptions }));
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron buscar recuperaciones.'); }
    finally { setSearching(null); }
  }

  async function confirm() {
    if (!selected) return;
    try {
      await api.bookRecovery(selected.absence.id, selected.option.id);
      setNotice(`Recuperación confirmada para ${selected.absence.studentName}.`);
      setSelected(null);
      setOptions({});
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo reservar la recuperación.'); }
  }

  return (
    <div className="page-content">
      <div className="page-heading"><div><h1>Ausencias y recuperaciones</h1><p>Revisa el preaviso y encuentra clases compatibles con plaza.</p></div><span className="count-label">{absences.length} ausencias registradas</span></div>
      {error && <p className="error-message" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
      <section className="absence-list" aria-label="Ausencias registradas">
        {absences.length === 0 ? <div className="panel empty-state"><h2>No hay ausencias registradas</h2><p>Registra una ausencia desde el detalle de una sesión con 24 horas de antelación.</p></div> : absences.map((absence) => <article className="panel absence-card" key={absence.id}>
          <div className="absence-top"><div><h2>{absence.studentName}</h2><p>{absence.groupName} · {absence.level} · {absence.modality}</p></div><span className="status-pill absence">Ausencia</span></div>
          <dl className="absence-facts"><div><dt>Clase original</dt><dd>{formatSessionDateInterval(absence.sessionStartsAt, absence.sessionDurationMinutes)}</dd></div><div><dt>Registrada</dt><dd>{formatDateTime(absence.registeredAt)}</dd></div><div><dt>Recuperaciones</dt><dd>{absence.recoveryCount ? `${absence.recoveryCount} confirmada${absence.recoveryCount === 1 ? '' : 's'}` : 'Ninguna confirmada'}</dd></div></dl>
          <button className="button secondary" type="button" onClick={() => void findOptions(absence)} disabled={searching !== null}>{searching === absence.id ? 'Buscando sesiones…' : 'Buscar recuperación'}</button>
          {options[absence.id] && <div className="recovery-options"><h3>Sesiones compatibles</h3><p className="muted">Mismo nivel y modalidad, con plaza libre hasta el {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date(`${options[absence.id][0]?.deadline ?? absence.sessionStartsAt}T12:00:00`))} incluido.</p>
            {options[absence.id].length === 0 ? <p className="empty-inline">No hay sesiones con plaza dentro del plazo.</p> : options[absence.id].map((option) => <div className="recovery-option" key={option.id}><div><strong>{formatSessionDateInterval(option.startsAt, option.durationMinutes)}</strong><span>{option.group.name} · {option.group.level} · {option.group.modality}</span><small>{option.occupancy} de {option.capacity} ocupadas · {option.freeSeats} {option.freeSeats === 1 ? 'plaza libre' : 'plazas libres'}</small></div><button className="button primary small" type="button" onClick={() => setSelected({ absence, option })}>Elegir sesión</button></div>)}
          </div>}
        </article>)}
      </section>
      {selected && <div className="dialog-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">Confirmar recuperación</h2><p>Se reservará una plaza para <strong>{selected.absence.studentName}</strong> en esta sesión:</p><div className="confirmation-summary"><strong>{formatSessionDateInterval(selected.option.startsAt, selected.option.durationMinutes)}</strong><span>{selected.option.group.name} · {selected.option.group.level} · {selected.option.group.modality}</span><span>{selected.option.freeSeats} plazas libres antes de reservar</span></div><p>La reserva confirmada no se puede cancelar desde la aplicación.</p><div className="form-actions"><button className="button primary" type="button" onClick={() => void confirm()}>Confirmar reserva</button><button className="button secondary" type="button" onClick={() => setSelected(null)}>Volver</button></div>
      </section></div>}
    </div>
  );
}
