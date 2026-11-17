# MVP de gestión de clases y recuperaciones

## Preocupaciones abiertas

- **Decisiones funcionales:** la suspensión de sesiones recurrentes en festivos, las correcciones de recuperaciones confirmadas y el tratamiento de recuperaciones no utilizadas siguen pendientes en `docs/intent.md`. Este documento no fija esas políticas.
- **Nombres homónimos:** el requisito actual rechaza nombres repetidos tras normalizar espacios y mayúsculas/minúsculas. La responsable del centro debe confirmar que esto es aceptable.
- **Privacidad:** nombre y teléfono son datos personales. Antes de cargar datos reales, deben revisarse las medidas de protección; los datos de desarrollo serán ficticios.
- **Fechas y zona horaria:** la regla de 24 horas se mide respecto al inicio de la sesión y el plazo de recuperación usa días naturales. Conviene confirmar la zona horaria oficial del centro antes de fijar estos cálculos en producción.
- **Elección visual:** se eligió **Agenda del día** (`docs/mockups/agenda-dia.html`) para el MVP: presenta primero las clases cronológicas y conserva el cambio a vista semanal.

**Estado:** borrador de requisitos y diseño basado en `docs/intent.md`. Las decisiones pendientes requieren validación con la responsable del centro.

## 1. Propósito

Dar a la administradora una herramienta local para mantener alumnos, grupos y sesiones; consultar ocupación; registrar ausencias; reservar recuperaciones compatibles; y gestionar días no lectivos. Los alumnos comunican sus solicitudes por los canales habituales y no usan la aplicación.

El MVP inicial sigue la fase Semana 1, Día 3 del curso: React, Vite y TypeScript; API JSON con FastAPI; SQLite local con SQLAlchemy Core; migraciones Alembic; y datos ficticios de ejemplo. Supabase Auth/Postgres y Render se incorporan en la fase posterior indicada en `docs/TECH_STACK.md`.

## 2. Usuarios y alcance

### Usuaria

- **Administradora:** única usuaria funcional. Mantiene los registros y resuelve las solicitudes recibidas de los alumnos.
- **Alumnos:** registros gestionados por la administradora; no tienen cuenta, inicio de sesión ni acceso de autoservicio.

### Incluido

- Alta, consulta, edición, búsqueda y baja de alumnos.
- Gestión de grupos, niveles, modalidades, horarios, recurrencias, aforos y asignaciones.
- Consulta de sesiones y de su ocupación, ausencias, recuperaciones y plazas libres.
- Registro de ausencias con validación de preaviso y liberación de plaza.
- Búsqueda y reserva de recuperaciones compatibles, incluso antes de la sesión original.
- Gestión de días no lectivos y habilitación de sesiones en ellos.
- Datos ficticios para recorrer los casos principales y las situaciones límite.
- Interfaz en español, mobile-first y con la identidad Regimental Blue.

### Fuera del MVP inicial

- Acceso de alumnos, registro público o varias cuentas funcionales del centro.
- Autenticación real, Supabase, PostgreSQL compartido y despliegue en Render; corresponden a la fase posterior del curso. El desarrollo local conserva el flujo previsto por el curso.
- Exportación JSON semanal, correo, copias en Drive, PWA, instalación y funcionamiento sin conexión.
- Modo oscuro y asistente de IA; siguen siendo ejercicios de fases posteriores.
- Recopilación de correo electrónico, domicilio, fecha de nacimiento o información médica.

