import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = new URL('../', import.meta.url);

/*
 * Shadowing guard.
 *
 * Three releases in a row shipped edits to methods that never ran in
 * production, because a subclass or an instance-level replacement shadowed
 * them: `updateEnemies` (movement-hotfix-runtime), `openUpgradeSelection`
 * (event-runtime dropped its arguments), and four DOM controller methods that
 * `dom-performance-bridge` replaces outright rather than wrapping.
 *
 * These tests do not ban overriding. They make the override surface explicit,
 * so adding a new one is a deliberate act that updates this file rather than a
 * silent trap for the next person editing a base method.
 */

async function sourceOf(relativePath) {
  return readFile(new URL(relativePath, repoRoot), 'utf8');
}

async function runtimeFiles() {
  const files = [];
  for (const dir of ['src/', 'src/core/']) {
    const entries = await readdir(new URL(dir, repoRoot), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.js')) files.push(`${dir}${entry.name}`);
    }
  }
  return files;
}

// Methods whose behaviour is combat-critical, and the file that must own the
// most-derived definition. Verified against the live object with a runtime
// probe; see STATUS.md for the ownership dump.
const EXPECTED_OWNER = Object.freeze({
  draw: 'src/core/ui-repair-runtime.js',
  update: 'src/core/ui-repair-runtime.js',
  fireBullet: 'src/core/ui-repair-runtime.js',
  recallBullet: 'src/core/ui-repair-runtime.js',
  catchBullet: 'src/core/ui-repair-runtime.js',
  onRicochet: 'src/core/ui-repair-runtime.js',
  damageEnemy: 'src/core/ui-repair-runtime.js',
  killEnemy: 'src/core/ui-repair-runtime.js',
  drawParticles: 'src/core/ui-repair-runtime.js',
  updateEnemies: 'src/movement-hotfix-runtime.js',
  drawEnemyBody: 'src/core/warden-runtime.js',
  drawEnemyHealth: 'src/core/warden-runtime.js',
});

// Order of the runtime inheritance chain, base first. The most-derived
// definition of a method wins, so ownership is the last file in this list that
// defines it.
const CHAIN = Object.freeze([
  'src/game.js',
  'src/game-runtime.js',
  'src/polish-runtime.js',
  'src/movement-hotfix-runtime.js',
  'src/visual-design-runtime.js',
  'src/combat-feedback-runtime.js',
  'src/ui-layout-runtime.js',
  'src/core/event-runtime.js',
  'src/core/combat-depth-runtime.js',
  'src/core/checkpoint-runtime.js',
  'src/core/warden-runtime.js',
  'src/core/world-2d-runtime.js',
  'src/core/visual-overhaul-runtime.js',
  'src/core/dashboard-polish-runtime.js',
  'src/core/world-expansion-runtime.js',
  'src/core/unified-ui-runtime.js',
  'src/core/production-art-runtime.js',
  'src/core/ui-repair-runtime.js',
]);

function definesMethod(source, method) {
  return new RegExp(`^\\s{2}${method}\\s*\\(`, 'm').test(source);
}

test('combat-critical methods are owned by the file that actually runs them', async () => {
  const sources = new Map();
  for (const file of CHAIN) sources.set(file, await sourceOf(file));

  for (const [method, expected] of Object.entries(EXPECTED_OWNER)) {
    const definers = CHAIN.filter((file) => definesMethod(sources.get(file), method));
    assert.ok(definers.length > 0, `${method} is not defined anywhere in the runtime chain`);
    const owner = definers[definers.length - 1];
    assert.equal(
      owner,
      expected,
      `${method} is now owned by ${owner}, not ${expected}. `
      + `Editing ${expected} would be dead code. Update EXPECTED_OWNER if this move is intentional.`,
    );
  }
});

test('the chain order used by this guard matches the real extends graph', async () => {
  // If someone reorders the inheritance chain, ownership above silently shifts.
  for (let index = 1; index < CHAIN.length; index += 1) {
    const source = await sourceOf(CHAIN[index]);
    const parentFile = CHAIN[index - 1];
    const parentModule = parentFile.split('/').pop();
    assert.ok(
      source.includes(parentModule),
      `${CHAIN[index]} should import its parent ${parentModule}`,
    );
  }
});

test('every instance-level method replacement is declared', async () => {
  // dom-performance-bridge replaces these on the controller instance, which
  // shadows the entire prototype chain. Anything added to these methods in
  // dom-ui.js is dead code unless it is also added here.
  const bridge = await sourceOf('src/ui/dom-performance-bridge.js');
  // Only function assignments shadow behaviour; plain state assignments such as
  // controller.lastState do not.
  const replaced = [...bridge.matchAll(/^\s*controller\.([A-Za-z]+)\s*=\s*(?:\(|function|async)/gm)]
    .map((m) => m[1])
    .sort();
  assert.deepEqual(
    replaced,
    ['setGauge', 'sync', 'syncHud', 'syncMinimap', 'syncSettings'],
    'dom-performance-bridge replaced a different set of controller methods than expected. '
    + 'Any newly replaced method now shadows dom-ui.js entirely.',
  );
});

test('the guardian HUD is driven from the bridge, not from the shadowed controller', async () => {
  // Regression for v3.12.1: syncGuardian was called from dom-ui.js's sync(),
  // which the bridge replaces, so it never ran in production.
  const bridge = await sourceOf('src/ui/dom-performance-bridge.js');
  assert.match(bridge, /syncGuardian/, 'the bridge must drive syncGuardian');
});

test('combat VFX is owned by the terminal runtime', async () => {
  // Every method the VFX system hooks is overridden somewhere in the chain, so
  // it has to live at the end of it.
  const terminal = await sourceOf('src/core/ui-repair-runtime.js');
  assert.match(terminal, /new CombatVfx\(\)/);
  assert.match(terminal, /combatVfx\?\.update\(/);
  assert.match(terminal, /combatVfx\?\.draw\(/);
});

test('no runtime file outside the chain defines a combat-critical method', async () => {
  // Catches a stray definition in a file that is not part of the chain at all,
  // which would look active in a grep but never run.
  const chain = new Set(CHAIN);
  const strays = [];
  for (const file of await runtimeFiles()) {
    if (chain.has(file)) continue;
    const source = await sourceOf(file);
    for (const method of Object.keys(EXPECTED_OWNER)) {
      if (definesMethod(source, method)) strays.push(`${file}:${method}`);
    }
  }
  assert.deepEqual(strays, [], `methods defined outside the runtime chain: ${strays.join(', ')}`);
});
