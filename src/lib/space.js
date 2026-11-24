// =============================================================================
// CounterSign - scan a whole Confluence space and keep the history (Forge storage)
// =============================================================================
import api, { route, assumeTrustedRoute } from '@forge/api';
import { kvs } from '@forge/kvs';
import { analyzeText, storageToText } from '../engine/checker.js';
import { updateLedger, summarizeLedger } from './scan.js';

const MAX_PAGES = 100; // keeps one scan fast and inside Forge's time limit
const storeKey = (spaceId) => `scan:${spaceId}`;

// Reads up to MAX_PAGES current pages of a space, with their text.
async function fetchSpacePages(spaceId) {
  const pages = [];
  let res = await api.asUser().requestConfluence(route`/wiki/api/v2/spaces/${spaceId}/pages?status=current&body-format=storage&limit=25`, {
    headers: { Accept: 'application/json' },
  });
  while (res.ok && pages.length < MAX_PAGES) {
    const data = await res.json();
    for (const p of data.results || []) {
      pages.push({ pageId: String(p.id), title: p.title, text: storageToText(p.body?.storage?.value || ''), webui: p._links?.webui || '' });
    }
    const next = data._links?.next;
    if (!next || pages.length >= MAX_PAGES) break;
    res = await api.asUser().requestConfluence(assumeTrustedRoute(next), { headers: { Accept: 'application/json' } });
  }
  if (!res.ok) throw new Error(`Could not read the pages of the space (HTTP ${res.status}).`);
  return pages.slice(0, MAX_PAGES);
}

// Dashboard data from what was stored by the last scan.
export async function getDashboard(spaceId) {
  const saved = (await kvs.get(storeKey(spaceId))) || null;
  if (!saved) return { scanned: false };
  return {
    scanned: true,
    scannedAt: saved.scannedAt,
    pageCount: saved.pages.length,
    truncated: !!saved.truncated,
    tickets: saved.tickets || {},
    ...summarizeLedger(saved.ledger, saved.pages),
  };
}

// Scans the whole space, updates the open / fixed history and stores it.
export async function scanSpace(spaceId, options = {}) {
  const pages = await fetchSpacePages(spaceId);
  const now = new Date().toISOString();
  const results = pages.map((p) => ({ pageId: p.pageId, title: p.title, issues: analyzeText(p.text, options).issues }));
  const saved = (await kvs.get(storeKey(spaceId))) || { ledger: {}, tickets: {} };
  const ledger = updateLedger(saved.ledger, results, now);
  const record = {
    scannedAt: now,
    truncated: pages.length >= MAX_PAGES,
    pages: pages.map((p) => ({ pageId: p.pageId, title: p.title })),
    ledger,
    tickets: saved.tickets || {},
  };
  await kvs.set(storeKey(spaceId), record);
  return getDashboard(spaceId);
}

// Remembers which Jira ticket was created for a page (shown in the dashboard).
export async function rememberTicket(spaceId, pageId, ticketKey) {
  const saved = (await kvs.get(storeKey(spaceId))) || { ledger: {}, tickets: {}, pages: [] };
  saved.tickets = { ...(saved.tickets || {}), [pageId]: ticketKey };
  await kvs.set(storeKey(spaceId), saved);
}
