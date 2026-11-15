# Intent: MVP de gestión de ausencias y recuperaciones — Escuela de Pilates

**Estado:** Borrador para validación con la responsable del centro  
**Producto:** Aplicación local para un único teléfono Android  
**Referencia de estructura:** `intent.md` del proyecto Accountable (curso AI SDLC)

## Problem

La escuela de pilates, con aproximadamente 50–150 alumnos, gestiona actualmente las ausencias y las recuperaciones de clases por teléfono o presencialmente. Esto exige intervención manual, dificulta conocer las plazas libres y puede provocar errores de asignación, duplicidades o sobreocupación.

Se quiere permitir que los alumnos gestionen presencialmente sus cambios desde un dispositivo del centro, sin depender de que la responsable tramite cada solicitud. No se pretende crear todavía un portal remoto ni una aplicación con cuentas individuales.

## Proposed outcome

El MVP es una aplicación de autoservicio presencial para **un único teléfono Android del centro**, instalable como PWA y utilizable sin conexión a Internet durante su uso habitual. Se desarrolla en un ordenador con VS Code y Codex, pero el dispositivo de uso final no depende de un ordenador encendido ni de un servidor.

La aplicación tiene dos modos claramente diferenciados:

### Modo alumno

1. El alumno introduce su **número de teléfono** para localizar su ficha. No hay contraseña individual ni cuentas de usuario.
2. Si el teléfono está registrado, puede consultar sus próximas clases habituales y las ausencias y recuperaciones que tenga registradas. Si no está registrado, se le indica que contacte con la administración; no puede darse de alta por sí mismo.
3. Puede comunicar una ausencia de una clase futura, siempre que falten **al menos 24 horas** para su comienzo.
4. Al registrar una ausencia válida, se libera una plaza de esa sesión para que pueda ofrecerse como recuperación a otro alumno.
5. Puede reservar una recuperación en una sesión futura **con plaza disponible** y del **mismo nivel y de la misma modalidad**, respetando las reglas que estén configuradas. La recuperación puede reservarse antes de que llegue la fecha de la clase habitual a la que faltará.
6. Puede registrar una ausencia sin elegir todavía una recuperación y volver posteriormente para reservarla, si mantiene el derecho a recuperarla, que caduca siete días naturales después de la fecha de la clase habitual ausente.
7. La aplicación confirma claramente cada operación y evita que una misma ausencia genere recuperaciones duplicadas o que una sesión supere su aforo.
8. La interfaz es sencilla, táctil y legible en una pantalla de smartphone Android, con un camino corto para completar la operación y una forma evidente de volver a la pantalla inicial.

**Importante:** el teléfono es el identificador único del alumno, pero conocerlo no acredita su identidad. Esta simplificación se acepta provisionalmente para el prototipo y deberá validarse antes de operar con datos reales.

### Modo administración

1. La responsable accede a un área protegida mediante un **código privado de administración**.
2. Puede crear, consultar, editar y dar de baja alumnos, registrando únicamente **nombre y número de teléfono** como datos personales; el teléfono debe ser único.
3. Puede crear y modificar grupos, sus niveles o modalidades, horarios, aforos y asignaciones de alumnos a grupos.
4. Puede consultar por fecha o grupo las sesiones, sus plazas ocupadas y disponibles, las ausencias y las recuperaciones.
5. Puede registrar o corregir ausencias y recuperaciones cuando sea necesario, sin romper las reglas de capacidad y consistencia de datos.
6. Puede cambiar su código alfanumérico de 10 caracteres y podrá solicitar su restablecimiento: se generará un código nuevo y se enviará por correo electrónico a la dirección previamente configurada de la responsable. El código nunca se mostrará en pantalla ni se almacenará en texto plano. El envío requiere conexión a Internet y un mecanismo seguro de autorización, pendiente de diseño técnico.
7. La sesión administrativa se puede cerrar explícitamente y se bloquea tras un periodo de inactividad configurable o definido durante la especificación.
8. Puede exportar una copia de seguridad estructurada de los datos y restaurarla, con confirmación previa antes de sustituir la información existente. La responsable podrá exportar y restaurar archivos JSON, con un recordatorio semanal de copia. La exportación será manual y funcionará sin conexión; podrá guardar el archivo donde prefiera.

### Secciones principales

- **Inicio / Identificación:** entrada de teléfono para alumnos y acceso separado a administración.
- **Mis clases:** próximas sesiones habituales, ausencias registradas y recuperaciones disponibles o reservadas.
- **Comunicar ausencia:** selección de sesión, validación de las 24 horas y confirmación.
- **Reservar recuperación:** selección de una ausencia con derecho a recuperación, consulta de sesiones compatibles con plazas y reserva.
- **Administración:** alumnos, grupos y horarios, asignaciones, calendario de sesiones, ausencias, recuperaciones, aforos y copias de seguridad.

