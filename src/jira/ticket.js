// Builds the fields of a Jira ticket (description in Atlassian Document Format, ADF).
// Pure function, so it can be unit-tested.

const para = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const heading = (text, level = 3) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
const bullet = (items) => ({
  type: 'bulletList',
  content: items.map((t) => ({ type: 'listItem', content: [para(t)] })),
});

const MAX_ISSUES = 25;
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
  content.push(para('All rules are DRAFT and must be confirmed by a qualified regulatory person.'));

  // Jira limits a description to about 32,000 characters. Issues arrive most severe first,
  // so we keep the first MAX_ISSUES and say how many were left out.
  const shown = issues.slice(0, MAX_ISSUES);
  shown.forEach((issue, i) => {
    content.push(heading(`${i + 1}. ${issue.severity.toUpperCase()} - ${issue.ruleId}`));
    content.push(bullet([
      `Found: ${cut(issue.excerpt)}`,
      `Problem: ${cut(issue.message)}`,
      `Legal basis: ${cut(issue.legalBasis)}`,
      `Suggested rewording: ${cut(issue.suggestion)}`,
    ]));
  });
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
