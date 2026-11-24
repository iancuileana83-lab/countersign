import test from 'node:test';
import assert from 'node:assert/strict';
import { updateLedger, summarizeLedger, ledgerKey } from '../src/lib/scan.js';
import { analyzeText } from '../src/engine/checker.js';

const page = (id, text) => ({ pageId: id, title: `Page ${id}`, issues: analyzeText(text).issues });

test('first scan marks everything open', () => {
  const ledger = updateLedger({}, [page('1', 'It treats diabetes.')], '2026-01-01');
  const s = summarizeLedger(ledger, [{ pageId: '1', title: 'Page 1' }]);
  assert.ok(s.open >= 1);
  assert.equal(s.fixed, 0);
});

test('an issue that disappears in a later scan becomes fixed', () => {
  let ledger = updateLedger({}, [page('1', 'It treats diabetes. Antiparasitic formula.')], '2026-01-01');
  const before = summarizeLedger(ledger, [{ pageId: '1', title: 'Page 1' }]);
  ledger = updateLedger(ledger, [page('1', 'Antiparasitic formula.')], '2026-01-02');
  const after = summarizeLedger(ledger, [{ pageId: '1', title: 'Page 1' }]);
  assert.ok(after.fixed >= 1);
  assert.equal(after.open, before.open - after.fixed);
  assert.ok(after.fixedRatio > 0 && after.fixedRatio < 1);
});

test('an issue that comes back is reopened and keeps firstSeen', () => {
  let ledger = updateLedger({}, [page('1', 'Antiparasitic formula.')], '2026-01-01');
  ledger = updateLedger(ledger, [page('1', 'Nice text.')], '2026-01-02');
  ledger = updateLedger(ledger, [page('1', 'Antiparasitic formula.')], '2026-01-03');
  const e = Object.values(ledger).find((x) => x.ruleId === 'EN-MED-PREFIX');
  assert.equal(e.status, 'open');
  assert.equal(e.firstSeen, '2026-01-01');
});

test('pages not scanned this time are left untouched', () => {
  let ledger = updateLedger({}, [page('1', 'Antiparasitic formula.'), page('2', 'Cures cancer.')], '2026-01-01');
  ledger = updateLedger(ledger, [page('1', 'Fine.')], '2026-01-02');
  const s = summarizeLedger(ledger, [{ pageId: '1', title: 'P1' }, { pageId: '2', title: 'P2' }]);
  assert.ok(s.pages.find((p) => p.pageId === '2').open >= 1);
  assert.ok(s.pages.find((p) => p.pageId === '1').fixed >= 1);
});

test('ledger key is stable when text moves', () => {
  const a = analyzeText('Intro. Antiparasitic formula.').issues[0];
  const b = analyzeText('A much longer intro sentence here. Antiparasitic formula.').issues[0];
  assert.equal(ledgerKey('9', a), ledgerKey('9', b));
});

test('summary counts open issues by type', () => {
  const ledger = updateLedger({}, [page('1', 'Great capsules. Treats diabetes.')], '2026-01-01');
  const s = summarizeLedger(ledger, [{ pageId: '1', title: 'P' }]);
  assert.ok(s.openByType.claim >= 1);
  assert.ok(s.openByType.mandatory >= 1);
});