### Registros del sistema

- **Alumno:** nombre y teléfono único; asignación a uno o varios grupos si las reglas del centro lo requieren.
- **Grupo:** nombre, nivel o modalidad, horario habitual y aforo.
- **Sesión:** fecha y hora concretas, grupo, capacidad y ocupación calculada a partir de asignaciones, ausencias y recuperaciones.
- **Ausencia:** alumno, sesión habitual afectada, fecha de registro y estado.
- **Recuperación:** alumno, ausencia que origina el derecho, sesión alternativa reservada y estado.
- **Día de calendario:** fecha marcada como lectiva o no lectiva; administración puede habilitar clases en festivos.
- **Configuración de administración:** credencial protegida y parámetros locales necesarios para operar.

Los registros operativos contienen relaciones con alumnos y clases, pero **no se recopilarán otros datos personales** como correo electrónico, domicilio, fecha de nacimiento o información médica.

### Datos de ejemplo

La aplicación incluirá datos ficticios y realistas para probar todas las pantallas: alumnos, grupos con distintos niveles o modalidades, sesiones futuras, clases completas y con plazas libres, ausencias válidas y fuera de plazo, recuperaciones pendientes y confirmadas. Debe existir una manera documentada de reiniciar el entorno de demostración sin confundirlo con los datos reales.

### Look and feel

Diseño **mobile-first**, para pantalla vertical de teléfono Android, con botones táctiles grandes, tipografía legible, mensajes claros y pasos mínimos. El modo alumno debe ser especialmente sencillo y no exponer herramientas administrativas.

## Affected users and systems

- **Alumnos:** utilizan presencialmente el mismo teléfono Android del centro, introduciendo su teléfono como identificador.
- **Responsable del centro:** configura y supervisa alumnos, grupos, horarios y recuperaciones desde el modo administrador.
- **Dispositivo:** un único smartphone Android dedicado a la escuela; no se contempla sincronización entre dispositivos.
- **Sistemas externos:** la operación diaria no depende de servicios externos. El restablecimiento del código de administración requiere correo electrónico y conectividad. Las copias JSON se exportan y restauran localmente, sin integración automática con Google Drive o Gmail. No hay otras integraciones previstas.

## Constraints

- El MVP se desarrollará como **PWA instalable en Android**, con funcionamiento offline una vez instalada y con los recursos necesarios almacenados localmente.
- La aplicación y los datos deben funcionar en el propio teléfono, **sin ordenador, servidor externo ni conexión a Internet durante el uso habitual**. La instalación inicial puede requerir conexión.
- La persistencia local debe conservar los cambios tras cerrar y reabrir la aplicación o reiniciar el teléfono. Se debe advertir de que borrar los datos de la aplicación puede eliminar la información.
- Deben existir **exportación, importación y restauración de copias de seguridad**, probadas de extremo a extremo. El formato será JSON estructurado y restaurable, no Google Docs. Se mostrará un recordatorio semanal y la responsable realizará la exportación manual; no se requiere automatización hacia Drive o Gmail. No se asumirá que GitHub guarda los datos del negocio.
- Solo se guardarán **nombre y teléfono** como datos personales del alumno; los demás registros serán datos operativos necesarios para organizar clases y recuperaciones.
- El teléfono del alumno es obligatorio y único. Los números deben normalizarse de forma coherente para evitar duplicados por espacios o formatos distintos. No se permiten teléfonos compartidos entre alumnos.
- Para comunicar una ausencia deben faltar al menos **24 horas** para el inicio de la sesión afectada.
- Una recuperación solo puede reservarse en un grupo del **mismo nivel y modalidad** y si existe una plaza disponible.
- Se permite reservar la recuperación **antes de que ocurra la ausencia**, pero no generar más de una recuperación activa por la misma ausencia.
- La recuperación debe disfrutarse **dentro de los siete días naturales posteriores a la fecha de la sesión habitual ausente**; contando desde la fecha de la clase ausente; una sesión del séptimo día natural estará dentro del plazo.
- Una recuperación confirmada **no puede cancelarse ni cambiarse por el alumno**. Si no asiste, pierde ese derecho y no se genera otro.
- Administración puede configurar días no lectivos o festivos y habilitarlos para clases cuando corresponda.
- El acceso administrativo exige un código **alfanumérico de 10 caracteres**, no almacenado en texto plano; el restablecimiento generará un nuevo código de 10 caracteres y lo enviará al correo previamente configurado de la responsable. No se mostrará en pantalla. El método seguro de autorización del restablecimiento queda pendiente de diseño.
- La aplicación debe poder trasladarse a otro teléfono Android mediante un proceso documentado de instalación y restauración de datos, con la mayor compatibilidad razonable, sin prometer funcionamiento universal en todas las versiones de Android o navegadores.
- **Fuera del MVP:** acceso remoto de alumnos, cuentas y contraseñas individuales, sincronización multidispositivo, publicación en Google Play, pagos, notificaciones push, integraciones distintas de las copias de seguridad previstas, analítica avanzada, inteligencia artificial y gestión de múltiples centros.

