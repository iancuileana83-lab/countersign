// =============================================================================
// CounterSign - the checking engine (pure JavaScript, no Forge dependencies)
//
// It takes the plain text of a page and returns a list of issues:
//   type "claim"       - health claim that is not allowed / needs authorisation
//   type "mandatory"   - a mandatory food-supplement statement is missing
//   type "recommended" - an OPTIONAL suggestion (never a legal requirement)
//   type "diacritics"  - Romanian diacritics problem
//   type "custom"      - a word from the admin's own forbidden list or brand list
//
// Rules: see rules.js. Label: see label.js.
// =============================================================================
import { CLAIM_RULES, MANDATORY_RULES, SUPPLEMENT_HINTS } from './rules.js';
import { withWordingNote } from './label.js';
import { checkDiacritics, detectLanguage } from './diacritics.js';

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

// ---- Confluence storage format (XHTML-like) -> plain text --------------------
export function storageToText(storage) {
  if (!storage) return '';
  let s = String(storage);
  // keep text of CDATA blocks (code macros etc.), drop everything else in tags
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // block-level tags become line breaks so sentences do not glue together
  s = s.replace(/<\/(p|div|li|ul|ol|h[1-6]|tr|table|blockquote)>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(td|th)>/gi, ' | ');
  s = s.replace(/<[^>]+>/g, ' ');
  // decode the common entities
  const named = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&rsquo;': "'", '&lsquo;': "'", '&ldquo;': '"', '&rdquo;': '"', '&ndash;': '-', '&mdash;': '-', '&hellip;': '...' };
  s = s.replace(/&[a-z]+;|&#39;/gi, (e) => (e.toLowerCase() in named ? named[e.toLowerCase()] : ' '));
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  // tidy whitespace
  s = s.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function excerptAround(text, index, length, radius = 50) {
  const from = Math.max(0, index - radius);
  const to = Math.min(text.length, index + length + radius);
  return (from > 0 ? '…' : '') + text.slice(from, to).replace(/\s+/g, ' ') + (to < text.length ? '…' : '');
}

// Small stable id so that the UI / Jira can refer to an issue.
function makeId(ruleId, matched, index) {
  let h = 0;
  const str = `${ruleId}|${matched.toLowerCase()}|${index}`;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return `${ruleId}-${(h >>> 0).toString(36)}`;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} text   plain text of the page
 * @param {object} [options]
 * @param {'auto'|'en'|'ro'} [options.language]   language of the text (default auto)
 * @param {string[]} [options.customForbidden]    extra forbidden words/phrases
 * @param {string[]} [options.brands]             brand names that must not appear in claims text
 * @param {boolean} [options.forceMandatory]      check mandatory statements even if the page does not look like a supplement
 * @param {string[]} [options.disabledRules]      rule ids to skip
 */
export function analyzeText(text, options = {}) {
  const language = options.language && options.language !== 'auto' ? options.language : detectLanguage(text);
  const disabled = new Set(options.disabledRules || []);
  const issues = [];

  // ---- 1) health claims ------------------------------------------------------
  const taken = []; // [start, end] ranges already reported, to avoid duplicates
  const overlaps = (a, b) => taken.some(([s, e]) => a < e && b > s);

  const claimRules =
    !options.language || options.language === 'auto'
      ? CLAIM_RULES
      : CLAIM_RULES.filter((r) => r.lang === language);

  for (const rule of claimRules) {
    if (disabled.has(rule.id)) continue;
    rule.pattern.lastIndex = 0;
    let m;
    while ((m = rule.pattern.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (m[0].length === 0) {
        rule.pattern.lastIndex += 1;
        continue;
      }
      if (overlaps(start, end)) continue;
      taken.push([start, end]);
      // Optional authorised exceptions (see rules.js): milder severity + "check the exact wording".
      const around = text.slice(Math.max(0, start - 150), Math.min(text.length, end + 150));
      const exception = (rule.exceptions || []).find((e) => e.appliesTo.test(m[0]) && e.context(around));
      issues.push({
        id: makeId(rule.id, m[0], start),
        ruleId: rule.id,
        type: 'claim',
        severity: exception ? exception.severity : rule.severity,
        status: 'reviewed',
        matched: m[0],
        start,
        excerpt: excerptAround(text, start, m[0].length),
        message: exception ? exception.message : rule.message,
        legalBasis: rule.legalBasis,
        suggestion: withWordingNote(exception ? exception.suggestion : rule.suggestion, rule.lang),
      });
    }
  }

  // ---- 2) mandatory food-supplement statements -------------------------------
  SUPPLEMENT_HINTS.lastIndex = 0;
  const looksLikeSupplement = SUPPLEMENT_HINTS.test(text);
  SUPPLEMENT_HINTS.lastIndex = 0;
  if ((looksLikeSupplement || options.forceMandatory) && text.trim().length > 0) {
    for (const rule of MANDATORY_RULES) {
      if (disabled.has(rule.id)) continue;
      // Some "present" patterns are global (made with anyOf): reset so a previous page cannot change this result.
      rule.present.lastIndex = 0;
      if (rule.present.test(text)) continue;
      issues.push({
        id: makeId(rule.id, '', 0),
        ruleId: rule.id,
        type: rule.type || 'mandatory',
        severity: rule.severity,
        status: 'reviewed',
        matched: '',
        start: -1,
        excerpt: '(missing from the page)',
        message: rule.message,
        legalBasis: rule.legalBasis,
        suggestion: rule.suggestion[language] || rule.suggestion.en,
      });
    }
  }

  // ---- 3) Romanian diacritics ------------------------------------------------
  if (language === 'ro' && !disabled.has('RO-DIACRITICS')) {
    for (const d of checkDiacritics(text)) {
      issues.push({ ...d, id: makeId(d.ruleId, d.matched || d.message, 0), status: 'reviewed', start: -1 });
    }
  }

  // ---- 4) the admin's own lists (Phase 6) ------------------------------------
  for (const word of options.customForbidden || []) {
    const w = String(word).trim();
    if (!w) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(w)}(?![\\p{L}\\p{N}])`, 'giu');
    let m;
    while ((m = re.exec(text)) !== null) {
      issues.push({
        id: makeId('CUSTOM-FORBIDDEN', m[0], m.index),
        ruleId: 'CUSTOM-FORBIDDEN',
        type: 'custom',
        severity: 'high',
        status: 'custom',
        matched: m[0],
        start: m.index,
        excerpt: excerptAround(text, m.index, m[0].length),
        message: `"${m[0]}" is on your organisation's forbidden-words list.`,
        legalBasis: 'Company policy (set in CounterSign admin settings).',
        suggestion: 'Remove or rephrase this wording according to your internal guidelines.',
      });
    }
  }
  for (const brand of options.brands || []) {
    const b = String(brand).trim();
    if (!b) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(b)}(?![\\p{L}\\p{N}])`, 'giu');
    let m;
    while ((m = re.exec(text)) !== null) {
      issues.push({
        id: makeId('CUSTOM-BRAND', m[0], m.index),
        ruleId: 'CUSTOM-BRAND',
        type: 'custom',
        severity: 'medium',
        status: 'custom',
        matched: m[0],
        start: m.index,
        excerpt: excerptAround(text, m.index, m[0].length),
        message: `Third-party brand "${m[0]}" is mentioned. Comparing with or naming other brands in health claims needs legal review.`,
        legalBasis: 'Company policy (brand list in CounterSign admin settings); Directive 2006/114/EC (comparative advertising).',
        suggestion: 'Remove the brand name or have the sentence reviewed.',
      });
    }
  }

  // Most severe first; inside a severity, issues found in the text (in reading order) come
  // before "missing statement" issues (which have no position in the text).
  const pos = (i) => (i.start >= 0 ? i.start : Number.MAX_SAFE_INTEGER);
  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || pos(a) - pos(b));

  return { language, looksLikeSupplement, issues, summary: summarize(issues) };
}

export function summarize(issues) {
  const byType = { claim: 0, mandatory: 0, recommended: 0, diacritics: 0, custom: 0 };
  const bySeverity = { high: 0, medium: 0, low: 0 };
  for (const i of issues) {
    byType[i.type] = (byType[i.type] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
  }
  return { total: issues.length, byType, bySeverity };
}
