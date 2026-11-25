# Estado del proyecto

## Ahora

- El MVP local de Belén Pilates está implementado según `docs/plan.md`: React/Vite/TypeScript, FastAPI, SQLite, Alembic, datos ficticios, cinco áreas de gestión y API JSON.
- La propuesta elegida para la Agenda es **Agenda del día** (`docs/mockups/agenda-dia.html`), con cambio a vista semanal.
- Las reglas de dominio están en servicios backend y usan transacciones para guardar cambios de asignaciones, ausencias y recuperaciones. Las decisiones abiertas de `docs/intent.md` siguen sin fijarse en el código.
- La creación y edición de grupos permite configurar varios días semanales, una hora y duración por día, atajos de selección, copia de horario y resumen por intervalos. La generación registra duración en las sesiones y las vistas muestran intervalos cuando el dato existe. Las duraciones desconocidas de grupos antiguos se conservan pendientes, sin asignarles un valor arbitrario; las sesiones vinculadas a ausencias o recuperaciones mantienen su ID, fecha, hora, duración y referencias. TypeScript pasa y Vitest verifica 4 archivos con 15 pruebas. La última ejecución de `npm test` terminó con código 1: pytest no pudo inicializar la caché de `uv` (`os error 183`) y Playwright no pudo iniciar el servidor backend; el entorno no tiene Python 3.12 disponible.
- La Agenda del día se ajustó visualmente al mockup elegido en escritorio y móvil. Playwright comparó la interfaz compilada con datos de prueba interceptados; capturas en `.playwright-mcp/agenda-final-desktop.png` y `.playwright-mcp/agenda-final-mobile.png`. El servidor API no pudo arrancar porque `uv` no encuentra una instalación de Python válida.
- `npm test` usa `scripts/run-tests.mjs` para ejecutar Vitest, pytest y Playwright en serie, incluso si falla una suite, y devuelve error si alguna falla. Se añadieron la ruta de imports y un reloj fijo; la prueba E2E selecciona el día 7 de forma explícita, comprueba que el día 8 se excluye y usa una etiqueta exacta. Playwright reconoce 7 recorridos, pero no los ejecuta sin arrancar sus servidores. Los intentos de preparar Python 3.12 con `uv` quedaron bloqueados por el acceso al perfil y la red del entorno.
- No se añadieron autenticación real, Supabase, PostgreSQL, Render, OpenRouter, modo oscuro, PWA ni acceso de alumnos.
- El seed y las pruebas usan únicamente nombres y teléfonos ficticios.

## Requisitos funcionales

La implementación está escrita. TypeScript y Vitest están verificados; pytest y Playwright necesitan un entorno Python funcional para completar la verificación automatizada.

| ID | Requisito | Implementación | Evidencia escrita |
|---|---|---|---|
| RF-01 | Alta, consulta, edición y baja de alumnos; nombre obligatorio y único; teléfono opcional. | Implementado | Vitest, pytest y E2E de alta sin teléfono, búsqueda, edición y baja. |
| RF-02 | Unicidad normalizada y referencias estables al editar el nombre. | Implementado | Vitest, pytest y E2E de cambio de nombre y grupos conservados. |
| RF-03 | Búsqueda por nombre y asignación a grupos. | Implementado | pytest y E2E de búsqueda y asignaciones. |
| RF-04 | Grupos, niveles, modalidades y varios días semanales con hora y duración independientes, atajos, copia de horarios, resumen por intervalos, aforo y participantes. | Implementado; TypeScript y Vitest verificados. Backend/E2E pendientes de ejecución. Los grupos migrados sin duración siguen siendo editables y mantienen esa duración pendiente. | Vitest cubre selección rápida, copia, resumen, validaciones, edición, horarios antiguos e intervalos. Se añadieron recorridos de API/backend y E2E para horarios por día, edición, sesiones reservadas y rollback cuando los cambios superarían el aforo. |
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
