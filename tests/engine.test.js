// Run with:  npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText, storageToText } from '../src/engine/checker.js';
import { detectLanguage } from '../src/engine/diacritics.js';
import { CLAIM_RULES, MANDATORY_RULES } from '../src/engine/rules.js';
import { REVIEW_LABEL } from '../src/engine/label.js';
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

// ---- review round 1 (rules 3 and 4): symptoms, botanical "on hold" claims, cholesterol exceptions ----
const sev = (r, ruleId) => r.issues.filter((i) => i.ruleId === ruleId).map((i) => i.severity);

test('cholesterol claim without an authorised ingredient stays HIGH (EN + RO)', () => {
  assert.deepEqual(sev(analyzeText('Our capsule reduces cholesterol fast.', { language: 'en' }), 'EN-LOWER-VALUES'), ['high']);
  assert.deepEqual(sev(analyzeText('Capsula scade colesterolul rapid.', { language: 'ro' }), 'RO-LOWER-VALUES'), ['high']);
  // beta-glucan alone (no oat / barley) is not an exception
  assert.deepEqual(sev(analyzeText('Beta-glucan reduces cholesterol.', { language: 'en' }), 'EN-LOWER-VALUES'), ['high']);
});

test('cholesterol claim next to plant sterols or oat/barley beta-glucans is MEDIUM with a check-the-register message', () => {
  const en1 = analyzeText('Plant sterols reduce cholesterol.', { language: 'en' });
  assert.deepEqual(sev(en1, 'EN-LOWER-VALUES'), ['medium']);
  assert.match(en1.issues[0].message, /EU Register/);
  assert.deepEqual(sev(analyzeText('Oat beta-glucan lowers cholesterol.', { language: 'en' }), 'EN-LOWER-VALUES'), ['medium']);
  assert.deepEqual(sev(analyzeText('Barley beta-glucans reduce cholesterol.', { language: 'en' }), 'EN-LOWER-VALUES'), ['medium']);
  assert.deepEqual(sev(analyzeText('Sterolii vegetali scad colesterolul.', { language: 'ro' }), 'RO-LOWER-VALUES'), ['medium']);
  assert.deepEqual(sev(analyzeText('Beta-glucanii din ovăz reduc colesterolul.', { language: 'ro' }), 'RO-LOWER-VALUES'), ['medium']);
  // the exception only applies to cholesterol, not to blood sugar
  assert.deepEqual(sev(analyzeText('Plant sterols lower blood sugar.', { language: 'en' }), 'EN-LOWER-VALUES'), ['high']);
});

test('botanical soothing-throat claims are MEDIUM and not reported as symptom claims', () => {
  const en = analyzeText('A herbal lozenge, soothing for the throat.', { language: 'en' });
  assert.deepEqual(sev(en, 'EN-BOTANICAL-SOOTHING'), ['medium']);
  assert.equal(en.issues.filter((i) => i.ruleId === 'EN-MED-SYMPTOM').length, 0);
  assert.match(en.issues[0].message, /on hold/);
  const ro = analyzeText('Pastile din plante, calmant pentru gât.', { language: 'ro' });
  assert.deepEqual(sev(ro, 'RO-BOTANICAL-SOOTHING'), ['medium']);
  assert.match(ro.issues[0].message, /on hold/);
  // "soothes cough" is still a symptom claim
  assert.deepEqual(sev(analyzeText('It soothes cough.', { language: 'en' }), 'EN-MED-SYMPTOM'), ['high']);
});

test('Romanian symptom claims are HIGH and the suggestion uses the official wording', () => {
  const r = analyzeText('Calmează durerea de cap și alină simptomele.', { language: 'ro' });
  assert.ok(sev(r, 'RO-MED-SYMPTOM').length >= 1);
  assert.ok(sev(r, 'RO-MED-SYMPTOM').every((x) => x === 'high'));
  const issue = r.issues.find((i) => i.ruleId === 'RO-MED-SYMPTOM');
  assert.match(issue.suggestion, /oboselii și a extenuării/);
  assert.doesNotMatch(issue.suggestion, /fatigabilit/);
  // the authorised wording itself is not flagged
  assert.equal(analyzeText('Magneziul contribuie la reducerea oboselii și a extenuării.', { language: 'ro' }).issues.filter((i) => i.type === 'claim').length, 0);
});

