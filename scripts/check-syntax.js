// Lint gate with zero dependencies: every JS file must parse (`node --check`).
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src', 'tests', 'scripts', 'sw.js', 'tailwind.config.js'];

const walk = (path) =>
  statSync(path).isDirectory() ? readdirSync(path).flatMap((name) => walk(join(path, name))) : [path];

const files = ROOTS.flatMap(walk).filter((f) => f.endsWith('.js'));
let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    failed += 1;
    console.error(`✗ ${file}\n${err.stderr}`);
  }
}
console.log(`${files.length - failed}/${files.length} files parse`);
process.exit(failed ? 1 : 0);
