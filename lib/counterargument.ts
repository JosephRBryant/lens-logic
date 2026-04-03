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

function derive(s: number, salt: number): number {
  return Math.abs(((s * 2654435761) ^ salt) | 0);
}

type ClaimType = "causal" | "predictive" | "normative" | "nuanced" | "general";
type AttackAngle = "causality" | "alternative" | "scope" | "measurement" | "selection" | "tradeoff" | "friction";

function classType(classification: string): ClaimType {
  const c = classification.toLowerCase();
  if (/nuanced/.test(c)) return "nuanced";
  if (/causal/.test(c)) return "causal";
  if (/predictive/.test(c)) return "predictive";
  if (/normative/.test(c)) return "normative";
  return "general";
}

function extractNouns(claim: string): { subj: string; obj: string } {
  const cleaned = claim.replace(/[.!?]+$/, "").trim();
  const patterns: RegExp[] = [
    /^(.+?)\b(?:should\s+(?:be\s+)?(?:prioritized|valued|preferred)\s+(?:over|above|more than)\s+)(.+)$/i,
    /^(.+?)\b(?:should\s+(?:matter|count)\s+more\s+than\s+)(.+)$/i,
    /^(.+?)\bis\s+(?:more\s+important|better|worse)\s+than\s+(.+)$/i,
    /^(.+?)\b(?:should\s+(?:prioritize|value|prefer|choose|focus on)\s+)(.+?)(?:\s+over\s+.+)?$/i,
    /^(.+?)\bwill\s+(?:replace|improve|reduce|increase|affect|cause|create|make|drive|produce|ruin|destroy|hurt|help|boost|eliminate|disrupt|transform)\b\s*(.+)$/i,
    /^(.+?)\b(?:improves?|reduces?|increases?|affects?|causes?|creates?|makes?|drives?|produces?|ruins?|destroys?|hurts?|helps?|boosts?|replaces?)\b\s*(.+)$/i,
    /^(.+?)\b(?:is|are)\b\s*(.+)$/i,
  ];
  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m && m[1].trim().length >= 2 && m[2].trim().length >= 2) {
      return {
        subj: m[1].trim().replace(/^(the|a|an)\s+/i, "").toLowerCase(),
        obj: m[2].trim().replace(/^(the|a|an)\s+/i, "").toLowerCase(),
      };
    }
  }
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  return {
    subj: words.slice(0, 2).join(" ").toLowerCase(),
    obj: words.slice(-2).join(" ").toLowerCase(),
  };
}

function selectAngle(type: ClaimType, s: number): AttackAngle {
  const anglesByType: Record<ClaimType, AttackAngle[]> = {
    causal: ["causality", "alternative", "selection", "scope", "measurement"],
    predictive: ["friction", "scope", "alternative", "measurement", "tradeoff"],
    normative: ["tradeoff", "scope", "measurement", "alternative", "friction"],
    nuanced: ["tradeoff", "scope", "friction", "measurement", "alternative"],
    general: ["scope", "measurement", "alternative", "causality", "friction"],
  };
  return pick(anglesByType[type], s, 0);
}

export function generateCounterargument(analysis: AnalysisResult): string {
  const s = seed(analysis.claim);
  const type = classType(analysis.classification);
  const angle = selectAngle(type, derive(s, 7));
  const { subj, obj } = extractNouns(analysis.claim);
  const objIsClean = obj.length < 40 && !/^(no longer|not|be |more |less |better |worse )/.test(obj);

  const raw = buildCounterargument(subj, obj, objIsClean, type, angle, s);
  // Ensure proper capitalization at sentence starts after interpolation
  return raw.replace(/(^|[.!?]\s+)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());
}