## 3. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-01 | La administradora puede crear, consultar, editar y dar de baja un alumno. Cada alumno tiene un identificador estable, un nombre obligatorio y único, y un teléfono de contacto opcional. |
| RF-02 | La unicidad del nombre se comprueba sin distinguir mayúsculas/minúsculas y normalizando espacios. Editar el nombre no cambia el identificador ni rompe referencias desde grupos, ausencias o recuperaciones. |
| RF-03 | La administradora puede buscar alumnos por nombre y asignarlos o retirarlos de grupos. La búsqueda por teléfono no es requisito. |
| RF-04 | La administradora puede crear y modificar grupos con nombre, nivel, modalidad, horario, recurrencia, aforo y alumnos asignados. |
| RF-05 | La agenda permite consultar sesiones por fecha y grupo, con horario, nivel, modalidad, lista de alumnos asignados, ausencias, recuperaciones, ocupación y plazas libres. |
| RF-06 | La ocupación se calcula con las asignaciones vigentes, descontando las ausencias registradas y sumando las recuperaciones confirmadas. En ningún caso puede superar el aforo. |
| RF-07 | La administradora puede registrar una ausencia para un alumno asignado a una sesión. Se acepta solo si se registra al menos 24 horas antes del inicio. Al aceptarla, la plaza queda libre. Si no cumple el plazo, se rechaza y se explica el motivo. |
| RF-08 | Una ausencia comunicada antes de la sesión original puede tener una recuperación reservada por adelantado. La sesión alternativa debe tener plaza y coincidir en nivel y modalidad con la sesión original. |
| RF-09 | La sesión de recuperación debe celebrarse dentro de los siete días naturales posteriores a la fecha de la sesión original; el séptimo día está incluido. |
| RF-10 | Una recuperación confirmada no ofrece una acción de cancelación. Antes de confirmarla, la aplicación muestra un resumen claro de la reserva. Las correcciones administrativas quedan pendientes de definir. |
| RF-11 | La administradora puede marcar fechas como festivas o no lectivas y habilitar sesiones en esas fechas cuando corresponda. La regla predeterminada para las recurrencias en festivos queda pendiente. |
| RF-12 | El entorno local permite iniciar la aplicación con datos ficticios y restablecerlos mediante los comandos del curso, con confirmación antes de una operación que vacíe o reponga datos. |

## 4. Reglas de negocio

1. El nombre del alumno es obligatorio y único según la normalización acordada; el teléfono no actúa como identificador.
2. Las relaciones entre registros usan identificadores estables, no nombres visibles.
3. Una ausencia libera una plaza únicamente después de pasar la validación de 24 horas.
4. La elegibilidad de recuperación se calcula desde la sesión original y requiere nivel y modalidad iguales, plaza libre y fecha dentro del plazo inclusivo de siete días naturales.
5. Se permite reservar una recuperación antes de que tenga lugar la sesión original, siempre que la ausencia se haya comunicado y registrado con el preaviso requerido.
6. Una recuperación confirmada no se cancela desde la interfaz.
7. El aforo se valida al cargar y al cambiar asignaciones, registrar ausencias o confirmar recuperaciones. La reserva de plaza debe ser una operación consistente para evitar sobreocupación.
8. En una fecha no lectiva no se presupone si las recurrencias se suspenden o continúan; la administradora puede habilitar sesiones según la regla pendiente de validar.

## 5. Modelo de información

- **Alumno:** ID estable, nombre visible, nombre normalizado para comprobar unicidad, teléfono opcional y estado de alta/baja.
- **Grupo:** ID, nombre, nivel, modalidad, horario habitual, recurrencia y aforo.
- **Asignación:** relación entre alumno y grupo. Permite mostrar participantes y calcular ocupación.
- **Sesión:** ID, grupo, fecha y hora de inicio, aforo aplicable y estado de disponibilidad en el calendario. Representa una clase concreta del grupo.
- **Ausencia:** ID, alumno, sesión original, fecha/hora de registro y estado. Al registrarla, reduce la ocupación de esa sesión.
- **Recuperación:** ID, ausencia que la origina, sesión alternativa y estado de reserva. Una reserva confirmada incrementa la ocupación de la sesión alternativa.
- **Día de calendario:** fecha y estado lectivo/no lectivo, con las sesiones habilitadas que correspondan.
- **Configuración del centro:** parámetros estrictamente necesarios para el calendario; no se crean opciones para resolver reglas que siguen pendientes.

El nombre es un dato editable; las referencias históricas se mantienen mediante IDs. La baja de un alumno debe conservar la integridad de sus asignaciones y registros existentes. La política de conservación o borrado de datos personales se revisará antes de usar datos reales.

## 6. Flujos principales

### Alta y mantenimiento de alumno

1. La administradora abre **Alumnos** y busca por nombre para detectar un registro existente.
2. Crea el alumno con nombre y, si dispone de él, teléfono; valida el nombre normalizado y asigna grupos.
3. Puede editar los datos o dar de baja al alumno. Los registros históricos siguen apuntando al mismo ID.

### Consulta de agenda

1. La administradora abre **Agenda** y selecciona una fecha o semana.
2. Cada sesión muestra hora, grupo, nivel, modalidad y ocupación numérica, por ejemplo, `7 de 10 · 3 plazas libres`.
3. Puede abrir la sesión para ver participantes, ausencias y recuperaciones y comenzar la acción correspondiente.

### Registrar ausencia

1. Desde la sesión habitual, la administradora selecciona a un alumno asignado.
2. La aplicación compara el momento de registro con el inicio de la sesión.
3. Si hay al menos 24 horas, presenta el resumen y confirma la ausencia; la plaza se libera y la ocupación se actualiza.
4. Si faltan menos de 24 horas, se muestra un error específico y no se modifica la sesión.

