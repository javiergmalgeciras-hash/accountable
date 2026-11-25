import { spawnSync } from 'node:child_process';
import process from 'node:process';

const suites = [
  ['Pruebas unitarias frontend (Vitest)', 'test:frontend'],
  ['Pruebas unitarias backend (pytest)', 'test:backend'],
  ['Pruebas end-to-end (Playwright)', 'test:e2e'],
];

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('No se encontró npm_execpath. Ejecuta este script mediante `npm test`.');
  process.exit(1);
}

let failures = 0;

for (const [label, script] of suites) {
  console.log(`\n=== ${label} ===`);

  const result = spawnSync(process.execPath, [npmCli, 'run', script], {
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`${label}: no se pudo iniciar: ${result.error.message}`);
    failures += 1;
  } else if (result.status !== 0) {
    const reason = result.signal ? `señal ${result.signal}` : `código ${result.status}`;
    console.error(`${label}: falló (${reason}).`);
    failures += 1;
  } else {
    console.log(`${label}: correcto.`);
  }
}

if (failures > 0) {
  console.error(`\nResultado: ${failures} de ${suites.length} suites fallaron.`);
  process.exitCode = 1;
} else {
  console.log(`\nResultado: las ${suites.length} suites pasaron.`);
}
