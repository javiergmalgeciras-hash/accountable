import { expect, test } from '@playwright/test';

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

test('agenda cambia entre vistas de día y semana y comunica ocupación', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Agenda', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sesiones de hoy' })).toBeVisible();
  await expect(page.getByText('08:00').first()).toBeVisible();
  await expect(page.getByText('Reformer · Inicial').first()).toBeVisible();
  await expect(page.getByText('Reformer mañana').first()).toBeVisible();
  await expect(page.getByText(/6 de 8 ocupadas/).first()).toBeVisible();
  await expect(page.getByText('2 plazas libres').first()).toBeVisible();
  await expect(page.getByText('Completa').first()).toBeVisible();
  await page.getByRole('button', { name: 'Semana' }).click();
  await expect(page.getByRole('region', { name: 'Agenda semanal' })).toBeVisible();
  await page.getByRole('button', { name: 'Día' }).click();
  await expect(page.getByRole('heading', { name: 'Sesiones de hoy' })).toBeVisible();
});

test('alumnos se crean sin teléfono, se buscan, se editan y rechazan duplicados normalizados', async ({ page }) => {
  const original = 'Alumna e2e Cobalto';
  const edited = 'Alumna e2e Cobalto Norte';
  await page.goto('/');
  await page.getByRole('button', { name: 'Alumnos', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill(original);
  await page.getByRole('checkbox', { name: /Reformer mañana/ }).check();
  await page.getByRole('button', { name: 'Crear alumno' }).click();
  await expect(page.getByText(original)).toBeVisible();
  await expect(page.getByText('Sin teléfono')).toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar alumno' }).fill('Cobalto');
  const row = page.locator('.student-item').filter({ hasText: original });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill(edited);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  const updatedRow = page.locator('.student-item').filter({ hasText: edited });
  await expect(updatedRow).toBeVisible();
  await expect(updatedRow.getByText('Reformer mañana')).toBeVisible();
  await page.getByLabel('Nombre', { exact: true }).fill('  ALUMNA   E2E COBALTO NORTE ');
  await page.getByRole('button', { name: 'Crear alumno' }).click();
  await expect(page.getByRole('alert')).toContainText('Ya existe un alumno');
});

test('grupos guardan horario, recurrencia, aforo y cambios de participantes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Grupos y horarios' }).click();
  await page.getByLabel('Nombre del grupo').fill('Grupo e2e Jade');
  await page.getByLabel('Nivel').selectOption('Intermedio');
  await page.getByLabel('Modalidad').selectOption('Suelo');
  await page.getByLabel('Hora').fill('10:30');
  await page.getByLabel('Aforo').fill('2');
  await page.getByRole('checkbox', { name: 'Alumna de prueba 01' }).check();
  await page.getByRole('button', { name: 'Crear grupo' }).click();
  const card = page.locator('.group-card').filter({ hasText: 'Grupo e2e Jade' });
  await expect(card).toContainText('Intermedio');
  await expect(card).toContainText('Suelo');
  await expect(card).toContainText('Semanal');
  await expect(card).toContainText('1 de 2 plazas asignadas');
  await card.getByRole('button', { name: 'Editar grupo' }).click();
  await page.getByRole('checkbox', { name: 'Alumna de prueba 01' }).uncheck();
  await page.getByRole('checkbox', { name: 'Alumna de prueba 02' }).check();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  const updated = page.locator('.group-card').filter({ hasText: 'Grupo e2e Jade' });
  await expect(updated).toContainText('Alumna de prueba 02');
  await updated.getByText(/sesiones próximas/).click();
  await expect(updated.locator('li').first()).toBeVisible();
});

