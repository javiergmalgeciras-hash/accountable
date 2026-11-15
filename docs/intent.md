# Intent: MVP de gestión de ausencias y recuperaciones — Escuela de Pilates

**Estado:** Borrador para validación con la responsable del centro  
**Producto:** Aplicación local para un único teléfono Android, de uso exclusivo por la propietaria  
**Referencia de estructura:** `intent.md` del proyecto Accountable (curso AI SDLC)

## Problem

La escuela de pilates, con aproximadamente 50–150 alumnos, gestiona actualmente las ausencias y las recuperaciones de clases por teléfono o presencialmente. La propietaria necesita consultar con rapidez las plazas disponibles y registrar los cambios sin recurrir a anotaciones o comprobaciones manuales que puedan producir duplicidades y sobreocupación.

El MVP no busca que los alumnos utilicen la aplicación. Los alumnos comunican sus solicitudes por los canales habituales y **la propietaria es la única persona que opera la herramienta** desde su propio teléfono Android.

## Proposed outcome

El MVP es una **PWA de gestión interna**, instalada en un único teléfono Android de la propietaria, que funciona sin conexión a Internet durante su uso habitual. Se desarrolla con VS Code y Codex, pero el dispositivo de uso final no necesita un ordenador ni un servidor encendido.

### Gestión exclusiva de la administradora

1. La propietaria abre la aplicación directamente en su móvil. **No hay cuentas, inicio de sesión, PIN, contraseñas ni recuperación de credenciales** dentro del MVP. La protección física y el bloqueo del dispositivo quedan fuera de la autenticación de la aplicación.
2. Puede crear, consultar, editar y dar de baja alumnos, guardando **nombre y número de teléfono**. El **nombre es obligatorio, único e identificador visible del alumno**; no se permiten duplicados, tras normalizar espacios y diferencias entre mayúsculas y minúsculas. El teléfono se utiliza como dato de contacto, no como identificador ni para iniciar sesión. La obligatoriedad del teléfono queda pendiente de confirmar.
3. Puede crear y modificar grupos, niveles, modalidades, horarios, aforos y asignaciones de alumnos.
4. Dispone de un calendario de sesiones para consultar clases programadas, alumnos asignados, ausencias, recuperaciones, plazas ocupadas y huecos libres.
5. Cuando un alumno comunica una ausencia por teléfono o presencialmente, la propietaria selecciona al alumno y la clase y registra la ausencia. La aplicación valida el preaviso mínimo de **24 horas** y libera la plaza correspondiente.
6. Puede consultar las clases alternativas disponibles para una recuperación y reservar una plaza en nombre del alumno, siempre que coincidan **nivel y modalidad**, exista capacidad y la sesión se celebre dentro de los **siete días naturales posteriores** a la clase habitual a la que falta. La reserva puede hacerse antes de la fecha de esa clase habitual.
7. Puede registrar una ausencia sin asignar todavía recuperación. Cada ausencia origina como máximo una recuperación; una recuperación confirmada no se cancela ni se cambia y, si no se utiliza, se pierde.
8. Puede corregir registros administrativos cuando sea necesario, conservando la coherencia de plazas y derechos. Cualquier excepción a las reglas de recuperación requiere una decisión funcional explícita, no se presupone.
9. Puede marcar festivos o días no lectivos en el calendario y habilitar sesiones en esas fechas cuando proceda.
10. Puede **exportar manualmente** los datos a un archivo JSON y restaurar una copia, con confirmación antes de reemplazar datos. La aplicación muestra un **recordatorio semanal** para realizar la copia; no se requiere envío automático a Gmail o Google Drive.

### Secciones principales

- **Calendario / Inicio:** sesiones por fecha, grupos, ocupación y plazas disponibles.
- **Alumnos:** alta, edición, búsqueda por nombre y asignación a grupos.
- **Grupos y horarios:** nivel, modalidad, recurrencia, capacidad y participantes.
- **Registrar ausencia:** selección de alumno y sesión habitual, validación de las 24 horas y liberación de plaza.
- **Gestionar recuperaciones:** derechos pendientes, sesiones compatibles con huecos y reservas confirmadas.
- **Configuración y copias:** festivos, exportación y restauración JSON, recordatorio semanal.

