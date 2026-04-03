import { isNounLike, smartLower } from "./types";
import type { AnalysisResult } from "./types";

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

// --- Tension model ---

interface Tension {
  hinges: string;
  breaks: string;
  holds: string;
}

function detectTension(analysis: AnalysisResult): Tension {
  const classLower = analysis.classification.toLowerCase();
  const allText = [
    analysis.claim,
    ...analysis.variables,
    ...analysis.assumptions,
  ].join(" ").toLowerCase();

  const isCausal = /causal/.test(classLower);
  const isPredictive = /predictive/.test(classLower);
  const isNormative = /normative/.test(classLower);
  const isNuanced = /nuanced/.test(classLower);

  // --- Normative claims: value conflicts ---
  if (isNormative) {
    if (/education|college|degree|university/.test(allText) && /cost|debt|worth/.test(allText)) {
      return {
        hinges: "This is really a disagreement about what education is for — financial return, personal growth, or social mobility — and which of those you prioritize changes the answer entirely.",
        breaks: "This breaks if the definition of 'worth' expands beyond earnings to include civic participation, personal development, and optionality — costs that are real but hard to price.",
        holds: "This holds when worth is measured primarily in financial terms, for students in fields with uncertain career pipelines and high upfront debt.",
      };
    }
    if (/work|remote|employee|office/.test(allText) && /productiv|focus|satisf/.test(allText)) {
      return {
        hinges: "This comes down to whether you value individual well-being and autonomy or collective cohesion and visibility — two legitimate priorities that point in different directions.",
        breaks: "This breaks if the organization values presence and spontaneous collaboration more than individual output and flexibility.",
        holds: "This holds when the people making the judgment prioritize measurable individual performance over harder-to-quantify team dynamics.",
      };
    }
    if (/policy|government|regulation/.test(allText)) {
      return {
        hinges: "This hinges on whose interests are centered — the people the policy is designed to protect, or the people who bear its costs.",
        breaks: "This breaks if the costs fall disproportionately on groups who had no voice in the decision.",
        holds: "This holds when the benefits are broadly shared and the costs are distributed in a way most stakeholders would accept as fair.",
      };
    }
    if (/health|wellbeing|well-being|mental/.test(allText)) {
      return {
        hinges: "This hinges on whether health is being measured by clinical outcomes or by the individual's own sense of well-being — two standards that don't always agree.",
        breaks: "This breaks if the standard of 'better' is defined by the person giving care rather than the person receiving it.",
        holds: "This holds when the people affected would themselves endorse the criteria being used to judge the outcome.",
      };
    }
    // Normative fallback — use conceptual axis
    return buildAxisFallback(analysis, "normative");
  }

  // --- Nuanced / tradeoff claims: competing outcomes ---
  if (isNuanced) {
    if (/collaborat|culture|in-person/.test(allText) && /flexib|focus|autonom|remote/.test(allText)) {
      return {
        hinges: "This comes down to whether collaboration and accountability require physical proximity, or whether those outcomes can be achieved — even improved — through deliberate remote practices.",
        breaks: "This breaks if the kind of work involved genuinely depends on the serendipity and speed of in-person interaction, not just habit or preference.",
        holds: "This holds when the work that matters most is deep, focused, and individually driven — and when the collaboration that remains can be structured intentionally.",
      };
    }
    if (/cost|benefit|econom/.test(allText) && /distribut|who bears|equity/.test(allText)) {
      return {
        hinges: "The tradeoff hinges on who captures the upside and who absorbs the downside — efficiency gains often look different depending on where you sit.",
        breaks: "This breaks if the costs are concentrated on a vulnerable group while the benefits accrue to those who were already ahead.",
        holds: "This holds when both the costs and benefits are distributed in a way that the affected parties would recognize as proportionate.",
      };
    }
    if (/short.term|long.term|immediate|sustain/.test(allText)) {
      return {
        hinges: "This comes down to time horizon — what looks like the right call in the short run may look reckless or premature in the long run, and vice versa.",
        breaks: "This breaks if the short-term gains create debts — financial, social, or institutional — that compound over time.",
        holds: "This holds if the timeframe is bounded and the second-order effects remain manageable within it.",
      };
    }
    // Nuanced fallback — use conceptual axis
    return buildAxisFallback(analysis, "nuanced");
  }

  // --- Predictive claims: pace, uncertainty, timeline ---
  if (isPredictive) {
    if (/technology|ai|automat|software|digital/.test(allText)) {
      return {
        hinges: "This hinges on whether the current pace of change is a genuine acceleration or a temporary burst that flattens once the easy gains are captured.",
        breaks: "This breaks if adoption hits a wall — technical, regulatory, or social — that the current trajectory doesn't account for.",
        holds: "This holds if the technology continues to improve at its current rate and the institutions affected are too slow to adapt in time.",
      };
    }
    if (/labor|job|work|employ/.test(allText)) {
      return {
        hinges: "This hinges on whether the labor market absorbs displaced workers as fast as the disruption displaces them — a race between destruction and creation.",
        breaks: "This breaks if new roles emerge faster than expected, or if the displaced workforce retools more effectively than the prediction assumes.",
        holds: "This holds if the disruption outpaces adaptation — if the new roles require skills the affected workers can't acquire quickly enough.",
      };
    }
    if (/econom|market|price|cost/.test(allText)) {
      return {
        hinges: "This hinges on whether the economic conditions driving the trend are structural or cyclical — one persists, the other reverses.",
        breaks: "This breaks if the trend is cyclical and the prediction mistakes a temporary pattern for a permanent shift.",
        holds: "This holds if the underlying structural conditions remain intact and no external shock disrupts the trajectory.",
      };
    }
    // Predictive fallback — use conceptual axis
    return buildAxisFallback(analysis, "predictive");
  }

  // --- Causal claims: driver tension, conditions ---
  if (isCausal) {
    if (/collaborat|independent|hybrid|team/.test(allText) && /industry|sector|type of work/.test(allText)) {
      return {
        hinges: "This comes down to whether the nature of the work or the structure around it is the real driver — the same policy produces different results in different kinds of work.",
        breaks: "This breaks if the work requires tight real-time coordination that can't happen asynchronously.",
        holds: "This holds when the work is primarily independent, output is measurable, and teams can self-organize effectively.",
      };
    }
    if (/culture|management/.test(allText) && /industry|sector|role/.test(allText)) {
      return {
        hinges: "This comes down to whether the claimed cause actually does the work, or whether it's the surrounding management culture that determines the outcome.",
        breaks: "This breaks in environments where the surrounding conditions — trust, accountability structures, communication norms — aren't set up to support the claimed cause.",
        holds: "This holds when the environment has been deliberately designed to let the claimed cause operate at its best.",
      };
    }
    if (/adoption|pace|technology/.test(allText) && /regulat|policy/.test(allText)) {
      return {
        hinges: "This hinges on whether the technology itself is the cause, or whether the real driver is the ecosystem of incentives and barriers around it.",
        breaks: "This breaks if the ecosystem resists — through regulation, cost barriers, or simple inertia — faster than the technology can push through.",
        holds: "This holds when adoption is mature enough that the technology's effects are observable at scale, not just in early-adopter contexts.",
      };
    }
    if (/genetic|lifestyle|individual/.test(allText) && /health|medical/.test(allText)) {
      return {
        hinges: "This hinges on whether the effect is strong enough to show up despite individual variation in biology, behavior, and circumstances.",
        breaks: "This breaks if individual differences swamp the effect — if what works on average works for almost no one in particular.",
        holds: "This holds when the effect size is large, consistent across subgroups, and not easily explained by confounders.",
      };
    }
    // Causal fallback — use conceptual axis
    return buildAxisFallback(analysis, "causal");
  }

  // --- Comparative claims ---
  if (/comparative/.test(classLower)) {
    const raw = extractClaimNouns(analysis.claim);
    const compBothClean = isNounLike(raw.subject) && isNounLike(raw.outcome);
    const subject = compBothClean ? raw.subject : "the first option";
    const outcome = compBothClean ? raw.outcome : "the second option";
    const s = seed(analysis.claim);
    return pick([
      {
        hinges: `This hinges on whether ${subject} and ${outcome} are being evaluated on the same terms — a comparison is only meaningful if both sides are measured consistently.`,
        breaks: `This breaks if the comparison cherry-picks a timeframe, metric, or population that flatters one side over the other.`,
        holds: `This holds when both ${subject} and ${outcome} are measured over the same period, with the same metrics, applied to the same population.`,
      },
      {
        hinges: `This hinges on whether the comparison between ${subject} and ${outcome} uses the same criteria for both sides — shift the yardstick and the ranking may reverse.`,
        breaks: `This breaks if ${subject} and ${outcome} are being measured on different scales, over different timeframes, or across populations that aren't comparable.`,
        holds: `This holds when the criteria for evaluating ${subject} and ${outcome} are explicit, consistent, and accepted by both sides of the argument.`,
      },
      {
        hinges: `This hinges on whether the comparison is apples-to-apples — ${subject} and ${outcome} may look straightforward to rank, but only if you hold the measuring stick steady.`,
        breaks: `This breaks if the framing quietly advantages one side — for instance, by selecting a metric where ${subject} looks strong and ${outcome} looks weak by construction.`,
        holds: `This holds when someone skeptical of the conclusion would still accept the way ${subject} and ${outcome} were measured and compared.`,
      },
      {
        hinges: `This hinges on whether ${subject} and ${outcome} are genuinely comparable, or whether the comparison flattens important differences between them.`,
        breaks: `This breaks if the comparison strips away context that would change the ranking — career stage, geography, timeframe, or how success is defined.`,
        holds: `This holds when the comparison controls for the variables that matter most and both sides would accept the framing as fair.`,
      },
    ], s, 0);
  }

  // --- Final fallback — detect axis from claim content ---
  return buildAxisFallback(analysis, "general");
}

