# Estado del proyecto

## Ahora

- El repositorio sigue el curso AI SDLC de Ed Donner, adaptando el dominio funcional a la gestión de una escuela de pilates.
- docs/intent.md define el alcance funcional: alumnos, grupos, calendario, ausencias, recuperaciones y festivos.
- La arquitectura y las herramientas del curso se conservan en docs/TECH_STACK.md, incluida la progresión desde el desarrollo local con SQLite hasta Supabase, autenticación y Render.
- La identidad visual Regimental Blue y el diseño mobile-first están definidos en .agents/skills/brand/SKILL.md.
- El borrador de requisitos y diseño del MVP está documentado en docs/spec.md. Hay tres alternativas de Agenda y mockups independientes de todas las secciones en docs/mockups/, con capturas de escritorio y móvil. Falta escoger una alternativa de Agenda. Las decisiones pendientes de docs/intent.md siguen abiertas.
- El plan de Build por fases está documentado en docs/plan.md. Todavía no se ha implementado código.
- La aplicación todavía no se ha implementado.
- La exportación JSON semanal queda fuera del MVP inicial y pendiente de reevaluación.

## Cumplimiento de requisitos funcionales

La aplicación aún no tiene implementación funcional, así que todos los requisitos están pendientes. La columna de prueba indica la evidencia prevista en la sección **Proof** de [docs/plan.md](plan.md); se actualizará el estado cuando esa evidencia se ejecute.

| ID | Requisito funcional | Estado | Prueba prevista |
|---|---|---|---|
| RF-01 | Alta, consulta, edición y baja de alumnos; nombre obligatorio y único; teléfono opcional. | Pendiente de implementar y verificar | Vitest y pytest de alumnos; E2E de alta sin teléfono, búsqueda y edición. |
| RF-02 | Unicidad del nombre normalizada; al editarlo se conservan el ID y las referencias. | Pendiente de implementar y verificar | Vitest y pytest de normalización e integridad; E2E de edición y duplicado normalizado. |
| RF-03 | Búsqueda de alumnos por nombre y asignación o retirada de grupos. | Pendiente de implementar y verificar | pytest de asignaciones; E2E de búsqueda y conservación de grupos. |
| RF-04 | Gestión de grupos con nivel, modalidad, horario, recurrencia, aforo y alumnos. | Pendiente de implementar y verificar | pytest de grupos y aforo; E2E de creación/edición y participantes. |
| RF-05 | Consulta de sesiones por fecha y grupo con alumnos, ausencias, recuperaciones, ocupación y plazas libres. | Pendiente de implementar y verificar | Vitest de agenda; E2E de agenda en vistas de día y semana. |
| RF-06 | Cálculo de ocupación con asignaciones, ausencias y recuperaciones, sin superar el aforo. | Pendiente de implementar y verificar | pytest de ocupación y reservas concurrentes; E2E de plazas actualizadas. |
| RF-07 | Registro de ausencia con al menos 24 horas de antelación; libera plaza; rechaza y explica los casos fuera de plazo. | Pendiente de implementar y verificar | pytest de límite exacto y rechazo sin cambios; E2E de aceptación y rechazo. |
| RF-08 | Reserva anticipada de recuperación para una sesión con plaza y mismo nivel y modalidad. | Pendiente de implementar y verificar | pytest de elegibilidad y reserva anticipada; E2E desde una ausencia futura válida. |
| RF-09 | Recuperación dentro de los siete días naturales; se incluye el séptimo día. | Pendiente de implementar y verificar | pytest de límites del plazo; E2E de fecha límite inclusiva. |
| RF-10 | Resumen claro antes de confirmar y sin acción de cancelación tras confirmar. | Pendiente de implementar y verificar | E2E de resumen y ausencia de acción para cancelar. |
| RF-11 | Marcar fechas no lectivas y habilitar sesiones sin imponer una regla automática pendiente. | Pendiente de implementar y verificar | pytest de calendario; E2E de día no lectivo y sesión habilitada manualmente. |
| RF-12 | Inicio local con datos ficticios y confirmación antes de sembrar o vaciar datos. | Pendiente de implementar y verificar | pytest de seed y comandos locales. |

## Siguiente paso

Revisar docs/plan.md, escoger una propuesta de Agenda y validar con la responsable las decisiones pendientes de docs/intent.md antes de comenzar Build.

## Secuencia del curso

- Semana 1, día 3: MVP local de pilates y pruebas.
- Semana 1, día 4: harness, estándares, hooks, CI y modo oscuro.
- Semana 1, día 5: subagentes, autenticación, Supabase, búsqueda, menú y despliegue en Render.
- Semana 2: trabajo en equipo, worktrees, fábrica de agentes y capstone con OpenRouter, aplicados al dominio de pilates.

## Ejecución

La aplicación aún no tiene comandos ejecutables. Se documentarán aquí cuando exista la implementación de la fase correspondiente.