test('doctor endorsements are HIGH and the message cites Art. 12(c) (EN + RO)', () => {
  const en = analyzeText('Recommended by doctors.', { language: 'en' });
  assert.deepEqual(en.issues.filter((i) => i.ruleId === 'EN-DOCTOR').map((i) => i.severity), ['high']);
  assert.match(en.issues[0].message, /12\(c\)/);
  const ro = analyzeText('Recomandat de medici și farmaciști.', { language: 'ro' });
  assert.deepEqual(ro.issues.filter((i) => i.ruleId === 'RO-DOCTOR').map((i) => i.severity), ['high']);
  assert.match(ro.issues[0].message, /12\(c\)/);
});

test('Romanian children rule (MEDIUM) catches the agreed phrases', () => {
  for (const phrase of ['creșterea copiilor', 'dezvoltarea copiilor', 'dezvoltarea creierului copilului', 'memoria copiilor', 'concentrarea copiilor']) {
    const r = analyzeText(`Produs care susține ${phrase}.`, { language: 'ro' });
    assert.deepEqual(r.issues.filter((i) => i.ruleId === 'RO-CHILDREN').map((i) => i.severity), ['medium'], phrase);
  }
  // the authorised calcium wording is not flagged by the children rule
  const ok = analyzeText('Calciul este necesar pentru creșterea și dezvoltarea normală a oaselor la copii.', { language: 'ro' });
  assert.equal(ok.issues.filter((i) => i.ruleId === 'RO-CHILDREN').length, 0);
});

