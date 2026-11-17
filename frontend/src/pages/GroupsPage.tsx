import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { dateKey, shiftDate } from '../domain/dates';
import type { Group, PilatesSession, Student } from '../types';

const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const newGroup = (weekday: number) => ({ name: '', level: 'Inicial', modality: 'Reformer', weekday, startTime: '09:00', recurrence: 'Semanal', capacity: 8, studentIds: [] as number[] });

export function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [futureSessions, setFutureSessions] = useState<Record<number, PilatesSession[]>>({});
  const [form, setForm] = useState(newGroup(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1));
  const [editing, setEditing] = useState<Group | null>(null);
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
    setEditing(group);
    setForm({ name: group.name, level: group.level, modality: group.modality, weekday: group.weekday, startTime: group.startTime, recurrence: group.recurrence, capacity: group.capacity, studentIds: [...group.studentIds] });
    setNotice('');
  }
  function reset() { setEditing(null); setForm(newGroup(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)); }
  function toggleStudent(id: number) { setForm((current) => ({ ...current, studentIds: current.studentIds.includes(id) ? current.studentIds.filter((studentId) => studentId !== id) : [...current.studentIds, id] })); }

  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    const payload = { ...form, capacity: Number(form.capacity) };
    try {
      if (editing) await api.updateGroup(editing.id, payload);
      else await api.createGroup(payload);
      setNotice(editing ? 'Se guardaron los cambios del grupo.' : 'Se creó el grupo y sus sesiones recurrentes.');
      reset(); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el grupo.'); }
  }

  return (
    <div className="page-content">
      <div className="page-heading"><div><h1>Grupos y horarios</h1><p>Organiza niveles, modalidades, aforos y participantes.</p></div><span className="count-label">{groups.length} {groups.length === 1 ? 'grupo' : 'grupos'}</span></div>
      {error && <p className="error-message" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
      <div className="management-layout groups-layout">
        <section className="group-list" aria-label="Grupos activos">{groups.length === 0 ? <div className="panel empty-state"><h2>Aún no hay grupos</h2><p>Configura el primer horario para crear las sesiones.</p></div> : groups.map((group) => <article className="panel group-card" key={group.id}>
          <div className="group-card-heading"><div><h2>{group.name}</h2><p>{group.level} · {group.modality}</p></div><button className="button small secondary" onClick={() => edit(group)} type="button">Editar grupo</button></div>
          <div className="group-facts"><span><strong>{weekdays[group.weekday]}</strong><small>{group.startTime}</small></span><span><strong>{group.recurrence}</strong><small>{group.studentIds.length} de {group.capacity} plazas asignadas</small></span></div>
          <div className="group-roster"><strong>Participantes</strong><p>{group.studentIds.map((id) => students.find((student) => student.id === id)?.name).filter(Boolean).join(', ') || 'Sin alumnos asignados'}</p></div>
          <details className="schedule-details"><summary>{futureSessions[group.id]?.length ?? 0} sesiones próximas</summary><ul>{(futureSessions[group.id] ?? []).slice(0, 8).map((session) => <li key={session.id}><time>{new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(session.startsAt))}</time><span>{session.occupancy} de {session.capacity} · {session.freeSeats} libres</span></li>)}</ul></details>
        </article>)}</section>
        <section className="panel form-panel" aria-labelledby="group-form-heading">
          <h2 id="group-form-heading">{editing ? 'Editar grupo' : 'Nuevo grupo'}</h2>
          <form onSubmit={(event) => void save(event)}>
            <label htmlFor="group-name">Nombre del grupo</label><input id="group-name" required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <div className="form-grid"><div><label htmlFor="group-level">Nivel</label><select id="group-level" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option>Inicial</option><option>Intermedio</option><option>Avanzado</option></select></div><div><label htmlFor="group-modality">Modalidad</label><select id="group-modality" value={form.modality} onChange={(event) => setForm({ ...form, modality: event.target.value })}><option>Reformer</option><option>Suelo</option></select></div></div>
            <div className="form-grid"><div><label htmlFor="group-weekday">Día</label><select id="group-weekday" value={form.weekday} onChange={(event) => setForm({ ...form, weekday: Number(event.target.value) })}>{weekdays.map((day, index) => <option value={index} key={day}>{day}</option>)}</select></div><div><label htmlFor="group-time">Hora</label><input id="group-time" type="time" step={1800} required value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></div></div>
            <div className="form-grid"><div><label htmlFor="group-recurrence">Recurrencia</label><select id="group-recurrence" value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value })}><option>Semanal</option></select></div><div><label htmlFor="group-capacity">Aforo</label><input id="group-capacity" type="number" min={1} max={50} required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></div></div>
            <fieldset className="checkbox-group"><legend>Alumnos asignados · {form.studentIds.length} de {form.capacity}</legend>{students.map((student) => <label className="check-row" key={student.id}><input type="checkbox" checked={form.studentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} /><span>{student.name}</span></label>)}</fieldset>
            <div className="form-actions"><button className="button primary" type="submit">{editing ? 'Guardar cambios' : 'Crear grupo'}</button>{editing && <button className="button secondary" type="button" onClick={reset}>Cancelar</button>}</div>
          </form>
          <p className="form-hint">Las sesiones se generan para las próximas seis semanas. Los días no lectivos no cambian las recurrencias automáticamente.</p>
        </section>
      </div>
    </div>
  );
}
