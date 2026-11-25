# Estado del proyecto

## Ahora

- **Aplicación:** MVP local de Belén Pilates implementado según `docs/plan.md`, con React/Vite/TypeScript, FastAPI, SQLite, Alembic, datos ficticios y cinco áreas de gestión. La agenda predeterminada es **Agenda del día**, con vista semanal.
- **Dominio:** asignaciones, aforo, ausencias, recuperaciones y calendario se gestionan en el backend. Las decisiones que `docs/intent.md` mantiene abiertas siguen sin fijarse.
- **Pruebas al cierre:** Vitest pasó 18/18 pruebas y Playwright descubre 7 recorridos. El último resultado completo compartido antes de corregir dos tests fue pytest 26/27 y Playwright 5/7. Tras esas correcciones no se pudo repetir pytest ni ejecutar E2E desde esta sesión porque `uv` no puede leer la instalación Python administrada (error 5). `tsc --noEmit` pasó; Vite no pudo cargar su configuración por acceso denegado a `../../..`.
- **Deployment:** solo existe el modo local SQLite. No se configuraron Supabase Auth/Postgres ni Render y no se desplegó la aplicación.
- **Rama y árbol de trabajo:** `mvp` está 3 commits por delante de `origin/mvp`; hay cambios modificados y archivos nuevos sin commit. No se hizo commit ni push.

## Revisión frente a main — 2026-11-25

Hallazgos importantes registrados y corregidos:

- Al retirar a un alumno de un grupo, se conserva su plaza en sesiones futuras con una ausencia aceptada; se añadió una prueba de regresión para ocupación.
- Las sesiones habilitadas manualmente heredan la duración del horario semanal del día correspondiente; se añadió una comprobación al flujo de calendario.
- Las opciones de recuperación excluyen sesiones ya iniciadas y la confirmación vuelve a validar esta condición; se añadió una prueba de búsqueda y reserva.

Verificación del 2026-11-25 con `npm.cmd test`: Vitest pasó (4 archivos, 15 pruebas). pytest y Playwright no pudieron arrancar porque no hay Python 3.12 instalado y la descarga con `uv` falló por bloqueo de red del entorno (TCP 10013). Se corrigió el fallo inicial de caché de `uv` usando una caché local al repositorio; las suites de backend y navegador quedan sin verificar hasta disponer de Python 3.12.

Hallazgo importante corregido: cuando una ausencia no tiene sesiones de recuperación compatibles, la pantalla usaba una fecha completa como respaldo y le concatenaba otra hora, lo que provocaba una fecha inválida. La API ahora devuelve el plazo de siete días junto con cada ausencia y la interfaz lo muestra aunque no haya opciones; se añadió una regresión de interfaz y una aserción backend. Vitest pasó (5 archivos, 16 pruebas). TypeScript pasó (`tsc --noEmit`). pytest y Playwright no pudieron iniciar porque falta Python 3.12; `uv` no pudo descargarlo (TCP 10013). Vite tampoco pudo completar el build: Windows denegó acceso a `../../..` al cargar la configuración, incluso fuera del sandbox.

Hallazgo importante corregido: al navegar a otra fecha, el resumen de agenda y los cambios del día seguían llamándola “Hoy”. El resumen ahora indica “Fecha seleccionada” y cada cambio muestra el día correspondiente; se añadió una prueba de navegación.

Verificación de esta revisión con `npm.cmd test` y caché `uv` local: Vitest pasó (6 archivos, 17 pruebas). pytest y Playwright no pudieron iniciar porque `uv` no puede leer su directorio de Python administrado (error 5); instalar Python 3.12 en una ruta local también quedó bloqueado por red (TCP 10013).

## Hallazgos adicionales de revisión — 2026-11-25

- [x] Los IDs repetidos en las asignaciones ya no se saltan la validación de capacidad ni la comprobación de alumno activo.
- [x] Los horarios semanales y las sesiones manuales admiten cualquier minuto, según la precisión `HH:MM` de la especificación.
- [x] Las sesiones futuras, incluidas las manuales, sincronizan los cambios de asignación y las bajas; cada alta comprueba el aforo concreto de la sesión.
- [x] Al elegir una fecha, el calendario carga seis semanas desde esa fecha y muestra los días no lectivos de ese periodo.

