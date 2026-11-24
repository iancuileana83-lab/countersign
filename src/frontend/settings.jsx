// =============================================================================
// CounterSign - admin settings page (Confluence settings > Apps > CounterSign)
// Lets an administrator choose the checking language and add the organisation's own
// forbidden words and brand names. No code changes needed.
// =============================================================================
import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Button, Heading, HelperMessage, Inline, Label, SectionMessage, Select, Spinner, Stack, Text, TextArea } from '@forge/react';
import { invoke } from '@forge/bridge';

const LANGUAGES = [
  { label: 'Detect automatically', value: 'auto' },
  { label: 'English', value: 'en' },
  { label: 'Romanian (Română)', value: 'ro' },
];

const App = () => {
  const [loaded, setLoaded] = useState(false);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [forbidden, setForbidden] = useState('');
  const [brands, setBrands] = useState('');
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke('getSettings')
      .then((s) => {
        setLanguage(LANGUAGES.find((l) => l.value === s.language) || LANGUAGES[0]);
        setForbidden((s.customForbidden || []).join('\n'));
        setBrands((s.brands || []).join('\n'));
        setLoaded(true);
      })
      .catch((e) => {
        setMessage({ appearance: 'error', text: String(e.message || e) });
        setLoaded(true);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const s = await invoke('saveSettings', { language: language.value, customForbidden: forbidden, brands });
      setForbidden(s.customForbidden.join('\n'));
      setBrands(s.brands.join('\n'));
      setMessage({ appearance: 'success', text: 'Settings saved. They apply to the next check or scan.' });
    } catch (e) {
      setMessage({ appearance: 'error', text: String(e.message || e) });
    }
    setSaving(false);
  };

  if (!loaded) {
    return (
      <Inline space="space.100" alignBlock="center">
        <Spinner />
        <Text>Loading…</Text>
      </Inline>
    );
  }

  return (
    <Stack space="space.250">
      <Heading size="large">CounterSign settings</Heading>
      <Text>These settings apply to the page check, the space dashboard and the Rovo tools. The built-in EU rules cannot be switched off here.</Text>

      {message && (
        <SectionMessage appearance={message.appearance}>
          <Text>{message.text}</Text>
        </SectionMessage>
      )}

      <Stack space="space.050">
        <Label labelFor="language">Language of the texts</Label>
        <Select inputId="language" options={LANGUAGES} value={language} onChange={(o) => setLanguage(o)} />
        <HelperMessage>"Detect automatically" checks English and Romanian rules and picks the language per page. Choose Romanian to always check diacritics.</HelperMessage>
      </Stack>

      <Stack space="space.050">
        <Label labelFor="forbidden">Your own forbidden words or phrases (one per line)</Label>
        <TextArea id="forbidden" value={forbidden} onChange={(e) => setForbidden(e.target.value)} placeholder={'superfood\nmiracle cure'} />
        <HelperMessage>Each match is reported as a high-severity "Company rule" issue.</HelperMessage>
      </Stack>

      <Stack space="space.050">
        <Label labelFor="brands">Brand names that must not appear (one per line)</Label>
        <TextArea id="brands" value={brands} onChange={(e) => setBrands(e.target.value)} placeholder={'Competitor Brand'} />
        <HelperMessage>Mentions of other brands are reported for legal review (comparative advertising).</HelperMessage>
      </Stack>

      <Inline space="space.100">
        <Button appearance="primary" onClick={save} isDisabled={saving}>
          Save settings
        </Button>
        {saving && <Spinner />}
      </Inline>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
