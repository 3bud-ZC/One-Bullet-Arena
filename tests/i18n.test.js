import test from 'node:test';
import assert from 'node:assert/strict';
import { I18nController, LANGUAGE_STORAGE_KEY, LOCALES } from '../src/i18n.js';

test('localization exposes complete English and Arabic locale metadata', () => {
  assert.equal(LANGUAGE_STORAGE_KEY, 'one-bullet-language');
  assert.equal(LOCALES.en.dir, 'ltr');
  assert.equal(LOCALES.ar.dir, 'rtl');
  assert.equal(LOCALES.en.nativeLabel, 'English');
  assert.equal(LOCALES.ar.nativeLabel, 'العربية');
});

test('English and Arabic functional UI copy are isolated by selected locale', () => {
  const english = new I18nController('en');
  const arabic = new I18nController('ar');
  assert.equal(english.t('menu.continue'), 'Continue Run');
  assert.equal(arabic.t('menu.continue'), 'استكمال الجولة');
  assert.equal(english.t('pause.title'), 'Run Paused');
  assert.equal(arabic.t('pause.title'), 'الجولة متوقفة');
  assert.equal(english.t('upgrade.heavy-shot.name'), 'Heavy Shot');
  assert.equal(arabic.t('upgrade.heavy-shot.name'), 'طلقة ثقيلة');
  assert.equal(english.t('stage.7'), 'Final Belt');
  assert.equal(arabic.t('stage.7'), 'الحزام الأخير');
});

test('translation interpolation keeps control values and wave numbers deterministic', () => {
  const english = new I18nController('en');
  const arabic = new I18nController('ar');
  assert.equal(english.t('wave.incoming', { wave: 35 }), 'WAVE 35');
  assert.equal(arabic.t('wave.incoming', { wave: 35 }), 'الموجة 35');
  assert.equal(english.t('hud.enemiesLeft', { count: 8 }), '8 enemies');
  assert.equal(arabic.t('hud.enemiesLeft', { count: 8 }), '8 أعداء');
});
