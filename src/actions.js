// =============================================================================
// CounterSign - Rovo actions
// These functions are the "tools" that a Rovo agent (ours, or any other agent in
// Rovo Studio) can call. They are declared as rovo:action modules in manifest.yml.
//
// Each handler receives (payload, requestContext). The payload holds the inputs
// declared in the manifest. All rules are DRAFT and this is not legal advice.
// =============================================================================
import { analyzeText } from './engine/checker.js';
import { loadPage } from './lib/confluence.js';
import { listProjects, createTicket } from './lib/jira.js';
import { analysisOptions } from './lib/settings.js';

const DRAFT_NOTE =
  'All CounterSign rules are DRAFT (based on EU Regulation 1924/2006). Results help a human reviewer and are not legal advice.';

// Inputs can arrive at the top level of the payload or inside payload.inputs.
const input = (payload, name) => payload?.[name] ?? payload?.inputs?.[name];

// Turns engine issues into a compact, agent-friendly list.
function compact(issues, limit = 30) {
  return issues.slice(0, limit).map((i, n) => ({
    n: n + 1,
    severity: i.severity,
    type: i.type,
    rule: i.ruleId,
    found: i.excerpt,
    problem: i.message,
    suggestedRewording: i.suggestion,
    legalBasis: i.legalBasis,
  }));
}

function report(result, extra = {}) {
  return {
    ...extra,
    language: result.language,
    summary: result.summary,
    issues: compact(result.issues),
    moreIssuesNotShown: Math.max(0, result.issues.length - 30),
    note: DRAFT_NOTE,
  };
}

// The page the user is looking at (when the agent runs inside Confluence).
function currentPageId(payload) {
  return input(payload, 'pageId') || payload?.context?.confluence?.contentId || payload?.context?.confluence?.content?.id;
}

// ---- action: check-text ------------------------------------------------------
export async function checkText(payload) {
  const text = String(input(payload, 'text') || '');
  if (!text.trim()) return { error: 'No text was provided.' };
  const language = input(payload, 'language');
  const options = await analysisOptions();
  if (language === 'en' || language === 'ro') options.language = language;
  return report(analyzeText(text, options));
}

// ---- action: suggest-rewording ----------------------------------------------
export async function suggestRewording(payload) {
  const text = String(input(payload, 'text') || '');
  if (!text.trim()) return { error: 'No text was provided.' };
  const result = analyzeText(text, await analysisOptions());
  const claims = result.issues.filter((i) => i.type === 'claim' || i.type === 'diacritics');
  if (claims.length === 0) return { message: 'No problematic claim or diacritics issue found in this text.', note: DRAFT_NOTE };
  return { rewordings: compact(claims), note: DRAFT_NOTE };
}

// ---- action: check-page ------------------------------------------------------
export async function checkPage(payload) {
  const pageId = currentPageId(payload);
  if (!pageId) return { error: 'No page id was given and no page is open. Ask the user for the page.' };
  const page = await loadPage(pageId);
  const result = analyzeText(page.text, await analysisOptions());
  return report(result, { pageTitle: page.title, pageUrl: page.pageUrl, pageId: page.id });
}

// ---- action: list-jira-projects ---------------------------------------------
export async function listJiraProjects() {
  const projects = await listProjects();
  return {
    projects,
    tip: 'Use a normal Jira project (for example "Project management"). Jira Service Management projects refuse tickets created by apps.',
  };
}

// ---- action: create-correction-ticket ---------------------------------------
export async function createCorrectionTicket(payload) {
  const pageId = currentPageId(payload);
  const projectKey = String(input(payload, 'projectKey') || '').trim();
  if (!pageId) return { error: 'No page id was given and no page is open.' };
  if (!projectKey) return { error: 'No Jira project key was given. Call list-jira-projects and ask the user which project to use.' };
  const page = await loadPage(pageId);
  const result = analyzeText(page.text, await analysisOptions());
  if (result.issues.length === 0) return { message: 'No issues found on this page, so no ticket was created.', note: DRAFT_NOTE };
  const created = await createTicket({ projectKey, pageTitle: page.title, pageUrl: page.pageUrl, issues: result.issues });
  let ticketUrl = '';
  try {
    ticketUrl = `${new URL(page.pageUrl).origin}/browse/${created.key}`;
  } catch (e) {
    ticketUrl = '';
  }
  return { message: `Created Jira ticket ${created.key} with ${result.issues.length} issue(s).`, ticket: created.key, ticketUrl, note: DRAFT_NOTE };
}