function buildCounterargument(
  subj: string,
  obj: string,
  objIsClean: boolean,
  type: ClaimType,
  angle: AttackAngle,
  s: number,
): string {

  // --- Causal claims ---
  if (type === "causal") {
    if (angle === "causality") {
      return pick([
        `The link between ${subj} and ${obj} is almost certainly correlational, not causal. People who engage with ${subj} tend to differ from those who don't in motivation, prior ability, and environment — all of which independently predict ${obj}. Without randomized assignment, the claim mistakes a sorting pattern for a mechanism.`,
        `What looks like ${subj} driving ${obj} is more plausibly a reverse-causation story. People already inclined toward ${obj} are drawn to ${subj}, not the other way around. The arrow of causation the claim draws is convenient but unearned.`,
        `This assumes ${subj} is the active ingredient, but the more likely explanation is that both ${subj} and ${obj} are downstream of something else — intrinsic motivation, socioeconomic background, or institutional support. The claim picks the visible correlate and calls it the cause.`,
      ], s, 1);
    }
    if (angle === "alternative") {
      return pick([
        `A more plausible explanation is that the observed improvement in ${obj} tracks with self-selection into ${subj}, not with ${subj} itself. People who seek out ${subj} are systematically different — in discipline, curiosity, or baseline skill — and those differences do the real explanatory work. Strip away the self-selection and the claimed effect shrinks dramatically.`,
        `The real driver here is probably not ${subj} but the environment in which people encounter it. Motivation, access to resources, and social reinforcement all correlate with ${subj} and independently predict ${obj}. The claim credits ${subj} for work that belongs to the ecosystem around it.`,
      ], s, 2);
    }
    if (angle === "selection") {
      return pick([
        `The observed connection between ${subj} and ${obj} is a selection effect, not a treatment effect. The people engaging with ${subj} aren't randomly assigned — they self-select based on traits like motivation, cognitive ability, and prior interest that independently predict ${obj}. Any observational study will overestimate the link, and the claim doesn't correct for that.`,
        `This falls apart once you account for who actually engages with ${subj}. It's not a random cross-section — it's a self-selected group whose pre-existing characteristics already predict ${obj}. The claim treats a filtered sample as if it were representative, and the conclusion inherits that distortion.`,
      ], s, 3);
    }
    if (angle === "scope") {
      return pick([
        `This claim generalizes from lab-scale evidence to real-world certainty, and the gap between those two is where it breaks. ${subj} might nudge ${obj} under tightly controlled experimental settings, but in practice — where competing demands, inconsistent engagement, and measurement noise all operate — the signal disappears into the background.`,
        `Outside a narrow set of idealized settings, ${subj} doesn't reliably produce ${obj}. The claim takes what is at best a small, inconsistent effect and presents it as a robust generalization. The specificity required for the effect to hold is exactly the specificity the claim omits.`,
      ], s, 4);
    }
    // measurement
    return pick([
      `The way ${obj} is typically measured in studies supporting this claim is itself suspect. The metrics used tend to capture short-term, narrow improvements that don't map onto the broader meaning the claim implies. Swap in a more robust measure of ${obj} — one that tracks long-term transfer or real-world performance — and the effect largely evaporates.`,
      `How ${obj} is defined here is doing more work than the claim acknowledges. The measurement used flatters the connection with ${subj} — a different operationalization of ${obj} would yield a different result. The claim's persuasive force depends on a definitional choice it never defends.`,
    ], s, 5);
  }

  // --- Predictive claims ---
  if (type === "predictive") {
    if (angle === "friction") {
      return pick([
        `Predictions like this chronically underestimate institutional inertia, regulatory drag, and the speed at which organizations can actually absorb change. The trajectory around ${subj} looks clean on a slide deck, but adoption curves flatten once early adopters are saturated, compliance costs mount, and legacy systems resist integration. The prediction mistakes a phase for a trend.`,
        `The claim treats the current momentum of ${subj} as self-sustaining, but every wave of technological change generates its own antibodies — labor organizing, regulatory intervention, public backlash, and competitive adaptation. The prediction models the acceleration without modeling the braking forces, which is why forecasts like this one are almost always early.`,
      ], s, 1);
    }
    if (angle === "scope") {
      return pick([
        `This prediction extrapolates from a handful of high-visibility cases to a sweeping generalization. The early impact of ${subj} in software, logistics, or customer service doesn't transfer cleanly to healthcare, education, skilled trades, or government — sectors with different incentive structures, regulatory regimes, and coordination requirements. The claim's scope dramatically outruns its evidence.`,
        `What this prediction gets wrong is scale. The initial displacement from ${subj} is real in narrow domains, but the claim treats those domains as representative of the entire economy. They aren't. Most work involves judgment, negotiation, physical presence, or regulatory constraint that ${subj} doesn't meaningfully touch — at least not on any plausible near-term timeline.`,
      ], s, 2);
    }
    if (angle === "alternative") {
      return pick([
        `The more likely outcome is not the disruption the claim predicts but a messy process of adaptation. When ${subj} reshapes a landscape, people retool, institutions reconfigure, and new roles emerge that the prediction doesn't model. The claim treats the economy as static except for the one variable it highlights — and that's never how displacement actually plays out.`,
        `History suggests that the response to ${subj} will be adaptation, not capitulation. New specializations, hybrid roles, and institutional workarounds tend to absorb the shock of technological change faster than predictions like this one allow. The claim forecasts a clean displacement because modeling the messy counterfactual is harder — but the messy counterfactual is what actually happens.`,
      ], s, 3);
    }
    if (angle === "measurement") {
      return pick([
        `How "${obj}" is defined here inflates the prediction. Shift from "replacement" to "augmentation," from "elimination" to "restructuring," and the forecast goes from dramatic to pedestrian. The claim's urgency depends on its framing — not on what's actually most likely to happen to the work itself.`,
      ], s, 4);
    }
    // tradeoff
    return pick([
      `The prediction focuses entirely on the displacement side of ${subj} and ignores the creation side. Every major technological shift has destroyed existing roles while simultaneously generating new ones — often in categories that didn't exist before the shift. The claim counts the losses but doesn't attempt to count the gains, which makes the forecast feel more decisive than it is.`,
    ], s, 5);
  }

  // --- Normative claims ---
  if (type === "normative") {
    if (angle === "tradeoff" && objIsClean) {
      return pick([
        `Prioritizing ${subj} over ${obj} sounds principled until you trace who bears the cost. Deprioritizing ${obj} doesn't just change the preference ranking — it shifts real resources, opportunities, and security away from people who depend on ${obj} and toward people who can already afford to value ${subj}. The judgment presents itself as universal when it's actually redistributive.`,
        `What this overlooks is that ${obj} is often what makes ${subj} viable in the first place. Treat ${obj} as secondary, and ${subj} becomes a luxury that only the already-secure can afford. The tradeoff the claim describes is real, but its resolution only works for people who don't need ${obj} as much as they think.`,
      ], s, 1);
    }
    if (angle === "tradeoff") {
      return pick([
        `The judgment about ${subj} sounds principled until you account for what gets sacrificed. The costs this framing pushes to the margins — financial security, career momentum, institutional standing — don't disappear because the claim ignores them. They fall hardest on people with the least leverage to absorb the loss.`,
        `This framing presents a clean verdict on ${subj}, but the costs it downplays are borne unevenly. For people with financial cushions and flexible careers, prioritizing ${subj} is easy. For everyone else, it's a risk the claim never acknowledges — and the people taking that risk aren't the ones making the argument.`,
      ], s, 1);
    }
    if (angle === "scope") {
      return pick([
        `This value judgment is being applied as a universal when it's really a local truth. Whether ${subj} deserves the priority this claim gives it depends on income level, career stage, industry norms, and family structure — none of which the claim accounts for. What reads as wisdom for a knowledge worker in their 30s reads as reckless advice for a single parent in hourly work.`,
        `The claim treats its priority ranking as obvious, but the ranking only holds for people in specific life circumstances. Change the population — younger, poorer, more precarious, or in a different industry — and the judgment doesn't just weaken; it inverts. The blanket framing hides a narrow applicability.`,
      ], s, 2);
    }
    if (angle === "measurement") {
      return pick([
        `The judgment rests on a particular definition of ${subj} that the claim never interrogates. Measure ${subj} as subjective satisfaction and the verdict goes one way; measure it as long-term financial resilience, career optionality, or social impact and the verdict may reverse entirely. The conclusion follows from a definitional choice, not from clear reasoning.`,
      ], s, 3);
    }
    // alternative/friction fallback
    return pick([
      `The value framework behind this claim treats its ranking as self-evident, but it's actually a choice among competing standards — and a contestable one. People operating from a framework that centers financial stability, institutional obligation, or collective responsibility would reach the opposite conclusion from the same evidence. The claim isn't arguing for the right answer; it's assuming there's only one framework worth using.`,
    ], s, 4);
  }

  // --- Nuanced / tradeoff claims ---
  if (type === "nuanced") {
    if (angle === "tradeoff") {
      return pick([
        `The claim presents itself as balanced, but the balance is tilted by framing. The side it favors gets concrete examples, intuitive language, and emotional weight. The opposing side is acknowledged abstractly and dispatched quickly. This isn't deliberation — it's a conclusion that performed the appearance of weighing both sides.`,
        `Acknowledging a tradeoff and resolving it fairly are different things. The claim mentions both sides but loads the rhetorical deck: one side gets specificity and empathy, the other gets a sentence of lip service. The "nuance" here is cosmetic — the conclusion was baked in before the tradeoff was stated.`,
      ], s, 1);
    }
    if (angle === "scope") {
      return pick([
        `The tradeoff resolves the way the claim suggests only within a narrow band of occupations, team structures, and management styles. Change the industry from software to healthcare, the team from autonomous to interdependent, or the timeline from quarters to years, and the balance tips the other way. The claim treats a local resolution as a general one.`,
      ], s, 2);
    }
    if (angle === "friction") {
      return pick([
        `The claim frames this as a binary tradeoff, but in practice most organizations don't choose cleanly between two poles — they settle into messy compromises that neither side of the claim describes. Hybrid arrangements, inconsistent policies, and ad hoc exceptions are the actual norm. The clean tradeoff the claim presents doesn't survive contact with institutional reality.`,
      ], s, 3);
    }
    // measurement/alternative fallback
    return pick([
      `The tradeoff described here depends on how each side is measured, and the claim quietly uses metrics that favor its preferred resolution. Measure collaboration by spontaneous idea exchange and the office wins; measure it by documented output and intentional communication, and remote wins. The claim's conclusion follows from its measurement choices, not from the tradeoff itself.`,
    ], s, 4);
  }

  // --- General fallback ---
  return pick([
    `The claim's persuasive force comes from its simplicity, but that simplicity is precisely what makes it misleading. ${obj} is shaped by self-selection, incentive structures, and measurement choices that ${subj} alone can't account for. What's being presented as a complete explanation is, at best, a partial and filtered observation.`,
    `Outside the narrow settings where this was first observed, the claimed relationship between ${subj} and ${obj} weakens rapidly. The populations are more varied, the measurements less consistent, and the competing explanations more numerous. What looks like a general truth is closer to a cherry-picked finding with unusually good PR.`,
    `The strongest objection here isn't that the claim is false — it's that it's unfalsifiable as stated. It doesn't specify a timeline, a population, or a measurable threshold for ${obj}. That means it can absorb any counterevidence without adjusting. That's not intellectual confidence; it's definitional evasion.`,
  ], s, 1);
}
