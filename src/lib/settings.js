// =============================================================================
// CounterSign - admin settings (stored in Forge storage, no code changes needed)
//   language         "auto" | "en" | "ro"   language of the checked texts
//   customForbidden  extra forbidden words / phrases of the organisation
//   brands           brand names that must not appear in claims text
// =============================================================================
import { kvs } from '@forge/kvs';

export const DEFAULT_SETTINGS = { language: 'auto', customForbidden: [], brands: [] };
const KEY = 'settings';
const MAX_ITEMS = 200;
const MAX_LENGTH = 80;

// Cleans a list: trims, removes empty lines and duplicates, limits size.
export function normalizeList(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/\r?\n|,/);
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const t = String(item).trim().slice(0, MAX_LENGTH);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function normalizeSettings(input = {}) {
  const language = ['auto', 'en', 'ro'].includes(input.language) ? input.language : 'auto';
  return { language, customForbidden: normalizeList(input.customForbidden), brands: normalizeList(input.brands) };
}

export async function getSettings() {
  try {
    const saved = await kvs.get(KEY);
    return normalizeSettings(saved || DEFAULT_SETTINGS);
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(input) {
  const clean = normalizeSettings(input);
  await kvs.set(KEY, clean);
  return clean;
}

// Options to pass to analyzeText().
export async function analysisOptions() {
  const s = await getSettings();
  return { language: s.language, customForbidden: s.customForbidden, brands: s.brands };
}
