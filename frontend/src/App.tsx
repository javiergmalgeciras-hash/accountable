import { useEffect, useState } from 'react';
import { api } from './api/client';
import { AgendaPage } from './pages/AgendaPage';
import { StudentsPage } from './pages/StudentsPage';
import { GroupsPage } from './pages/GroupsPage';
import { AbsencesPage } from './pages/AbsencesPage';
import { CalendarPage } from './pages/CalendarPage';
import type { Student } from './types';

type Page = 'agenda' | 'students' | 'groups' | 'absences' | 'calendar';
const navigation: { id: Page; label: string; symbol: string }[] = [
  { id: 'agenda', label: 'Agenda', symbol: '◷' },
  { id: 'students', label: 'Alumnos', symbol: '○' },
  { id: 'groups', label: 'Grupos y horarios', symbol: '▦' },
  { id: 'absences', label: 'Ausencias y recuperaciones', symbol: '↻' },
  { id: 'calendar', label: 'Calendario del centro', symbol: '▤' },
];

export default function App() {
  const [page, setPage] = useState<Page>('agenda');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [agendaView, setAgendaView] = useState<'day' | 'week'>('day');
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<Student[]>([]);

  useEffect(() => {
    if (!search.trim()) { setMatches([]); return; }
    let active = true;
    const timer = window.setTimeout(() => {
      void api.students(search).then((result) => { if (active) setMatches(result.slice(0, 6)); }).catch(() => { if (active) setMatches([]); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#agenda" onClick={(event) => { event.preventDefault(); setPage('agenda'); }}>
          <img src="/assets/brand/logo.webp" alt="" />
          <span><strong>Belén Pilates</strong><small>Gestión de pilates</small></span>
        </a>
        <nav aria-label="Navegación principal" className="side-nav">
          {navigation.map((item) => <button key={item.id} type="button" className={page === item.id ? 'active' : ''} aria-current={page === item.id ? 'page' : undefined} onClick={() => { setPage(item.id); setSearch(''); }}><span className="nav-symbol" aria-hidden="true">{item.symbol}</span><span>{item.label}</span></button>)}
        </nav>
        <div className="sidebar-note"><strong>Agenda del centro</strong><p>Consulta las clases y sus plazas disponibles.</p></div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="global-search-wrap">
            <label className="search-box"><span className="search-icon" aria-hidden="true" /><input aria-label="Buscar alumno" placeholder="Buscar alumno" value={search} onFocus={() => setPage('students')} onChange={(event) => { setSearch(event.target.value); setPage('students'); }} /><kbd>⌕</kbd></label>
            {search.trim() && <div className="search-results" role="listbox" aria-label="Resultados de alumnos">{matches.length ? matches.map((student) => <button key={student.id} role="option" type="button" onClick={() => { setSearch(student.name); setPage('students'); }}><strong>{student.name}</strong><span>{student.phone || 'Sin teléfono'}</span></button>) : <p>No se encontraron alumnos.</p>}</div>}
          </div>
          <div className="admin-chip"><img src="/assets/brand/logo.webp" alt="" /><span><strong>Belén Pilates</strong><small>Administración</small></span></div>
        </header>
        {page === 'agenda' && <AgendaPage selectedDate={selectedDate} view={agendaView} onDateChange={setSelectedDate} onViewChange={setAgendaView} />}
        {page === 'students' && <StudentsPage search={search} />}
        {page === 'groups' && <GroupsPage />}
        {page === 'absences' && <AbsencesPage />}
        {page === 'calendar' && <CalendarPage />}
      </main>
      <nav className="mobile-nav" aria-label="Navegación móvil">{navigation.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} type="button" aria-current={page === item.id ? 'page' : undefined} onClick={() => { setPage(item.id); setSearch(''); }}><span aria-hidden="true">{item.symbol}</span><small>{item.id === 'groups' ? 'Grupos' : item.id === 'absences' ? 'Ausencias' : item.id === 'calendar' ? 'Calendario' : item.label}</small></button>)}</nav>
    </div>
  );
}
