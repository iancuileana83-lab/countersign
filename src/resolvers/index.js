// =============================================================================
// CounterSign - backend functions for the page window (UI Kit)
// The UI (src/frontend/index.jsx) calls these with invoke('name', payload).
// Everything runs "as the user": the app can only see what the user can see.
// =============================================================================
import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { analyzeText } from '../engine/checker.js';
import { DEMO_PAGES } from '../demo/pages.js';
import { loadPage } from '../lib/confluence.js';
import { listProjects, createTicket } from '../lib/jira.js';
import { getDashboard, scanSpace, rememberTicket } from '../lib/space.js';
import { getSettings, saveSettings, analysisOptions } from '../lib/settings.js';
import { getPageContext } from '../lib/teamworkGraph.js';

const resolver = new Resolver();

// Checks the page that is currently open.
resolver.define('checkPage', async ({ context }) => {
  const pageId = context.extension?.content?.id;
  if (!pageId) throw new Error('No page found in the current context.');
  const page = await loadPage(pageId);
  // Teamwork Graph context (people + linked pages). Never throws; { available:false } on any problem.
  const pageContext = await getPageContext(context.cloudId, pageId);
  const result = analyzeText(page.text, await analysisOptions());
  return { pageId, title: page.title, pageUrl: page.pageUrl, chars: page.text.length, pageContext, ...result };
});

// Lists the Jira projects the user can create issues in.
resolver.define('listProjects', async () => listProjects());

// Creates ONE Jira ticket for the issues the user selected (one or many).
resolver.define('createTicket', async ({ payload }) => createTicket(payload));

// Creates the three FICTIONAL demo pages in the current space (for trying the app).
resolver.define('createDemoPages', async ({ context }) => {
  const spaceId = context.extension?.space?.id;
  if (!spaceId) throw new Error('No space found in the current context.');
  const created = [];
  for (const demo of DEMO_PAGES) {
    const res = await api.asUser().requestConfluence(route`/wiki/api/v2/pages`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceId: String(spaceId), status: 'current', title: demo.title, body: { representation: 'storage', value: demo.body } }),
    });
    if (res.ok) {
      const page = await res.json();
      created.push({ title: page.title, id: page.id });
    } else {
      const text = await res.text();
      created.push({ title: demo.title, error: `HTTP ${res.status} ${text.slice(0, 120)}` });
    }
  }
  return created;
});

// ---- Phase 5: space dashboard ---------------------------------------------------

// Shows the stored result of the last scan of the current space.
resolver.define('getDashboard', async ({ context }) => {
  const spaceId = context.extension?.space?.id;
  if (!spaceId) throw new Error('No space found in the current context.');
  return getDashboard(spaceId);
});

// Scans every page of the current space.
resolver.define('scanSpace', async ({ context }) => {
  const spaceId = context.extension?.space?.id;
  if (!spaceId) throw new Error('No space found in the current context.');
  return scanSpace(spaceId, await analysisOptions());
});

// Re-checks ONE page of the space and creates a Jira ticket with its current issues.
resolver.define('createPageTicket', async ({ context, payload }) => {
  const spaceId = context.extension?.space?.id;
  const { pageId, projectKey } = payload;
  const page = await loadPage(pageId);
  const result = analyzeText(page.text, await analysisOptions());
  if (result.issues.length === 0) return { none: true };
  const pageContext = await getPageContext(context.cloudId, pageId);
  const created = await createTicket({ projectKey, pageTitle: page.title, pageUrl: page.pageUrl, issues: result.issues, pageContext });
  if (spaceId) await rememberTicket(spaceId, pageId, created.key);
  return created;
});

// ---- Phase 6: admin settings --------------------------------------------------
resolver.define('getSettings', async () => getSettings());
resolver.define('saveSettings', async ({ payload }) => saveSettings(payload));

export const handler = resolver.getDefinitions();