// --- Claim-aware fallback ---
// When no specific domain pattern matches, extract concrete nouns from the claim
// and build tensions using those instead of abstract axis labels.

function extractClaimNouns(claim: string): { subject: string; outcome: string } {
  const cleaned = claim.replace(/[.!?]+$/, "").trim();

  // Comparative: "X plays a bigger role ... than Y", "X matters more than Y"
  const compRole = cleaned.match(
    /^(.+?)\b(?:(?:plays?|has|have|had|makes?|exerts?)\s+(?:a\s+)?(?:bigger|smaller|larger|greater|lesser|more\s+\w+|less\s+\w+)\s+(?:role|impact|influence|effect|part|contribution)(?:\s+(?:in|on|to|for)\s+\S+(?:\s+\S+)*)?\s+than)\s+(.+)$/i
  ) || cleaned.match(
    /^(.+?)\b(?:(?:matters?|counts?|contributes?|weighs?)\s+(?:more|less)(?:\s+(?:in|to|for)\s+\S+(?:\s+\S+)*)?\s+than)\s+(.+)$/i
  );
  if (compRole) {
    const a = smartLower(compRole[1].trim().replace(/^(the|a|an)\s+/i, ""));
    const b = smartLower(compRole[2].trim().replace(/^(the|a|an)\s+/i, ""));
    return { subject: a, outcome: b };
  }

  // Normative comparisons: "X should be prioritized over Y", "X should matter more than Y"
  const normComp = cleaned.match(
    /^(.+?)\b(?:should|must|ought to)\b\s+(?:be\s+)?(?:prioritized|valued|preferred|chosen|favored|weighed)\s+(?:over|above|more than|against)\s+(.+)$/i
  );
  if (normComp) {
    const a = smartLower(normComp[1].trim().replace(/^(the|a|an)\s+/i, ""));
    const b = smartLower(normComp[2].trim().replace(/^(the|a|an)\s+/i, ""));
    return { subject: a, outcome: b };
  }

  // "X should matter more than Y", "X is/are more important than Y", "X is/are better than Y"
  const moreComp = cleaned.match(
    /^(.+?)\b(?:should\s+)?(?:matter|count|rank|weigh)\s+more\s+than\s+(.+)$/i
  ) || cleaned.match(
    /^(.+?)\b(?:is|are)\s+(?:more\s+\w+|less\s+\w+|better|worse|bigger|smaller|greater|fewer|higher|lower|faster|slower|harder|easier|stronger|weaker)\b[^.!?]*?\bthan\s+(.+)$/i
  );
  if (moreComp) {
    const a = smartLower(moreComp[1].trim().replace(/^(the|a|an)\s+/i, ""));
    const b = smartLower(moreComp[2].trim().replace(/^(the|a|an)\s+/i, ""));
    return { subject: a, outcome: b };
  }

  // "X should prioritize Y over Z" → subject: X, but tension is Y vs Z
  const shouldVerb = cleaned.match(
    /^(.+?)\bshould\s+(?:prioritize|value|prefer|choose|focus on)\s+(.+?)\s+over\s+(.+)$/i
  );
  if (shouldVerb) {
    const b = smartLower(shouldVerb[2].trim().replace(/^(the|a|an)\s+/i, ""));
    const c = smartLower(shouldVerb[3].trim().replace(/^(the|a|an)\s+/i, ""));
    return { subject: b, outcome: c };
  }

  // Standard causal: "X improves/reduces/causes Y"
  const causal = cleaned.match(
    /^(.+?)\b(improves?|reduces?|increases?|affects?|causes?|creates?|makes?|drives?|produces?|ruins?|destroys?|hurts?|helps?|boosts?|lowers?|prevents?)\b\s*(.+)$/i
  );
  if (causal && causal[1].trim().length > 2 && causal[3].trim().length > 2) {
    const subj = smartLower(causal[1].trim().replace(/^(the|a|an)\s+/i, ""));
    const obj = smartLower(causal[3].trim().replace(/^(the|a|an)\s+/i, ""));
    return { subject: subj, outcome: obj };
  }

  // Linking verbs: "X is Y"
  const linking = cleaned.match(/^(.+?)\b(is|are|will|can)\b\s*(.+)$/i);
  if (linking && linking[1].trim().length > 2 && linking[3].trim().length > 2) {
    const subj = smartLower(linking[1].trim().replace(/^(the|a|an)\s+/i, ""));
    const obj = smartLower(linking[3].trim().replace(/^(the|a|an)\s+/i, ""));
    return { subject: subj, outcome: obj };
  }

  // Fallback: use first and last meaningful words
  const words = cleaned.split(/\s+/).filter(w =>
    !/^(the|a|an|is|are|was|were|will|should|must|can|do|does|not|and|or|but|for|to|in|on|at|of|by|with)$/i.test(w)
  );
  return {
    subject: smartLower(words.slice(0, 2).join(" ")) || "the claimed cause",
    outcome: smartLower(words.slice(-2).join(" ")) || "the expected outcome",
  };
}

