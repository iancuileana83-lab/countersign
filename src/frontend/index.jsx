// =============================================================================
// CounterSign - the window that opens from the page menu (UI Kit)
// Shows the issues found on the current page, with suggested rewordings, and
// lets the user create Jira tickets for them.
// =============================================================================
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  Heading,
  Inline,
  Link,
  Lozenge,
  SectionMessage,
  Select,
  Spinner,
  Stack,
  Strong,
  Text,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { REVIEW_LABEL } from '../engine/label.js';

const cardStyle = xcss({
  borderColor: 'color.border',
  borderStyle: 'solid',
  borderWidth: 'border.width',
  borderRadius: 'border.radius',
  padding: 'space.150',
});

const SEVERITY = {
  high: { label: 'High', appearance: 'removed' },
  medium: { label: 'Medium', appearance: 'moved' },
  low: { label: 'Low', appearance: 'default' },
};
const TYPE_LABEL = {
  claim: 'Health claim',
  mandatory: 'Missing mandatory statement',
  recommended: 'Optional suggestion',
  diacritics: 'Romanian diacritics',
  custom: 'Company rule',
};

const App = () => {
  const [state, setState] = useState({ loading: true });
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [tickets, setTickets] = useState({}); // issue id -> Jira key
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { appearance, text }
  const [demo, setDemo] = useState(null);

  const run = async () => {
    setState({ loading: true });
    try {
      const result = await invoke('checkPage');
      setState({ loading: false, result });
    } catch (e) {
      setState({ loading: false, error: String(e.message || e) });
    }
  };

  useEffect(() => {
    run();
    invoke('listProjects')
      .then((list) => {
        setProjects(list);
        if (list.length > 0) setProject({ label: `${list[0].name} (${list[0].key})`, value: list[0].key });
      })
      .catch(() => setProjects([]));
  }, []);

  const createTicket = async (issues) => {
    if (!project) {
      setMessage({ appearance: 'warning', text: 'Choose a Jira project first.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { result } = state;
      const created = await invoke('createTicket', {
        projectKey: project.value,
        pageTitle: result.title,
        pageUrl: result.pageUrl,
        pageContext: result.pageContext,
        issues,
      });
      setTickets((prev) => {
        const next = { ...prev };
        issues.forEach((i) => (next[i.id] = created.key));
        return next;
      });
      setMessage({ appearance: 'success', text: `Jira ticket ${created.key} created with ${issues.length} issue(s).` });
    } catch (e) {
      setMessage({ appearance: 'error', text: String(e.message || e) });
    }
    setBusy(false);
  };

  const createDemo = async () => {
    setBusy(true);
    try {
      setDemo(await invoke('createDemoPages'));
    } catch (e) {
      setDemo([{ title: 'Demo pages', error: String(e.message || e) }]);
    }
    setBusy(false);
  };

  if (state.loading) {
    return (
      <Inline space="space.100" alignBlock="center">
        <Spinner />
        <Text>Checking this page…</Text>
      </Inline>
    );
  }
  if (state.error) {
    return (
      <Stack space="space.150">
        <SectionMessage title="Could not check the page" appearance="error">
          <Text>{state.error}</Text>
        </SectionMessage>
        <Button onClick={run}>Try again</Button>
      </Stack>
    );
  }

  const { result } = state;
  const open = result.issues.filter((i) => !tickets[i.id]);
  const { bySeverity } = result.summary;

  return (
    <Stack space="space.200">
      <Stack space="space.075">
        <Heading size="medium">CounterSign: {result.title}</Heading>
        <Inline space="space.100" alignBlock="center">
          <Lozenge appearance="removed">{bySeverity.high} high</Lozenge>
          <Lozenge appearance="moved">{bySeverity.medium} medium</Lozenge>
          <Lozenge appearance="default">{bySeverity.low} low</Lozenge>
          <Text>Language: {result.language === 'ro' ? 'Romanian' : 'English'}</Text>
        </Inline>
        <SectionMessage appearance="information" title={REVIEW_LABEL}>
          <Text>
            The rules are based on EU Regulation 1924/2006. This tool helps a human reviewer; it is not legal advice.
          </Text>
        </SectionMessage>
      </Stack>

      {message && (
        <SectionMessage appearance={message.appearance}>
          <Text>{message.text}</Text>
        </SectionMessage>
      )}

      {result.issues.length === 0 ? (
        <SectionMessage appearance="success" title="No issues found">
          <Text>No unauthorised health claims, missing mandatory statements or diacritics problems were found on this page.</Text>
        </SectionMessage>
      ) : (
        <Stack space="space.150">
          <Inline space="space.150" alignBlock="center">
            <Box>
              <Select
                appearance="default"
                placeholder="Jira project"
                options={projects.map((p) => ({ label: `${p.name} (${p.key})`, value: p.key }))}
                value={project}
                onChange={(option) => setProject(option)}
              />
            </Box>
            <Button appearance="primary" isDisabled={busy || open.length === 0 || !project} onClick={() => createTicket(open)}>
              Create one Jira ticket for all open issues ({open.length})
            </Button>
          </Inline>
          {projects.length === 0 && (
            <Text>No Jira project is available to you, so tickets cannot be created yet.</Text>
          )}

          {result.issues.map((issue) => (
            <Box key={issue.id} xcss={cardStyle}>
              <Stack space="space.075">
                <Inline space="space.100" alignBlock="center">
                  <Lozenge appearance={SEVERITY[issue.severity].appearance}>{SEVERITY[issue.severity].label}</Lozenge>
                  <Strong>{TYPE_LABEL[issue.type] || issue.type}</Strong>
                  <Text>({issue.ruleId})</Text>
                </Inline>
                <Text>Found: {issue.excerpt}</Text>
                <Text>{issue.message}</Text>
                <Text>
                  <Strong>Suggested rewording: </Strong>
                  {issue.suggestion}
                </Text>
                <Text>Legal basis: {issue.legalBasis}</Text>
                {tickets[issue.id] ? (
                  <Lozenge appearance="success">Ticket {tickets[issue.id]}</Lozenge>
                ) : (
                  <Box>
                    <Button isDisabled={busy || !project} onClick={() => createTicket([issue])}>
                      Create Jira ticket
                    </Button>
                  </Box>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {/* Page context from Teamwork Graph (people + linked pages). Hidden when the graph has nothing. */}
      {result.pageContext?.available &&
        (result.pageContext.people.length > 0 || result.pageContext.linkedPages.length > 0) && (
          <Stack space="space.100">
            <Heading size="small">Page context (Teamwork Graph)</Heading>
            {result.pageContext.people.length > 0 && (
              <Text>
                <Strong>People: </Strong>
                {result.pageContext.people.map((p) => `${p.name} (${p.roles.join(', ')})`).join('; ')}
              </Text>
            )}
            {result.pageContext.linkedPages.length > 0 && (
              <Stack space="space.050">
                <Text>
                  <Strong>Linked pages that may repeat the same claims:</Strong>
                </Text>
                {result.pageContext.linkedPages.map((p) =>
                  p.url ? (
                    <Link key={p.url} href={p.url} openNewTab>
                      {p.title}
                    </Link>
                  ) : (
                    <Text key={p.title}>{p.title}</Text>
                  )
                )}
              </Stack>
            )}
          </Stack>
        )}

      <Inline space="space.100">
        <Button onClick={run} isDisabled={busy}>
          Check again
        </Button>
        <Button appearance="subtle" onClick={createDemo} isDisabled={busy}>
          Create fictional demo pages in this space
        </Button>
      </Inline>
      {demo && (
        <SectionMessage title="Demo pages">
          <Stack space="space.050">
            {demo.map((d) => (
              <Text key={d.title}>{d.error ? `${d.title}: ${d.error}` : `Created: ${d.title}`}</Text>
            ))}
          </Stack>
        </SectionMessage>
      )}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
