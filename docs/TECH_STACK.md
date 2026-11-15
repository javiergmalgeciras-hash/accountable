# Stack técnico y secuencia del curso

Este proyecto conserva la arquitectura y las herramientas del curso AI SDLC de Ed Donner. La adaptación cambia el dominio funcional a la gestión de pilates, no el stack. La aplicación sigue las fases del curso y usa la tecnología que corresponde a cada una.

## Tecnologías

1. **Frontend:** Node.js 26 (Node 24 o posterior es compatible), TypeScript, React y Vite en frontend/.
2. **Backend:** Python 3.12 con uv y FastAPI en backend/. pyproject.toml y uv.lock permanecen en la raíz.
3. **API:** el frontend obtiene y modifica datos mediante la API JSON del backend.
4. **Persistencia local de desarrollo:** SQLite con SQLAlchemy Core; no se usa SQL directo en la aplicación. La base local se inicializa con datos de ejemplo.
5. **Migraciones:** Alembic actualiza el esquema al evolucionar la aplicación y ejecuta las migraciones al iniciar el backend.
6. **Persistencia compartida, en la fase correspondiente:** Supabase proporciona PostgreSQL y Supabase Auth. Las migraciones específicas de Postgres habilitan Row Level Security (RLS).
7. **Despliegue, en la fase correspondiente:** Render ejecuta un servicio web definido en render.yaml. FastAPI sirve la API y el frontend compilado.

No se añade un stack paralelo de PWA, persistencia exclusiva en el dispositivo, servicio de correo o integración de copias con Drive. El diseño mobile-first es una pauta de interfaz recogida en .agents/skills/brand/SKILL.md, no un requisito de arquitectura.

## Desarrollo local y aplicación compartida

El curso conserva dos modos con propósitos diferentes:

- **Desarrollo local:** npm run dev ejecuta frontend y backend juntos, con SQLite y datos de ejemplo. Las pruebas usan sus propias bases SQLite. Este modo no representa el almacenamiento final de la aplicación desplegada.
- **Aplicación compartida:** después de configurar Supabase, npm start compila el frontend y ejecuta la aplicación como en Render, conectada a PostgreSQL y Supabase Auth. La configuración se guarda en .env local y en las variables de entorno de Render; nunca se escribe en render.yaml ni se comparte en el repositorio.

La integración real de autenticación se introduce en Semana 1, día 5. Se usa Supabase Auth con correo y contraseña, sin registro público; se provisiona la cuenta de la única administradora. Los alumnos no son usuarios ni tienen acceso a la aplicación. La fase local anterior sigue el flujo simulado que especifican las instrucciones del curso, adaptado a una sola administradora.

La aplicación compartida usa DATABASE_URL, SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY, almacenadas en .env local y en las variables de entorno de Render. La cuenta del capstone usa OPENROUTER_API_KEY en .env y en Render. No guardes valores secretos en Git ni en render.yaml.

## Fases técnicas y metodológicas

| Fase del curso | Herramientas y resultado técnico |
|---|---|
| Semana 1, día 3 — MVP | Plan, Design, Build, Test, Deploy y Maintain para el dominio de pilates. Aplicación local con React/Vite, FastAPI, SQLite, datos de ejemplo y pruebas. |
| Semana 1, día 4 — Harness | Estándares, npm run check, npm run check:quick, npm run format, hooks de Git y del agente, gitleaks y CI en GitHub. El ejercicio de modo oscuro se desarrolla como un cambio separado a través del AI SDLC. |
| Semana 1, día 5 — Agentes y aplicación compartida | Subagentes reviewer y ui-check; autenticación, búsqueda y menú; Supabase Auth/Postgres, RLS, revisión de base de datos y despliegue en Render después de CI. |
| Semana 2, día 1 — Worktrees | Se conserva el ejercicio de Git worktrees y el trabajo aislado en paralelo. |
| Semana 2, días 2 y 3 — Trabajo en equipo | Se conservan la preparación de main, trabajo paralelo, integración, revisiones, pruebas y refactorización. Los ejemplos de productos, ventas y contabilidad se traducen a tareas del dominio de pilates. |
| Semana 2, día 4 — Fábrica de software | Se conservan los agentes en GitHub, Actions, issues, ramas, pull requests, revisión y gates de CI. Las tareas automatizadas corresponden al dominio de pilates, no a contabilidad. |
| Semana 2, día 5 — Capstone | Se conserva la integración de OpenRouter. El asistente adaptado a pilates es una extensión del curso, separada del MVP inicial; las pruebas no llaman a un modelo real. |

Las fases iniciales no deben adelantarse: el MVP local precede al harness; Supabase Auth y Render se incorporan en Semana 1, día 5; OpenRouter se incorpora en el capstone.

## Comandos y pruebas del curso

Los scripts se definen en el package.json de la raíz, con frontend/ como npm workspace, para Windows, macOS y Linux.

- npm run dev inicia la copia local de desarrollo.
- npm test ejecuta pruebas unitarias y end-to-end durante la fase inicial.
- npm run seed repone los datos de ejemplo, después de pedir confirmación.
- npm run empty vacía la base local, después de pedir confirmación.
- Desde el harness, npm run check, npm run check:quick y npm run format aplican las comprobaciones del curso.
- npm start compila el frontend y ejecuta localmente el modo compartido conectado a Supabase.

Las pruebas usan:

- **Vitest** para las pruebas unitarias del frontend.
- **pytest** para las pruebas unitarias del backend.
- **Playwright Test** con Google Chrome para las pruebas end-to-end en e2e/.

Las pruebas usan sus propias bases SQLite y no modifican Supabase. Después de la fase de subagentes, CI ejecuta check:quick; los recorridos end-to-end se ejecutan localmente como indican las instrucciones. Los flujos de Supabase se revisan con el servidor MCP de Supabase en modo de solo lectura.

## Herramientas e integraciones que se conservan

- Codex y su configuración de proyecto, junto con las guías para los agentes del curso.
- Playwright MCP para la inspección visual y el agente ui-check.
- Supabase MCP limitado a lectura para revisar el esquema y la seguridad.
- GitHub Actions para CI y para el ejercicio de fábrica de software, configurada según las instrucciones del curso.
- OpenRouter para el capstone.
- Las skills de interfaz y revisión del curso. La skill brand define la identidad Regimental Blue del producto de pilates.

No se introducen dependencias nuevas sin que el plan de la fase correspondiente las justifique. Las instrucciones detalladas de ejecución, configuración y despliegue permanecen en course/ y no se reescriben como parte de esta adaptación.