### Registros del sistema

- **Alumno:** identificador técnico interno estable, nombre visible único y número de teléfono; asignaciones a grupos. El identificador técnico permite conservar relaciones si se cambia el nombre.
- **Grupo:** nombre, nivel, modalidad, horario habitual y aforo.
- **Sesión:** fecha y hora concretas, grupo, capacidad y ocupación calculada a partir de asignaciones, ausencias y recuperaciones.
- **Ausencia:** alumno, sesión habitual afectada, fecha de registro y estado.
- **Recuperación:** alumno, ausencia que origina el derecho, sesión alternativa reservada y estado.
- **Día de calendario:** fecha lectiva o no lectiva y posibles sesiones habilitadas excepcionalmente.
- **Configuración local:** parámetros necesarios y fecha de la última copia de seguridad registrada.

No se recopilan correos electrónicos, domicilios, fechas de nacimiento ni información médica en el MVP. El teléfono y el nombre son datos personales y su tratamiento deberá revisarse antes de usar datos reales.

### Datos de ejemplo

Se incluirán datos ficticios para probar alumnos, grupos, sesiones futuras, clases completas y con plazas, ausencias dentro y fuera de plazo, recuperaciones pendientes y confirmadas, festivos y restauración de copias. Se documentará cómo reiniciar los datos de demostración sin confundirlos con los reales.

### Look and feel

Diseño **mobile-first** para pantalla vertical Android, con calendario fácil de consultar, botones táctiles grandes, búsquedas rápidas por alumno, indicadores claros de plazas disponibles y flujos cortos para registrar ausencias y recuperaciones. Toda la interfaz está orientada a una única administradora; no existe modo alumno.

## Affected users and systems

- **Propietaria / administradora:** única usuaria de la aplicación, desde su teléfono Android; registra las solicitudes recibidas y gestiona clases, alumnos y plazas.
- **Alumnos:** personas cuyos datos y reservas administra el centro; **no acceden a la aplicación**.
- **Dispositivo:** un único smartphone Android con datos locales; no se contempla sincronización multidispositivo.
- **Sistemas externos:** ninguno para la operación diaria. Las copias JSON pueden guardarse o compartirse manualmente mediante las opciones del teléfono, sin integración automática con Gmail o Drive.

## Constraints

- PWA instalable en Android y operativa offline tras la instalación inicial, sin ordenador ni servidor externo en el uso habitual.
- Un único usuario operativo: la propietaria. **Sin autenticación de aplicación**, sin panel separado ni funciones de autoservicio para alumnos. Se asume que el dispositivo está bajo su control; el riesgo de acceso a datos si se pierde o desbloquea el móvil queda pendiente de mitigación.
- Persistencia local tras cerrar y reabrir la PWA o reiniciar el teléfono. Borrar datos de la aplicación puede eliminar la información.
- Exportación, importación y restauración manual de JSON estructurado, con recordatorio semanal y pruebas de recuperación completas. GitHub no es una copia de los datos operativos.
- Datos personales del alumno limitados a **nombre y número de teléfono**. Nombre obligatorio y único tras normalización; no se usa el teléfono como identificador ni se exige unicidad del teléfono. La obligatoriedad del teléfono queda pendiente de confirmar.
- Identificador interno estable por alumno para no romper referencias si cambia su nombre. No se permiten nombres duplicados en el MVP; los homónimos son un riesgo funcional a revisar.
- Ausencias: mínimo **24 horas de antelación** respecto al inicio de la clase habitual.
- Recuperaciones: grupo del **mismo nivel y modalidad**, con plaza libre, dentro de los **siete días naturales posteriores** a la fecha de la clase habitual ausente; el séptimo día está incluido.
- Se permite reservar la recuperación antes de la ausencia efectiva, pero cada ausencia genera como máximo una recuperación. Una recuperación confirmada no puede cancelarse ni cambiarse; si no se utiliza, se pierde.
- La administradora puede configurar festivos y habilitar sesiones en esos días.
- La PWA debe poder instalarse y restaurarse en otro teléfono Android compatible mediante un proceso documentado; no se garantiza compatibilidad con todas las versiones y navegadores.
- **Fuera del MVP:** acceso de alumnos, autenticación de usuarios, recuperación de códigos, acceso remoto, sincronización multidispositivo, Google Play, pagos, notificaciones push, integración automática con correo o Drive, analítica avanzada, IA y múltiples centros.

