# Intención: MVP de gestión de clases y recuperaciones — Escuela de Pilates

**Estado:** Borrador para validar con la responsable del centro
**Producto:** Aplicación interna para que la administradora gestione alumnos, grupos, clases, ausencias y recuperaciones
**Proceso:** Fases y herramientas del curso AI SDLC de Ed Donner; ver docs/TECH_STACK.md

## Problema

La escuela de pilates, con aproximadamente 50–150 alumnos (estimación pendiente de validar), gestiona las ausencias y las recuperaciones por teléfono o presencialmente. La administradora necesita consultar las plazas disponibles y registrar cambios con rapidez para evitar duplicidades y sobreocupación.

Los alumnos comunican sus solicitudes por los canales habituales. La administradora es la única usuaria funcional de la aplicación; los alumnos no acceden a ella.

## Resultado propuesto

Una aplicación de gestión que permite a la administradora mantener el calendario y la ocupación de las clases, registrar ausencias, reservar recuperaciones compatibles y gestionar festivos. El desarrollo sigue la arquitectura y la secuencia del curso: MVP local primero y, en las fases posteriores, autenticación y despliegue compartido según docs/TECH_STACK.md.

### Gestión de la administradora

1. Puede crear, consultar, editar y dar de baja alumnos. Cada alumno tiene un identificador técnico estable, nombre obligatorio y único, y un teléfono de contacto opcional. Los nombres se comparan tras normalizar espacios y diferencias entre mayúsculas y minúsculas. El teléfono no es el identificador del alumno.
2. Puede crear y modificar grupos con nivel, modalidad, horario, recurrencia, aforo y alumnos asignados.
3. Puede consultar sesiones por fecha, grupo, alumnos asignados, ausencias, recuperaciones, ocupación y plazas libres.
4. Cuando un alumno comunica una ausencia, la administradora registra el alumno y la clase afectada. Se exige un mínimo de 24 horas antes del inicio de la clase y, al registrarla, se libera la plaza correspondiente.
5. Puede reservar por adelantado una recuperación para una ausencia comunicada antes de la clase original. La sesión alternativa debe tener el mismo nivel y modalidad, disponer de plaza y celebrarse dentro de los siete días naturales posteriores a la clase original. El séptimo día está incluido.
6. Una recuperación confirmada no se puede cancelar. Las correcciones administrativas y el tratamiento de una recuperación que no se utiliza están pendientes de definir.
7. Puede marcar festivos o días no lectivos y habilitar sesiones en esas fechas cuando corresponda. La regla por defecto para las sesiones recurrentes queda pendiente de validar.
8. La aplicación autentica a la administradora en la fase del curso que introduce Supabase Auth. No hay registro ni acceso de alumnos. Las fases anteriores mantienen el flujo local previsto por el curso.

### Secciones principales

- **Calendario / Inicio:** sesiones por fecha, grupos, ocupación y plazas disponibles.
- **Alumnos:** alta, edición, búsqueda por nombre y asignación a grupos.
- **Grupos y horarios:** nivel, modalidad, recurrencia, capacidad y participantes.
- **Registrar ausencia:** selección de alumno y clase habitual, validación del preaviso y liberación de plaza.
- **Gestionar recuperaciones:** sesiones compatibles, plazas, plazo y reservas confirmadas.
- **Configuración del centro:** festivos y días lectivos.

### Registros del sistema

- **Alumno:** identificador estable, nombre único, teléfono de contacto y asignaciones a grupos.
- **Grupo:** nombre, nivel, modalidad, horario habitual y aforo.
- **Sesión:** fecha y hora concretas, grupo, capacidad y ocupación calculada desde asignaciones, ausencias y recuperaciones.
- **Ausencia:** alumno, sesión habitual afectada, fecha de registro y estado.
- **Recuperación:** ausencia que origina la solicitud, sesión alternativa y estado.
- **Día de calendario:** fecha lectiva o no lectiva y posibles sesiones habilitadas.
- **Configuración del centro:** parámetros necesarios para horarios y calendario.

