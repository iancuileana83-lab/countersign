// =============================================================================
// CounterSign - rule definitions
//
// STATUS OF EVERY RULE IN THIS FILE: Reviewed by a community pharmacy professional (20 years' experience) - not legal advice.
// The rules are an engineering aid based on Regulation (EC) No 1924/2006 on
// nutrition and health claims, Directive 2002/46/EC (food supplements),
// Regulation (EU) No 1169/2011 (food information) and the EU Register of
// nutrition and health claims. They are NOT legal advice.
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

// ---- authorised exceptions (cholesterol) ---------------------------------------
// Some ingredients DO have authorised claims about blood cholesterol (plant sterols / stanols,
// beta-glucans from oats or barley). A rule can list "exceptions": when the matched text is about
// cholesterol AND the surrounding text (about 150 characters each side) mentions one of these
// ingredients, the issue is reported with a milder severity and a "check the exact wording" message
// instead of the generic "not allowed" message. We never decide that the wording is correct: only
// the exact wording and conditions of use in the EU Register make a claim legal.
const hasSterols = (w) => /(?<![\p{L}])(?:phyto|fito)?(?:sterol|stanol)/iu.test(w);
const hasOatBarleyBetaGlucan = (w, oatBarley) => /beta[\s-]?glucan/iu.test(w) && oatBarley.test(w);
const cholesterolContextEn = (w) => hasSterols(w) || hasOatBarleyBetaGlucan(w, /(?<![\p{L}])(?:oats?|barley)(?![\p{L}])/iu);
const cholesterolContextRo = (w) => hasSterols(w) || hasOatBarleyBetaGlucan(w, /(?<![\p{L}])(?:ov[aăâ]z|orz)(?![\p{L}])/iu);

