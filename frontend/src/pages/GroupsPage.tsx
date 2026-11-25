import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { dateKey, shiftDate } from '../domain/dates';
import { formatSessionDateInterval, formatWeeklyInterval } from '../domain/schedules';
import type { Group, GroupInput, PilatesSession, Student, WeeklySchedule } from '../types';

const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const todayWeekday = () => (new Date().getDay() + 6) % 7;
const newGroup = (): GroupInput => ({
  name: '', level: 'Inicial', modality: 'Reformer', weeklySchedule: [{ weekday: todayWeekday(), startTime: '09:00', durationMinutes: null }],
  recurrence: 'Semanal', capacity: 8, studentIds: [],
});

export function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [futureSessions, setFutureSessions] = useState<Record<number, PilatesSession[]>>({});
  const [form, setForm] = useState<GroupInput>(newGroup());
  const [editing, setEditing] = useState<Group | null>(null);
  const [copySourceWeekday, setCopySourceWeekday] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const [listedGroups, listedStudents] = await Promise.all([api.groups(), api.students()]);
      setGroups(listedGroups); setStudents(listedStudents); setError('');
      const start = new Date();
      const end = shiftDate(start, 41);
      const schedules = await Promise.all(listedGroups.map(async (group) => [group.id, await api.sessions(dateKey(start), dateKey(end), group.id)] as const));
      setFutureSessions(Object.fromEntries(schedules));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los grupos.'); }
  }
  useEffect(() => { void load(); }, []);

  function edit(group: Group) {
    const weeklySchedule = (group.weeklySchedule ?? [{ weekday: group.weekday, startTime: group.startTime, durationMinutes: null }])
      .map((item) => ({ ...item, durationMinutes: item.durationMinutes ?? null }));
    setEditing(group);
    setForm({
      name: group.name, level: group.level, modality: group.modality,
      weeklySchedule,
      recurrence: group.recurrence, capacity: group.capacity, studentIds: [...group.studentIds],
    });
    setCopySourceWeekday(weeklySchedule[0]?.weekday ?? null);
    setError(''); setNotice('');
  }
  function reset() { setEditing(null); setForm(newGroup()); setCopySourceWeekday(null); }
  function toggleWeekday(weekday: number) {
    setForm((current) => {
      const selected = current.weeklySchedule.some((item) => item.weekday === weekday);
      const weeklySchedule = selected
        ? current.weeklySchedule.filter((item) => item.weekday !== weekday)
        : [...current.weeklySchedule, { weekday, startTime: '09:00', durationMinutes: null }];
      return { ...current, weeklySchedule: weeklySchedule.sort((left, right) => left.weekday - right.weekday) };
    });
    setCopySourceWeekday((current) => current === weekday ? null : current);
  }
  function changeTime(weekday: number, startTime: string) {
    setForm((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((item) => item.weekday === weekday ? { ...item, startTime } : item),
    }));
  }
  function changeDuration(weekday: number, value: string) {
    const durationMinutes = value === '' ? null : Number(value);
    setForm((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((item) => item.weekday === weekday ? { ...item, durationMinutes } : item),
    }));
  }
  function selectWeekdays(selectedDays: number[]) {
    setForm((current) => {
      const currentByDay = new Map(current.weeklySchedule.map((item) => [item.weekday, item]));
      const weeklySchedule = selectedDays.map((weekday) => currentByDay.get(weekday) ?? { weekday, startTime: '09:00', durationMinutes: null });
      return { ...current, weeklySchedule };
    });
  }
  function copyScheduleToSelectedDays() {
    setForm((current) => {
      const source = current.weeklySchedule.find((item) => item.weekday === copySourceWeekday) ?? current.weeklySchedule[0];
      if (!source || source.durationMinutes == null) return current;
      return {
        ...current,
        weeklySchedule: current.weeklySchedule.map((item) => item.weekday === source.weekday
          ? item
          : { ...item, startTime: source.startTime, durationMinutes: source.durationMinutes }),
      };
    });
  }
  function canKeepLegacyDuration(weekday: number): boolean {
    return editing !== null && scheduleFor(editing).some((item) => item.weekday === weekday && item.durationMinutes == null);
  }
  function toggleStudent(id: number) {
    setForm((current) => ({ ...current, studentIds: current.studentIds.includes(id) ? current.studentIds.filter((studentId) => studentId !== id) : [...current.studentIds, id] }));
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    if (form.weeklySchedule.length === 0) { setError('Selecciona al menos un día para el horario semanal.'); return; }
    if (form.weeklySchedule.some((item) => item.durationMinutes == null && !canKeepLegacyDuration(item.weekday))) {
      setError('Indica la duración en minutos para cada día nuevo del horario.'); return;
    }
    const payload = { ...form, weeklySchedule: [...form.weeklySchedule].sort((left, right) => left.weekday - right.weekday), capacity: Number(form.capacity) };
    try {
      if (editing) await api.updateGroup(editing.id, payload);
      else await api.createGroup(payload);
      setNotice(editing ? 'Se guardaron los cambios del grupo.' : 'Se creó el grupo y sus sesiones recurrentes.');
      reset(); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el grupo.'); }
  }

  function scheduleFor(group: Group): WeeklySchedule[] {
    return group.weeklySchedule ?? [{ weekday: group.weekday, startTime: group.startTime, durationMinutes: null }];
  }
  const copySource = form.weeklySchedule.find((item) => item.weekday === copySourceWeekday) ?? form.weeklySchedule[0] ?? null;
  const canCopySchedule = form.weeklySchedule.length > 1 && copySource?.durationMinutes != null;

  return (
    <div className="page-content">
      <div className="page-heading"><div><h1>Grupos y horarios</h1><p>Organiza niveles, modalidades, aforos y participantes.</p></div><span className="count-label">{groups.length} {groups.length === 1 ? 'grupo' : 'grupos'}</span></div>
      {error && <p className="error-message" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
      <div className="management-layout groups-layout">
        <section className="group-list" aria-label="Grupos activos">{groups.length === 0 ? <div className="panel empty-state"><h2>Aún no hay grupos</h2><p>Configura el primer horario para crear las sesiones.</p></div> : groups.map((group) => <article className="panel group-card" key={group.id}>
          <div className="group-card-heading"><div><h2>{group.name}</h2><p>{group.level} · {group.modality}</p></div><button className="button small secondary" onClick={() => edit(group)} type="button">Editar grupo</button></div>
          <div className="group-facts">
            <div className="group-schedule-summary"><strong>Horario semanal</strong><ul>{scheduleFor(group).map((item) => <li key={item.weekday}><span>{weekdays[item.weekday]}</span><span className="schedule-interval">{formatWeeklyInterval(item.startTime, item.durationMinutes)}</span></li>)}</ul></div>
            <span><strong>{group.recurrence}</strong><small>{group.studentIds.length} de {group.capacity} plazas asignadas</small></span>
          </div>
          <div className="group-roster"><strong>Participantes</strong><p>{group.studentIds.map((id) => students.find((student) => student.id === id)?.name).filter(Boolean).join(', ') || 'Sin alumnos asignados'}</p></div>
          <details className="schedule-details"><summary>{futureSessions[group.id]?.length ?? 0} sesiones próximas</summary><ul>{(futureSessions[group.id] ?? []).slice(0, 8).map((session) => <li key={session.id}><time dateTime={session.startsAt}>{formatSessionDateInterval(session.startsAt, session.durationMinutes)}</time><span>{session.occupancy} de {session.capacity} · {session.freeSeats} libres</span></li>)}</ul></details>
        </article>)}</section>
        <section className="panel form-panel" aria-labelledby="group-form-heading">
          <h2 id="group-form-heading">{editing ? 'Editar grupo' : 'Nuevo grupo'}</h2>
          <form onSubmit={(event) => void save(event)}>
            <label htmlFor="group-name">Nombre del grupo</label><input id="group-name" required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <div className="form-grid"><div><label htmlFor="group-level">Nivel</label><select id="group-level" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option>Inicial</option><option>Intermedio</option><option>Avanzado</option></select></div><div><label htmlFor="group-modality">Modalidad</label><select id="group-modality" value={form.modality} onChange={(event) => setForm({ ...form, modality: event.target.value })}><option>Reformer</option><option>Suelo</option></select></div></div>
            <fieldset className="weekly-schedule-fieldset"><legend>Días y horarios semanales</legend>
              <div className="weekly-schedule-quick-actions"><button className="button small secondary" type="button" onClick={() => selectWeekdays([0, 1, 2, 3, 4])}>Lunes a viernes</button><button className="button small secondary" type="button" onClick={() => selectWeekdays([0, 1, 2, 3, 4, 5, 6])}>Todos los días</button></div>
              <div className="weekly-schedule-summary" aria-live="polite"><strong>Resumen semanal</strong>{form.weeklySchedule.length ? <ul>{form.weeklySchedule.map((item) => <li key={item.weekday}><span>{weekdays[item.weekday]}</span><span className="schedule-interval">{formatWeeklyInterval(item.startTime, item.durationMinutes)}</span></li>)}</ul> : <p>Selecciona al menos un día.</p>}</div>
              <div className="weekly-schedule-list">{weekdays.map((day, weekday) => {
              const selectedSchedule = form.weeklySchedule.find((item) => item.weekday === weekday);
              const legacyDuration = canKeepLegacyDuration(weekday);
              return <div className="weekly-schedule-row" key={day}>
                <label className="weekly-schedule-day"><input type="checkbox" checked={Boolean(selectedSchedule)} onChange={() => toggleWeekday(weekday)} /><span>{day}</span></label>
                {selectedSchedule && <div className="weekly-schedule-fields"><div><label htmlFor={`group-time-${weekday}`}>Hora de inicio · {day}</label><input id={`group-time-${weekday}`} type="time" required value={selectedSchedule.startTime} onChange={(event) => changeTime(weekday, event.target.value)} /></div><div><label htmlFor={`group-duration-${weekday}`}>Duración (min)</label><input id={`group-duration-${weekday}`} type="number" min={1} step={1} required={!legacyDuration} placeholder={legacyDuration ? 'Pendiente' : ''} value={selectedSchedule.durationMinutes ?? ''} onChange={(event) => changeDuration(weekday, event.target.value)} />{legacyDuration && selectedSchedule.durationMinutes == null && <small className="legacy-duration-note">No consta en el grupo original; puedes completarla ahora.</small>}</div></div>}
              </div>;
            })}</div>
              <div className="weekly-schedule-copy"><div><label htmlFor="copy-schedule-source">Copiar horario de</label><select id="copy-schedule-source" value={copySource?.weekday ?? ''} onChange={(event) => setCopySourceWeekday(event.target.value === '' ? null : Number(event.target.value))}><option value="">Selecciona un día</option>{form.weeklySchedule.map((item) => <option value={item.weekday} key={item.weekday}>{weekdays[item.weekday]}</option>)}</select></div><button className="button secondary" type="button" disabled={!canCopySchedule} onClick={copyScheduleToSelectedDays}>Copiar al resto</button></div>
              <p className="form-hint">Se copian la hora de inicio y la duración a los demás días seleccionados; después puedes ajustarlos por separado.</p>
            </fieldset>
            <div><label htmlFor="group-capacity">Aforo</label><input id="group-capacity" type="number" min={1} max={50} required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></div>
            <fieldset className="checkbox-group"><legend>Alumnos asignados · {form.studentIds.length} de {form.capacity}</legend>{students.map((student) => <label className="check-row" key={student.id}><input type="checkbox" checked={form.studentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} /><span>{student.name}</span></label>)}</fieldset>
            <div className="form-actions"><button className="button primary" type="submit">{editing ? 'Guardar cambios' : 'Crear grupo'}</button>{editing && <button className="button secondary" type="button" onClick={reset}>Cancelar</button>}</div>
          </form>
          <p className="form-hint">Se genera una sesión semanal por cada día seleccionado para las próximas seis semanas. Al editar, las sesiones futuras sin reservas se regeneran; las vinculadas a ausencias o recuperaciones conservan su fecha, hora y duración originales. Los días no lectivos no cambian las recurrencias automáticamente.</p>
        </section>
      </div>
    </div>
  );
}