function buildAxisFallback(analysis: AnalysisResult, claimType: string): Tension {
  const raw = extractClaimNouns(analysis.claim);
  const bothClean = isNounLike(raw.subject) && isNounLike(raw.outcome);
  const subject = bothClean ? raw.subject : "the proposed cause";
  const outcome = bothClean ? raw.outcome : "the expected outcome";
  const s = seed(analysis.claim);
  const claimLower = analysis.claim.toLowerCase();

  if (claimType === "causal") {
    return pick([
      {
        hinges: `This hinges on whether the link between ${subject} and ${outcome} is genuinely causal, or whether both are driven by a third factor the claim doesn't account for.`,
        breaks: `This breaks if ${outcome} turns out to be shaped by factors other than ${subject} — if the real driver is something the claim overlooks.`,
        holds: `This holds when the effect of ${subject} on ${outcome} is consistent, and removing ${subject} from the equation reliably changes the result.`,
      },
      {
        hinges: `This hinges on whether the effect of ${subject} on ${outcome} is real and direct, or whether it only appears under narrow conditions.`,
        breaks: `This breaks if the link between ${subject} and ${outcome} disappears once you control for environment, population, or how ${outcome} is measured.`,
        holds: `This holds when the relationship between ${subject} and ${outcome} is consistent across different settings and populations.`,
      },
    ], s, 0);
  }

  if (claimType === "predictive") {
    return pick([
      {
        hinges: `This hinges on whether the forces currently shaping ${subject} will continue, or whether they'll be disrupted before ${outcome} materializes.`,
        breaks: `This breaks if the trajectory around ${subject} slows, reverses, or gets overtaken by a countervailing force.`,
        holds: `This holds if ${subject} continues on its current path and no major disruption intervenes before ${outcome} plays out.`,
      },
      {
        hinges: `This hinges on timing — ${subject} may well lead to ${outcome}, but whether it happens in five years or fifty changes everything.`,
        breaks: `This breaks if adaptation outpaces the predicted change — if people and institutions adjust faster than the claim assumes.`,
        holds: `This holds if the pace of change around ${subject} stays on track and the affected systems can't adapt quickly enough.`,
      },
    ], s, 0);
  }

  if (claimType === "normative") {
    return pick([
      {
        hinges: `This hinges on how you weigh ${subject} against ${outcome} — different value systems rank them differently, and the claim picks one ranking without defending it.`,
        breaks: `This breaks if the audience values ${outcome} more than ${subject}, or applies a framework where the two aren't in tension at all.`,
        holds: `This holds when the audience shares the claim's implicit priority — that ${subject} matters more than ${outcome} in the situation described.`,
      },
      {
        hinges: `This hinges on whose priorities count — prioritizing ${subject} over ${outcome} reflects one set of values, and others would reach a different conclusion.`,
        breaks: `This breaks if the people most affected would weigh ${subject} and ${outcome} differently than the claim assumes.`,
        holds: `This holds when the audience agrees that ${subject} should take precedence over ${outcome} in this context.`,
      },
      {
        hinges: `This hinges on whether ${subject} and ${outcome} are genuinely in competition, or whether the tension between them is overstated.`,
        breaks: `This breaks if it turns out you can have both ${subject} and ${outcome} — if the tradeoff the claim assumes isn't as sharp as it sounds.`,
        holds: `This holds when ${subject} and ${outcome} genuinely pull in opposite directions, and a choice between them can't be avoided.`,
      },
    ], s, 0);
  }

  if (claimType === "nuanced") {
    return pick([
      {
        hinges: `This hinges on which side of the ${subject} tradeoff you weight more heavily — and the answer changes depending on who bears the costs.`,
        breaks: `This breaks if the side the claim downplays turns out to matter more than it acknowledges — the balance may not be as clear as it seems.`,
        holds: `This holds when the priorities of the people affected align with the side the claim favors.`,
      },
      {
        hinges: `This hinges on whether the competing outcomes around ${subject} can actually be compared on the same scale, or whether the tradeoff is misleading.`,
        breaks: `This breaks if the costs of the preferred arrangement are hidden, delayed, or borne by people who aren't part of the conversation.`,
        holds: `This holds when both sides of the tradeoff have been genuinely weighed and the claim's resolution matches the situation at hand.`,
      },
    ], s, 0);
  }

  // General fallback — still claim-specific, using plural-safe phrasing
  return pick([
    {
      hinges: `This hinges on whether the connection between ${subject} and ${outcome} is as direct as the claim implies, or whether it's more circumstantial than it sounds.`,
      breaks: `This breaks if ${outcome} turns out to depend on factors the claim doesn't mention — things like who's affected, how it's measured, and over what timeframe.`,
      holds: `This holds when ${subject} and ${outcome} are clearly defined, the population matches the claim's assumptions, and the evidence is consistent.`,
    },
    {
      hinges: `This hinges on how ${subject} and ${outcome} are defined — change the definition, and the claim may reverse.`,
      breaks: `This breaks if the definitions are narrow enough to exclude important cases, or broad enough to include cases that contradict the claim.`,
      holds: `This holds when the definitions of ${subject} and ${outcome} are clear, shared, and stable across the contexts where the claim is applied.`,
    },
  ], s, 0);
}

