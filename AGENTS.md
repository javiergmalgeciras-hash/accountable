# Instrucciones del proyecto — adaptación Pilates del curso AI SDLC

Este repositorio sigue el curso AI SDLC de Ed Donner. Se conserva íntegramente su arquitectura tecnológica, herramientas, integraciones, fases y metodología. El producto funcional de esta rama es la aplicación de gestión para una escuela de pilates.

## Fuentes de verdad

- docs/intent.md define el dominio, las reglas funcionales y los criterios de éxito de pilates.
- docs/TECH_STACK.md define la arquitectura, las herramientas y la fase del curso en que se incorpora cada tecnología.
- docs/STATUS.md registra el estado del trabajo y cómo ejecutar la aplicación cuando exista.
- .agents/skills/brand/SKILL.md define la identidad visual Regimental Blue y las pautas mobile-first.

Si los ejemplos de CRM, ERP o contabilidad de las guías del curso contradicen docs/intent.md, conserva el procedimiento y adapta el ejemplo al dominio de pilates. No reincorpores organizaciones, contactos, oportunidades, facturas ni libros contables como alcance del producto.

## Reglas de adaptación

- La administradora es la única usuaria funcional de la escuela. Los alumnos no acceden a la aplicación.
- Conserva el mecanismo técnico de autenticación del curso en la fase indicada en docs/TECH_STACK.md; habrá una cuenta de administradora y no habrá registro público ni cuentas de alumnos.
- Mantén el orden original de incorporación de SQLite local, harness y CI, Supabase Auth/Postgres, Render y OpenRouter. No adelantes una integración a una fase anterior.
- Usa las reglas funcionales confirmadas de docs/intent.md. Deja abiertas las decisiones que ese documento marca como pendientes; no inventes políticas para resolverlas.
- Aplica la identidad visual de pilates sin convertir el diseño mobile-first en un requisito de PWA, instalación u operación offline.

## Pruebas automatizadas

- `npm test` ejecuta las suites unitarias de Vitest y pytest, y las pruebas end-to-end de Playwright. Las ejecuta en serie y continúa con las siguientes aunque una falle.
- El comando debe terminar con código distinto de cero si falla cualquier suite. Corrige los fallos antes de dar el trabajo por validado; no omitas una suite para obtener un resultado correcto.
- En Windows PowerShell, verifica los cambios con `npm.cmd test` desde la raíz del repositorio.
- pytest fija `PILATES_TEST_NOW` para que los casos de fecha y hora usen datos repetibles; Playwright fija el mismo instante en el backend, el seed y el reloj del navegador.

## Método y material del curso

Cuando el trabajo corresponda a una fase del curso, consulta course/for_agents/ y las instrucciones pertinentes. Conserva sus etapas de Plan, Design, Build, Test, Deploy y Maintain, sus prácticas de revisión, skills, agentes, ramas y herramientas. Las instrucciones de course/ son material del curso y no se modifican en esta adaptación.

Actualiza docs/STATUS.md al completar una pieza de trabajo. Antes de implementar, lee la intención y el stack de la fase. Sigue las instrucciones del curso sobre pruebas, seguridad y gestión de secretos.
