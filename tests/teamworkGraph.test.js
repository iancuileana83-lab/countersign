import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePageContext } from '../src/lib/teamworkGraph.js';
import { buildTicket } from '../src/jira/ticket.js';
import { analyzeText } from '../src/engine/checker.js';

const node = (id, name) => ({ node: { id, name } });

test('parsePageContext merges roles of the same person and keeps only names', () => {
  const ctx = parsePageContext({
    data: {
      creator: { edges: [node('u1', 'Ana')] },
      owners: { edges: [node('u1', 'Ana')] },
      contributors: { edges: [node('u1', 'Ana'), { node: { id: 'u2', name: 'Bogdan', email: 'x@y.z' } }] },
      linked: { edges: [{ node: { id: 'p1', title: 'Other page', webUrl: 'https://x/wiki/p1' } }, { node: {} }] },
    },
  });
  assert.equal(ctx.available, true);
  assert.deepEqual(ctx.people, [
    { name: 'Ana', roles: ['creator', 'owner', 'contributor'] },
    { name: 'Bogdan', roles: ['contributor'] },
  ]);
  assert.deepEqual(ctx.linkedPages, [{ title: 'Other page', url: 'https://x/wiki/p1' }]);
});

test('parsePageContext copes with errors, nulls and empty answers', () => {
  assert.equal(parsePageContext({ errors: [{ message: 'x' }] }).available, false);
  assert.equal(parsePageContext(null).available, false);
  const empty = parsePageContext({ data: { creator: null, owners: { edges: null }, contributors: { edges: [] }, linked: { edges: [] } } });
  assert.equal(empty.available, true);
  assert.deepEqual(empty.people, []);
});

test('buildTicket adds the Teamwork Graph context only when it has content', () => {
  const { issues } = analyzeText('This capsule treats diabetes.');
  const base = { projectKey: 'ABC', issueTypeId: '1', pageTitle: 'P', pageUrl: 'https://x', issues };
  const text = (f) => JSON.stringify(f.description);
  const withCtx = buildTicket({ ...base, pageContext: { available: true, people: [{ name: 'Ana', roles: ['owner'] }], linkedPages: [{ title: 'Other', url: null }] } });
  assert.match(text(withCtx), /Ana \(owner\)/);
  assert.match(text(withCtx), /Other/);
  assert.doesNotMatch(text(buildTicket({ ...base, pageContext: { available: false, people: [], linkedPages: [] } })), /Teamwork Graph/);
  assert.doesNotMatch(text(buildTicket(base)), /Teamwork Graph/);
});
