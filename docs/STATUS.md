# Estado del proyecto

## Ahora

- El MVP local de Belén Pilates está implementado según `docs/plan.md`: React/Vite/TypeScript, FastAPI, SQLite, Alembic, datos ficticios, cinco áreas de gestión y API JSON.
- La propuesta elegida para la Agenda es **Agenda del día** (`docs/mockups/agenda-dia.html`), con cambio a vista semanal.
- Las reglas de dominio están en servicios backend y usan transacciones para guardar cambios de asignaciones, ausencias y recuperaciones. Las decisiones abiertas de `docs/intent.md` siguen sin fijarse en el código.
- Las pruebas de Vitest, pytest y Playwright están escritas. Los intentos de `npm test`, `uv run pytest`, Playwright y compilación se detuvieron antes de ejecutar casos: faltan `vitest`, `playwright` y `tsc`, y `uv` no pudo descargar Python 3.12 por el bloqueo de red del sandbox (`os error 10013`). La escalación devolvió un error interno antes de abrir la solicitud de autorización. Tampoco se generó `uv.lock` ni `package-lock.json`.
- No se añadieron autenticación real, Supabase, PostgreSQL, Render, OpenRouter, modo oscuro, PWA ni acceso de alumnos.
- El seed y las pruebas usan únicamente nombres y teléfonos ficticios.

## Requisitos funcionales

La implementación está escrita; la verificación automatizada queda pendiente de ejecutar en un entorno con dependencias instaladas.

| ID | Requisito | Implementación | Evidencia escrita |
|---|---|---|---|
| RF-01 | Alta, consulta, edición y baja de alumnos; nombre obligatorio y único; teléfono opcional. | Implementado | Vitest, pytest y E2E de alta sin teléfono, búsqueda, edición y baja. |
| RF-02 | Unicidad normalizada y referencias estables al editar el nombre. | Implementado | Vitest, pytest y E2E de cambio de nombre y grupos conservados. |
| RF-03 | Búsqueda por nombre y asignación a grupos. | Implementado | pytest y E2E de búsqueda y asignaciones. |
| RF-04 | Grupos, niveles, modalidades, horario, recurrencia, aforo y participantes. | Implementado | pytest y E2E de edición y sesiones visibles. |
| RF-05 | Consulta de sesiones, participantes, ausencias, recuperaciones, ocupación y plazas libres. | Implementado | Vitest y E2E en las vistas diaria y semanal. |
| RF-06 | Ocupación calculada en backend sin superar el aforo. | Implementado | pytest de cambios de plazas y reservas concurrentes. |
| RF-07 | Ausencia con 24 horas mínimas y liberación de plaza. | Implementado | pytest del límite exacto y rechazo; E2E válido y tardío. |
| RF-08 | Recuperación anticipada compatible con plaza disponible. | Implementado | pytest y E2E desde ausencia futura. |
| RF-09 | Plazo de siete días naturales, incluido el séptimo. | Implementado | pytest de los límites y E2E de la fecha inclusiva. |
| RF-10 | Resumen antes de confirmar; sin cancelación desde la interfaz. | Implementado | E2E de confirmación y ausencia de acción de cancelación. |
| RF-11 | Días no lectivos y sesiones habilitadas manualmente. | Implementado | pytest y E2E sin regla automática de recurrencias. |
| RF-12 | Seed y vaciado locales con confirmación. | Implementado | pytest del requisito de confirmación; comandos locales pendientes de smoke test. |

## Ejecución local

Una vez instaladas las dependencias:

1. `npm install`
2. `uv sync --python 3.12`
3. `npm run seed` y confirmar escribiendo `yes`.
4. `npm run dev`
5. `npm test` para Vitest, pytest y Playwright Test con Google Chrome.
6. `npm run build` en `frontend/` para comprobar tipos y generar la interfaz compilada.
7. `npm run empty` y confirmar escribiendo `yes` para vaciar la base local.

La base de desarrollo predeterminada está en `data/pilates.db`. Las pruebas y Playwright usan bases SQLite aisladas. El backend local solo acepta `PILATES_DATABASE_URL` con SQLite; no lee `DATABASE_URL` ni se conecta a Supabase.

## Fases posteriores del curso

- Semana 1, día 4: harness, estándares, hooks, CI y ejercicio separado de modo oscuro.
- Semana 1, día 5: revisión con agentes, Supabase Auth/Postgres, RLS y Render.
- Semana 2: worktrees, integración de equipo, fábrica de agentes y capstone con OpenRouter.
