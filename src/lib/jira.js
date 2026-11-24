// Shared Jira helpers (used by the page window AND by the Rovo actions).
import api, { route } from '@forge/api';
import { buildTicket } from '../jira/ticket.js';

// Lists the Jira projects the user can see.
export async function listProjects() {
  const res = await api.asUser().requestJira(route`/rest/api/3/project/search?maxResults=50&orderBy=name`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Could not list Jira projects (HTTP ${res.status}).`);
  const data = await res.json();
  return (data.values || []).map((p) => ({ key: p.key, name: p.name }));
}

// Creates ONE Jira ticket that contains all the given issues.
// Issue type names can be in any language, so we try the project's types until Jira accepts one.
// NOTE: Jira Service Management ("service desk") projects refuse issue creation from Forge apps;
// use a normal Jira project (for example "Project management").
export async function createTicket({ projectKey, pageTitle, pageUrl, issues, pageContext }) {
  if (!projectKey) throw new Error('Choose a Jira project first.');
  if (!Array.isArray(issues) || issues.length === 0) throw new Error('No issues selected.');

  const projRes = await api.asUser().requestJira(route`/rest/api/3/project/${projectKey}`, {
    headers: { Accept: 'application/json' },
  });
  if (!projRes.ok) throw new Error(`Could not read project ${projectKey} (HTTP ${projRes.status}).`);
  const project = await projRes.json();
  const preferred = ['Task', 'Sarcina', 'Sarcină', 'Story', 'Improvement', 'Bug', 'Eroare'];
  const rank = (t) => {
    const i = preferred.indexOf(t.name);
    return i === -1 ? 99 : i;
  };
  const candidates = (project.issueTypes || []).filter((t) => !t.subtask).sort((a, b) => rank(a) - rank(b));
  if (candidates.length === 0) throw new Error('This Jira project has no issue type that can be created.');

  const attempts = [];
  for (const type of candidates) {
    let fields = buildTicket({ projectKey, issueTypeId: type.id, pageTitle, pageUrl, issues, pageContext });
    for (let retry = 0; retry < 2; retry++) {
      const res = await api.asUser().requestJira(route`/rest/api/3/issue`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (res.ok) {
        const created = await res.json();
        return { key: created.key, id: created.id };
      }
      const text = await res.text();
      // Some projects do not show the "labels" field: try once more without it.
      if (retry === 0 && /labels/i.test(text)) {
        const { labels, ...withoutLabels } = fields;
        fields = withoutLabels;
        continue;
      }
      attempts.push(`${type.name}: HTTP ${res.status} ${text.replace(/\s+/g, ' ').slice(0, 160)}`);
      break;
    }
  }
  throw new Error(`Jira refused the ticket for every issue type. ${attempts.join(' | ')}`.slice(0, 700));
}
