import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeViewportFit,
  detectMobileQuality,
  isMobileLandscape,
  normalizeMobileSettings,
} from '../src/mobile-browser.js';

test('mobile settings normalize unsafe values to stable defaults', () => {
  assert.deepEqual(normalizeMobileSettings({
    controlScale: 99,
    opacity: -1,
    quality: 'unknown',
    leftHanded: 1,
    aimRelease: false,
    aimGuide: false,
    haptics: false,
  }), {
    controlScale: 1,
    opacity: 0.64,
    leftHanded: true,
    aimRelease: false,
    aimGuide: false,
    haptics: false,
    quality: 'auto',
  });
});

test('mobile quality selects performance tiers from device capability', () => {
  assert.equal(detectMobileQuality({ deviceMemory: 2, hardwareConcurrency: 8, devicePixelRatio: 2 }), 'performance');
  assert.equal(detectMobileQuality({ deviceMemory: 4, hardwareConcurrency: 6, devicePixelRatio: 2 }), 'balanced');
  assert.equal(detectMobileQuality({ deviceMemory: 8, hardwareConcurrency: 8, devicePixelRatio: 2 }), 'high');
});

test('viewport fitting keeps a 16:9 canvas inside short phone landscapes', () => {
  const fit = computeViewportFit({ viewportWidth: 844, viewportHeight: 390 });
  assert.ok(fit.width <= 844);
  assert.ok(fit.height <= 390);
  assert.equal(Math.round((fit.width / fit.height) * 100), Math.round((16 / 9) * 100));
});

test('viewport fitting reserves toolbar and safe-area space', () => {
  const fit = computeViewportFit({
    viewportWidth: 932,
    viewportHeight: 430,
    toolbarHeight: 42,
    safeTop: 4,
    safeRight: 36,
    safeBottom: 8,
    safeLeft: 36,
  });
  assert.ok(fit.width <= 860);
  assert.ok(fit.height <= 376);
});

test('mobile landscape requires both coarse input and horizontal orientation', () => {
  assert.equal(isMobileLandscape({ width: 844, height: 390, coarse: true }), true);
  assert.equal(isMobileLandscape({ width: 390, height: 844, coarse: true }), false);
  assert.equal(isMobileLandscape({ width: 844, height: 390, coarse: false }), false);
});
