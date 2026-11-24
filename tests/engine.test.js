// Run with:  npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText, storageToText } from '../src/engine/checker.js';
import { detectLanguage } from '../src/engine/diacritics.js';
import { DEMO_PAGES } from '../src/demo/pages.js';

const ids = (r) => r.issues.map((i) => i.ruleId);

test('storageToText strips tags and decodes entities', () => {
  const t = storageToText('<p>Zinc &amp; vitamin&nbsp;C</p><p>Second</p>');
  assert.equal(t, 'Zinc & vitamin C\nSecond');
});

test('detects disease treatment claims (EN)', () => {
  const r = analyzeText('This capsule treats diabetes and cures arthritis.');
  assert.ok(ids(r).includes('EN-MED-DISEASE'));
  assert.equal(r.issues.filter((i) => i.ruleId === 'EN-MED-DISEASE').length, 2);
});

test('detects antiparasitic action (EN)', () => {
  assert.ok(ids(analyzeText('Our antiparasitic formula is gentle.')).includes('EN-MED-PREFIX'));
});

test('detects lowers blood sugar (EN)', () => {
  assert.ok(ids(analyzeText('It lowers blood sugar quickly.')).includes('EN-LOWER-VALUES'));
});

test('detects weight-loss amounts, doctor endorsements and proof wording', () => {
  const r = analyzeText('Lose 5 kg in two weeks! Recommended by doctors. Clinically proven.');
  for (const id of ['EN-WEIGHT', 'EN-DOCTOR', 'EN-PROVEN']) assert.ok(ids(r).includes(id), id);
});

test('does NOT flag an authorised-style claim', () => {
  const r = analyzeText('Vitamin D contributes to the normal function of the immune system.');
  assert.equal(r.issues.filter((i) => i.type === 'claim').length, 0);
});

test('does not flag harmless sentences', () => {
  const r = analyzeText('Our team will treat every customer with respect. Pack of 60 capsules.');
  assert.equal(r.issues.filter((i) => i.type === 'claim').length, 0);
});

test('mandatory statements are reported missing on a supplement page', () => {
  const r = analyzeText('Great capsules made from plant extracts.');
  const missing = r.issues.filter((i) => i.type === 'mandatory').map((i) => i.ruleId);
  for (const id of ['MAND-LABEL', 'MAND-DOSE', 'MAND-EXCEED', 'MAND-DIET', 'MAND-CHILDREN']) {
    assert.ok(missing.includes(id), id);
  }
});

test('mandatory statements are not checked on unrelated pages', () => {
  const r = analyzeText('Meeting notes: we discussed the roadmap and the budget.');
  assert.equal(r.issues.filter((i) => i.type === 'mandatory').length, 0);
});

test('Romanian text: claims and missing diacritics', () => {
  const text = 'Acest supliment creste imunitatea si previne gripa. Contine vitamina C pentru sanatate. Nu depasiti doza zilnica.';
  const r = analyzeText(text);
  assert.equal(r.language, 'ro');
  assert.ok(ids(r).includes('RO-MED-DISEASE'));
  assert.ok(ids(r).includes('RO-IMMUNE-GENERIC'));
  const missing = r.issues.filter((i) => i.ruleId === 'RO-DIAC-MISSING').map((i) => i.matched.toLowerCase());
  for (const w of ['si', 'contine', 'sanatate', 'zilnica', 'depasiti']) assert.ok(missing.includes(w), w);
});

test('Romanian text with correct diacritics has no diacritics issues', () => {
  const r = analyzeText('Acest supliment alimentar conține vitamina C pentru sănătate. Nu depășiți doza zilnică recomandată.');
  assert.equal(r.issues.filter((i) => i.type === 'diacritics').length, 0);
});

test('legacy cedilla letters are reported', () => {
  const r = analyzeText('Ţineţi produsul la loc uscat. Acest supliment alimentar este pentru adulţi.', { language: 'ro' });
  assert.ok(ids(r).includes('RO-DIAC-CEDILLA'));
});

test('language detection', () => {
  assert.equal(detectLanguage('This is a product for daily use'), 'en');
  assert.equal(detectLanguage('Acesta este un produs pentru uz zilnic'), 'ro');
});

test('custom forbidden words and brand list', () => {
  const r = analyzeText('Better than SuperBrand. Our secret sauce.', { customForbidden: ['secret sauce'], brands: ['SuperBrand'] });
  assert.ok(ids(r).includes('CUSTOM-FORBIDDEN'));
  assert.ok(ids(r).includes('CUSTOM-BRAND'));
});

test('forcing the language to EN ignores Romanian claim rules', () => {
  const r = analyzeText('Acest produs vindeca diabetul.', { language: 'en' });
  assert.equal(r.issues.filter((i) => i.type === 'claim').length, 0);
});

test('demo page 1 (non-compliant) produces many high-severity issues', () => {
  const r = analyzeText(storageToText(DEMO_PAGES[0].body));
  assert.ok(r.summary.bySeverity.high >= 6, `high=${r.summary.bySeverity.high}`);
});

test('demo page 2 (Romanian) produces claim + diacritics issues', () => {
  const r = analyzeText(storageToText(DEMO_PAGES[1].body));
  assert.equal(r.language, 'ro');
  assert.ok(r.summary.byType.claim >= 4);
  assert.ok(r.summary.byType.diacritics >= 4);
});

test('demo page 3 (compliant) has no issues', () => {
  const r = analyzeText(storageToText(DEMO_PAGES[2].body));
  assert.deepEqual(r.issues.map((i) => `${i.ruleId}: ${i.matched}`), []);
});
