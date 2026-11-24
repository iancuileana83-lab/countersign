// =============================================================================
// CounterSign - rule definitions
//
// STATUS OF EVERY RULE IN THIS FILE: DRAFT.
// The rules are an engineering aid based on Regulation (EC) No 1924/2006 on
// nutrition and health claims, Directive 2002/46/EC (food supplements),
// Regulation (EU) No 1169/2011 (food information) and the EU Register of
// nutrition and health claims. They are NOT legal advice and must be reviewed
// by a qualified regulatory person before real-world use.
//
// All products and texts used in this project's demo are fictional.
// =============================================================================

// ---- helpers to build tolerant regular expressions ---------------------------

// Words we match are written in plain ASCII. For Romanian we also want to match
// the same word written WITH diacritics, so a->[aăâ], i->[iî], s->[sșş], t->[tțţ].
// A trailing "*" in a word means "any letters may follow" (word stem).
function lit(word) {
  let out = '';
  for (const ch of word) {
    if (ch === '*') out += '\\p{L}*';
    else if (ch === ' ') out += '\\s+';
    else if (ch === 'a') out += '[aăâ]';
    else if (ch === 'i') out += '[iî]';
    else if (ch === 's') out += '[sșş]';
    else if (ch === 't') out += '[tțţ]';
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return out;
}

// Letters-only boundaries that also work for Romanian letters (JS \b does not).
const BEFORE = '(?<![\\p{L}\\p{N}])';
const AFTER = '(?![\\p{L}\\p{N}])';

// Build one regex from a list of words / phrases (ASCII spec, diacritics tolerated).
export function anyOf(words) {
  return new RegExp(`${BEFORE}(?:${words.map(lit).join('|')})${AFTER}`, 'giu');
}

// "VERB ... DISEASE" (up to four words between them)
export function verbNear(verbs, nouns) {
  return new RegExp(
    `${BEFORE}(?:${verbs.map(lit).join('|')})(?:\\s+[\\p{L}'-]+){0,4}?\\s+(?:${nouns.map(lit).join('|')})${AFTER}`,
    'giu'
  );
}

// ---- vocabulary --------------------------------------------------------------

const DISEASES_EN = [
  'diabetes', 'cancer*', 'hypertension', 'high blood pressure', 'arthritis', 'asthma',
  'infection*', 'ulcer*', 'depression', 'anxiety disorder*', 'insomnia', 'allerg*',
  'parasit*', 'worms', 'candida', 'eczema', 'psoriasis', 'migraine*', 'obesity',
  'covid*', 'flu', 'colds', 'inflammation', 'osteoporosis', 'hemorrhoids',
  'liver disease', 'heart disease', 'high cholesterol', 'gastritis', 'fungal*', 'virus*',
];
const DISEASES_RO = [
  'diabet*', 'cancer*', 'hipertensiune*', 'tensiune* arteriala', 'artrita', 'astm',
  'infectii*', 'infectie*', 'ulcer*', 'depresie*', 'insomnie*', 'alergi*',
  'parazit*', 'viermi*', 'candida', 'eczem*', 'psoriazis', 'migren*', 'obezitate*',
  'gripa', 'raceal*', 'inflamati*', 'osteoporoza', 'hemoroizi', 'boli de inima',
  'colesterol mare', 'gastrit*', 'virus*', 'ciuperci*',
];

// ---- claim rules -------------------------------------------------------------
// Every rule: id, type, severity (high|medium|low), lang, status ('draft'),
// pattern (RegExp), message, legalBasis, suggestion.

export const CLAIM_RULES = [
  // ---------- English ----------
  {
    id: 'EN-MED-DISEASE',
    lang: 'en',
    severity: 'high',
    pattern: verbNear(
      ['treat*', 'cure*', 'curing', 'prevent*', 'heal*', 'fight*', 'eliminat*', 'reverse*', 'protect against', 'remedy for', 'remedies for'],
      DISEASES_EN
    ),
    message: 'Attributes the property of treating, preventing or curing a human disease to a food supplement.',
    legalBasis: 'Reg. (EU) 1169/2011 Art. 7(3); Reg. (EC) 1924/2006 Art. 10 and Art. 14 (disease risk reduction claims need authorisation).',
    suggestion: 'Remove the disease reference. Describe only an authorised function claim, for example: "Vitamin D contributes to the normal function of the immune system" (only if the product is at least a source of vitamin D).',
  },
  {
    id: 'EN-MED-PREFIX',
    lang: 'en',
    severity: 'high',
    pattern: anyOf([
      'antiparasitic', 'anti-parasitic', 'antiviral', 'anti-viral', 'antibacterial', 'anti-bacterial',
      'antifungal', 'anti-fungal', 'antibiotic', 'anti-diabetic', 'antidiabetic', 'anticancer',
      'anti-cancer', 'anti-inflammatory', 'antiinflammatory', 'anti-hypertensive', 'analgesic', 'painkiller',
    ]),
    message: 'Medicinal-style term. A food supplement may not be presented as having a medicinal (pharmacological) action.',
    legalBasis: 'Reg. (EU) 1169/2011 Art. 7(3); Directive 2002/46/EC (food supplements are foods, not medicines).',
    suggestion: 'Delete the term. Describe the product by its ingredients and by an authorised nutrient function claim, e.g. "Zinc contributes to the normal function of the immune system".',
  },
  {
    id: 'EN-MED-SYMPTOM',
    lang: 'en',
    severity: 'high',
    pattern: verbNear(['relieve*', 'alleviate*', 'ease*', 'soothe*', 'stop*'], ['pain*', 'symptoms', 'headache*', 'cough*', 'fever', 'cramps', 'joint pain', 'inflammation']),
    message: 'Claims to relieve pain or disease symptoms, which is a medicinal claim.',
    legalBasis: 'Reg. (EU) 1169/2011 Art. 7(3); Reg. (EC) 1924/2006 Art. 10(1).',
    suggestion: 'Remove the symptom claim. If appropriate use an authorised wording such as "Magnesium contributes to the reduction of tiredness and fatigue".',
  },
  {
    id: 'EN-LOWER-VALUES',
    lang: 'en',
    severity: 'high',
    pattern: verbNear(
      ['lower*', 'reduce*', 'reducing', 'regulate*', 'balance*', 'normaliz*', 'normalis*', 'control*'],
      ['blood sugar', 'blood glucose', 'glucose', 'glycemia', 'cholesterol', 'blood pressure', 'triglycerides']
    ),
    message: 'Claim about lowering or regulating a blood parameter. Allowed only with the exact authorised wording and conditions of use.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(1) and Art. 14; EU Register of authorised health claims.',
    suggestion: 'Use only an authorised claim and its conditions, e.g. "Chromium contributes to the maintenance of normal blood glucose levels" (product must be at least a source of chromium). Check the EU Register before publishing.',
  },
  {
    id: 'EN-IMMUNE-GENERIC',
    lang: 'en',
    severity: 'medium',
    pattern: verbNear(['boost*', 'strengthen*', 'enhance*', 'stimulate*', 'increase*', 'build*'], ['immunity', 'immune system', 'immune defenses', 'immune defences', 'natural defenses', 'natural defences']),
    message: 'Generic immune-boosting claim. Only specific function claims for named nutrients are authorised.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(1); Reg. (EU) 432/2012 (authorised function claims).',
    suggestion: 'Rewrite as: "Vitamin C contributes to the normal function of the immune system" (only for products that are at least a source of vitamin C), or use the matching authorised claim for the ingredient.',
  },
  {
    id: 'EN-DETOX',
    lang: 'en',
    severity: 'medium',
    pattern: anyOf(['detox*', 'cleanse*', 'cleansing', 'purif*', 'flush* toxins', 'toxin*']),
    message: 'Detox / cleansing claims are non-specific and not authorised.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(1) and Art. 10(3).',
    suggestion: 'Delete the detox wording. Describe the ingredient and an authorised function claim instead.',
  },
  {
    id: 'EN-WEIGHT',
    lang: 'en',
    severity: 'high',
    pattern: new RegExp(
      `${BEFORE}(?:lose\\s+(?:up\\s+to\\s+)?\\d+\\s*(?:kg|kilos?|lbs?|pounds)|burns?\\s+fat|fat[- ]burn\\w*|slimming|weight[- ]loss|melts?\\s+(?:away\\s+)?(?:fat|pounds))${AFTER}`,
      'giu'
    ),
    message: 'Weight-loss claim. Claims about the rate or amount of weight loss are prohibited; fat-burning claims are not authorised.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 12(b) (rate/amount of weight loss prohibited) and Art. 10(1).',
    suggestion: 'Remove the weight-loss promise. Authorised wording exists only for specific cases, e.g. "Glucomannan contributes to weight loss in the context of an energy-restricted diet" (conditions apply: 3 g/day in 3 doses with water).',
  },
  {
    id: 'EN-DOCTOR',
    lang: 'en',
    severity: 'medium',
    pattern: new RegExp(
      `${BEFORE}(?:(?:recommended|approved|endorsed|trusted)\\s+by\\s+(?:\\w+\\s+){0,2}(?:doctors?|physicians?|pharmacists?|nurses?|dentists?|specialists?|experts?)|(?:doctors?|physicians?|pharmacists?)\\s+(?:recommend|approve|trust)\\w*)${AFTER}`,
      'giu'
    ),
    message: 'References the recommendation of individual health professionals.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 12(c).',
    suggestion: 'Delete the endorsement. Keep only factual product information and an authorised claim.',
  },
  {
    id: 'EN-PROVEN',
    lang: 'en',
    severity: 'medium',
    pattern: anyOf(['clinically proven', 'clinically tested', 'clinically shown', 'scientifically proven', 'proven to', 'guaranteed results', 'guaranteed to']),
    message: 'Proof / guarantee wording. A health effect may be stated only through an authorised claim, and results cannot be guaranteed.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 5(1) (claims must be scientifically substantiated and not misleading) and Art. 10(1).',
    suggestion: 'Remove "proven" / "guaranteed". Use the authorised claim wording instead.',
  },
  {
    id: 'EN-ABSOLUTE',
    lang: 'en',
    severity: 'medium',
    pattern: anyOf(['miracle', 'magic', 'instant relief', 'no side effects', '100% safe', 'completely safe', 'works for everyone', 'cure-all']),
    message: 'Absolute or misleading wording.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 3 (claims must not be false, ambiguous or misleading); Reg. (EU) 1169/2011 Art. 7.',
    suggestion: 'Replace with neutral, factual wording about ingredients and use.',
  },
  {
    id: 'EN-CHILDREN',
    lang: 'en',
    severity: 'medium',
    pattern: new RegExp(`${BEFORE}(?:children'?s?|kids'?|child)\\s+(?:growth|development|brain|memory|concentration|intelligence)${AFTER}`, 'giu'),
    message: 'Claim about children\'s development. These claims need a specific authorisation (Art. 14).',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 14(1)(b).',
    suggestion: 'Only use the authorised wording, e.g. "Calcium is needed for normal growth and development of bone in children" (product must be at least a source of calcium).',
  },
  {
    id: 'EN-GENERAL-HEALTH',
    lang: 'en',
    severity: 'low',
    pattern: anyOf(['good for your health', 'for overall wellness', 'overall well-being', 'overall wellbeing', 'promotes health', 'promotes wellbeing', 'promotes well-being', 'supports wellness', 'optimal health']),
    message: 'General, non-specific health benefit. It is allowed only if accompanied by a specific authorised health claim.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(3).',
    suggestion: 'Add the specific authorised claim right next to it (e.g. "Vitamin C contributes to the reduction of tiredness and fatigue"), or remove the general wording.',
  },

  // ---------- Romanian ----------
  {
    id: 'RO-MED-DISEASE',
    lang: 'ro',
    severity: 'high',
    pattern: verbNear(['trat*', 'vindec*', 'previn*', 'prevent*', 'combat*', 'elimin*', 'inlatur*', 'protej*', 'remediu pentru'], DISEASES_RO),
    message: 'Atribuie unui supliment alimentar proprietatea de a trata, preveni sau vindeca o boală.',
    legalBasis: 'Reg. (UE) 1169/2011 art. 7(3); Reg. (CE) 1924/2006 art. 10 și art. 14.',
    suggestion: 'Eliminați referirea la boală. Folosiți doar o declarație autorizată, de exemplu: „Vitamina D contribuie la funcționarea normală a sistemului imunitar” (doar dacă produsul este cel puțin sursă de vitamina D).',
  },
  {
    id: 'RO-MED-PREFIX',
    lang: 'ro',
    severity: 'high',
    pattern: anyOf([
      'antiparazitar*', 'antiviral*', 'antibacterian*', 'antifungic*', 'antibiotic*', 'antidiabetic*',
      'anticancer*', 'antiinflamator*', 'anti-inflamator*', 'antihipertensiv*', 'analgezic*', 'antitumoral*',
    ]),
    message: 'Termen de tip medicament. Un supliment alimentar nu poate fi prezentat ca având acțiune medicamentoasă.',
    legalBasis: 'Reg. (UE) 1169/2011 art. 7(3); Directiva 2002/46/CE.',
    suggestion: 'Eliminați termenul. Descrieți produsul prin ingrediente și printr-o declarație autorizată de funcție.',
  },
  {
    id: 'RO-LOWER-VALUES',
    lang: 'ro',
    severity: 'high',
    pattern: verbNear(
      ['scad*', 'reduc*', 'regle*', 'echilibr*', 'normaliz*', 'controle*'],
      ['glicemi*', 'zahar* din sange', 'zaharul din sange', 'colesterol*', 'tensiune*', 'trigliceride*']
    ),
    message: 'Declarație despre scăderea sau reglarea unui parametru din sânge. Permisă doar cu formularea și condițiile autorizate.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(1) și art. 14; Registrul UE al declarațiilor de sănătate.',
    suggestion: 'Folosiți doar o declarație autorizată, de exemplu: „Cromul contribuie la menținerea nivelurilor normale ale glucozei din sânge” (produsul trebuie să fie cel puțin sursă de crom). Verificați Registrul UE.',
  },
  {
    id: 'RO-IMMUNE-GENERIC',
    lang: 'ro',
    severity: 'medium',
    pattern: verbNear(['cres*', 'intaresc*', 'stimul*', 'sprijin*', 'boost*'], ['imunitate*', 'sistemul imunitar', 'aparari* naturale', 'imunitat*']),
    message: 'Declarație generică despre imunitate. Sunt autorizate doar declarații specifice pentru nutrienți numiți.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(1); Reg. (UE) 432/2012.',
    suggestion: 'Reformulați: „Vitamina C contribuie la funcționarea normală a sistemului imunitar” (doar pentru produse care sunt cel puțin sursă de vitamina C).',
  },
  {
    id: 'RO-DETOX',
    lang: 'ro',
    severity: 'medium',
    pattern: anyOf(['detox*', 'curatare*', 'purifica*', 'toxine*', 'elimina toxinele']),
    message: 'Declarațiile de tip detox sunt nespecifice și neautorizate.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(1) și art. 10(3).',
    suggestion: 'Eliminați formularea detox; descrieți ingredientul și o declarație autorizată.',
  },
  {
    id: 'RO-WEIGHT',
    lang: 'ro',
    severity: 'high',
    pattern: new RegExp(
      `${BEFORE}(?:(?:pierde|slabe[sșş]te|slabi[ţțt]i)\\s+(?:pana\\s+la\\s+|până\\s+la\\s+)?\\d+\\s*(?:kg|kilograme?|kilo)|arde\\s+grasimi\\w*|arde\\s+grăsimi\\w*|slabire|slăbire|slabeste|slăbește)${AFTER}`,
      'giu'
    ),
    message: 'Declarație de slăbire. Declarațiile despre ritmul sau cantitatea de greutate pierdută sunt interzise.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 12(b) și art. 10(1).',
    suggestion: 'Eliminați promisiunea de slăbire. Există formulări autorizate doar pentru cazuri specifice (ex.: glucomannan, în contextul unei diete cu restricție calorică).',
  },
  {
    id: 'RO-DOCTOR',
    lang: 'ro',
    severity: 'medium',
    pattern: new RegExp(
      `${BEFORE}(?:recomandat\\w*\\s+de\\s+(?:\\p{L}+\\s+){0,2}(?:medic\\w*|doctor\\w*|farmacist\\w*|speciali[sșş]t\\w*)|(?:medicii|doctorii|farmaci[sșş]tii)\\s+recomand\\w*)${AFTER}`,
      'giu'
    ),
    message: 'Face referire la recomandarea unor profesioniști din sănătate.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 12(c).',
    suggestion: 'Eliminați recomandarea; păstrați doar informații factuale și o declarație autorizată.',
  },
  {
    id: 'RO-PROVEN',
    lang: 'ro',
    severity: 'medium',
    pattern: anyOf(['dovedit clinic', 'testat clinic', 'demonstrat clinic', 'dovedit stiintific', 'rezultate garantate', 'garantat']),
    message: 'Formulare de tip „dovedit” / „garantat”.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 5(1) și art. 10(1).',
    suggestion: 'Eliminați „dovedit” / „garantat”; folosiți formularea declarației autorizate.',
  },
  {
    id: 'RO-ABSOLUTE',
    lang: 'ro',
    severity: 'medium',
    pattern: anyOf(['minune', 'miraculos*', 'efect instantaneu', 'fara efecte secundare', '100% sigur', 'complet sigur', 'panaceu']),
    message: 'Formulare absolută sau înșelătoare.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 3; Reg. (UE) 1169/2011 art. 7.',
    suggestion: 'Înlocuiți cu formulări neutre, factuale, despre ingrediente și mod de utilizare.',
  },
  {
    id: 'RO-GENERAL-HEALTH',
    lang: 'ro',
    severity: 'low',
    pattern: anyOf(['bun pentru sanatatea ta', 'bun pentru sanatate', 'starea generala de bine', 'sanatate optima', 'promoveaza sanatatea']),
    message: 'Beneficiu general, nespecific. Este permis doar însoțit de o declarație de sănătate specifică autorizată.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(3).',
    suggestion: 'Adăugați alături declarația autorizată specifică sau eliminați formularea generală.',
  },
];

// ---- mandatory statements for food supplements --------------------------------
// Checked once per page, only when the page looks like a supplement description.

export const SUPPLEMENT_HINTS = anyOf([
  'supplement*', 'capsule*', 'tablet*', 'softgel*', 'gummies', 'sachet*', 'drops', 'dietary',
  'supliment*', 'capsul*', 'comprimat*', 'picatur*', 'plic*',
]);

export const MANDATORY_RULES = [
  {
    id: 'MAND-LABEL',
    severity: 'medium',
    present: anyOf(['food supplement', 'dietary supplement', 'supliment alimentar', 'suplimente alimentare', 'food supplements']),
    message: 'The text does not say that the product is a food supplement.',
    legalBasis: 'Directive 2002/46/EC Art. 6(3)(a) (name of the product: "food supplement"). In Romania: "supliment alimentar".',
    suggestion: { en: 'Add: "Food supplement."', ro: 'Adăugați: „Supliment alimentar.”' },
  },
  {
    id: 'MAND-DOSE',
    severity: 'high',
    present: new RegExp(
      `(?:${[
        'recommended (?:daily )?(?:dose|dosage|intake)',
        'daily (?:dose|dosage|intake)',
        'dosage',
        'take \\d+',
        '\\d+ (?:capsules?|tablets?|softgels?|drops|sachets?|gummies) (?:per|a|each|daily|\\/)\\s*day',
        'doza (?:zilnica|recomandata)',
        'doza (?:zilnică|recomandată)',
        'mod de administrare',
        '\\d+ (?:capsul\\w*|comprimat\\w*|picaturi|picături|plic\\w*) (?:pe|\\/) ?zi',
      ].join('|')})`,
      'iu'
    ),
    message: 'The recommended daily dose is missing.',
    legalBasis: 'Directive 2002/46/EC Art. 6(3)(c) (recommended daily dose of the product).',
    suggestion: { en: 'Add, for example: "Recommended daily dose: 1 capsule per day, with water."', ro: 'Adăugați, de exemplu: „Doza zilnică recomandată: 1 capsulă pe zi, cu apă.”' },
  },
  {
    id: 'MAND-EXCEED',
    severity: 'high',
    present: new RegExp(
      `(?:do not exceed|don't exceed|never exceed|not to exceed|nu depasiti|nu depășiți|a nu se depasi|a nu se depăși|nu se depaseste|nu se depășește)`,
      'iu'
    ),
    message: 'The warning not to exceed the stated recommended daily dose is missing.',
    legalBasis: 'Directive 2002/46/EC Art. 6(3)(d).',
    suggestion: { en: 'Add: "Do not exceed the recommended daily dose."', ro: 'Adăugați: „A nu se depăși doza zilnică recomandată.”' },
  },
  {
    id: 'MAND-DIET',
    severity: 'high',
    present: new RegExp(
      `(?:substitute for a varied|varied and balanced diet|balanced and varied diet|varied diet|dieta variata|dieta variată|dieta echilibrata|dieta echilibrată|regim alimentar variat|alimentatie variata|alimentație variată|alimentatie echilibrata|alimentație echilibrată)`,
      'iu'
    ),
    message: 'The statement that supplements should not replace a varied diet / healthy lifestyle is missing.',
    legalBasis: 'Directive 2002/46/EC Art. 6(3)(d).',
    suggestion: {
      en: 'Add: "Food supplements should not be used as a substitute for a varied and balanced diet and a healthy lifestyle."',
      ro: 'Adăugați: „Suplimentele alimentare nu trebuie utilizate ca înlocuitor pentru o dietă variată și echilibrată și un stil de viață sănătos.”',
    },
  },
  {
    id: 'MAND-CHILDREN',
    severity: 'high',
    present: new RegExp(
      `(?:out of (?:the )?reach of (?:young )?children|keep (?:away )?from children|indemana copiilor|îndemâna copiilor|indemana copiilor mici|raza de actiune a copiilor|raza de acțiune a copiilor)`,
      'iu'
    ),
    message: 'The statement to keep the product out of the reach of (young) children is missing.',
    legalBasis: 'Directive 2002/46/EC Art. 6(3)(e).',
    suggestion: { en: 'Add: "Keep out of the reach of young children."', ro: 'Adăugați: „A nu se lăsa la îndemâna copiilor mici.”' },
  },
];