// --- Framing variation ---
// The tension content is domain-specific. These pools vary the sentence frame around it.

function wrapHinges(content: string, s: number, type: string): string {
  const stripped = content
    .replace(/^This (hinges on|comes down to|is really a disagreement about|ultimately depends on) /i, "")
    .replace(/^The (tradeoff hinges on|key question is) /i, "")
    .replace(/^At its core, this hinges on /i, "");

  if (stripped === content) return content;

  const startsWithWhether = /^whether\b/i.test(stripped);
  const w = startsWithWhether ? "" : "whether ";

  // Type-aware framing — each type gets frames that match its tone
  const typeFrames: Record<string, string[]> = {
    causal: [
      `The mechanism depends on ${w}${stripped}`,
      `The causal chain hinges on ${w}${stripped}`,
      `What drives the outcome is ${stripped}`,
    ],
    predictive: [
      `The trajectory depends on ${w}${stripped}`,
      `The forecast hinges on ${w}${stripped}`,
      `What could shift the prediction is ${stripped}`,
    ],
    normative: [
      `The judgment rests on ${stripped}`,
      `What you value determines ${w}${stripped}`,
      `The conclusion reflects a choice about ${stripped}`,
    ],
    nuanced: [
      `The tradeoff turns on ${w}${stripped}`,
      `Which side dominates depends on ${stripped}`,
      `The balance hinges on ${w}${stripped}`,
    ],
  };

  const generalFrames = [
    `This comes down to ${stripped}`,
    `At its core, this hinges on ${stripped}`,
    `What really matters here is ${stripped}`,
    `The crux of this is ${stripped}`,
    `The deciding factor is ${stripped}`,
  ];

  const frames = [...(typeFrames[type] || []), ...generalFrames];
  return pick(frames, s, 0);
}