### Reservar recuperación

1. Desde una ausencia elegible, la administradora elige **Buscar recuperación**.
2. La aplicación muestra solo sesiones que cumplen nivel, modalidad, plazo y disponibilidad, junto con la fecha límite.
3. La administradora selecciona una sesión y revisa el resumen antes de confirmar.
4. Al confirmar, se ocupa una plaza y el estado queda visible como **Recuperación confirmada**. No se ofrece cancelar.

### Gestionar día no lectivo

1. La administradora marca una fecha como festiva/no lectiva.
2. Puede habilitar sesiones en esa fecha cuando corresponda.
3. La aplicación presenta la fecha y sus sesiones con etiquetas textuales. La reacción automática de las recurrencias queda pendiente de validación.

## 7. Diseño de interfaz

### Navegación y pantallas

La navegación principal mantiene pocas secciones y es consistente en todas las pantallas:

1. **Agenda / Inicio:** vista diaria predeterminada, acceso a la semana, navegación entre fechas y lista de sesiones.
2. **Alumnos:** búsqueda por nombre, ficha compacta, formulario de alta/edición y gestión de asignaciones.
3. **Grupos y horarios:** lista de grupos y formulario para nivel, modalidad, recurrencia, aforo y participantes.
4. **Ausencias y recuperaciones:** acciones desde la sesión y consulta de reservas y su estado.
5. **Calendario del centro:** gestión de festivos, días no lectivos y sesiones habilitadas.

En móvil se prioriza una columna con tarjetas de sesión. En pantallas más anchas, la agenda puede aprovechar dos columnas para calendario y detalle sin cambiar las acciones ni ocultar información operativa.

### Propuestas de dashboard

- [Agenda del día](mockups/agenda-dia.html) · [captura de escritorio](mockups/agenda-dia.png) · [captura móvil](mockups/agenda-dia-movil.png): agenda cronológica con cambios del día a la vista.
- [Vista semanal](mockups/semana.html) · [captura de escritorio](mockups/semana.png) · [captura móvil](mockups/semana-movil.png): calendario de siete días para comparar sesiones y ocupación.
- [Plazas disponibles](mockups/plazas.html) · [captura de escritorio](mockups/plazas.png) · [captura móvil](mockups/plazas-movil.png): ocupación numérica como foco principal, con ausencias y recuperaciones al lado.

Las tres propuestas usan los mismos datos ficticios y el mismo sistema Regimental Blue; cambia la jerarquía y composición de la agenda.

Además, el prototipo incluye una vista navegable para cada sección del MVP:

- [Alumnos](mockups/alumnos.html) · [escritorio](mockups/alumnos.png) · [móvil](mockups/alumnos-movil.png)
- [Grupos y horarios](mockups/grupos.html) · [escritorio](mockups/grupos.png) · [móvil](mockups/grupos-movil.png)
- [Ausencias y recuperaciones](mockups/ausencias-recuperaciones.html) · [escritorio](mockups/ausencias-recuperaciones.png) · [móvil](mockups/ausencias-recuperaciones-movil.png)
- [Calendario del centro](mockups/calendario.html) · [escritorio](mockups/calendario.png) · [móvil](mockups/calendario-movil.png)
- [Índice de todos los mockups](mockups/index.html)

### Agenda y tarjetas de sesión

- La fecha, la hora y el grupo aparecen primero.
- Nivel y modalidad se muestran como datos secundarios.
- Ocupación y plazas libres se expresan con números y texto visible.
- Los estados incluyen etiquetas: **Disponible**, **Completa**, **Ausencia** y **Recuperación**.
- Desde el detalle se accede a participantes, registrar ausencia y revisar recuperaciones compatibles.
- Los controles de fecha permiten avanzar y retroceder de forma sencilla entre días y semanas.

### Lenguaje visual

- La identidad visible del centro usa el nombre **Belén Pilates** y el símbolo azul y rojo de `assets/brand/logo.webp`; no se sustituye por una letra genérica.
- Fondo cálido `#F5F1F0`, superficies blancas `#FFFFFF`, texto grafito `#252525` y bordes suaves `#D7D9DB`.
- Azul Regimental `#426282` para navegación y acciones principales; azul profundo `#295178` para títulos y estados activos; azul apagado `#5C7998` para acciones secundarias.
- Verde apagado para disponibilidad, gris neutro para sesiones completas, ámbar apagado para ausencias y azul para recuperaciones. Cada estado lleva además texto o icono; el color nunca es la única señal.
- Tipografía del sistema (`system-ui`, `Arial`, sans-serif). No se cargan fuentes externas.
- Tarjetas suavemente redondeadas, espaciado consistente y sombras discretas. Sin grandes fondos saturados, gradientes decorativos ni elementos que sugieran una asociación comercial con Gratz.
- Modo claro para el MVP. El modo oscuro corresponde a la fase posterior del curso.

