# Plan de Build — MVP de Belén Pilates

Este plan implementa el alcance de `docs/intent.md` y `docs/spec.md` en la fase local del MVP. La estructura de código propuesta todavía no existe; se mantiene dentro del stack de `docs/TECH_STACK.md`. Supabase Auth, PostgreSQL, Render, el modo oscuro y OpenRouter quedan fuera de estas fases.

## Files that change

- `package.json`: crear el workspace npm de la raíz y los comandos `dev`, `test`, `seed` y `empty`.
- `frontend/package.json`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`: crear la aplicación React, TypeScript y Vite.
- `frontend/src/api/client.ts` y `frontend/src/types.ts`: definir el cliente de la API JSON y los tipos compartidos del MVP.
- `frontend/src/components/`: navegación, controles de fecha, tarjetas de sesión, estados de ocupación y formularios reutilizables.
- `frontend/src/pages/`: vistas de Agenda, Alumnos, Grupos y horarios, Ausencias y recuperaciones, y Calendario del centro.
- `frontend/src/styles.css`: aplicar Regimental Blue, accesibilidad y diseño móvil de `.agents/skills/brand/SKILL.md`.
- `frontend/src/**/*.test.ts(x)`: pruebas unitarias de validaciones y reglas visibles en el frontend, con Vitest.
- `pyproject.toml` y `uv.lock` en la raíz: dependencias del backend y herramientas Python de la fase MVP.
- `backend/app/main.py`, `backend/app/database.py` y `backend/app/tables.py`: FastAPI, conexión SQLite mediante SQLAlchemy Core y tablas del dominio.
- `backend/app/services/`: operaciones para alumnos, grupos/asignaciones, sesiones, ausencias, recuperaciones y calendario.
- `backend/app/seed.py`: carga de datos ficticios para desarrollo local.
- `alembic.ini`, `alembic/env.py` y `alembic/versions/0001_initial.py`: configuración y migración inicial del esquema SQLite.
- `backend/tests/`: pruebas pytest de reglas, persistencia y API; cada ejecución usa su propia base SQLite.
- `playwright.config.ts` y `e2e/`: configuración Playwright Test con Google Chrome y recorridos end-to-end del MVP.
- `docs/STATUS.md`: registrar el avance y los comandos locales cuando la aplicación pueda ejecutarse.

## Order of work

### Fase 1 — Esqueleto local y arranque

Crear el workspace React/Vite y el servicio FastAPI. Añadir `npm run dev` para iniciar ambos con SQLite local. Mantener el acceso local simulado para una administradora, sin configurar autenticación real. Confirmar que el arranque no lee ni escribe en Supabase.

### Fase 2 — Persistencia, migración y datos de ejemplo

Definir tablas y relaciones para alumnos, grupos, asignaciones, sesiones concretas, ausencias, recuperaciones, días de calendario y configuración necesaria. Crear la migración inicial con Alembic y el seed ficticio: sesiones completas y con plazas, casos antes y después del límite de ausencia, recuperaciones y días no lectivos. Añadir `npm run seed` y `npm run empty` con confirmación.

### Fase 3 — Reglas de dominio y API

Implementar y probar primero en backend la validación de nombres, asignaciones, ocupación, ausencias, compatibilidad de recuperaciones y habilitación manual de sesiones. Exponer operaciones JSON para consultar la agenda y administrar alumnos, grupos, ausencias, recuperaciones y calendario. Validar aforos en el servidor y guardar cada cambio que afecte plazas en una transacción.

### Fase 4 — Shell de interfaz y gestión diaria

Antes de construir la Agenda, escoger una de las tres propuestas de `docs/mockups/`. Crear navegación y las vistas de Agenda, Alumnos y Grupos conectadas a la API. Incluir búsqueda por nombre, teléfono opcional, asignaciones, niveles, modalidades, horario, recurrencia y aforo. Mostrar ocupación y plazas como números y texto además de color.

### Fase 5 — Ausencias, recuperaciones y calendario

Completar el registro de ausencias con el límite mínimo de 24 horas y actualización de plazas. Añadir búsqueda de recuperaciones por nivel, modalidad, disponibilidad y plazo inclusivo de siete días naturales; permitir la reserva por adelantado y no mostrar cancelación tras confirmar. Completar la gestión de días no lectivos y habilitación manual de sesiones, sin decidir una política automática para las recurrencias.

### Fase 6 — Integración y demostración local

Completar la prueba end-to-end de cada flujo, corregir diferencias entre la interfaz y el mockup elegido y revisar tamaños móviles, foco, contraste y mensajes. Ejecutar `npm test` con bases de prueba aisladas, verificar `npm run dev`, `npm run seed` y `npm run empty`, y actualizar `docs/STATUS.md`. No incorporar autenticación, despliegue ni servicios de fases posteriores.

## Risks

- **Dashboard sin elegir:** `docs/spec.md` deja pendiente escoger entre tres propuestas. Elegir una antes de la Fase 4; no implementar las tres como dashboards distintos.
- **Decisiones de negocio abiertas:** siguen pendientes la conducta de recurrencias en festivos, las correcciones administrativas de recuperaciones confirmadas, el número de recuperaciones por ausencia y el tratamiento de reservas no usadas. No fijar esas políticas en código hasta validarlas. La especificación sí exige habilitación manual de sesiones y que una recuperación confirmada no se cancele desde la interfaz.
- **Fechas y zona horaria:** los límites de 24 horas y siete días deben compararse con fechas deterministas y una zona horaria que el centro confirme. No fijar una zona horaria de producción a partir del entorno de desarrollo.
- **Nombres homónimos:** la unicidad por nombre puede impedir registrar a dos alumnos con el mismo nombre. Mantener la regla especificada y mostrar un mensaje claro; la aceptación operativa sigue pendiente.
- **Sobreocupación:** calcular ocupación en backend y actualizar ausencias/reservas de forma transaccional. No confiar en el contador del frontend para autorizar una plaza.
- **Datos personales:** usar solo alumnos y teléfonos ficticios en el seed y las pruebas. No cargar datos reales hasta revisar privacidad y conservación.
- **Recurrencias y sesiones concretas:** la especificación define ambos conceptos, pero no detalla toda la política de generación o actualización de sesiones futuras. Resolver el mecanismo técnico durante la implementación sin cambiar la regla pendiente para festivos.

## Proof

### Pruebas unitarias

- **Vitest — alumnos:** acepta teléfono vacío; rechaza nombre vacío y duplicados tras la normalización especificada; verifica que editar el nombre conserva el ID y las asignaciones.
- **Vitest — grupos y agenda:** presenta nivel, modalidad, horario y aforo; muestra ocupación y plazas libres con etiquetas textuales; distingue sesiones completas, ausencias y recuperaciones.
- **pytest — alumnos y grupos:** CRUD, teléfono opcional, unicidad normalizada, referencias por ID, asignación de alumnos y validación de aforo.
- **pytest — ocupación:** una ausencia aceptada libera una plaza; una recuperación confirmada ocupa una plaza; la ocupación no supera el aforo al competir varias reservas por las últimas plazas.
- **pytest — ausencia:** acepta exactamente 24 horas de antelación y rechaza menos de 24 horas sin modificar la ocupación.
- **pytest — recuperación:** filtra por mismo nivel y modalidad, plaza libre y plazo; incluye el séptimo día natural, excluye el siguiente y permite reservar antes de la sesión original si la ausencia se registró a tiempo.
- **pytest — calendario:** marca fechas no lectivas y permite habilitar una sesión concreta sin aplicar una política automática no aprobada a las recurrencias.
- **pytest — seed y comandos locales:** comprueba que los datos son ficticios y que semilla y vaciado requieren la confirmación prevista.

### Pruebas end-to-end con Playwright Test y Google Chrome

- **Agenda:** iniciar con el seed, cambiar entre día y semana y comprobar hora, grupo, nivel, modalidad, ocupación y plazas libres.
- **Alumnos:** crear un alumno sin teléfono, buscarlo, editar su nombre y verificar que conserva sus grupos; intentar un nombre duplicado normalizado y comprobar el mensaje.
- **Grupos y horarios:** crear o editar un grupo, cambiar participantes y comprobar nivel, modalidad, recurrencia, aforo y sesiones visibles.
- **Ausencia:** registrar una ausencia elegible desde una sesión y comprobar que se libera la plaza; repetir con menos de 24 horas y comprobar que se rechaza sin cambios.
- **Recuperación:** desde una ausencia futura válida, reservar una sesión compatible antes de la clase original; comprobar disponibilidad, fecha límite inclusiva, ocupación actualizada y que no aparezca una acción para cancelar la reserva confirmada.
- **Calendario:** marcar un día no lectivo, habilitar manualmente una sesión y comprobar que no se aplica una regla automática pendiente.

Las pruebas de backend y end-to-end usarán bases SQLite de prueba independientes. Ninguna prueba del MVP local se conectará a Supabase.
