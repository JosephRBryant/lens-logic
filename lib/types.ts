export interface AnalysisResult {
  claim: string;
  classification: string;
  assumptions: string[];
  variables: string[];
  perspectives: string[];
  conclusion: string;
  hingesOn: string;
  breaksIf: string;
  holdsWhen: string;
  stronger: string;
  weaker: string;
  coreQuestion: string;
  counterargument: string;
  article: string;
}

export interface ClaimStructure {
  subject: string;
  relation: string;
  object: string;
  concepts: string[];
}

/**
 * Lowercases a phrase for template interpolation while preserving known
 * acronyms and initialisms (AI, GDP, KPI, etc.).
 */
export function smartLower(phrase: string): string {
  return phrase.replace(/\S+/g, word => {
    // Preserve all-caps words of 2-4 chars (acronyms: AI, GDP, KPI, STEM, etc.)
    if (/^[A-Z]{2,4}$/.test(word)) return word;
    return word.toLowerCase();
  });
}

/**
 * Returns true if the phrase reads like a clean noun/entity suitable for
 * template interpolation (e.g. "remote work", "employee productivity").
 * Returns false for sentence fragments, verb phrases, or clause remnants
 * (e.g. "happier when they have more choices", "will fundamentally").
 */
export function isNounLike(phrase: string): boolean {
  if (phrase.length > 40) return false;
  // Negation, bare infinitive, or filler adverb at the start — these never
  // open a noun phrase.  Comparative adjectives (higher, better, more, etc.)
  // are intentionally omitted: they legitimately modify nouns ("higher taxes",
  // "better outcomes") and the fragment cases they used to guard against are
  // already caught by the clause-marker and pronoun checks below.
  if (/^(not |no longer |be |likely |very |really |also |just )/i.test(phrase)) return false;
  // Past participle left over from verb-split extraction
  if (/^(prioritized|valued|preferred|allowed|required|considered|expected|designed|defined|measured|compared|replaced|improved|reduced|increased)\b/i.test(phrase)) return false;
  // Modal/auxiliary verbs indicate a verb fragment, not a noun phrase
  if (/\b(will|would|could|should|shall|can|may|might|must|does|did)\b/i.test(phrase)) return false;
  // Clause markers signal a sentence fragment, not a noun phrase
  if (/\b(when|if|because|while|although|unless|until|where|whether|since)\b/i.test(phrase)) return false;
  // Pronouns signal a dependent clause
  if (/\b(they|them|their|you|your|we|our|its)\b/i.test(phrase)) return false;
  // Predicate adjective phrases: "bad for society", "good for children",
  // "essential for democracy" — an adjective followed by a preposition is a
  // predicate, not a noun phrase.  Also catches bare participial adjectives
  // ("overrated", "fundamentally flawed") and gerund predicates ("destroying
  // the economy").
  // Predicate adjective phrases: "bad for society", "overrated", "fundamentally
  // flawed".  Only triggers when the adjective is the last content word (bare
  // predicate) — "important issue" passes because a noun follows.
  if (/^(\w+ly\s+)?(bad|good|great|essential|important|necessary|harmful|beneficial|dangerous|critical|vital|wrong|right|true|false|overrated|underrated|flawed|broken|dead|obsolete)\s*$/i.test(phrase)) return false;
  // Gerund predicates: "destroying the economy", "ruining attention spans"
  if (/^(\w+ly\s+)?(destroying|ruining|hurting|killing|undermining|eroding|threatening|worsening|improving|helping)\b/i.test(phrase)) return false;
  // Object complement: "employees more productive", "workers less efficient" —
  // a noun followed by "more/less" + adjective-suffix word is a causative
  // complement, not a noun phrase.
  if (/\S+\s+(more|less)\s+\w*(ive|ent|ful|ous|ant|ble|cal|tic|ate)\s*$/i.test(phrase)) return false;
  // Adjective + preposition = predicate, not noun phrase: "bad for society",
  // "essential for democracy".  Excludes common noun+prep phrases like "need for".
  if (/^\w+\s+(for|to|about)\s+/i.test(phrase) && !/^(need|plan|push|bid|call|case|basis|reason|argument|time|room)\s/i.test(phrase)) return false;
  return true;
}

/** Subject-verb agreement: returns "is" or "are" based on plurality heuristic. */
export function isAre(subject: string): string {
  const s = subject.toLowerCase().trim();
  if (/s$/.test(s) && !/ss$|us$|is$/.test(s)) return "are";
  if (/people|children|workers|employees|companies|meetings|games/.test(s)) return "are";
  return "is";
}

/** Subject-verb agreement: returns "does" or "do" based on plurality heuristic. */
export function doesDo(subject: string): string {
  const s = subject.toLowerCase().trim();
  if (/s$/.test(s) && !/ss$|us$|is$/.test(s)) return "do";
  if (/people|children|workers|employees|companies|meetings|games/.test(s)) return "do";
  return "does";
}

export interface ClaimTraits {
  isCausal: boolean;
  isPredictive: boolean;
  isNormative: boolean;
  isComparative: boolean;
  isAbsolute: boolean;
  hasTradeoff: boolean;
  isShort: boolean;
  hasNumbers: boolean;
  isQuestion: boolean;
  domainWork: boolean;
  domainTech: boolean;
  domainEducation: boolean;
  domainEcon: boolean;
  domainPolicy: boolean;
  domainHealth: boolean;
  domainProductivity: boolean;
}