No se recopilan correos electrónicos, domicilios, fechas de nacimiento ni información médica. Nombre y teléfono son datos personales; su tratamiento se revisará antes de utilizar datos reales.

### Datos de ejemplo

Se incluirán datos ficticios de alumnos, grupos, sesiones futuras, clases completas y con plazas, ausencias dentro y fuera de plazo, recuperaciones pendientes y confirmadas, y festivos. La carga y el reinicio de estos datos seguirán los comandos y las precauciones del curso.

### Look and feel

La interfaz conserva la identidad Regimental Blue de .agents/skills/brand/SKILL.md y se diseña mobile-first para facilitar su uso desde una pantalla vertical, con controles táctiles cómodos, búsquedas rápidas y flujos claros. Este criterio visual no prescribe una PWA ni el funcionamiento sin conexión.

## Usuarios y sistemas

- **Administradora:** única usuaria funcional; registra solicitudes y gestiona alumnos, grupos, clases y plazas.
- **Alumnos:** personas cuyos datos y reservas administra el centro; no acceden a la aplicación.
- **Sistemas de desarrollo y operación:** frontend, backend, base de datos, autenticación y despliegue definidos por las fases del curso en docs/TECH_STACK.md.

## Alcance y restricciones funcionales

- Nombre de alumno obligatorio y único; teléfono de contacto opcional.
- Ausencias con un mínimo de 24 horas de antelación respecto al inicio de la clase.
- Recuperaciones con plaza libre, mismo nivel y modalidad, dentro de los siete días naturales posteriores a la clase original; se permite reservar antes de que ocurra esa clase.
- Una recuperación confirmada no se puede cancelar.
- La administradora gestiona festivos y puede habilitar sesiones en días no lectivos.
- No hay autoservicio ni cuentas para alumnos, ni varios usuarios funcionales del centro.
- La exportación JSON semanal no forma parte del MVP inicial y queda pendiente de reevaluación.
- La autenticación de la administradora, Supabase, Render, las pruebas y el despliegue se incorporan en las fases del curso indicadas en docs/TECH_STACK.md; no se adelantan al MVP local.
- El modo oscuro se mantiene como ejercicio de la fase correspondiente del curso.
- El asistente de IA no forma parte del MVP inicial; OpenRouter se conserva para el capstone del curso como una extensión separada del MVP.

## Criterios de éxito

1. La administradora puede iniciar la aplicación de desarrollo con datos de ejemplo y recorrer sus flujos según el curso.
2. Puede crear, buscar, editar y dar de baja alumnos, evitando nombres duplicados según la normalización acordada y manteniendo referencias al editar un nombre.
3. Puede gestionar grupos, niveles, modalidades, horarios, aforos y asignaciones.
4. Puede consultar sesiones y plazas disponibles en el calendario; la ocupación nunca supera el aforo.
5. Una ausencia registrada con al menos 24 horas de antelación libera la plaza; un registro fuera de plazo se rechaza con un mensaje claro.
6. La aplicación propone recuperaciones solo con plaza libre, nivel y modalidad coincidentes, dentro del plazo de siete días.
7. Puede registrar la ausencia y reservar la recuperación por adelantado; una recuperación confirmada no puede cancelarse.
8. Puede gestionar días no lectivos y habilitar sesiones cuando proceda.
9. La fase de autenticación permite el acceso de la administradora y no habilita cuentas de alumnos.
10. Las funcionalidades se verifican con las pruebas automatizadas y los recorridos de navegador establecidos por el curso.

## Decisiones pendientes

1. **Festivos:** decidir si las sesiones recurrentes se suspenden por defecto y cómo se reactivan.
2. **Correcciones:** definir cuándo puede revertirse un error administrativo que afecta una recuperación confirmada.
3. **Derecho de recuperación:** confirmar si cada ausencia genera como máximo una recuperación y qué ocurre si no se utiliza.
4. **Homónimos:** se mantiene el requisito de nombre único; validar con la responsable si el rechazo de nombres repetidos es aceptable para el centro.
5. **Privacidad:** revisar las medidas de protección de datos antes de usar información real.
6. **Copias JSON:** reevaluar después del MVP; no son requisito de la primera versión.
