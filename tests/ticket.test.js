import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTicket } from '../src/jira/ticket.js';
import { analyzeText } from '../src/engine/checker.js';

test('buildTicket makes a valid ADF description with all issue details', () => {
  const { issues } = analyzeText('This capsule treats diabetes.');
  const fields = buildTicket({ projectKey: 'ABC', issueTypeId: '10001', pageTitle: 'Demo page', pageUrl: 'https://x/wiki/p', issues });
  assert.equal(fields.project.key, 'ABC');
  assert.equal(fields.issuetype.id, '10001');
  assert.equal(fields.description.type, 'doc');
  assert.equal(fields.description.version, 1);
  const json = JSON.stringify(fields.description);
  assert.ok(json.includes('Suggested rewording'));
  assert.ok(json.includes('DRAFT'));
  assert.ok(fields.labels.includes('countersign'));
});

test('single-issue ticket has the issue message in the summary; multi-issue ticket counts issues', () => {
  const { issues } = analyzeText('Treats diabetes. Antiparasitic formula.');
  const one = buildTicket({ projectKey: 'A', issueTypeId: '1', pageTitle: 'P', issues: [issues[0]] });
  assert.ok(one.summary.startsWith('[CounterSign]'));
  const many = buildTicket({ projectKey: 'A', issueTypeId: '1', pageTitle: 'P', issues });
  assert.ok(many.summary.includes(`${issues.length} compliance issues`));
});

test('a ticket for a huge number of issues stays under the Jira description limit', () => {
  const issues = analyzeText('It treats diabetes. Antiparasitic. '.repeat(300)).issues;
  assert.ok(issues.length > 100);
  const fields = buildTicket({ projectKey: 'A', issueTypeId: '1', pageTitle: 'Big page', issues });
  assert.ok(JSON.stringify(fields.description).length < 30000);
  assert.ok(JSON.stringify(fields.description).includes('more issue(s) are not listed'));
});
