// Shared Confluence helpers (used by the page window AND by the Rovo actions).
import api, { route } from '@forge/api';
import { storageToText } from '../engine/checker.js';

// Reads a Confluence page (v2 API) as the current user.
// Returns { id, title, spaceId, text, pageUrl }.
export async function loadPage(pageId) {
  const res = await api.asUser().requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Could not read the page (HTTP ${res.status}).`);
  const page = await res.json();
  const base = page._links?.base || '';
  const webui = page._links?.webui || '';
  return {
    id: page.id,
    title: page.title,
    spaceId: page.spaceId,
    text: storageToText(page.body?.storage?.value || ''),
    pageUrl: base && webui ? `${base}${webui}` : '',
  };
}
