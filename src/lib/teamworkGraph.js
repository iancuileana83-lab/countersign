// =============================================================================
// CounterSign - Teamwork Graph (read) helpers
//
// Teamwork Graph is Atlassian's graph of work objects and the people connected to them.
// CounterSign uses the READ side (curated queries) to add "page context" to a compliance
// check and to the Jira ticket: who created / owns / contributed to the page (so the
// ticket can be routed to the right person) and which other Confluence pages it links to
// (they may repeat the same claims).
//
// Teamwork Graph API status: Preview. Results are filtered by the user's permissions.
// Every call here is wrapped so that a Teamwork Graph problem NEVER breaks the main check:
// on any problem getPageContext() returns { available: false } instead of throwing.
// =============================================================================
import api from '@forge/api';

// How many linked pages / people we ask for (keeps the answer small and fast).
const LIMIT = 10;

// Runs a GraphQL query against Teamwork Graph as the current user.
// NOTE: Teamwork Graph requires every query to have an operation name of the shape
// `company_operation` (for example "countersign_pageContext"), otherwise it answers with an error.
export async function twg(query, variables = {}) {
  const res = await api.asUser().requestTeamworkGraph(query, variables);
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    json = { parseError: String(e.message || e) };
  }
  return { status: res.status, json };
}

// Builds the "ARI" (Atlassian Resource Identifier) that Teamwork Graph uses to name a page.
export const pageAri = (cloudId, pageId) => `ari:cloud:confluence:${cloudId}:page/${pageId}`;

// One request, four aliased questions. `node` is a GraphQL union, so we ask for the
// fields of the one member type we expect with an inline fragment (`... on Type`).
const PAGE_CONTEXT_QUERY = `
query countersign_pageContext($id: ID!, $first: Int) {
  creator: confluencePageCreator(id: $id, first: $first) {
    edges { node { ... on AtlassianUser { id name } } }
  }
  owners: confluencePageOwners(id: $id, first: $first) {
    edges { node { ... on AtlassianUser { id name } } }
  }
  contributors: confluencePageContributors(id: $id, first: $first) {
    edges { node { ... on AtlassianUser { id name } } }
  }
  linked: confluencePageLinkedConfluencePages(id: $id, first: $first) {
    edges { node { ... on ConfluencePage { id title webUrl } } }
  }
}`;

// Pure function (easy to unit-test): turns the raw GraphQL answer into a small, flat object.
// We only keep NAMES of people (no e-mail addresses) because the result ends up in a Jira ticket.
export function parsePageContext(json) {
  const data = json?.data;
  if (!data) return { available: false, people: [], linkedPages: [] };

  // Collects the `node` objects of one aliased connection (missing or null -> empty list).
  const nodes = (alias) => (data[alias]?.edges || []).map((edge) => edge?.node).filter(Boolean);

  // A person can be creator AND contributor: we merge them and join the roles.
  const byId = new Map();
  const addPeople = (alias, role) => {
    for (const user of nodes(alias)) {
      if (!user.id || !user.name) continue;
      const entry = byId.get(user.id) || { name: user.name, roles: [] };
      if (!entry.roles.includes(role)) entry.roles.push(role);
      byId.set(user.id, entry);
    }
  };
  addPeople('creator', 'creator');
  addPeople('owners', 'owner');
  addPeople('contributors', 'contributor');

  const linkedPages = nodes('linked')
    .filter((page) => page.title)
    .map((page) => ({ title: page.title, url: page.webUrl || null }));

  return { available: true, people: [...byId.values()], linkedPages };
}

// Returns the Teamwork Graph context of a page. NEVER throws.
export async function getPageContext(cloudId, pageId) {
  try {
    if (!cloudId || !pageId) return { available: false, people: [], linkedPages: [] };
    const { status, json } = await twg(PAGE_CONTEXT_QUERY, { id: pageAri(cloudId, pageId), first: LIMIT });
    if (status !== 200) {
      console.log('Teamwork Graph answered HTTP', status);
      return { available: false, people: [], linkedPages: [] };
    }
    if (json?.errors?.length) console.log('Teamwork Graph errors', JSON.stringify(json.errors).slice(0, 400));
    return parsePageContext(json);
  } catch (e) {
    // For example: the app was not (re)installed with the graph scopes yet.
    console.log('Teamwork Graph unavailable:', String(e.message || e));
    return { available: false, people: [], linkedPages: [] };
  }
}