### Accesibilidad y uso móvil

- Diseño mobile-first para pantalla vertical Android, con formularios cortos y una sola columna en anchuras estrechas.
- Objetivos táctiles de al menos 44 × 44 CSS px cuando sea posible; acciones primarias fáciles de alcanzar.
- Contraste objetivo WCAG AA, texto legible, foco visible y etiquetas asociadas a los campos.
- Mensajes de validación específicos en español, junto al campo o acción afectada.
- Confirmación previa a reservas irreversibles y acciones que vacían o reponen datos.
- El diseño adaptable no requiere instalación, PWA ni operación sin conexión.

## 8. Diseño técnico

- **Frontend:** React, TypeScript y Vite en `frontend/`.
- **Backend:** API JSON con FastAPI y Python 3.12 gestionado con `uv`.
- **Persistencia de desarrollo:** SQLite local mediante SQLAlchemy Core, sin SQL directo en la lógica de la aplicación.
- **Evolución del esquema:** Alembic; las migraciones se ejecutan al iniciar el backend.
- **Datos iniciales:** semilla ficticia que incluye alumnos, grupos, sesiones futuras, sesiones completas y con plazas, ausencias a ambos lados del límite, recuperaciones y festivos.
- **Pruebas de la fase MVP:** Vitest y pytest para unidades, Playwright Test con Google Chrome para recorridos de navegador, usando bases SQLite de prueba separadas.
- **Desarrollo local:** `npm run dev`; pruebas con `npm test`; semilla y vaciado con `npm run seed` y `npm run empty`, ambos con confirmación según `docs/TECH_STACK.md`.
- **Acceso en la fase local:** se mantiene el flujo local simulado previsto por el curso para la administradora. No se configura Supabase Auth ni se habilita acceso para alumnos.
- **Fases posteriores:** Supabase Auth/Postgres y RLS, Render y OpenRouter se mantienen en la secuencia del curso. No se adelantan al MVP local.

## 9. Criterios de aceptación

1. La aplicación local inicia con datos ficticios y permite recorrer los flujos de agenda, alumnos, grupos, ausencias, recuperaciones y días no lectivos.
2. Crear un alumno con un nombre equivalente tras normalizar espacios y mayúsculas/minúsculas se rechaza con un mensaje claro; cambiar el nombre mantiene sus relaciones.
3. La administradora puede crear y editar grupos, configurar horario, recurrencia, nivel, modalidad y aforo, y mantener sus alumnos asignados.
4. La agenda muestra sesiones por fecha con grupo, hora, nivel, modalidad, participantes, ocupación y plazas libres.
5. La ocupación nunca supera el aforo; las sesiones completas se identifican con texto y número.
6. Una ausencia justo en el límite de 24 horas se acepta y libera una plaza; una ausencia con menos de 24 horas se rechaza sin alterar la sesión.
7. Las recuperaciones propuestas coinciden en nivel y modalidad, tienen plaza y caen dentro de los siete días naturales posteriores, incluido el séptimo día.
8. Es posible reservar por adelantado una recuperación para una ausencia válida anterior a la sesión original; la confirmación ocupa plaza y no se puede cancelar desde la interfaz.
9. La administradora puede marcar días no lectivos y habilitar sesiones en ellos sin que el sistema aplique una política no aprobada a las recurrencias.
10. Los recorridos principales se cubren con las pruebas automatizadas y de navegador previstas por el curso; los datos de prueba no usan Supabase.
11. La interfaz sigue el sistema Regimental Blue, se adapta a móvil, muestra foco visible y comunica estados con texto además de color.

## 10. Decisiones pendientes

Se mantienen abiertas, según `docs/intent.md`:

1. Si las sesiones recurrentes se suspenden por defecto en festivos y cómo se reactivan.
2. Cuándo puede corregirse un error administrativo que afecta a una recuperación confirmada.
3. Si cada ausencia permite como máximo una recuperación y qué pasa si no se utiliza.
4. Si la regla de nombre único es aceptable ante alumnos homónimos.
5. Qué medidas de privacidad deben estar listas antes de usar datos reales.
6. Si se reevaluará la exportación JSON tras el MVP.
