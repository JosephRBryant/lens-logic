import type { AnalysisResult, ClaimTraits, ClaimStructure } from "./types";

// Simple seeded variation based on claim text — deterministic per input but varied across inputs
function seed(claim: string): number {
  let h = 0;
  for (let i = 0; i < claim.length; i++) {
    h = ((h << 5) - h + claim.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(options: T[], s: number, offset = 0): T {
  return options[(s + offset) % options.length];
}

// --- Readability guard ---
// A phrase is "too long to interpolate" if it:
//   - exceeds 40 characters, OR
//   - contains 2+ commas, OR
//   - contains conjunction-heavy wording (and...and, or...or, that...that)
const MAX_INTERPOLATION_LENGTH = 40;

function isTooLong(phrase: string): boolean {
  if (phrase.length > MAX_INTERPOLATION_LENGTH) return true;
  if ((phrase.match(/,/g) || []).length >= 2) return true;
  if (/\b(and|or)\b.*\b(and|or)\b/i.test(phrase)) return true;
  if (/\bthat\b.*\bthat\b/i.test(phrase)) return true;
  return false;
}

function safeSubj(raw: string, s: number): string {
  if (!isTooLong(raw)) return raw;
  return pick(["the claim", "this position", "the arrangement described", "the approach in question"], s, 0);
}

function safeObj(raw: string, s: number): string {
  if (!isTooLong(raw)) return raw;
  return pick(["the outcome in question", "the expected result", "the effects being discussed", "the goals at stake"], s, 1);
}

export function analyzeClaimSimulated(
  claim: string,
  traits: ClaimTraits,
  structure: ClaimStructure,
): AnalysisResult {
  const s = seed(claim);
  const subj = safeSubj(structure.subject, s);
  const obj = safeObj(structure.object, s);

  // Short raw subject for variable naming — first few noun words from the subject, stripped of verbs
  const rawSubjShort = structure.subject
    .split(/\s+/)
    .filter(w => !/^(is|are|was|were|makes?|does|has|have|should|must|will|can|could|would|be|been|being)$/i.test(w))
    .slice(0, 3)
    .join(" ")
    .toLowerCase() || structure.subject.split(/\s+/).slice(0, 2).join(" ").toLowerCase();

  const classification = simulateClassification(traits, s);
  const assumptions = simulateAssumptions(claim, traits, subj, obj, s);
  const variables = simulateVariables(traits, subj, s, rawSubjShort);
  const perspectives = simulatePerspectives(traits, subj, obj, s);
  const conclusion = simulateConclusion(classification, assumptions, variables, s);

  return { claim, classification, assumptions, variables, perspectives, conclusion, hingesOn: "", breaksIf: "", holdsWhen: "", stronger: "", weaker: "", coreQuestion: "", counterargument: "", article: "" };
}

function simulateClassification(traits: ClaimTraits, s: number): string {
  const types: string[] = [];
  if (traits.isCausal) types.push("causal");
  if (traits.isPredictive) types.push("predictive");
  if (traits.isNormative) types.push("normative");
  if (traits.isComparative) types.push("comparative");
  if (traits.isAbsolute) types.push("broad");
  if (traits.hasTradeoff) types.push("nuanced");
  if (traits.isQuestion) types.push("interrogative");

  const domains: string[] = [];
  if (traits.domainWork) domains.push("work and employment");
  if (traits.domainTech) domains.push("technology");
  if (traits.domainEducation) domains.push("education");
  if (traits.domainEcon) domains.push("economics and finance");
  if (traits.domainPolicy) domains.push("public policy");
  if (traits.domainHealth) domains.push("health and wellbeing");
  if (traits.domainProductivity) domains.push("productivity");

  const typeStr = types.length > 0 ? types.join(" and ") : "general";
  const domainStr = domains.length > 0 ? domains.join(", ") : "general topics";

  const templates = [
    `This is primarily a ${typeStr} claim, touching on ${domainStr}.`,
    `A ${typeStr} argument centered on ${domainStr}.`,
    `The claim makes a ${typeStr} case related to ${domainStr}.`,
    `This reads as a ${typeStr} statement in the area of ${domainStr}.`,
  ];

  return pick(templates, s);
}

function simulateAssumptions(
  claim: string,
  traits: ClaimTraits,
  subj: string,
  obj: string,
  s: number,
): string[] {
  const pool: string[][] = [];

  if (traits.isCausal) {
    pool.push([
      `This takes for granted that ${subj} is a meaningful driver of ${obj}, rather than a minor or incidental factor.`,
      `There's an embedded assumption that the relationship between ${subj} and ${obj} is causal, not merely coincidental.`,
      `The claim presupposes that changes in ${subj} reliably produce changes in ${obj}.`,
      `It treats ${subj} as the active ingredient, but there may be deeper causes at play.`,
    ]);
  }

  if (traits.isPredictive) {
    pool.push([
      `The prediction assumes that conditions driving ${subj} today will persist long enough for the forecast to play out.`,
      `It takes for granted that we can extrapolate from current trends involving ${subj} to future outcomes.`,
      `There's an implicit assumption about the timeline — how fast or slow changes around ${subj} will unfold.`,
      `The forecast leans on the idea that no major disruption will alter the trajectory of ${subj}.`,
    ]);
  }

  if (traits.isNormative) {
    pool.push([
      `The judgment assumes a particular framework for what counts as good, right, or worthwhile regarding ${subj}.`,
      `Not everyone would agree on the values underlying this claim — that's a hidden assumption.`,
      `It presupposes that the audience shares a common standard for evaluating ${subj}.`,
    ]);
  }

  if (traits.isComparative) {
    pool.push([
      `The comparison assumes we're measuring ${subj} and its alternative on the same terms.`,
      `It takes for granted that the comparison is apples-to-apples, but that may not hold across different contexts.`,
    ]);
  }

  if (traits.isAbsolute) {
    pool.push([
      `The sweeping language assumes the pattern described holds uniformly, with no meaningful exceptions.`,
      `By using broad terms, the claim assumes a consistency that may not exist across very different situations.`,
    ]);
  }

  if (traits.hasTradeoff) {
    pool.push([
      `The argument assumes the benefits of one arrangement outweigh the drawbacks, though reasonable people could disagree.`,
      `It assumes the competing outcomes can be weighed cleanly against each other, when in practice they may be incommensurable.`,
      `While the claim acknowledges tension, it ultimately assumes one side of the tradeoff clearly wins.`,
      `The tradeoff framing assumes both sides have been fairly represented, but the scales may be tilted by how the question is framed.`,
    ]);
  }

  if (traits.hasNumbers) {
    pool.push([
      `The cited figures are taken at face value — their source, recency, and representativeness are assumed.`,
    ]);
  }

  if (traits.isShort) {
    pool.push([
      `The brevity of the claim leaves a lot unsaid — scope, context, and qualifiers are all absent.`,
    ]);
  }

  // Flatten and select with variation
  const flat = pool.flat();
  if (flat.length === 0) {
    return [
      "The claim assumes its key terms are understood the same way by all readers.",
      "It presupposes the underlying evidence is solid and representative.",
    ];
  }

  // Pick items with spread — not just first N
  const selected: string[] = [];
  const step = Math.max(1, Math.floor(flat.length / 4));
  for (let i = 0; i < flat.length && selected.length < 4; i += step) {
    selected.push(flat[(s + i) % flat.length]);
  }
  return [...new Set(selected)];
}

function simulateVariables(traits: ClaimTraits, subj: string, s: number, rawSubj?: string): string[] {
  const varSubj = rawSubj || subj;
  const pool: string[] = [];

  if (traits.domainWork) {
    pool.push(
      "The specific industry and type of work involved",
      "Organizational culture and management approach",
      "Whether roles are collaborative, independent, or hybrid",
    );
  }
  if (traits.domainTech) {
    pool.push(
      "How far along adoption of the technology actually is in practice",
      "Regulatory responses that could accelerate or slow things down",
      "Whether historical tech predictions in this area have been accurate",
    );
  }
  if (traits.domainEducation) {
    pool.push(
      "The specific field of study and institution quality",
      "Regional differences in job markets and earning potential",
      "Student debt levels and family financial circumstances",
    );
  }
  if (traits.domainEcon) {
    pool.push(
      "Where we are in the economic cycle",
      "How costs and benefits are distributed across income groups",
    );
  }
  if (traits.domainPolicy) {
    pool.push(
      "The political environment and institutional capacity to implement",
      "Who bears the costs versus who receives the benefits",
    );
  }
  if (traits.domainHealth) {
    pool.push(
      "Individual variation in genetics, lifestyle, and baseline health",
      "Access to healthcare and socioeconomic factors",
    );
  }
  if (traits.domainProductivity) {
    pool.push(
      "How productivity is being defined and measured in this context",
      "The baseline period and whether comparisons are fair",
    );
  }

  if (traits.hasTradeoff) {
    pool.push(
      "How much weight each side of the tradeoff is given",
      "Whether the framing of the tradeoff is itself biased toward one conclusion",
    );
  }

  if (traits.isCausal && pool.length < 4) {
    pool.push(`Whether something other than ${varSubj} is actually driving the observed effect`);
  }
  if (traits.isPredictive && pool.length < 4) {
    pool.push("The actual timeline — predictions without dates are hard to evaluate");
  }
  if (traits.hasNumbers) {
    pool.push("Data source reliability, sample size, and methodology");
  }

  if (pool.length === 0) {
    // Claim-specific variables based on what kind of claim it is
    pool.push(
      `What exactly counts as "${varSubj}" — the definition matters more than it seems`,
      "Who this applies to — age, background, and circumstances likely change the result",
      "Whether this has been tested in controlled settings or is based on informal observation",
      "The timeframe being considered — short-term effects and long-term effects may differ",
      "Whether alternative explanations have been ruled out",
    );
  }
  // Ensure minimum of 3 variables
  if (pool.length < 3) {
    pool.push(
      "How the outcome is being measured — different metrics could tell different stories",
      "Whether the effect persists across different populations and settings",
    );
  }

  const count = Math.min(pool.length, 3 + (s % 2));
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(pool[(s + i) % pool.length]);
  }
  return [...new Set(result)];
}

function simulatePerspectives(
  traits: ClaimTraits,
  subj: string,
  obj: string,
  s: number,
): string[] {
  const pool: string[] = [];

  if (traits.isCausal) {
    const causalFor = [
      `People who've seen ${subj} work firsthand may find this claim obvious — their experience backs it up.`,
      `Research in this area does suggest a meaningful link, giving the claim some empirical footing.`,
      `Proponents would point to concrete examples where ${subj} measurably changed ${obj}.`,
    ];
    const causalAgainst = [
      `Skeptics would note that ${obj} is shaped by many factors, and singling out ${subj} oversimplifies things.`,
      `The relationship might be correlational — both sides could be driven by something else entirely.`,
      `Critics might argue that the evidence doesn't hold consistently across different contexts.`,
    ];
    pool.push(pick(causalFor, s, 0), pick(causalAgainst, s, 1));
  }

  if (traits.isPredictive) {
    const predFor = [
      "Those who follow this space closely may see the trend as already well underway.",
      `Momentum has been building in this area, making the prediction feel plausible to insiders.`,
    ];
    const predAgainst = [
      "History is full of confident predictions in this space that didn't pan out — timing is notoriously hard to get right.",
      "Counterarguments might focus on adaptation — people and institutions often adjust in ways that blunt predicted impacts.",
    ];
    pool.push(pick(predFor, s, 2), pick(predAgainst, s, 3));
  }

  if (traits.isNormative) {
    const normFor = [
      "Those who share the claim's underlying values will likely find the reasoning compelling.",
      "From a certain value framework, this conclusion follows naturally.",
    ];
    const normAgainst = [
      "Others operating from different priorities may find the value judgment unconvincing or even objectionable.",
      `The "should" in this claim carries weight only if you accept its implicit criteria for what's good or worthwhile.`,
    ];
    pool.push(pick(normFor, s, 4), pick(normAgainst, s, 5));
  }

  if (traits.isComparative) {
    pool.push(
      pick([
        "The strength of this comparison depends entirely on whether the things being compared are truly comparable.",
        "Different people will weight the comparison criteria differently, reaching opposite conclusions from the same data.",
      ], s, 6),
    );
  }

  if (traits.isAbsolute) {
    pool.push(
      "The broad framing may resonate with people who see a clear, consistent pattern — but those aware of exceptions will push back.",
    );
  }

  if (traits.hasTradeoff) {
    pool.push(
      pick([
        "Supporters may argue that the tradeoff favors flexibility and individual benefit over the alternative.",
        "The fact that the claim acknowledges complexity is a point in its favor — it signals the author has weighed both sides.",
      ], s, 7),
      pick([
        "Critics may argue that collaboration, accountability, or other values are harder to preserve under the arrangement described.",
        "Others may feel the tradeoff is resolved too quickly — the costs of the preferred side deserve more attention.",
      ], s, 8),
    );
  }

  if (pool.length === 0) {
    return [
      "Supporters would likely find the reasoning straightforward and well-grounded in common experience.",
      "Critics might argue the claim glosses over important nuances or alternative explanations.",
    ];
  }

  return pool;
}

function simulateConclusion(
  classification: string,
  assumptions: string[],
  variables: string[],
  s: number,
): string {
  const conclusions = [
    "This claim isn't wrong on its face, but it's only as strong as the assumptions behind it. Change the conditions, and the conclusion may change with them.",
    "The reasoning here has real weight — but it depends on things the claim doesn't say out loud. Whether those hidden premises hold is the real question.",
    "This is a claim that could be right under the right conditions. The challenge is that those conditions aren't specified, and they matter more than the claim lets on.",
    "If the key assumptions hold, this claim has force. If they don't, it weakens quickly. The difference comes down to context the claim leaves open.",
    "There's a defensible version of this argument — but it requires being more specific about scope, conditions, and what counts as evidence. The claim as stated doesn't do that work.",
    "This isn't a claim you can accept or reject wholesale. It depends on circumstances, definitions, and priorities that reasonable people will weigh differently.",
    "The claim has merit in the right context, but it overstates its case by presenting a conditional truth as a general one.",
    "Taken on its own terms, the argument is coherent. The question is whether its terms match the situation you're applying it to.",
  ];

  return pick(conclusions, s, 0);
}
