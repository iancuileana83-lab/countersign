// Builds the fields of a Jira ticket (description in Atlassian Document Format, ADF).
// Pure function, so it can be unit-tested.
import { REVIEW_LABEL } from '../engine/label.js';

const para = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const heading = (text, level = 3) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
const bullet = (items) => ({
  type: 'bulletList',
  content: items.map((t) => ({ type: 'listItem', content: [para(t)] })),
});

const MAX_ISSUES = 25;
const DESCRIPTION_BUDGET = 28000; // characters of ADF JSON, below the ~32,000 Jira limit
const SUGGESTION_MAX = 650; // suggestions can be long (they end with the "exact wording" note)
const cut = (text, max = 400) => (String(text).length > max ? `${String(text).slice(0, max - 1)}…` : String(text));

export function buildTicket({ projectKey, issueTypeId, pageTitle, pageUrl, issues, pageContext }) {
  const count = issues.length;
  const summary =
    count === 1
      ? `[CounterSign] ${issues[0].message.slice(0, 120)}`
      : `[CounterSign] ${count} compliance issues on "${pageTitle}"`;

  const content = [para(`CounterSign found ${count} possible compliance issue${count === 1 ? '' : 's'} on the Confluence page "${pageTitle}".`)];
  if (pageUrl) content.push(para(`Page: ${pageUrl}`));
  // Optional Teamwork Graph context: who to talk to, and which linked pages may repeat the claims.
  if (pageContext?.available) {
    if (pageContext.people?.length) {
      content.push(para('Page people (Teamwork Graph): ' + pageContext.people.map((p) => p.name + ' (' + p.roles.join(', ') + ')').join('; ')));
    }
    if (pageContext.linkedPages?.length) {
      content.push(para('Linked Confluence pages to check for the same claims: ' + pageContext.linkedPages.map((p) => p.title).join('; ')));
    }
  }
  content.push(para('Rules: ' + REVIEW_LABEL + '.'));

  // Jira limits a description to about 32,000 characters. Issues arrive most severe first.
  // We add issues one by one while the description stays under a safe budget (and at most MAX_ISSUES),
  // then say how many were left out. Long messages and suggestions can therefore never break the ticket.
  const shown = [];
  let size = JSON.stringify(content).length + 600; // 600 = room for the closing note
  for (const issue of issues.slice(0, MAX_ISSUES)) {
    const nodes = [
      heading(`${shown.length + 1}. ${issue.severity.toUpperCase()} - ${issue.ruleId}`),
      bullet([
        `Found: ${cut(issue.excerpt)}`,
        `Problem: ${cut(issue.message)}`,
        `Legal basis: ${cut(issue.legalBasis)}`,
        `Suggested rewording: ${cut(issue.suggestion, SUGGESTION_MAX)}`,
      ]),
    ];
    const nodeSize = JSON.stringify(nodes).length;
    if (shown.length > 0 && size + nodeSize > DESCRIPTION_BUDGET) break;
    content.push(...nodes);
    size += nodeSize;
    shown.push(issue);
  }
  if (issues.length > shown.length) {
    content.push(para(`${issues.length - shown.length} more issue(s) are not listed here (less severe). Open the page in CounterSign to see them all.`));
  }

  const hasHigh = issues.some((i) => i.severity === 'high');
  return {
    project: { key: projectKey },
    issuetype: { id: issueTypeId },
    summary: summary.slice(0, 250),
    description: { type: 'doc', version: 1, content },
    labels: ['countersign', hasHigh ? 'compliance-high' : 'compliance'],
  };
}
