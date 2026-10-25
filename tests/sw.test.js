import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const ROOT = new URL('..', import.meta.url).pathname;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const precached = () => {
  const source = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const block = source.match(/const APP_SHELL = \[([\s\S]*?)\];/)[1];
  return new Set([...block.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean));
};

test('every app file is precached so the app boots offline', () => {
  const files = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'assets/icons')).filter((f) => f.endsWith('.png'))]
    .map((f) => relative(ROOT, f));
  const shell = precached();
  const missing = [...files, 'index.html', 'manifest.webmanifest'].filter((f) => !shell.has(f));
  assert.deepEqual(missing, [], `Add these to APP_SHELL in sw.js: ${missing.join(', ')}`);
});

test('every precached file exists', () => {
  const absent = [...precached()].filter((f) => {
    try {
      return !statSync(join(ROOT, f)).isFile();
    } catch {
      return true;
    }
  });
  assert.deepEqual(absent, []);
});

test('manifest is installable: name, start_url, standalone, 192 + 512 icons, maskable', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  assert.ok(manifest.name && manifest.short_name);
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.start_url);
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  manifest.icons.forEach((icon) => assert.ok(statSync(join(ROOT, icon.src)).isFile(), icon.src));
});
