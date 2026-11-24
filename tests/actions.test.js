import test from 'node:test';
import assert from 'node:assert/strict';
import { checkText, suggestRewording } from '../src/actions.js';

test('check-text action returns a compact report with the review note', async () => {
  const r = await checkText({ text: 'Our capsule lowers blood sugar and treats diabetes.' });
  assert.ok(r.summary.total >= 2);
  assert.ok(r.issues[0].suggestedRewording);
  assert.ok(/Reviewed by a community pharmacy professional/.test(r.note));
});

test('check-text accepts inputs nested under payload.inputs', async () => {
  const r = await checkText({ inputs: { text: 'Antiparasitic formula.' } });
  assert.ok(r.issues.some((i) => i.rule === 'EN-MED-PREFIX'));
});

test('check-text without text returns an error object, not an exception', async () => {
  const r = await checkText({});
  assert.ok(r.error);
});

test('suggest-rewording returns only claim/diacritics rewordings', async () => {
  const r = await suggestRewording({ text: 'Antiparasitic. Great capsules.' });
  assert.ok(r.rewordings.length >= 1);
  assert.ok(r.rewordings.every((x) => x.type === 'claim' || x.type === 'diacritics'));
});

test('suggest-rewording on clean text says nothing was found', async () => {
  const r = await suggestRewording({ text: 'Vitamin D contributes to the normal function of the immune system.' });
  assert.ok(r.message);
});