test('mandatory-statement messages cite Order 1069/2007 and the dose suggestion never contains a concrete dose', () => {
  const r = analyzeText('Zenvora capsules, a food supplement for adults.', { language: 'en' });
  for (const id of ['MAND-DOSE', 'MAND-EXCEED']) {
    const issue = r.issues.find((i) => i.ruleId === id);
    assert.ok(issue, id);
    assert.match(issue.message, /1069\/2007/);
  }
  const dose = r.issues.find((i) => i.ruleId === 'MAND-DOSE');
  assert.match(dose.message, /manufacturer's label/);
  assert.doesNotMatch(dose.suggestion, /\d/); // no number at all, so no concrete dose
  assert.match(dose.suggestion, /\[as stated on the manufacturer's label\]/);
  const ro = analyzeText('Capsule Zenvora, supliment alimentar pentru adulți.', { language: 'ro' });
  const doseRo = ro.issues.find((i) => i.ruleId === 'MAND-DOSE');
  assert.doesNotMatch(doseRo.suggestion, /\d/);
  assert.match(doseRo.suggestion, /\[conform etichetei producătorului\]/);
  const label = analyzeText('Zenvora capsules for adults. Recommended daily dose on the label. Do not exceed it.', { language: 'en' }).issues.find((i) => i.ruleId === 'MAND-LABEL');
  assert.match(label.message, /1069\/2007/);
});

test('MAND-DIET and MAND-CHILDREN also cite Directive 2002/46/EC and Order 1069/2007', () => {
  const r = analyzeText('Zenvora capsules, a food supplement for adults.', { language: 'en' });
  for (const id of ['MAND-DIET', 'MAND-CHILDREN']) {
    const issue = r.issues.find((i) => i.ruleId === id);
    assert.ok(issue, id);
    assert.match(issue.message, /2002\/46\/EC/);
    assert.match(issue.message, /1069\/2007/);
    assert.match(issue.legalBasis, /1069\/2007/);
  }
});

test('safety promises are HIGH; "miracle" / "minune" stay MEDIUM (EN + RO)', () => {
  const en = analyzeText('A miracle with no side effects and 100% safe.', { language: 'en' });
  assert.deepEqual(sev(en, 'EN-SAFETY-PROMISE'), ['high', 'high']);
  assert.deepEqual(sev(en, 'EN-ABSOLUTE'), ['medium']);
  const ro = analyzeText('O minune fără efecte secundare, 100% sigur.', { language: 'ro' });
  assert.deepEqual(sev(ro, 'RO-SAFETY-PROMISE'), ['high', 'high']);
  assert.deepEqual(sev(ro, 'RO-ABSOLUTE'), ['medium']);
  assert.match(en.issues.find((i) => i.ruleId === 'EN-SAFETY-PROMISE').message, /interactions/);
});

// ---- review question 2: common wording (EN + RO) ----
const flagged = (text, language) => analyzeText(text, { language }).issues.filter((i) => i.type === 'claim').map((i) => `${i.ruleId}:${i.severity}`);

test('new wording families are caught with the agreed severities', () => {
  const expected = [
    ['en', 'Ideal for the cold season.', 'EN-COLD-SEASON:low'],
    ['ro', 'Ideal pentru sezonul rece.', 'RO-COLD-SEASON:low'],
    ['en', 'It helps you sleep.', 'EN-SLEEP:medium'],
    ['ro', 'Ajută la somn.', 'RO-SLEEP:medium'],
    ['en', 'It boosts metabolism.', 'EN-METABOLISM:medium'],
    ['ro', 'Stimulează metabolismul.', 'RO-METABOLISM:medium'],
    ['ro', 'Accelerează metabolismul.', 'RO-METABOLISM:medium'],
    ['en', 'Boosts memory and focus.', 'EN-MEMORY-FOCUS:medium'],
    ['ro', 'Pentru memorie și concentrare.', 'RO-MEMORY-FOCUS:medium'],
    ['en', 'Anti-stress formula.', 'EN-STRESS:medium'],
    ['ro', 'Reduce stresul.', 'RO-STRESS:medium'],
    ['en', 'Rebuilds cartilage.', 'EN-CARTILAGE:high'],
    ['ro', 'Reface cartilajul.', 'RO-CARTILAGE:high'],
    ['ro', 'Regenerează cartilajul.', 'RO-CARTILAGE:high'],
    ['en', 'Good for joints.', 'EN-JOINTS:medium'],
    ['ro', 'Pentru articulații.', 'RO-JOINTS:medium'],
    ['en', 'Protects the heart.', 'EN-HEART:high'],
    ['ro', 'Protejează inima.', 'RO-HEART:high'],
    ['en', 'An energy boost.', 'EN-ENERGY:low'],
    ['ro', 'Energie și vitalitate.', 'RO-ENERGY:low'],
    ['en', 'Completely safe.', 'EN-SAFETY-PROMISE:high'],
    ['ro', 'Complet sigur.', 'RO-SAFETY-PROMISE:high'],
  ];
  for (const [lang, text, want] of expected) assert.ok(flagged(text, lang).includes(want), `${text} -> ${flagged(text, lang)}`);
});

test('authorised wordings from the EU Register style are NOT flagged by the new rules', () => {
  const ok = [
    ['en', 'Zinc contributes to normal cognitive function.'],
    ['en', 'Magnesium contributes to normal psychological function.'],
    ['en', 'Vitamin B6 contributes to normal energy-yielding metabolism.'],
    ['en', 'Iron contributes to the reduction of tiredness and fatigue.'],
    ['en', 'EPA and DHA contribute to the normal function of the heart.'],
    ['en', 'Vitamin C contributes to normal collagen formation for the normal function of cartilage.'],
    ['en', 'Melatonin contributes to the reduction of time taken to fall asleep.'],
    ['ro', 'Magneziul contribuie la metabolismul energetic normal.'],
    ['ro', 'Zincul contribuie la funcția cognitivă normală.'],
    ['ro', 'EPA și DHA contribuie la funcționarea normală a inimii.'],
    ['ro', 'Vitamina C contribuie la formarea normală a colagenului pentru funcționarea normală a cartilajelor.'],
    ['ro', 'Melatonina contribuie la reducerea timpului necesar pentru a adormi.'],
  ];
  for (const [lang, text] of ok) assert.deepEqual(flagged(text, lang), [], text);
});

test('new rules never put a dose in their suggestions', () => {
  const newIds = /-(COLD-SEASON|SLEEP|METABOLISM|MEMORY-FOCUS|STRESS|CARTILAGE|JOINTS|HEART|ENERGY)$/;
  const rules = CLAIM_RULES.filter((r) => newIds.test(r.id));
  assert.equal(rules.length, 18);
  for (const r of rules) {
    // vitamin names such as "B6" are fine; an amount with a unit is a dose and is not allowed
    assert.doesNotMatch(r.suggestion, /\d+\s?(?:mg|g|mcg|µg|ml|ui|iu|capsul|tablet|comprimat)/i, r.id);
    assert.match(r.suggestion, /Registr|Register/, r.id);
  }
});

// ---- review question 3: presence rules ----
const missing = (text, language = 'en') => analyzeText(text, { language, forceMandatory: true }).issues.filter((i) => i.type === 'mandatory' || i.type === 'recommended').map((i) => `${i.ruleId}:${i.severity}`);

test('presence rules fire on a bare supplement text with the agreed severities (EN)', () => {
  const m = missing('Zenvora capsules, a food supplement for adults.');
  for (const id of ['MAND-INGREDIENTS:medium', 'MAND-ALLERGENS:medium', 'MAND-NUTRIENTS:medium', 'MAND-MANUFACTURER:medium', 'MAND-NETQTY:low', 'REC-NOTIFICATION:low']) {
    assert.ok(m.includes(id), `${id} not in ${m}`);
  }
});

test('presence rules are satisfied by the matching wording (EN + RO)', () => {
  const en = 'Ingredients: oil. Allergens: none. Per daily dose: vitamin D 25 micrograms (500% NRV). Manufactured by Example SRL. Pack of 30 capsules. Notification number given.';
  const ids = missing(en).map((x) => x.split(':')[0]);
  for (const id of ['MAND-INGREDIENTS', 'MAND-ALLERGENS', 'MAND-NUTRIENTS', 'MAND-MANUFACTURER', 'MAND-NETQTY', 'REC-NOTIFICATION']) assert.ok(!ids.includes(id), id);
  const ro = 'Ingrediente: ulei. Alergeni: nu conține. Pe doză zilnică: vitamina D, 500% VNR. Producător: Exemplu SRL. 60 capsule. Număr de notificare.';
  const idsRo = missing(ro, 'ro').map((x) => x.split(':')[0]);
  for (const id of ['MAND-INGREDIENTS', 'MAND-ALLERGENS', 'MAND-NUTRIENTS', 'MAND-MANUFACTURER', 'MAND-NETQTY', 'REC-NOTIFICATION']) assert.ok(!idsRo.includes(id), id);
});

test('lot number and best-before date are NOT checked (distance selling)', () => {
  const all = MANDATORY_RULES.map((r) => r.id).join(' ');
  assert.doesNotMatch(all, /LOT|BATCH|DURABIL|BEST/i);
});

test('the notification suggestion is optional: type "recommended", LOW, never counted as mandatory', () => {
  const r = analyzeText('Zenvora capsules, a food supplement.', { forceMandatory: true });
  const rec = r.issues.find((i) => i.ruleId === 'REC-NOTIFICATION');
  assert.equal(rec.type, 'recommended');
  assert.equal(rec.severity, 'low');
  assert.match(rec.message, /Optional/);
  assert.ok(r.summary.byType.recommended >= 1);
});

test('presence suggestions are placeholders and never contain a number', () => {
  for (const r of MANDATORY_RULES.filter((x) => /^(MAND-INGREDIENTS|MAND-ALLERGENS|MAND-NUTRIENTS|MAND-MANUFACTURER|MAND-NETQTY)$/.test(x.id))) {
    for (const lang of ['en', 'ro']) assert.doesNotMatch(r.suggestion[lang], /\d/, `${r.id} ${lang}`);
    assert.match(r.legalBasis, /1169\/2011/);
    assert.match(r.legalBasis, /2002\/46/);
    assert.match(r.legalBasis, /Art\. 14/);
  }
});

test('analysing two pages in a row gives the same result (no state kept in global regexes)', () => {
  const page = 'Zenvora capsules, a food supplement. Recommended daily dose on the label. Do not exceed it.';
  const first = analyzeText(page).issues.map((i) => i.ruleId);
  analyzeText('Another food supplement page with a food supplement label.');
  const second = analyzeText(page).issues.map((i) => i.ruleId);
  assert.deepEqual(second, first);
});

// ---- review finished: exact-wording note + magnesium wording ----
test('every suggestion that proposes an authorised claim ends with the exact-wording note (EN + RO)', () => {
  const en = analyzeText('It reduces cholesterol. Antiparasitic. Boosts immunity. Helps you sleep.', { language: 'en' });
  const withAuthorised = en.issues.filter((i) => i.type === 'claim' && /authoris/i.test(i.suggestion));
  assert.ok(withAuthorised.length >= 3);
  for (const i of withAuthorised) assert.match(i.suggestion, /Copy the exact wording from the official language version of Regulation \(EU\) 432\/2012 \/ EU Register; do not paraphrase\.$/, i.ruleId);
  const ro = analyzeText('Scade colesterolul. Antiparazitar. Crește imunitatea.', { language: 'ro' });
  for (const i of ro.issues.filter((x) => x.type === 'claim' && /autoriz/i.test(x.suggestion))) assert.match(i.suggestion, /versiunea oficială în limba română a Regulamentului \(UE\) 432\/2012/, i.ruleId);
  // the note is added only once
  assert.equal((en.issues[0].suggestion.match(/Copy the exact wording/g) || []).length, 1);
});

test('the Romanian magnesium wording is "reducerea oboselii și a extenuării" everywhere', () => {
  for (const r of CLAIM_RULES) assert.doesNotMatch(r.suggestion, /oboselii și extenuării/, r.id);
  const s = analyzeText('Calmează durerea.', { language: 'ro' }).issues[0].suggestion;
  assert.match(s, /Magneziul contribuie la reducerea oboselii și a extenuării/);
});

test('the review label replaces DRAFT in results and tickets', () => {
  const r = analyzeText('It treats diabetes.');
  assert.equal(r.issues[0].status, 'reviewed');
  assert.match(REVIEW_LABEL, /^Reviewed by a community pharmacy professional \(20 years' experience\) - not legal advice$/);
});
