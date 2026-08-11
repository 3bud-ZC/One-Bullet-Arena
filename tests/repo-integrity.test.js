import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = new URL('../', import.meta.url);

// Returns repo-relative, forward-slashed paths (e.g. "src/core/warden-runtime.js")
// so the same list can be matched against package.json, sw.js, and CI config.
async function listFiles(directory, extensions) {
  const base = fileURLToPath(new URL(directory, repoRoot));
  const entries = await readdir(base, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension)))
    .map((entry) => {
      const parent = (entry.parentPath ?? entry.path).replaceAll('\\', '/').replace(/\/+$/, '');
      const suffix = parent.slice(base.replaceAll('\\', '/').replace(/\/+$/, '').length);
      return `${directory}${suffix ? `${suffix.replace(/^\//, '')}/` : ''}${entry.name}`;
    })
    .sort();
}

const listSourceModules = () => listFiles('src/', ['.js']);

test('every src module is syntax-checked by npm run check', async () => {
  const packageJson = JSON.parse(await readFile(new URL('package.json', repoRoot), 'utf8'));
  const checkScript = packageJson.scripts.check;
  const modules = await listSourceModules();

  assert.ok(modules.length > 0, 'expected to discover src modules');

  const unchecked = modules.filter((module) => !checkScript.includes(`node --check ${module}`));
  assert.deepEqual(unchecked, [], `add these modules to the "check" script in package.json: ${unchecked.join(', ')}`);
});

test('every src module is cached in the service worker app shell', async () => {
  const workerSource = await readFile(new URL('sw.js', repoRoot), 'utf8');
  const modules = await listSourceModules();

  // A module missing from APP_SHELL still works online, so no test or deploy
  // gate catches it — it only fails offline, after release. Assert it here.
  const uncached = modules.filter((module) => !workerSource.includes(`'./${module}'`));
  assert.deepEqual(uncached, [], `add these modules to APP_SHELL in sw.js: ${uncached.join(', ')}`);
});

test('the service worker app shell has no entries for deleted modules', async () => {
  const workerSource = await readFile(new URL('sw.js', repoRoot), 'utf8');
  const shellBlock = workerSource.slice(workerSource.indexOf('const APP_SHELL'), workerSource.indexOf('];'));
  const referenced = [...shellBlock.matchAll(/'\.\/(src\/[^']+\.js)'/g)].map((match) => match[1]);
  const modules = new Set(await listSourceModules());

  // cache.addAll() rejects atomically, so one stale path disables offline mode entirely.
  const stale = referenced.filter((module) => !modules.has(module));
  assert.deepEqual(stale, [], `remove these deleted modules from APP_SHELL in sw.js: ${stale.join(', ')}`);
});

test('no tracked source file starts with a UTF-8 BOM', async () => {
  const offenders = [];

  for (const root of ['src/', 'styles/', 'tests/', 'scripts/']) {
    for (const file of await listFiles(root, ['.js', '.css'])) {
      const source = await readFile(new URL(file, repoRoot), 'utf8');
      // A BOM breaks `importScripts` parsing and silently corrupts diffs.
      if (source.charCodeAt(0) === 0xfeff) offenders.push(file);
    }
  }

  assert.deepEqual(offenders, [], `strip the UTF-8 BOM from: ${offenders.join(', ')}`);
});

test('the release version is consistent across package.json, release-config, and the cache name', async () => {
  const packageJson = JSON.parse(await readFile(new URL('package.json', repoRoot), 'utf8'));
  const configSource = await readFile(new URL('src/release-config.js', repoRoot), 'utf8');

  // A stale cacheName leaves returning players on the previous release forever.
  assert.ok(
    configSource.includes(`const version = '${packageJson.version}'`),
    `src/release-config.js must declare version '${packageJson.version}'`,
  );
  assert.ok(configSource.includes('cacheName: `one-bullet-arena-v${version}`'));
});
