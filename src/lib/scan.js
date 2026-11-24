// =============================================================================
// CounterSign - space scan bookkeeping (pure functions, no Forge dependencies)
//
// A "ledger" remembers every issue ever found in a space:
//   key -> { pageId, pageTitle, ruleId, type, severity, firstSeen, lastSeen, status, fixedAt }
// status is "open" while the issue is still found by the latest scan of its page and
// "fixed" once a later scan of that page no longer finds it.
// =============================================================================

const MAX_LEDGER_ENTRIES = 700; // keeps the stored value well below Forge storage limits

// A stable key: the same problem on the same page keeps the same key even if the text moved.
export function ledgerKey(pageId, issue) {
  const what = (issue.matched || issue.message || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
  return `${pageId}|${issue.ruleId}|${what}`;
}

/**
 * @param {object} ledger        previous ledger (or {})
 * @param {Array}  pageResults   [{ pageId, title, issues }] for the pages scanned NOW
 * @param {string} now           ISO date string
 */
export function updateLedger(ledger, pageResults, now) {
  const next = { ...(ledger || {}) };
  for (const page of pageResults) {
    const current = new Set();
    for (const issue of page.issues) {
      const key = ledgerKey(page.pageId, issue);
      current.add(key);
      const old = next[key];
      next[key] = {
        pageId: page.pageId,
        pageTitle: page.title,
        ruleId: issue.ruleId,
        type: issue.type,
        severity: issue.severity,
        firstSeen: old?.firstSeen || now,
        lastSeen: now,
        status: 'open',
      };
    }
    // issues of this page that were open before but are gone now are FIXED
    for (const [key, entry] of Object.entries(next)) {
      if (entry.pageId === page.pageId && entry.status === 'open' && !current.has(key)) {
        next[key] = { ...entry, status: 'fixed', fixedAt: now, pageTitle: page.title };
      }
    }
  }
  return trimLedger(next);
}

// Drops the oldest fixed entries if the ledger grows too large.
function trimLedger(ledger) {
  const keys = Object.keys(ledger);
  if (keys.length <= MAX_LEDGER_ENTRIES) return ledger;
  const fixed = keys.filter((k) => ledger[k].status === 'fixed').sort((a, b) => (ledger[a].fixedAt || '').localeCompare(ledger[b].fixedAt || ''));
  const out = { ...ledger };
  for (const k of fixed) {
    if (Object.keys(out).length <= MAX_LEDGER_ENTRIES) break;
    delete out[k];
  }
  return out;
}

// Numbers for the dashboard.
export function summarizeLedger(ledger, pages = []) {
  const entries = Object.values(ledger || {});
  const open = entries.filter((e) => e.status === 'open');
  const fixed = entries.filter((e) => e.status === 'fixed');
  const count = (list, field, values) => Object.fromEntries(values.map((v) => [v, list.filter((e) => e[field] === v).length]));
  const types = ['claim', 'mandatory', 'recommended', 'diacritics', 'custom'];
  const severities = ['high', 'medium', 'low'];

  const perPage = pages.map((p) => {
    const mine = entries.filter((e) => e.pageId === p.pageId);
    const o = mine.filter((e) => e.status === 'open');
    return {
      pageId: p.pageId,
      title: p.title,
      open: o.length,
      high: o.filter((e) => e.severity === 'high').length,
      medium: o.filter((e) => e.severity === 'medium').length,
      low: o.filter((e) => e.severity === 'low').length,
      fixed: mine.filter((e) => e.status === 'fixed').length,
    };
  });
  perPage.sort((a, b) => b.high - a.high || b.open - a.open);

  const total = open.length + fixed.length;
  return {
    open: open.length,
    fixed: fixed.length,
    fixedRatio: total === 0 ? 0 : fixed.length / total,
    openByType: count(open, 'type', types),
    fixedByType: count(fixed, 'type', types),
    openBySeverity: count(open, 'severity', severities),
    pages: perPage,
  };
}