Verificación tras las correcciones: Vitest pasó (7 archivos, 18 pruebas) y Playwright descubre los 7 recorridos con `npm.cmd run test:e2e -- --list`. El resultado recibido antes de corregir los tests mostró 26/27 casos de pytest y 5/7 E2E; el caso backend elegía varias sesiones con `scalar_one()` y los cálculos de fecha de E2E usaban el reloj real de Node en lugar de `TEST_NOW`. Se limitó la consulta a la primera sesión futura y los cálculos E2E ahora usan `TEST_NOW`. No pude repetir pytest ni ejecutar Playwright desde esta sesión porque `uv` no puede leer el intérprete Python administrado fuera del sandbox (error 5). `tsc --noEmit` pasó en la compilación previa; Vite no pudo cargar la configuración por acceso denegado de Windows a `../../..`.

## Cierre de sesión — 2026-11-25

### Cambios realizados durante esta sesión

- Se corrigió la validación de IDs repetidos para que no omita el aforo del grupo ni la comprobación de alumno activo.
- Los horarios de grupo y las sesiones manuales aceptan cualquier minuto, sin limitarse a `:00` o `:30`.
- Los cambios de asignación y las bajas se sincronizan con sesiones futuras manuales y recurrentes. Al añadir a un alumno se valida el aforo concreto de cada sesión.
- El calendario carga seis semanas desde la fecha elegida, también para festivos fuera del periodo inicial.
- Se añadieron pruebas de regresión para esas reglas. Se corrigió el test de capacidad para seleccionar una sola sesión futura, y los cálculos de fecha E2E ahora usan `TEST_NOW`, igual que el seed, el backend y el reloj del navegador.
- También quedaron registrados en esta rama los arreglos de ausencias con fecha límite visible, agenda con fecha correcta, filtrado de sesiones de recuperación ya iniciadas, duración heredada en sesiones manuales y conservación de roster cuando una ausencia aceptada sigue vinculada.

### Hallazgos de review

- **Corregidos:** IDs repetidos que evitaban validaciones; horarios limitados a media hora; roster desactualizado en sesiones manuales futuras; festivos elegidos fuera del rango visible de seis semanas.
- **Pendientes de código:** ninguno identificado en la review.
- **Pendiente de verificación:** volver a ejecutar pytest y Playwright después de corregir sus tests; el entorno de esta sesión no permite leer el Python administrado que está bajo `%AppData%`.

### Errores pendientes y causas probables

- `uv run pytest` y el servidor backend de Playwright no arrancaron en la última repetición local porque `uv` no pudo leer `C:\Users\Javier\AppData\Roaming\uv\python` (error 5). La salida de pruebas compartida por el usuario sí mostró Python 3.12.12 funcionando; parece una diferencia de acceso entre esa terminal y el sandbox de Codex.
- `npm.cmd run build --workspace frontend` pasó `tsc --noEmit`, pero Vite/esbuild no pudo leer `../../..` al cargar `frontend/vite.config.ts` (acceso denegado de Windows). Hay que repetir el build desde la terminal del usuario para separar permisos del entorno de un error del proyecto.
- La última salida completa recibida fue anterior a los arreglos de `scalar_one()` y del reloj E2E. No se debe considerar backend ni E2E validados todavía.

### Siguiente paso concreto

Mañana, desde la terminal donde Python 3.12 ya funcionó, ejecutar `npm.cmd test`. Si pytest y Playwright pasan, ejecutar `npm.cmd run build --workspace frontend`; si alguna suite falla, corregir el fallo sin omitir suites y actualizar este estado con el resultado final.

### Deployment

Sin cambios: aplicación local, sin deployment. Supabase Auth/Postgres y Render siguen pendientes para la fase del curso correspondiente; no se desplegó ni publicó nada.

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
