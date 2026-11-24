import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeList, normalizeSettings } from '../src/lib/settings.js';
import { analyzeText } from '../src/engine/checker.js';

test('normalizeList trims, removes empty lines and duplicates', () => {
  assert.deepEqual(normalizeList('  superfood \n\nSUPERFOOD\nmiracle cure,detox plus'), ['superfood', 'miracle cure', 'detox plus']);
});

test('normalizeList limits item count and length', () => {
  const many = Array.from({ length: 500 }, (_, i) => `w${i}`);
  assert.equal(normalizeList(many).length, 200);
  assert.equal(normalizeList(['x'.repeat(500)])[0].length, 80);
});

test('normalizeSettings falls back to safe defaults', () => {
  const s = normalizeSettings({ language: 'fr', customForbidden: null });
  assert.equal(s.language, 'auto');
  assert.deepEqual(s.customForbidden, []);
});

test('settings drive the checker: language RO forces diacritics check, custom words are reported', () => {
  const s = normalizeSettings({ language: 'ro', customForbidden: 'superfood', brands: 'RivalCo' });
  const r = analyzeText('Acest superfood este mai bun decat RivalCo. Pentru sanatate.', s);
  assert.equal(r.language, 'ro');
  assert.ok(r.issues.some((i) => i.ruleId === 'CUSTOM-FORBIDDEN'));
  assert.ok(r.issues.some((i) => i.ruleId === 'CUSTOM-BRAND'));
  assert.ok(r.issues.some((i) => i.ruleId === 'RO-DIAC-MISSING'));
});