function wrapBreaks(content: string, s: number, type: string): string {
  const stripped = content
    .replace(/^This (breaks if|breaks in|starts to fall apart when|doesn't hold up if) /i, "")
    .replace(/^The (claim falls apart when|forecast collapses if|conclusion unravels if) /i, "");

  if (stripped === content) return content;

  const typeFrames: Record<string, string[]> = {
    causal: [
      `The mechanism breaks down when ${stripped}`,
      `The causal link dissolves if ${stripped}`,
      `The connection fails when ${stripped}`,
    ],
    predictive: [
      `The forecast derails if ${stripped}`,
      `The prediction fails when ${stripped}`,
      `The trajectory breaks if ${stripped}`,
    ],
    normative: [
      `The judgment loses its footing when ${stripped}`,
      `The values behind this claim are challenged when ${stripped}`,
      `The 'should' falls apart if ${stripped}`,
    ],
    nuanced: [
      `The balance tips the wrong way when ${stripped}`,
      `The tradeoff becomes untenable if ${stripped}`,
      `The resolution fails when ${stripped}`,
    ],
  };

  const generalFrames = [
    `This breaks if ${stripped}`,
    `This starts to fall apart when ${stripped}`,
    `This doesn't hold up if ${stripped}`,
    `This loses force when ${stripped}`,
    `This unravels if ${stripped}`,
    `This no longer holds if ${stripped}`,
  ];

  const frames = [...(typeFrames[type] || []), ...generalFrames];
  return pick(frames, s, 1);
}

function wrapHolds(content: string, s: number, type: string): string {
  const stripped = content
    .replace(/^This (holds when|holds if|is most likely to be true when|is most credible when) /i, "")
    .replace(/^The (claim is most credible when|judgment is most defensible when|prediction is most plausible when) /i, "");

  if (stripped === content) return content;

  const typeFrames: Record<string, string[]> = {
    causal: [
      `The mechanism operates when ${stripped}`,
      `The cause-effect link holds when ${stripped}`,
      `The connection is strongest when ${stripped}`,
    ],
    predictive: [
      `The forecast is most plausible when ${stripped}`,
      `The prediction tracks when ${stripped}`,
      `The trajectory holds if ${stripped}`,
    ],
    normative: [
      `The judgment is most defensible when ${stripped}`,
      `The values align when ${stripped}`,
      `The 'should' is strongest when ${stripped}`,
    ],
    nuanced: [
      `The tradeoff resolves this way when ${stripped}`,
      `The balance favors this side when ${stripped}`,
      `The resolution works when ${stripped}`,
    ],
  };

  const generalFrames = [
    `This holds when ${stripped}`,
    `This becomes more credible when ${stripped}`,
    `This works best when ${stripped}`,
    `This is strongest when ${stripped}`,
    `This is most convincing when ${stripped}`,
  ];

  const frames = [...(typeFrames[type] || []), ...generalFrames];
  return pick(frames, s, 2);
}

// --- Type detection for tone ---

function claimType(classification: string): "causal" | "predictive" | "normative" | "nuanced" | "general" {
  const c = classification.toLowerCase();
  if (/nuanced/.test(c)) return "nuanced";
  if (/causal/.test(c)) return "causal";
  if (/predictive/.test(c)) return "predictive";
  if (/normative/.test(c)) return "normative";
  return "general";
}

// --- Public API ---

export function generateHingesOn(analysis: AnalysisResult): string {
  const s = seed(analysis.claim);
  const type = claimType(analysis.classification);
  return wrapHinges(detectTension(analysis).hinges, s, type);
}

export function generateBreaksIf(analysis: AnalysisResult): string {
  const s = seed(analysis.claim);
  const type = claimType(analysis.classification);
  return wrapBreaks(detectTension(analysis).breaks, s, type);
}

export function generateHoldsWhen(analysis: AnalysisResult): string {
  const s = seed(analysis.claim);
  const type = claimType(analysis.classification);
  return wrapHolds(detectTension(analysis).holds, s, type);
}