## Success criteria

1. La propietaria instala y utiliza la PWA en un teléfono Android compatible, **sin conexión a Internet** durante la operativa normal, sin ordenador ni servidor.
2. Al abrir la aplicación accede directamente a la gestión, sin registro, PIN, contraseña ni selección de perfiles; no existe interfaz para alumnos.
3. Puede crear, buscar, editar y dar de baja alumnos con nombre y teléfono; se impiden nombres duplicados tras normalización y se mantienen las referencias al editar el nombre.
4. Puede gestionar grupos, niveles, modalidades, horarios, aforos y asignaciones, y consultar en el calendario las sesiones y sus plazas disponibles.
5. Una ausencia registrada con al menos 24 horas de antelación libera la plaza; si se intenta registrar fuera de plazo, la aplicación la rechaza con un mensaje claro.
6. La aplicación muestra únicamente recuperaciones compatibles por nivel **y** modalidad, dentro de los siete días naturales posteriores a la clase ausente y con plazas libres; la reserva no supera el aforo.
7. Puede registrar una ausencia sin reservar recuperación y reservarla antes de que ocurra la clase ausente; no se duplican derechos ni reservas y una recuperación confirmada no se cancela ni se cambia.
8. Puede configurar días no lectivos o festivos y habilitar clases en ellos, con ocupación correcta.
9. Los datos persisten tras cerrar y reabrir la aplicación y reiniciar el dispositivo. La exportación JSON, la restauración y el recordatorio semanal funcionan y se prueban de extremo a extremo.
10. Se prueban en un teléfono Android real los flujos completos de calendario, alta de alumnos, ausencia, búsqueda de huecos, recuperación y copia de seguridad.
11. Antes de incorporar datos reales se revisan los riesgos de privacidad, acceso al móvil, pérdida de datos y homónimos.

## Open questions

### Decisiones confirmadas

1. Solo la propietaria utiliza la aplicación desde su teléfono; no hay modo alumno ni autenticación en el MVP.
2. El alumno se identifica visualmente por **nombre único** y se conserva su **número de teléfono** como dato; no se almacena correo electrónico.
3. Las ausencias requieren 24 horas de preaviso; las recuperaciones deben coincidir en nivel y modalidad y realizarse dentro de los siete días naturales posteriores a la clase ausente.
4. Una recuperación confirmada no puede cancelarse ni cambiarse; si no se utiliza, se pierde.
5. La administradora gestiona festivos y puede habilitar sesiones.
6. Copias JSON exportadas manualmente con recordatorio semanal; funcionamiento local offline.
7. Protección de datos pendiente de revisión antes de operar con información real.

### Cuestiones pendientes

1. **Teléfono:** confirmar si es obligatorio para todos los alumnos o puede quedar vacío.
2. **Festivos:** confirmar si las sesiones recurrentes se suspenden por defecto en un día marcado no lectivo y se reactivan individualmente.
3. **Correcciones:** definir si la administradora puede revertir errores de registro incluso cuando una recuperación ya está confirmada, y bajo qué condiciones, sin convertirlo en una cancelación ordinaria.
4. **Privacidad y seguridad del dispositivo:** definir medidas mínimas antes de introducir datos reales (bloqueo del teléfono, copias y protección de los archivos exportados).
5. **Homónimos:** aceptar expresamente el rechazo de alumnos con el mismo nombre o definir más adelante un identificador visible alternativo.

---

**Decisión de alcance:** este documento define el resultado esperado y sus criterios de aceptación. La elección de librerías, almacenamiento y tareas de implementación se abordará en la especificación y el plan técnico.
