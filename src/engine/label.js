// =============================================================================
// CounterSign - the review label and the "exact wording" note (one place, used everywhere)
// =============================================================================

// Shown in the window, the dashboard, Jira tickets and Rovo results instead of "DRAFT".
export const REVIEW_LABEL = "Reviewed by a community pharmacy professional (20 years' experience) - not legal advice";

// Appended to every suggestion that proposes an authorised health claim.
export const WORDING_NOTE = {
  en: 'Copy the exact wording from the official language version of Regulation (EU) 432/2012 / EU Register; do not paraphrase.',
  ro: 'Copiați formularea exactă din versiunea oficială în limba română a Regulamentului (UE) 432/2012 / din Registrul UE; nu parafrazați.',
};

// Adds the note to a suggestion when that suggestion talks about an authorised claim.
export function withWordingNote(text, lang) {
  if (!/authoris|autoriz/i.test(text)) return text;
  const note = WORDING_NOTE[lang] || WORDING_NOTE.en;
  return text.includes(note) ? text : `${text} ${note}`;
}
