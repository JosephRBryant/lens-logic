import type { AnalysisResult, ClaimStructure } from "./types";

function seed(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(options: T[], s: number, offset = 0): T {
  return options[(s + offset) % options.length];
}

function claimTypeFrom(analysis: AnalysisResult): string {
  const c = analysis.classification.toLowerCase();
  if (/nuanced/.test(c)) return "nuanced";
  if (/causal/.test(c)) return "causal";
  if (/predictive/.test(c)) return "predictive";
  if (/normative/.test(c)) return "normative";
  return "general";
}

// Subject-verb agreement: "does" for singular, "do" for plural
function doesDo(subject: string): string {
  const s = subject.toLowerCase().trim();
  // Common plural patterns
  if (/s$/.test(s) && !/ss$|us$|is$/.test(s)) return "do";
  if (/people|children|workers|employees|companies|meetings|games/.test(s)) return "do";
  return "does";
}

function isAre(subject: string): string {
  const s = subject.toLowerCase().trim();
  if (/s$/.test(s) && !/ss$|us$|is$/.test(s)) return "are";
  if (/people|children|workers|employees|companies|meetings|games/.test(s)) return "are";
  return "is";
}

export function generateStrongerClaim(claim: string, analysis: AnalysisResult): string {
  const s = seed(claim);

  // Use the top assumption to add a qualifier
  const topAssumption = analysis.assumptions[0] || "";
  const topVariable = analysis.variables[0] || "";

  // Extract a scope qualifier from the top variable
  const scopeQualifiers = buildScopeQualifiers(analysis, s);
  const conditionClause = buildConditionClause(analysis, s);

  // Strip trailing period from claim for reconstruction
  const base = claim.replace(/\.+$/, "").trim();

  // Build a version that narrows scope and adds conditions
  if (scopeQualifiers && conditionClause) {
    return `${scopeQualifiers}, ${lowerFirst(base)}, ${conditionClause}.`;
  } else if (scopeQualifiers) {
    return `${scopeQualifiers}, ${lowerFirst(base)}.`;
  } else if (conditionClause) {
    return `${base}, ${conditionClause}.`;
  }

  // Type-aware fallback
  const type = claimTypeFrom(analysis);
  const typeFallbacks: Record<string, string[]> = {
    causal: [
      `Under controlled conditions, ${lowerFirst(base)}, though the mechanism likely depends on context.`,
      `When confounders are accounted for, ${lowerFirst(base)}, at least in well-studied cases.`,
    ],
    predictive: [
      `Within the next decade and assuming current trends hold, ${lowerFirst(base)}.`,
      `If adoption continues at its current pace, ${lowerFirst(base)}, though the timeline remains uncertain.`,
    ],
    normative: [
      `When evaluated by the standards the claim implies, ${lowerFirst(base)}.`,
      `For those who prioritize the values embedded in this claim, ${lowerFirst(base)}.`,
    ],
    nuanced: [
      `When both sides of the tradeoff are given equal weight, ${lowerFirst(base)}.`,
      `Under conditions where the competing factors are transparently measured, ${lowerFirst(base)}.`,
    ],
  };
  const generalFallbacks = [
    `Under specific conditions, ${lowerFirst(base)}, though the effect likely varies by context.`,
    `There is evidence to suggest that ${lowerFirst(base)}, at least in certain well-defined contexts.`,
    `${base} — when measured under controlled conditions and with clearly defined terms.`,
  ];
  const fallbacks = [...(typeFallbacks[type] || []), ...generalFallbacks];
  return pick(fallbacks, s, 0);
}

export function generateWeakerClaim(claim: string, analysis: AnalysisResult): string {
  const s = seed(claim);
  const base = claim.replace(/\.+$/, "").trim();

  // Exaggerate by removing nuance and adding absolutes
  const absolutes = buildAbsoluteVersion(base, analysis, s);
  if (absolutes) return absolutes;

  // Type-aware weaker fallback
  const type = claimTypeFrom(analysis);
  const typeFallbacks: Record<string, string[]> = {
    causal: [
      `${base} — regardless of context, confounders, or mechanism.`,
      `${base}, and no other factor plays any meaningful role.`,
    ],
    predictive: [
      `${base} — this will definitely happen, and no force can stop it.`,
      `${base}. The timeline is certain and adaptation is impossible.`,
    ],
    normative: [
      `${base} — and anyone who disagrees has their priorities fundamentally wrong.`,
      `${base}. There is no legitimate value framework under which this isn't true.`,
    ],
    nuanced: [
      `${base} — and the other side of the tradeoff doesn't matter at all.`,
      `${base}. The costs are zero and the benefits are absolute.`,
    ],
  };
  const generalFallbacks = [
    `${base} — always, in every case, without exception.`,
    `It is undeniable that ${lowerFirst(base)}, and anyone who disagrees is simply ignoring the evidence.`,
    `${base}. This is universally true and no reasonable person could argue otherwise.`,
  ];
  const fallbacks = [...(typeFallbacks[type] || []), ...generalFallbacks];
  return pick(fallbacks, s, 1);
}

export function generateCoreQuestion(claim: string, analysis: AnalysisResult, structure?: ClaimStructure): string {
  const s = seed(claim);
  const subj = structure?.subject || "";
  const obj = structure?.object || "";
  const shortSubj = subj.length > 40 ? "" : subj;
  const shortObj = obj.length > 40 ? "" : obj;
  const topVar = analysis.variables[0]?.toLowerCase() || "";

  // Classification-aware question generation
  const classLower = analysis.classification.toLowerCase();
  const isCausal = /causal/.test(classLower);
  const isPredictive = /predictive/.test(classLower);
  const isNormative = /normative/.test(classLower);
  const isComparative = /comparative/.test(classLower);
  const isNuanced = /nuanced/.test(classLower);

  if (isCausal && shortSubj && shortObj) {
    const altFactor = extractAlternativeFactor(topVar, shortSubj);
    if (altFactor) {
      return pick([
        `What matters more for ${shortObj}: ${shortSubj}, or ${altFactor}?`,
        `${isAre(shortObj).charAt(0).toUpperCase() + isAre(shortObj).slice(1)} ${shortObj} primarily driven by ${shortSubj}, or by ${altFactor}?`,
        `Under what conditions ${doesDo(shortSubj)} ${shortSubj} actually improve ${shortObj}, and when not?`,
        `What would have to be true for ${shortSubj} — rather than ${altFactor} — to be the real cause?`,
        `If you controlled for ${altFactor}, would ${shortSubj} still predict ${shortObj}?`,
      ], s, 13);
    }
    return pick([
      `Under what conditions ${doesDo(shortSubj)} ${shortSubj} actually affect ${shortObj}?`,
      `${isAre(shortObj).charAt(0).toUpperCase() + isAre(shortObj).slice(1)} ${shortObj} really driven by ${shortSubj}, or is something else doing the work?`,
      `What would change your mind about whether ${shortSubj} causes ${shortObj}?`,
      `What assumption matters most for the link between ${shortSubj} and ${shortObj}?`,
      `What is the most important unknown in the relationship between ${shortSubj} and ${shortObj}?`,
    ], s, 14);
  }

  if (isCausal && !shortSubj) {
    return pick([
      `Is the cause-and-effect relationship here real, or are we looking at a coincidence shaped by other factors?`,
      `What would have to be true for the claimed causal link to actually hold?`,
      `What would make this causal claim fail?`,
      `What is the most important unknown behind this cause-and-effect story?`,
      `What condition matters most for this causal claim to work?`,
    ], s, 15);
  }

  if (isPredictive && shortSubj) {
    return pick([
      `What would have to be true for ${shortSubj} to actually play out as predicted?`,
      `Is the trend around ${shortSubj} genuinely accelerating, or are we over-reading a temporary pattern?`,
      `If this prediction about ${shortSubj} is off by a decade, does that change the conclusion?`,
      `What is the real point of tension behind this forecast about ${shortSubj}?`,
      `What would make this prediction about ${shortSubj} fail entirely?`,
    ], s, 16);
  }

  if (isPredictive) {
    return pick([
      `What would have to change for this prediction to fail entirely?`,
      `Are we extrapolating from a real trend, or from a temporary moment?`,
      `What is the most important unknown behind this forecast?`,
      `What condition matters most for this prediction to come true?`,
      `What would change your mind about whether this will happen?`,
    ], s, 17);
  }

  if (isNuanced) {
    return pick([
      `Which side of this tradeoff matters more — and does the answer change depending on who you ask?`,
      `Are the two outcomes being traded off here actually on the same scale, or is the comparison misleading?`,
      `If both sides of this tradeoff are real, what would a genuine compromise look like?`,
      `What is this claim really testing underneath the surface?`,
      `What is the real point of tension behind this idea?`,
    ], s, 18);
  }

  if (isNormative && shortSubj) {
    return pick([
      `By whose standards is ${shortSubj} being judged — and would a different framework flip the conclusion?`,
      `Is the disagreement about ${shortSubj} really about facts, or about what we think matters?`,
      `What does this claim depend on that isn't being stated about ${shortSubj}?`,
      `What assumption matters most in the judgment about ${shortSubj}?`,
      `What would change your mind about whether ${shortSubj} is the right call?`,
    ], s, 19);
  }

  if (isNormative) {
    return pick([
      `Is this really a factual disagreement, or a disagreement about values dressed up as one?`,
      `Whose definition of "worth" is doing the work here?`,
      `What does this claim depend on that isn't being stated?`,
      `What assumption matters most here?`,
      `What is this claim actually trying to prove?`,
    ], s, 20);
  }

  if (isComparative && shortSubj) {
    return pick([
      `Are the things being compared to ${shortSubj} actually measured on the same terms?`,
      `Does the comparison hold if you change the timeframe, population, or metric?`,
    ], s, 21);
  }

  // Fallback — only use the variable if it's short and noun-like
  const cleanVar = topVar.split(/\s*[—–:]\s*/)[0].trim();
  if (cleanVar && cleanVar.length < 40 && shortSubj && !/^(whether|how|who|what|the timeframe)/i.test(cleanVar)) {
    return `How much ${doesDo(cleanVar)} ${cleanVar} change the picture for ${shortSubj}?`;
  }

  return pick([
    `Under what specific conditions would this claim hold, and when would it break down?`,
    `What would have to be true for this claim to hold?`,
    `What is the most important thing this claim leaves unstated?`,
    `What would make this claim fail?`,
    `What condition matters most for this claim to work?`,
  ], s, 22);
}

// --- Helpers ---

function buildScopeQualifiers(a: AnalysisResult, s: number): string {
  // Derive scope from variables
  if (a.variables.length === 0) return "";

  const v = a.variables[0].toLowerCase();

  if (/industry|sector|type of work/.test(v)) {
    return pick([
      "In knowledge-work industries",
      "For roles that involve independent focused work",
      "In sectors where output is individually measurable",
    ], s, 3);
  }
  if (/culture|management|organi/.test(v)) {
    return pick([
      "In organizations with high-trust management cultures",
      "Where management practices support autonomy",
    ], s, 4);
  }
  if (/field of study|institution/.test(v)) {
    return pick([
      "For students in high-earning fields at selective institutions",
      "In fields with clear career pipelines",
    ], s, 5);
  }
  if (/economic|cycle|market/.test(v)) {
    return pick([
      "Under current economic conditions",
      "In stable market environments",
    ], s, 6);
  }
  if (/adoption|technology/.test(v)) {
    return pick([
      "At the current pace of adoption",
      "In industries where the technology is already mature",
    ], s, 7);
  }
  if (/tradeoff|weight|framing/.test(v)) {
    return pick([
      "When the tradeoffs are weighed on clearly stated criteria",
      "If the competing priorities are given equal scrutiny",
    ], s, 8);
  }

  return "";
}

function buildConditionClause(a: AnalysisResult, s: number): string {
  // Derive conditions from assumptions
  if (a.assumptions.length < 2) return "";

  const assumption = a.assumptions[1].toLowerCase();

  if (/confound|variable|other factor/.test(assumption)) {
    return pick([
      "provided other contributing factors are controlled for",
      "assuming confounding variables are accounted for",
    ], s, 9);
  }
  if (/timeline|pace|how fast/.test(assumption)) {
    return pick([
      "over the next five to ten years",
      "within a clearly defined timeframe",
    ], s, 10);
  }
  if (/value|framework|criteria|what counts/.test(assumption)) {
    return pick([
      "when evaluated by the criteria most relevant to the affected population",
      "judged by the standards that matter most to those involved",
    ], s, 11);
  }
  if (/competing|tradeoff|outweigh/.test(assumption)) {
    return pick([
      "when both sides of the tradeoff are given equal weight",
      "assuming the costs and benefits are measured transparently",
    ], s, 12);
  }

  return "";
}

function buildAbsoluteVersion(base: string, a: AnalysisResult, s: number): string {
  const lowBase = base.toLowerCase();

  // If claim already has nuance, strip it
  if (/\b(although|however|but|while|though|despite)\b/i.test(base)) {
    // Find the main assertion after the concession
    const parts = base.split(/\b(?:although|however|but|while|though|despite)\b/i);
    const mainPart = parts.length > 1 ? parts[parts.length - 1].trim() : base;
    const cleaned = mainPart.replace(/^[,\s]+/, "");
    return `${cleaned.charAt(0).toUpperCase() + cleaned.slice(1).replace(/\.+$/, "")} — always, without exception, and anyone who claims otherwise is simply wrong.`;
  }

  // Add universal qualifiers
  if (/\b(some|many|often|sometimes|can|may|might)\b/i.test(base)) {
    const exaggerated = base
      .replace(/\b(some|many)\b/gi, "all")
      .replace(/\b(often|sometimes)\b/gi, "always")
      .replace(/\b(can|may|might)\b/gi, "will")
      .replace(/\.+$/, "");
    return `${exaggerated}, without exception.`;
  }

  // Generic overgeneralization
  return "";
}

// Extract a concrete alternative factor from the top variable, contrasting with the subject
function extractAlternativeFactor(topVar: string, subj: string): string {
  if (!topVar) return "";
  // Don't use the variable if it's too similar to the subject
  if (topVar.includes(subj.toLowerCase())) return "";

  if (/industry|sector|type of work/.test(topVar)) return "the type of work being done";
  if (/culture|management|organi/.test(topVar)) return "management culture";
  if (/collaborat|independent|hybrid/.test(topVar)) return "the nature of the role";
  if (/adoption|technology/.test(topVar)) return "the pace of adoption";
  if (/field of study|institution/.test(topVar)) return "field of study and institution";
  if (/debt|financial/.test(topVar)) return "financial circumstances";
  if (/economic|cycle|market/.test(topVar)) return "economic conditions";
  if (/politic|institutional/.test(topVar)) return "political context";
  if (/genetic|lifestyle/.test(topVar)) return "individual variation";
  if (/tradeoff|weight|framing/.test(topVar)) return "how the tradeoff is framed";
  if (/productiv|measur/.test(topVar)) return "how productivity is measured";
  if (/regulat/.test(topVar)) return "the regulatory environment";

  // Use the variable directly if it's short enough
  if (topVar.length <= 35) return topVar;
  return "";
}

function lowerFirst(s: string): string {
  if (!s) return s;
  if (/^[A-Z]{2,}/.test(s)) return s;
  if (/^"/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
