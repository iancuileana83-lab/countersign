// =============================================================================
// CounterSign - space dashboard (UI Kit)
// Scans every page of the current space and shows: issues by type, open vs fixed,
// and a table of pages. "Fixed" means an issue found by an earlier scan that the
// latest scan no longer finds.
// =============================================================================
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  DynamicTable,
  Heading,
  Inline,
  Lozenge,
  ProgressBar,
  SectionMessage,
  Select,
  Spinner,
  Stack,
  Strong,
  Text,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const tileStyle = xcss({
  borderColor: 'color.border',
  borderStyle: 'solid',
  borderWidth: 'border.width',
  borderRadius: 'border.radius',
  padding: 'space.200',
  minWidth: '140px',
});

const TYPE_LABEL = {
  claim: 'Health claims',
  mandatory: 'Missing mandatory statements',
  recommended: 'Optional suggestions',
  diacritics: 'Romanian diacritics',
  custom: 'Company rules',
};

const Tile = ({ label, value, appearance }) => (
  <Box xcss={tileStyle}>
    <Stack space="space.050">
      <Text>{label}</Text>
      <Heading size="large">{String(value)}</Heading>
      {appearance && <Lozenge appearance={appearance}>{label}</Lozenge>}
    </Stack>
  </Box>
);

const App = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(true);
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setBusy(true);
    try {
      setData(await invoke('getDashboard'));
      setError(null);
    } catch (e) {
      setError(String(e.message || e));
    }
    setBusy(false);
  };

  const scan = async () => {
    setBusy(true);
    setMessage(null);
    try {
      setData(await invoke('scanSpace'));
      setError(null);
    } catch (e) {
      setError(String(e.message || e));
    }
    setBusy(false);
  };

  const ticket = async (pageId) => {
    if (!project) {
      setMessage({ appearance: 'warning', text: 'Choose a Jira project first.' });
      return;
    }
    setBusy(true);
    try {
      const r = await invoke('createPageTicket', { pageId, projectKey: project.value });
      setMessage(r.none ? { appearance: 'info', text: 'This page has no open issues.' } : { appearance: 'success', text: `Jira ticket ${r.key} created.` });
      setData(await invoke('getDashboard'));
    } catch (e) {
      setMessage({ appearance: 'error', text: String(e.message || e) });
    }
    setBusy(false);
  };

  useEffect(() => {
    load();
    invoke('listProjects')
      .then((list) => {
        setProjects(list);
        if (list.length > 0) setProject({ label: `${list[0].name} (${list[0].key})`, value: list[0].key });
      })
      .catch(() => setProjects([]));
  }, []);

  if (error) {
    return (
      <Stack space="space.150">
        <SectionMessage title="Something went wrong" appearance="error">
          <Text>{error}</Text>
        </SectionMessage>
        <Button onClick={load}>Try again</Button>
      </Stack>
    );
  }
  if (!data) {
    return (
      <Inline space="space.100" alignBlock="center">
        <Spinner />
        <Text>Loading…</Text>
      </Inline>
    );
  }

  return (
    <Stack space="space.250">
      <Stack space="space.100">
        <Heading size="large">CounterSign space dashboard</Heading>
        <Text>
          Scans every page of this space (up to 100) against the reviewed rules for EU food-supplement claims. Run the scan again after
          editing pages: issues that disappear are counted as fixed.
        </Text>
        <Inline space="space.100" alignBlock="center">
          <Button appearance="primary" onClick={scan} isDisabled={busy}>
            {data.scanned ? 'Scan the space again' : 'Scan the space'}
          </Button>
          {busy && <Spinner />}
        </Inline>
      </Stack>

      {message && (
        <SectionMessage appearance={message.appearance}>
          <Text>{message.text}</Text>
        </SectionMessage>
      )}

      {!data.scanned ? (
        <SectionMessage appearance="info" title="No scan yet">
          <Text>Press "Scan the space" to check all pages.</Text>
        </SectionMessage>
      ) : (
        <Stack space="space.250">
          <Text>
            Last scan: {new Date(data.scannedAt).toLocaleString()} · {data.pageCount} pages{data.truncated ? ' (limit of 100 pages reached)' : ''}
          </Text>

          <Inline space="space.200" shouldWrap>
            <Tile label="Open issues" value={data.open} />
            <Tile label="Fixed issues" value={data.fixed} />
            <Tile label="High severity open" value={data.openBySeverity.high} />
            <Tile label="Medium severity open" value={data.openBySeverity.medium} />
          </Inline>

          <Stack space="space.100">
            <Heading size="small">Fixed vs open</Heading>
            <ProgressBar value={data.fixedRatio} appearance={data.fixedRatio === 1 ? 'success' : 'default'} />
            <Text>
              {data.fixed} fixed, {data.open} still open ({Math.round(data.fixedRatio * 100)}% fixed)
            </Text>
          </Stack>

          <Stack space="space.100">
            <Heading size="small">Open issues by type</Heading>
            <DynamicTable
              head={{
                cells: [
                  { key: 'type', content: 'Type' },
                  { key: 'open', content: 'Open' },
                  { key: 'fixed', content: 'Fixed' },
                ],
              }}
              rows={Object.keys(TYPE_LABEL).map((t) => ({
                key: t,
                cells: [
                  { key: 'type', content: TYPE_LABEL[t] },
                  { key: 'open', content: String(data.openByType[t] || 0) },
                  { key: 'fixed', content: String(data.fixedByType[t] || 0) },
                ],
              }))}
            />
          </Stack>

          <Stack space="space.100">
            <Heading size="small">Pages</Heading>
            <Box>
              <Select
                placeholder="Jira project for tickets"
                options={projects.map((p) => ({ label: `${p.name} (${p.key})`, value: p.key }))}
                value={project}
                onChange={(option) => setProject(option)}
              />
            </Box>
            <DynamicTable
              head={{
                cells: [
                  { key: 'page', content: 'Page' },
                  { key: 'high', content: 'High' },
                  { key: 'medium', content: 'Medium' },
                  { key: 'low', content: 'Low' },
                  { key: 'fixed', content: 'Fixed' },
                  { key: 'ticket', content: 'Jira ticket' },
                ],
              }}
              rows={data.pages.map((p) => ({
                key: p.pageId,
                cells: [
                  { key: 'page', content: <Strong>{p.title}</Strong> },
                  { key: 'high', content: <Lozenge appearance={p.high ? 'removed' : 'default'}>{String(p.high)}</Lozenge> },
                  { key: 'medium', content: <Lozenge appearance={p.medium ? 'moved' : 'default'}>{String(p.medium)}</Lozenge> },
                  { key: 'low', content: <Lozenge appearance="default">{String(p.low)}</Lozenge> },
                  { key: 'fixed', content: <Lozenge appearance={p.fixed ? 'success' : 'default'}>{String(p.fixed)}</Lozenge> },
                  {
                    key: 'ticket',
                    content: data.tickets[p.pageId] ? (
                      <Lozenge appearance="success">{data.tickets[p.pageId]}</Lozenge>
                    ) : p.open > 0 ? (
                      <Button onClick={() => ticket(p.pageId)} isDisabled={busy || !project}>
                        Create ticket
                      </Button>
                    ) : (
                      <Text>-</Text>
                    ),
                  },
                ],
              }))}
            />
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
