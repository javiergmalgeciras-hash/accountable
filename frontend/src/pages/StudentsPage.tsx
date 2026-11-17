import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { normalizeOptionalPhone, validateStudentName } from '../domain/students';
import type { Group, Student } from '../types';

type Props = { search: string };
const emptyForm = { name: '', phone: '', groupIds: [] as number[] };

export function StudentsPage({ search }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const [listedStudents, listedGroups] = await Promise.all([api.students(search), api.groups()]);
      setStudents(listedStudents);
      setGroups(listedGroups);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los alumnos.'); }
  }
  useEffect(() => { void load(); }, [search]);

  const groupNames = useMemo(() => new Map(groups.map((group) => [group.id, group.name])), [groups]);

  function startEdit(student: Student) {
    setEditing(student);
    setForm({ name: student.name, phone: student.phone ?? '', groupIds: [...student.groupIds] });
    setNotice('');
  }

  function reset() { setEditing(null); setForm(emptyForm); setError(''); }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    const validation = validateStudentName(form.name, students, editing?.id);
    if (validation) { setError(validation); return; }
    try {
      const payload = { name: form.name.trim().replace(/\s+/g, ' '), phone: normalizeOptionalPhone(form.phone), groupIds: form.groupIds };
      if (editing) await api.updateStudent(editing.id, payload);
      else await api.createStudent(payload);
      setNotice(editing ? 'Se guardaron los cambios del alumno.' : 'Se creó el alumno.');
      reset();
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el alumno.'); }
  }

  async function deactivate(student: Student) {
    if (!window.confirm(`¿Dar de baja a ${student.name}? Sus registros anteriores se conservarán.`)) return;
    try { await api.deactivateStudent(student.id); setNotice(`Se dio de baja a ${student.name}.`); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo dar de baja al alumno.'); }
  }

  function toggleGroup(id: number) {
    setForm((current) => ({ ...current, groupIds: current.groupIds.includes(id) ? current.groupIds.filter((groupId) => groupId !== id) : [...current.groupIds, id] }));
  }

  return (
    <div className="page-content">
      <div className="page-heading"><div><h1>Alumnos</h1><p>Busca y mantiene las fichas y asignaciones del centro.</p></div><span className="count-label">{students.length} {students.length === 1 ? 'alumno' : 'alumnos'}</span></div>
      {error && <p className="error-message" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
      <div className="management-layout">
        <section className="panel list-panel" aria-label="Lista de alumnos">
          <div className="section-heading"><h2>{search ? 'Resultados' : 'Alumnos activos'}</h2><span>{students.length} registros</span></div>
          {students.length === 0 ? <div className="empty-state"><h3>{search ? 'No hay coincidencias' : 'Aún no hay alumnos'}</h3><p>{search ? 'Prueba otra búsqueda.' : 'Crea una ficha para empezar a asignar clases.'}</p></div> : <ul className="student-list">{students.map((student) => <li className="student-item" key={student.id}>
            <div className="student-avatar" aria-hidden="true">{student.name.trim().charAt(0).toLocaleUpperCase('es')}</div>
            <div className="student-copy"><strong>{student.name}</strong><span>{student.phone || 'Sin teléfono'}</span><small>{student.groupIds.length ? student.groupIds.map((id) => groupNames.get(id)).filter(Boolean).join(' · ') : 'Sin grupo asignado'}</small></div>
            <div className="item-actions"><button className="button small secondary" type="button" onClick={() => startEdit(student)}>Editar</button><button className="text-button destructive" type="button" onClick={() => void deactivate(student)}>Dar de baja</button></div>
          </li>)}</ul>}
        </section>
        <section className="panel form-panel" aria-labelledby="student-form-heading">
          <h2 id="student-form-heading">{editing ? 'Editar alumno' : 'Nuevo alumno'}</h2>
          <form onSubmit={(event) => void save(event)}>
            <label htmlFor="student-name">Nombre</label><input id="student-name" name="name" autoComplete="name" required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <label htmlFor="student-phone">Teléfono <span className="optional">Opcional</span></label><input id="student-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <fieldset className="checkbox-group"><legend>Grupos asignados</legend>{groups.map((group) => <label className="check-row" key={group.id}><input type="checkbox" checked={form.groupIds.includes(group.id)} onChange={() => toggleGroup(group.id)} /><span>{group.name}<small>{group.level} · {group.modality}</small></span></label>)}{groups.length === 0 && <p className="muted">Crea un grupo para poder asignarlo.</p>}</fieldset>
            <div className="form-actions"><button className="button primary" type="submit">{editing ? 'Guardar cambios' : 'Crear alumno'}</button>{editing && <button className="button secondary" type="button" onClick={reset}>Cancelar</button>}</div>
          </form>
          <p className="form-hint">El nombre debe ser único. El teléfono no es obligatorio.</p>
        </section>
      </div>
    </div>
  );
}