// ---- claim rules -------------------------------------------------------------
// Every rule: id, type, severity (high|medium|low), lang, status ('reviewed'),
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
    id: 'EN-BOTANICAL-SOOTHING',
    lang: 'en',
    severity: 'medium',
    pattern: anyOf(['soothing for the throat', 'soothing for your throat', 'soothing to the throat', 'soothes the throat', 'soothes your throat']),
    message: 'Botanical ("herbal") claim. Claims of this kind for plant products are "on hold" in the EU: tolerated for now while their evaluation is pending, but NOT authorised. They can be removed or refused at any time.',
    legalBasis: 'Reg. (EC) 1924/2006 (botanical claims on hold); EU Register of nutrition and health claims.',
    suggestion: 'Check the current status of the claim in the EU Register before publishing. If it is still on hold, decide with your regulatory person whether to keep it; otherwise describe the plant ingredient without the claim.',
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
    suggestion: 'Use only an authorised claim and its conditions, e.g. "Chromium contributes to the maintenance of normal blood glucose levels" (product must be at least a source of chromium). Check the EU Register before publishing. Exception: plant sterols / stanols and oat or barley beta-glucans have authorised cholesterol claims, but only with the exact wording and conditions of use from the EU Register.',
    exceptions: [
      {
        appliesTo: /cholesterol/i,
        context: cholesterolContextEn,
        severity: 'medium',
        message: 'Cholesterol claim next to plant sterols / stanols or oat / barley beta-glucans. Authorised claims about reducing or maintaining blood cholesterol exist for these ingredients, but ONLY with the exact wording and conditions of use in the EU Register.',
        suggestion: 'Replace the sentence with the exact authorised wording for the ingredient from the EU Register and check the conditions (ingredient, daily amount, product type). Do not paraphrase.',
      },
    ],
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
    severity: 'high',
    pattern: new RegExp(
      `${BEFORE}(?:(?:recommended|approved|endorsed|trusted)\\s+by\\s+(?:\\w+\\s+){0,2}(?:doctors?|physicians?|pharmacists?|nurses?|dentists?|specialists?|experts?)|(?:doctors?|physicians?|pharmacists?)\\s+(?:recommend|approve|trust)\\w*)${AFTER}`,
      'giu'
    ),
    message: 'References the recommendation of individual doctors or health professionals. Article 12(c) of Regulation (EC) No 1924/2006 expressly prohibits such references.',
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
    id: 'EN-SAFETY-PROMISE',
    lang: 'en',
    severity: 'high',
    pattern: anyOf(['no side effects', '100% safe', 'completely safe']),
    message: 'Unfounded safety promise. It can make people stop asking about interactions with their own medicines, so it is treated as high severity.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 3 (claims must not be false, ambiguous or misleading); Reg. (EU) 1169/2011 Art. 7.',
    suggestion: 'Delete the safety promise. If useful, add a neutral warning, for example to ask a doctor or pharmacist about interactions with other medicines.',
  },
  {
    id: 'EN-ABSOLUTE',
    lang: 'en',
    severity: 'medium',
    pattern: anyOf(['miracle', 'magic', 'instant relief', 'works for everyone', 'cure-all']),
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
    id: 'RO-CHILDREN',
    lang: 'ro',
    severity: 'medium',
    pattern: anyOf([
      'cresterea copiilor', 'dezvoltarea copiilor', 'dezvoltarea creierului copilului', 'memoria copiilor', 'concentrarea copiilor',
      'cresterea copilului', 'dezvoltarea copilului', 'memoria copilului', 'concentrarea copilului',
    ]),
    message: 'Declarație despre dezvoltarea copiilor. Aceste declarații necesită o autorizare specifică (art. 14).',
    legalBasis: 'Reg. (CE) 1924/2006 art. 14(1)(b).',
    suggestion: 'Folosiți doar formularea autorizată, de exemplu: „Calciul este necesar pentru creșterea și dezvoltarea normală a oaselor la copii” (produsul trebuie să fie cel puțin sursă de calciu).',
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
    id: 'RO-MED-SYMPTOM',
    lang: 'ro',
    severity: 'high',
    pattern: verbNear(
      ['calmeaz*', 'alin*', 'amelior*', 'atenu*', 'usur*', 'ostoi*', 'opre*'],
      ['durer*', 'simptom*', 'tuse', 'tusea', 'febra', 'cramp*', 'inflamati*', 'migren*']
    ),
    message: 'Declară că ameliorează durerea sau simptomele unei boli, ceea ce este o declarație medicinală.',
    legalBasis: 'Reg. (UE) 1169/2011 art. 7(3); Reg. (CE) 1924/2006 art. 10(1).',
    suggestion: 'Eliminați declarația despre simptom. Dacă este cazul, folosiți o formulare autorizată, de exemplu: „Magneziul contribuie la reducerea oboselii și a extenuării”.',
  },
  {
    id: 'RO-BOTANICAL-SOOTHING',
    lang: 'ro',
    severity: 'medium',
    pattern: anyOf(['calmant pentru gat', 'calmant pentru gatul', 'calmeaza gatul', 'linisteste gatul']),
    message: 'Afirmație botanică („pe bază de plante”). Astfel de afirmații pentru produse din plante sunt „on hold” în UE: tolerate deocamdată, cât timp evaluarea nu e finalizată, dar NEautorizate. Pot fi retrase sau refuzate oricând.',
    legalBasis: 'Reg. (CE) 1924/2006 (declarații botanice „on hold”); Registrul UE al declarațiilor nutriționale și de sănătate.',
    suggestion: 'Verificați statutul actual al declarației în Registrul UE înainte de publicare. Dacă este încă „on hold”, decideți împreună cu persoana de reglementare dacă o păstrați; altfel descrieți ingredientul vegetal fără declarație.',
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
    suggestion: 'Folosiți doar o declarație autorizată, de exemplu: „Cromul contribuie la menținerea nivelurilor normale ale glucozei din sânge” (produsul trebuie să fie cel puțin sursă de crom). Verificați Registrul UE. Excepție: sterolii / stanolii vegetali și beta-glucanii din ovăz sau orz au declarații autorizate despre colesterol, dar doar cu formularea exactă și condițiile din Registrul UE.',
    exceptions: [
      {
        appliesTo: /colesterol/i,
        context: cholesterolContextRo,
        severity: 'medium',
        message: 'Declarație despre colesterol lângă steroli / stanoli vegetali sau beta-glucani din ovăz / orz. Pentru acești ingredienți există declarații autorizate despre reducerea sau menținerea colesterolului, dar DOAR cu formularea exactă și condițiile din Registrul UE.',
        suggestion: 'Înlocuiți propoziția cu formularea autorizată exactă din Registrul UE și verificați condițiile (ingredient, doza zilnică, tipul produsului). Nu parafrazați.',
      },
    ],
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
    severity: 'high',
    pattern: new RegExp(
      `${BEFORE}(?:recomandat\\w*\\s+de\\s+(?:\\p{L}+\\s+){0,2}(?:medic\\w*|doctor\\w*|farmacist\\w*|speciali[sșş]t\\w*)|(?:medicii|doctorii|farmaci[sșş]tii)\\s+recomand\\w*)${AFTER}`,
      'giu'
    ),
    message: 'Face referire la recomandarea unor medici sau profesioniști din sănătate individuali. Articolul 12(c) din Reg. (CE) 1924/2006 interzice explicit astfel de trimiteri.',
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
    id: 'RO-SAFETY-PROMISE',
    lang: 'ro',
    severity: 'high',
    pattern: anyOf(['fara efecte secundare', '100% sigur', 'complet sigur']),
    message: 'Promisiune de siguranță fără temei. Îi poate face pe oameni să nu mai întrebe despre interacțiuni cu medicamentele lor, de aceea e tratată ca severitate mare.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 3; Reg. (UE) 1169/2011 art. 7.',
    suggestion: 'Eliminați promisiunea de siguranță. Dacă e util, adăugați un avertisment neutru, de exemplu să se ceară sfatul medicului sau farmacistului despre interacțiuni cu alte medicamente.',
  },
  {
    id: 'RO-ABSOLUTE',
    lang: 'ro',
    severity: 'medium',
    pattern: anyOf(['minune', 'miraculos*', 'efect instantaneu', 'panaceu']),
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

  // ---------- Review round: common wording used in practice (reviewed) ----------
  {
    id: 'EN-COLD-SEASON',
    lang: 'en',
    severity: 'low',
    pattern: anyOf(['for the cold season', 'for cold season', 'for the cold months', 'for cold and flu season']),
    message: 'General, non-specific benefit ("cold season"). It is allowed only together with a specific authorised health claim.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(3).',
    suggestion: 'Add the specific authorised claim next to it, e.g. "Vitamin C / Vitamin D / Zinc contributes to the normal function of the immune system" (only if the product is at least a source of that nutrient), or remove the general wording. Check the conditions of use in the EU Register and do not state any dose that is not on the manufacturer\'s label.',
  },
  {
    id: 'RO-COLD-SEASON',
    lang: 'ro',
    severity: 'low',
    pattern: anyOf(['pentru sezonul rece', 'pentru sezonul friguros', 'pentru perioada rece', 'pentru sezonul racelilor']),
    message: 'Beneficiu general, nespecific („sezonul rece”). Este permis doar însoțit de o declarație de sănătate specifică autorizată.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(3).',
    suggestion: 'Adăugați declarația specifică autorizată, de exemplu „Vitamina C / Vitamina D / Zincul contribuie la funcționarea normală a sistemului imunitar” (doar dacă produsul este cel puțin sursă din acel nutrient), sau eliminați formularea generală. Verificați condițiile de utilizare în Registrul UE și nu indicați nicio doză care nu este pe eticheta producătorului.',
  },
  {
    id: 'EN-SLEEP',
    lang: 'en',
    severity: 'medium',
    pattern: anyOf(['helps you sleep', 'helps you to sleep', 'helps with sleep', 'helps to sleep', 'helps you fall asleep', 'sleep aid', 'sleeping aid', 'promotes sleep', 'induces sleep']),
    message: 'Sleep claim. Only melatonin has an authorised sleep claim; botanical sleep claims (for example valerian, lemon balm) are "on hold" in the EU: tolerated for now, NOT authorised.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(1); Reg. (EU) 432/2012 (authorised function claims); EU Register (botanical claims on hold).',
    suggestion: 'For melatonin use only the authorised claim ("Melatonin contributes to the reduction of time taken to fall asleep"), with its conditions of use from the Register. For plants, check the status in the Register: they are on hold. Check the conditions of use in the EU Register and do not state any dose that is not on the manufacturer\'s label.',
  },
  {
    id: 'RO-SLEEP',
    lang: 'ro',
    severity: 'medium',
    pattern: anyOf(['ajuta la somn', 'ajuta somnul', 'ajuta sa dormi', 'ajuta sa adormi', 'ajuta la adormire', 'favorizeaza somnul', 'induce somnul']),
    message: 'Declarație despre somn. Doar melatonina are o declarație autorizată despre somn; declarațiile botanice despre somn (de exemplu valeriană, roiniță) sunt „on hold” în UE: tolerate deocamdată, NEautorizate.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(1); Reg. (UE) 432/2012; Registrul UE (declarații botanice „on hold”).',
    suggestion: 'Pentru melatonină folosiți doar declarația autorizată („Melatonina contribuie la reducerea timpului necesar pentru a adormi”), cu condițiile din Registru. Pentru plante verificați statutul în Registru: sunt „on hold”. Verificați condițiile de utilizare în Registrul UE și nu indicați nicio doză care nu este pe eticheta producătorului.',
  },
  {
    id: 'EN-METABOLISM',
    lang: 'en',
    severity: 'medium',
    pattern: verbNear(['stimulate*', 'accelerate*', 'boost*', 'speed* up', 'increase*', 'activate*'], ['metabolism', 'metabolic rate']),
    message: 'Claim about boosting the metabolism. Only specific function claims for named nutrients are authorised.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(1); Reg. (EU) 432/2012.',
    suggestion: 'Use an authorised claim for a named nutrient, e.g. "Vitamin B6 / Magnesium / Iron contributes to normal energy-yielding metabolism" (only if the product is at least a source of that nutrient). Check the conditions of use in the EU Register and do not state any dose that is not on the manufacturer\'s label.',
  },
  {
    id: 'RO-METABOLISM',
    lang: 'ro',
    severity: 'medium',
    pattern: verbNear(['stimul*', 'accelera*', 'accelerea*', 'activeaz*', 'intensific*', 'cres*'], ['metabolism*']),
    message: 'Declarație despre stimularea metabolismului. Sunt autorizate doar declarații specifice pentru nutrienți numiți.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(1); Reg. (UE) 432/2012.',
    suggestion: 'Folosiți o declarație autorizată pentru un nutrient numit, de exemplu „Vitaminele B, magneziul, fierul contribuie la metabolismul energetic normal” (doar dacă produsul este cel puțin sursă din acel nutrient). Verificați condițiile de utilizare în Registrul UE și nu indicați nicio doză care nu este pe eticheta producătorului.',
  },
  {
    id: 'EN-MEMORY-FOCUS',
    lang: 'en',
    severity: 'medium',
    pattern: new RegExp(
      `${BEFORE}(?:for memory and (?:focus|concentration)|for memory|for focus and memory|for concentration)${AFTER}|` +
        verbNear(['boost*', 'improve*', 'enhance*', 'sharpen*', 'increase*'], ['memory', 'focus', 'concentration', 'mental clarity', 'brain power']).source,
      'giu'
    ),
    message: 'Memory / focus claim. Only specific function claims for named nutrients are authorised.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(1); Reg. (EU) 432/2012.',
    suggestion: 'Use an authorised claim for a named nutrient, e.g. "Zinc / Iron / Iodine contributes to normal cognitive function" (only if the product is at least a source of that nutrient). Check the conditions of use in the EU Register and do not state any dose that is not on the manufacturer\'s label.',
  },
  {
    id: 'RO-MEMORY-FOCUS',
    lang: 'ro',
    severity: 'medium',
    pattern: new RegExp(
      `${BEFORE}(?:${['pentru memorie si concentrare', 'pentru memorie', 'pentru concentrare'].map(lit).join('|')})${AFTER}|` +
        verbNear(['imbunatat*', 'stimul*', 'intensific*', 'cres*', 'amelior*'], ['memori*', 'concentrar*']).source,
      'giu'
    ),
    message: 'Declarație despre memorie / concentrare. Sunt autorizate doar declarații specifice pentru nutrienți numiți.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(1); Reg. (UE) 432/2012.',
    suggestion: 'Folosiți o declarație autorizată pentru un nutrient numit, de exemplu „Zincul, fierul, iodul contribuie la funcția cognitivă normală” (doar dacă produsul este cel puțin sursă din acel nutrient). Verificați condițiile de utilizare în Registrul UE și nu indicați nicio doză care nu este pe eticheta producătorului.',
  },
  {
    id: 'EN-STRESS',
    lang: 'en',
    severity: 'medium',
    pattern: new RegExp(
      `${BEFORE}(?:anti-?stress|stress[- ]relief)${AFTER}|` +
        verbNear(['reduce*', 'relieve*', 'fight*', 'combat*', 'beat*', 'ease*', 'eliminate*'], ['stress']).source,
      'giu'
    ),
    message: 'Stress claim. Anxiety, depression and insomnia are diseases: claims about them are high severity (see the disease rule).',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(1); Reg. (EU) 432/2012.',
    suggestion: 'Use an authorised claim for a named nutrient, e.g. "Magnesium / Vitamin B6 / Vitamin B12 contributes to normal psychological function" (only if the product is at least a source of that nutrient). Check the conditions of use in the EU Register and do not state any dose that is not on the manufacturer\'s label.',
  },
  {
    id: 'RO-STRESS',
    lang: 'ro',
    severity: 'medium',
    pattern: new RegExp(
      `${BEFORE}(?:anti-?stres\\p{L}*)${AFTER}|` +
        verbNear(['reduc*', 'combat*', 'alin*', 'amelior*', 'atenu*', 'usur*', 'elimin*'], ['stres*']).source,
      'giu'
    ),
    message: 'Declarație despre stres. Anxietatea, depresia și insomnia sunt boli: declarațiile despre ele sunt de severitate mare (vezi regula despre boli).',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(1); Reg. (UE) 432/2012.',
    suggestion: 'Folosiți o declarație autorizată pentru un nutrient numit, de exemplu „Magneziul, vitaminele B6 și B12 contribuie la funcția psihologică normală” (doar dacă produsul este cel puțin sursă din acel nutrient). Verificați condițiile de utilizare în Registrul UE și nu indicați nicio doză care nu este pe eticheta producătorului.',
  },
  {
    id: 'EN-CARTILAGE',
    lang: 'en',
    severity: 'high',
    pattern: verbNear(['rebuild*', 'regenerat*', 'repair*', 'restor*', 'regrow*', 'renew*'], ['cartilage']),
    message: 'Claims a medicinal action (rebuilding / regenerating cartilage).',
    legalBasis: 'Reg. (EU) 1169/2011 Art. 7(3); Reg. (EC) 1924/2006 Art. 10(1).',
    suggestion: 'Remove the claim. If appropriate use an authorised one, e.g. "Vitamin C contributes to normal collagen formation for the normal function of cartilage" (only if the product is at least a source of vitamin C). Check the conditions of use in the EU Register and do not state any dose that is not on the manufacturer\'s label.',
  },
  {
    id: 'RO-CARTILAGE',
    lang: 'ro',
    severity: 'high',
    pattern: verbNear(['reface*', 'regenera*', 'regenere*', 'repar*', 'reconstru*', 'reinnoie*'], ['cartilaj*']),
    message: 'Atribuie o acțiune de medicament (refacerea / regenerarea cartilajului).',
    legalBasis: 'Reg. (UE) 1169/2011 art. 7(3); Reg. (CE) 1924/2006 art. 10(1).',
    suggestion: 'Eliminați declarația. Dacă este cazul, folosiți una autorizată, de exemplu „Vitamina C contribuie la formarea normală a colagenului pentru funcționarea normală a cartilajelor” (doar dacă produsul este cel puțin sursă de vitamina C). Verificați condițiile de utilizare în Registrul UE și nu indicați nicio doză care nu este pe eticheta producătorului.',
  },
  {
    id: 'EN-JOINTS',
    lang: 'en',
    severity: 'medium',
    pattern: anyOf(['for joints', 'for the joints', 'for your joints', 'for joint health', 'for healthy joints']),
    message: 'General joint claim. It needs a specific authorised claim; "joint" wording alone is not enough.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(1) and Art. 10(3).',
    suggestion: 'Use an authorised claim, e.g. "Vitamin C contributes to normal collagen formation for the normal function of cartilage" (only if the product is at least a source of vitamin C), or remove the wording. Check the conditions of use in the EU Register and do not state any dose that is not on the manufacturer\'s label.',
  },
  {
    id: 'RO-JOINTS',
    lang: 'ro',
    severity: 'medium',
    pattern: anyOf(['pentru articulatii', 'pentru articulatiile', 'pentru sanatatea articulatiilor', 'pentru articulatii sanatoase']),
    message: 'Declarație generală despre articulații. Necesită o declarație specifică autorizată; „articulații” singur nu este suficient.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(1) și art. 10(3).',
    suggestion: 'Folosiți o declarație autorizată, de exemplu „Vitamina C contribuie la formarea normală a colagenului pentru funcționarea normală a cartilajelor” (doar dacă produsul este cel puțin sursă de vitamina C), sau eliminați formularea. Verificați condițiile de utilizare în Registrul UE și nu indicați nicio doză care nu este pe eticheta producătorului.',
  },
  {
    id: 'EN-HEART',
    lang: 'en',
    severity: 'high',
    pattern: verbNear(['protect*', 'guard*', 'shield*', 'safeguard*'], ['heart', 'cardiovascular system', 'cardiovascular health']),
    message: 'Claim about protecting the heart, which implies preventing disease.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(1) and Art. 14; Reg. (EU) 1169/2011 Art. 7(3).',
    suggestion: 'Remove the claim. If appropriate use an authorised one, e.g. "EPA and DHA contribute to the normal function of the heart", ONLY with the conditions of use set in the EU Register (daily intake of EPA and DHA). Check the conditions of use in the EU Register and do not state any dose that is not on the manufacturer\'s label.',
  },
  {
    id: 'RO-HEART',
    lang: 'ro',
    severity: 'high',
    pattern: verbNear(['protej*', 'ocroteste', 'apara'], ['inima', 'inimii', 'sistemul cardiovascular', 'sanatatea cardiovasculara']),
    message: 'Declarație despre protejarea inimii, care sugerează prevenirea unei boli.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(1) și art. 14; Reg. (UE) 1169/2011 art. 7(3).',
    suggestion: 'Eliminați declarația. Dacă este cazul, folosiți una autorizată, de exemplu „EPA și DHA contribuie la funcționarea normală a inimii”, DOAR cu condițiile de utilizare din Registrul UE (aportul zilnic de EPA și DHA). Verificați condițiile de utilizare în Registrul UE și nu indicați nicio doză care nu este pe eticheta producătorului.',
  },
  {
    id: 'EN-ENERGY',
    lang: 'en',
    severity: 'low',
    pattern: new RegExp(
      `${BEFORE}(?:energy boost|energy and vitality|for energy and vitality|vitality)${AFTER}|` +
        verbNear(['boost*', 'increase*', 'give*', 'restore*'], ['energy', 'vitality']).source,
      'giu'
    ),
    message: 'General energy / vitality wording. It is allowed only together with a specific authorised claim.',
    legalBasis: 'Reg. (EC) 1924/2006 Art. 10(3).',
    suggestion: 'Add or use an authorised claim, e.g. "Iron / Magnesium / Vitamin C / B vitamins contribute to the reduction of tiredness and fatigue" (only if the product is at least a source of that nutrient). Check the conditions of use in the EU Register and do not state any dose that is not on the manufacturer\'s label.',
  },
  {
    id: 'RO-ENERGY',
    lang: 'ro',
    severity: 'low',
    pattern: new RegExp(
      `${BEFORE}(?:${['energie si vitalitate', 'impuls de energie', 'boost de energie', 'vitalitate'].map(lit).join('|')})${AFTER}|` +
        verbNear(['stimul*', 'cres*', 'ofera', 'reface*'], ['energi*', 'vitalitate*']).source,
      'giu'
    ),
    message: 'Formulare generală despre energie / vitalitate. Este permisă doar însoțită de o declarație specifică autorizată.',
    legalBasis: 'Reg. (CE) 1924/2006 art. 10(3).',
    suggestion: 'Adăugați sau folosiți o declarație autorizată, de exemplu „Fierul, magneziul, vitamina C, vitaminele B contribuie la reducerea oboselii și a extenuării” (doar dacă produsul este cel puțin sursă din acel nutrient). Verificați condițiile de utilizare în Registrul UE și nu indicați nicio doză care nu este pe eticheta producătorului.',
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
    message: 'The text does not say that the product is a food supplement. Source: Directive 2002/46/EC, transposed in Romania by Order no. 1069/2007.',
    legalBasis: 'Directive 2002/46/EC Art. 6(3)(a) (name of the product: "food supplement"), transposed in Romania by Order no. 1069/2007. In Romania: "supliment alimentar".',
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
    message: 'The recommended daily dose is missing. The dose must be taken only from the manufacturer\'s label; CounterSign never proposes a dose. Source: Directive 2002/46/EC, transposed in Romania by Order no. 1069/2007.',
    legalBasis: 'Directive 2002/46/EC Art. 6(3)(c) (recommended daily dose of the product), transposed in Romania by Order no. 1069/2007.',
    suggestion: {
      en: 'Add a line such as: "Recommended daily dose: [as stated on the manufacturer\'s label]". Fill in the dose only from the manufacturer\'s label.',
      ro: 'Adăugați o linie de tipul: „Doza zilnică recomandată: [conform etichetei producătorului]”. Completați doza doar de pe eticheta producătorului.',
    },
  },
  {
    id: 'MAND-EXCEED',
    severity: 'high',
    present: new RegExp(
      `(?:do not exceed|don't exceed|never exceed|not to exceed|nu depasiti|nu depășiți|a nu se depasi|a nu se depăși|nu se depaseste|nu se depășește)`,
      'iu'
    ),
    message: 'The warning not to exceed the stated recommended daily dose is missing. Source: Directive 2002/46/EC, transposed in Romania by Order no. 1069/2007.',
    legalBasis: 'Directive 2002/46/EC Art. 6(3)(d), transposed in Romania by Order no. 1069/2007.',
    suggestion: { en: 'Add: "Do not exceed the recommended daily dose."', ro: 'Adăugați: „A nu se depăși doza zilnică recomandată.”' },
  },
  {
    id: 'MAND-DIET',
    severity: 'high',
    present: new RegExp(
      `(?:substitute for a varied|varied and balanced diet|balanced and varied diet|varied diet|dieta variata|dieta variată|dieta echilibrata|dieta echilibrată|regim alimentar variat|alimentatie variata|alimentație variată|alimentatie echilibrata|alimentație echilibrată)`,
      'iu'
    ),
    message: 'The statement that supplements should not replace a varied diet / healthy lifestyle is missing. Source: Directive 2002/46/EC, transposed in Romania by Order no. 1069/2007.',
    legalBasis: 'Directive 2002/46/EC Art. 6(3)(d), transposed in Romania by Order no. 1069/2007.',
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
    message: 'The statement to keep the product out of the reach of (young) children is missing. Source: Directive 2002/46/EC, transposed in Romania by Order no. 1069/2007.',
    legalBasis: 'Directive 2002/46/EC Art. 6(3)(e), transposed in Romania by Order no. 1069/2007.',
    suggestion: { en: 'Add: "Keep out of the reach of young children."', ro: 'Adăugați: „A nu se lăsa la îndemâna copiilor mici.”' },
  },
  // ---- Presence rules added after review question 3. They only look for the PRESENCE of a topic in the text:
  // CounterSign cannot see bold text or tables as formatting and cannot judge that what is written is correct.
  // Batch number and best-before date are intentionally NOT checked: for distance selling they are not required before purchase.
  {
    id: 'MAND-INGREDIENTS',
    severity: 'medium',
    present: /(?<![\p{L}])(?:ingredient\p{L}*|compozi[tț]ie|composition)(?![\p{L}])/iu,
    message: 'No list of ingredients was found. It must be available before purchase (distance selling).',
    legalBasis: 'Reg. (EU) 1169/2011 Art. 9(1)(b) (mandatory particulars) and Art. 14 (distance selling: required before purchase); Directive 2002/46/EC Art. 8.',
    suggestion: {
      en: 'Add: "Ingredients: [full list as on the manufacturer\'s label]". Copy the content from the manufacturer\'s label; CounterSign never invents it.',
      ro: 'Adăugați: „Ingrediente: [lista completă de pe eticheta producătorului]”. Copiați conținutul de pe eticheta producătorului; CounterSign nu îl inventează.',
    },
  },
  {
    id: 'MAND-ALLERGENS',
    severity: 'medium',
    present: /(?<![\p{L}])(?:allergen\p{L}*|alergen\p{L}*|allergy|alergi\p{L}*|may contain|poate con[tț]ine|gluten)(?![\p{L}])/iu,
    message: 'No allergen information was found. Any allergen in the list of ingredients must be emphasised (for example in bold). CounterSign cannot see formatting: if the product has no allergenic ingredient this may not apply, but check it.',
    legalBasis: 'Reg. (EU) 1169/2011 Art. 9(1)(c) (mandatory particulars) and Art. 14 (distance selling: required before purchase); Directive 2002/46/EC Art. 8.',
    suggestion: {
      en: 'In the ingredients list, emphasise each allergen (for example in bold) and, if useful, add: "Allergens: [as on the manufacturer\'s label]". Copy the content from the manufacturer\'s label; CounterSign never invents it.',
      ro: 'În lista de ingrediente evidențiați fiecare alergen (de exemplu cu aldin) și, dacă e util, adăugați: „Alergeni: [conform etichetei producătorului]”. Copiați conținutul de pe eticheta producătorului; CounterSign nu îl inventează.',
    },
  },
  {
    id: 'MAND-NUTRIENTS',
    severity: 'medium',
    present: /(?<![\p{L}])(?:nrv|vnr|%\s?ri|%\s?rdi|amount per|per daily dose|per capsule|per tablet|per serving|pe doz[aă]|pe capsul[aă]|pe por[tț]ie|nutrition(?:al)? (?:information|facts)|valori nutri[tț]ionale|informa[tț]ii nutri[tț]ionale)(?![\p{L}])/iu,
    message: 'No amount of nutrients or active substances per daily dose was found, and no %NRV (nutrient reference value) for vitamins and minerals.',
    legalBasis: 'Reg. (EU) 1169/2011 Art. 9(1)(l) and Art. 14 (distance selling: required before purchase); Directive 2002/46/EC Art. 8 (amounts of nutrients per daily dose and %NRV).',
    suggestion: {
      en: 'Add a table: for each nutrient or active substance the amount per daily dose, and for vitamins and minerals the % of the NRV: "[amount per daily dose] ([%NRV])". Copy the content from the manufacturer\'s label; CounterSign never invents it.',
      ro: 'Adăugați un tabel: pentru fiecare nutrient sau substanță activă cantitatea per doză zilnică, iar pentru vitamine și minerale %VNR: „[cantitate per doză zilnică] ([%VNR])”. Copiați conținutul de pe eticheta producătorului; CounterSign nu îl inventează.',
    },
  },
  {
    id: 'MAND-MANUFACTURER',
    severity: 'medium',
    present: /(?<![\p{L}])(?:manufactur\p{L}*|distribut\p{L}*|produced by|packed by|marketed by|importer|importator\p{L}*|produc[aă]tor\p{L}*|fabricat\p{L}*|ambalat\p{L}*)(?![\p{L}])/iu,
    message: 'The name and address of the manufacturer or distributor were not found.',
    legalBasis: 'Reg. (EU) 1169/2011 Art. 9(1)(h) (mandatory particulars) and Art. 14 (distance selling: required before purchase); Directive 2002/46/EC Art. 8.',
    suggestion: {
      en: 'Add: "Manufactured / distributed by: [name and address as on the label]". Copy the content from the manufacturer\'s label; CounterSign never invents it.',
      ro: 'Adăugați: „Producător / distribuitor: [numele și adresa de pe etichetă]”. Copiați conținutul de pe eticheta producătorului; CounterSign nu îl inventează.',
    },
  },
  {
    id: 'MAND-NETQTY',
    severity: 'low',
    present: /(?:net (?:quantity|content|weight)|cantitate net[aă]|con[tț]inut net|\d+\s?(?:capsul\p{L}*|capsules?|tablets?|comprimat\p{L}*|softgels?|gummies|sachets?|plic\p{L}*|picaturi|picături|drops|ml|g|kg)(?![\p{L}]))/iu,
    message: 'The net quantity (for example the number of capsules or the volume) was not found.',
    legalBasis: 'Reg. (EU) 1169/2011 Art. 9(1)(e) (mandatory particulars) and Art. 14 (distance selling: required before purchase); Directive 2002/46/EC Art. 8.',
    suggestion: {
      en: 'Add: "Net quantity: [number of capsules / volume, as on the label]". Copy the content from the manufacturer\'s label; CounterSign never invents it.',
      ro: 'Adăugați: „Cantitate netă: [numărul de capsule / volumul, conform etichetei]”. Copiați conținutul de pe eticheta producătorului; CounterSign nu îl inventează.',
    },
  },
  {
    // OPTIONAL suggestion only (type "recommended" in the result): never required by this tool.
    id: 'REC-NOTIFICATION',
    type: 'recommended',
    severity: 'low',
    present: /(?<![\p{L}])(?:notific\p{L}*|ansvsa|iba)(?![\p{L}])/iu,
    message: 'Optional suggestion, NOT a requirement of this tool: if your product has a notification number (IBA / ANSVSA), you may mention it on the page.',
    legalBasis: 'Optional. Check the national notification rules for food supplements with your regulatory person.',
    suggestion: {
      en: 'If it applies, add: "Notification number: [as given by the authority]". Otherwise ignore this suggestion.',
      ro: 'Dacă este cazul, adăugați: „Număr de notificare: [cel primit de la autoritate]”. Altfel ignorați această sugestie.',
    },
  },
];