## Success criteria

1. Se puede instalar la PWA en un teléfono Android compatible, abrirla desde su icono y usar las funciones principales **sin Internet**, sin ordenador ni servidor externo.
2. Un alumno registrado introduce su teléfono y ve únicamente la información operativa necesaria para gestionar sus clases. Un teléfono no registrado no permite operar.
3. Administración puede crear y modificar alumnos, grupos, horarios, aforos y asignaciones; no se pueden registrar dos alumnos con el mismo teléfono normalizado.
4. Una ausencia comunicada con al menos 24 horas de antelación se registra y libera la plaza; una ausencia fuera de plazo se rechaza con un mensaje comprensible.
5. Una recuperación solo se ofrece en sesiones del mismo nivel y modalidad, dentro del plazo de siete días naturales posterior a la ausencia y con plazas disponibles; al confirmarla se actualiza la ocupación y no se excede el aforo.
6. Se puede reservar una recuperación antes de la fecha de la ausencia, y también comunicar una ausencia sin reservar inmediatamente una recuperación. La reserva no puede cancelarse por el alumno y la inasistencia consume el derecho.
7. El sistema impide reservas duplicadas para el mismo derecho de recuperación y mantiene coherencia entre ausencias, recuperaciones y plazas tras cada operación.
8. El panel de administración no es accesible sin el código correcto; el código puede cambiarse, la sesión puede cerrarse y el restablecimiento por correo electrónico está protegido contra solicitudes no autorizadas y probado con conexión; se valida la longitud alfanumérica de 10 caracteres.
9. Todos los cambios persisten tras cerrar y reabrir la aplicación y tras reiniciar el dispositivo. Se puede exportar una copia estructurada, restaurarla y comprobar que los datos recuperados son correctos. Se verifica el recordatorio semanal y la exportación y restauración manual de JSON.
10. La interfaz se prueba manualmente en un **smartphone Android real**, incluyendo navegación táctil, teclado numérico, legibilidad y los flujos completos de alumno y administración. No basta con que pasen pruebas automatizadas.
11. Administración puede configurar festivos, días no lectivos y habilitar clases excepcionalmente; la ocupación y las reservas respetan ese calendario.
12. Antes de usar datos reales, la responsable valida expresamente los riesgos de identificación por teléfono, el tratamiento de datos personales y el procedimiento de copias de seguridad.

## Open questions

### Decisiones confirmadas

1. Cada alumno dispone de un teléfono único; no se admiten números compartidos.
2. Las recuperaciones requieren coincidencia de **nivel y modalidad**.
3. Una recuperación confirmada no puede cancelarse; si el alumno no asiste, pierde el derecho.
4. El administrador gestiona festivos y puede habilitar sesiones en esos días.
5. El código de administración tendrá **10 caracteres alfanuméricos**.
6. Se requieren copias de seguridad **semanales** mediante exportación manual de archivos JSON, con recordatorio en la aplicación.
7. Se priorizará la compatibilidad con smartphones Android actuales, sin fijar todavía un modelo concreto.
8. La protección de datos queda identificada como riesgo a resolver **antes de utilizar datos personales reales**.

### Nuevas decisiones confirmadas

1. El plazo de recuperación comienza en la fecha de la clase habitual a la que se falta y comprende los **siete días naturales posteriores**; una clase en el séptimo día está incluida.
2. El restablecimiento del código de administrador generará un nuevo código alfanumérico de 10 caracteres y lo enviará por correo electrónico a la responsable del centro. No se mostrará el código en la aplicación.
3. Las copias serán **archivos JSON exportados manualmente**, con recordatorio semanal y posibilidad de restauración; no se requiere envío automático a Gmail ni Drive.

### Cuestiones que aún requieren precisión

1. **Seguridad del restablecimiento:** determinar cómo se autoriza la solicitud y qué servicio enviará el correo, evitando que cualquier alumno pueda invalidar el código de la administradora. Se necesita Internet para el envío.
2. **Calendario:** concretar si un festivo deshabilita por defecto las sesiones recurrentes y si el administrador puede reactivarlas individualmente.
3. **Sesión de administración:** concretar el tiempo de cierre automático por inactividad.
4. **Protección de datos:** resolver las medidas necesarias antes de introducir nombres y teléfonos reales.

---

**Decisión de alcance:** este documento describe el resultado deseado y los criterios de aceptación. La elección de librerías, estructura del código, almacenamiento concreto y tareas de implementación corresponde a la especificación y al plan técnico posteriores.