test('ausencia válida libera plaza y una solicitud con menos de 24 horas no cambia la sesión', async ({ page }) => {
  const targetDate = addDays(new Date(), 2);
  const targetDay = dayKey(targetDate);
  const listed = await page.request.get(`/api/sessions?start=${targetDay}&end=${targetDay}`);
  const sessions = await listed.json() as { id: number; startsAt: string; group: { name: string }; students: { id: number; name: string; absent: boolean }[]; occupancy: number }[];
  const origin = sessions.find((session) => session.group.name === 'Reformer mañana' && session.startsAt.endsWith('T08:30:00'))!;
  const freeStudent = origin.students.find((student) => !student.absent)!;
  const previousOccupancy = origin.occupancy;

  await page.goto('/');
  await page.getByRole('button', { name: 'Día siguiente' }).click();
  await page.getByRole('button', { name: 'Día siguiente' }).click();
  const row = page.locator('.session-card').filter({ hasText: 'Reformer mañana' });
  await row.locator('.session-summary').click();
  await row.locator('.roster-list li').filter({ hasText: freeStudent.name }).getByRole('button', { name: 'Registrar ausencia' }).click();
  await expect(page.getByRole('dialog')).toContainText(freeStudent.name);
  await page.getByRole('button', { name: 'Confirmar ausencia' }).click();
  await expect(row).toContainText(`${previousOccupancy - 1} de 8`);
  await expect(row).toContainText(`${9 - previousOccupancy} plazas libres`);

  const todayKey = dayKey(new Date());
  const tomorrowKey = dayKey(addDays(new Date(), 1));
  const nearResponse = await page.request.get(`/api/sessions?start=${todayKey}&end=${tomorrowKey}`);
  const nearSessions = await nearResponse.json() as { id: number; startsAt: string; group: { name: string }; students: { id: number; absent: boolean }[]; occupancy: number }[];
  const nearSession = nearSessions.find((session) => {
    const hours = (new Date(session.startsAt).getTime() - Date.now()) / 3_600_000;
    return session.group.name === 'Suelo intermedio' && hours > 0 && hours < 24 && !session.students.some((student) => student.absent);
  })!;
  expect(nearSession).toBeTruthy();
  const before = nearSession.occupancy;
  const nearDay = nearSession.startsAt.slice(0, 10);
  const gap = Math.round((new Date(`${nearDay}T12:00:00`).getTime() - new Date(`${todayKey}T12:00:00`).getTime()) / 86_400_000);
  const pageOffset = gap - 2;
  for (let step = 0; step < Math.abs(pageOffset); step += 1) await page.getByRole('button', { name: pageOffset > 0 ? 'Día siguiente' : 'Día anterior' }).click();
  const nearTime = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(nearSession.startsAt));
  const nearRow = page.locator('.session-row').filter({ hasText: 'Suelo intermedio' }).filter({ hasText: nearTime });
  await nearRow.locator('.session-summary').click();
  const registerButton = nearRow.getByRole('button', { name: 'Registrar ausencia' }).first();
  await registerButton.click();
  await page.getByRole('button', { name: 'Confirmar ausencia' }).click();
  await expect(page.getByRole('alert')).toContainText('24 horas');
  const after = await page.request.get(`/api/sessions/${nearSession.id}`);
  expect((await after.json()).occupancy).toBe(before);
  expect(freeStudent.id).toBeTruthy();
});

test('recuperación incluye el séptimo día, confirma plaza y no muestra cancelación', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ausencias y recuperaciones' }).click();
  const absence = page.locator('.absence-card').filter({ hasText: 'Alumna de prueba 01' }).filter({ hasText: 'Reformer mañana' });
  await absence.getByRole('button', { name: 'Buscar recuperación' }).click();
  await expect(absence.getByRole('heading', { name: 'Sesiones compatibles' })).toBeVisible();
  const eligible = absence.locator('.recovery-option').filter({ hasText: 'Reformer inicial tarde' });
  await expect(eligible.first()).toBeVisible();
  const inclusiveDay = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(addDays(new Date(), 9));
  await expect(eligible.first().locator('strong')).toContainText(inclusiveDay);
  await eligible.first().getByRole('button', { name: 'Elegir sesión' }).click();
  await expect(page.getByRole('dialog')).toContainText('La reserva confirmada no se puede cancelar');
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();
  await expect(page.getByRole('status')).toContainText('Recuperación confirmada');
  await expect(absence).toContainText('confirmada');
  await expect(absence.getByRole('button', { name: /cancelar|anular/i })).toHaveCount(0);
});

test('calendario marca día no lectivo y habilita una sesión sin suspender recurrencias', async ({ page }) => {
  const holiday = addDays(new Date(), 21);
  const day = dayKey(holiday);
  await page.goto('/');
  await page.getByRole('button', { name: 'Calendario del centro' }).click();
  await page.getByLabel('Fecha').fill(day);
  await page.getByLabel('Nota').fill('Festivo de prueba E2E');
  await page.getByRole('button', { name: 'Guardar día no lectivo' }).click();
  await expect(page.getByRole('status')).toContainText('día quedó marcado como no lectivo');
  await page.getByLabel('Grupo').selectOption({ label: 'Reformer mañana · Inicial · Reformer' });
  await page.getByLabel('Fecha y hora').fill(`${day}T12:00`);
  await page.getByRole('button', { name: 'Habilitar sesión' }).click();
  await expect(page.getByRole('status')).toContainText('habilitó una sesión');
  const holidayCard = page.locator('.calendar-day-item').filter({ hasText: 'Festivo de prueba E2E' });
  await expect(holidayCard).toContainText('Habilitada manualmente');
  await expect(holidayCard).toContainText('Sesión recurrente');
});

test('navegación móvil mantiene cinco accesos táctiles y el foco visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const mobileNavigation = page.getByRole('navigation', { name: 'Navegación móvil' });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByRole('button')).toHaveCount(5);
  await mobileNavigation.getByRole('button', { name: /Alumnos/ }).click();
  await expect(page.getByRole('heading', { name: 'Alumnos', level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe('none');
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});
