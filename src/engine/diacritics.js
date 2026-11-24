// =============================================================================
// CounterSign - Romanian diacritics checks (status: DRAFT word list)
//
// Romanian uses the letters ă â î ș ț. Texts written without them ("sanatate"
// instead of "sănătate") look unprofessional on a product page and hurt search.
// We only list words that are UNAMBIGUOUS (a word that is also a correct
// Romanian word without diacritics, such as "dieta" or "doza", is NOT listed).
// =============================================================================

// ASCII word -> correct spelling
export const RO_DIACRITIC_WORDS = {
  si: 'și', sa: 'să', fara: 'fără', dupa: 'după', inainte: 'înainte', pana: 'până',
  sanatate: 'sănătate', sanatatii: 'sănătății', sanatos: 'sănătos', sanatoasa: 'sănătoasă',
  alimentara: 'alimentară', alimentatie: 'alimentație', alimentatia: 'alimentația',
  echilibrata: 'echilibrată', variata: 'variată', recomandata: 'recomandată', zilnica: 'zilnică',
  depasiti: 'depășiți', depasi: 'depăși', depasirea: 'depășirea', depaseste: 'depășește',
  pastrati: 'păstrați', pastreaza: 'păstrează', tineti: 'țineți', indemana: 'îndemâna',
  contine: 'conține', contin: 'conțin', continut: 'conținut', imunitatii: 'imunității',
  insarcinate: 'însărcinate', alaptare: 'alăptare', adulti: 'adulți', puteti: 'puteți',
  poti: 'poți', luati: 'luați', consultati: 'consultați', afectiuni: 'afecțiuni',
  dimineata: 'dimineața', utilizati: 'utilizați', recomandari: 'recomandări', ingrediente: 'ingrediente',
  capsula: 'capsulă', mancare: 'mâncare', tablete: 'tablete', atentie: 'atenție', precautii: 'precauții',
};
// Remove entries whose correct spelling equals the key (they are not errors).
for (const k of Object.keys(RO_DIACRITIC_WORDS)) {
  if (RO_DIACRITIC_WORDS[k] === k) delete RO_DIACRITIC_WORDS[k];
}
// "capsula" is also a correct definite form ("the capsule"), so it is too risky.
delete RO_DIACRITIC_WORDS.capsula;

// Common Romanian function words, used to detect that a text is Romanian.
const RO_STOP = ['si', 'și', 'sau', 'pentru', 'este', 'care', 'din', 'cu', 'nu', 'de', 'la', 'pe', 'un', 'o', 'se', 'zilnic', 'zilnică', 'copii', 'copiilor', 'doza', 'doză', 'produs', 'produsul', 'suplimentul', 'supliment'];
const EN_STOP = ['and', 'or', 'for', 'is', 'which', 'from', 'with', 'not', 'of', 'the', 'to', 'in', 'a', 'an', 'be', 'daily', 'children', 'dose', 'product', 'supplement'];

export function tokenize(text) {
  return (text.toLowerCase().match(/[\p{L}]+/gu) || []);
}

// Returns 'ro' or 'en'. Used when the language setting is "auto".
export function detectLanguage(text) {
  const words = tokenize(text);
  let ro = 0;
  let en = 0;
  for (const w of words) {
    if (RO_STOP.includes(w)) ro += 1;
    if (EN_STOP.includes(w)) en += 1;
  }
  // Romanian letters are a strong hint.
  if (/[ăâîșțşţ]/i.test(text)) ro += 3;
  return ro > en ? 'ro' : 'en';
}

function excerptAround(text, index, length, radius = 40) {
  const from = Math.max(0, index - radius);
  const to = Math.min(text.length, index + length + radius);
  return (from > 0 ? '…' : '') + text.slice(from, to).replace(/\s+/g, ' ') + (to < text.length ? '…' : '');
}

// Finds wrong characters, missing diacritics and "no diacritics at all".
export function checkDiacritics(text) {
  const issues = [];

  // 1) Legacy cedilla letters (ş ţ) instead of comma-below letters (ș ț).
  const cedilla = /[şŞţŢ]/g;
  let m;
  const cedillaSeen = new Set();
  while ((m = cedilla.exec(text)) !== null) {
    // one issue per distinct surrounding word
    const around = text.slice(Math.max(0, m.index - 12), m.index + 12);
    const key = around.toLowerCase();
    if (cedillaSeen.has(key)) continue;
    cedillaSeen.add(key);
    issues.push({
      ruleId: 'RO-DIAC-CEDILLA',
      type: 'diacritics',
      severity: 'low',
      excerpt: excerptAround(text, m.index, 1),
      matched: m[0],
      message: 'Wrong Romanian character: cedilla (ş, ţ) is used instead of comma-below (ș, ț).',
      legalBasis: 'Romanian orthography (DOOM3); Unicode: U+0219 ș and U+021B ț.',
      suggestion: 'Replace ş with ș and ţ with ț (Find & Replace).',
    });
    if (issues.length >= 5) break; // do not flood the list
  }

  // 2) Words written without diacritics.
  const found = new Map(); // ascii word -> { count, firstIndex }
  const wordRe = /[\p{L}]+/gu;
  while ((m = wordRe.exec(text)) !== null) {
    const w = m[0].toLowerCase();
    if (Object.prototype.hasOwnProperty.call(RO_DIACRITIC_WORDS, w)) {
      const cur = found.get(w);
      if (cur) cur.count += 1;
      else found.set(w, { count: 1, firstIndex: m.index, original: m[0] });
    }
  }
  for (const [w, info] of found) {
    issues.push({
      ruleId: 'RO-DIAC-MISSING',
      type: 'diacritics',
      severity: 'low',
      excerpt: excerptAround(text, info.firstIndex, info.original.length),
      matched: info.original,
      occurrences: info.count,
      message: `Missing Romanian diacritics: "${info.original}" should be written "${RO_DIACRITIC_WORDS[w]}"${info.count > 1 ? ` (${info.count} occurrences)` : ''}.`,
      legalBasis: 'Romanian orthography (DOOM3).',
      suggestion: `Write "${RO_DIACRITIC_WORDS[w]}".`,
    });
  }

  // 3) A longer Romanian text with no diacritics at all.
  const hasAny = /[ăâîșțĂÂÎȘȚşţŞŢ]/.test(text);
  if (!hasAny && tokenize(text).length >= 40 && found.size > 0) {
    issues.unshift({
      ruleId: 'RO-DIAC-NONE',
      type: 'diacritics',
      severity: 'medium',
      excerpt: excerptAround(text, 0, 0, 80),
      matched: '',
      message: 'The whole Romanian text has no diacritics (ă â î ș ț).',
      legalBasis: 'Romanian orthography (DOOM3); consumer information must be clear and readable (Reg. (EU) 1169/2011 Art. 7).',
      suggestion: 'Re-write the text with correct diacritics. A Romanian keyboard layout or the "Romanian (Programmers)" layout makes this easy.',
    });
  }
  return issues;
}
