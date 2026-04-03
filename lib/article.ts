import type { AnalysisResult } from "./types";

type ClaimType = "causal" | "predictive" | "normative" | "nuanced" | "general";

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

function classType(classification: string): ClaimType {
  const c = classification.toLowerCase();
  if (/nuanced/.test(c)) return "nuanced";
  if (/causal/.test(c)) return "causal";
  if (/predictive/.test(c)) return "predictive";
  if (/normative/.test(c)) return "normative";
  return "general";
}

export function generateArticle(analysis: AnalysisResult): string {
  const s = seed(analysis.claim);
  const type = classType(analysis.classification);
  const paragraphs: string[] = [];

  paragraphs.push(buildOpening(analysis, s, type));
  paragraphs.push(buildAssumptionsParagraph(analysis, derive(s, 1), type));
  paragraphs.push(buildVariablesParagraph(analysis, derive(s, 2), type));
  paragraphs.push(buildPerspectivesParagraph(analysis, derive(s, 3), type));
  paragraphs.push(buildClosing(analysis, derive(s, 4), type));

  return soften(paragraphs.join("\n\n"));
}

// --- Opening ---

function buildOpening(a: AnalysisResult, s: number, type: ClaimType): string {
  const claim = a.claim.replace(/\.+$/, "");

  // Type-aware openers — each type has a distinct framing feel
  const typeOpeners: Record<ClaimType, string[]> = {
    causal: [
      `"${claim}" asserts a cause-and-effect relationship — one that deserves a closer look at the mechanism.`,
      `The idea that ${lowerFirst(claim)} implies a chain of cause and effect. The question is whether that chain holds.`,
      `"${claim}" connects two things with an implied "because." But does the connection run as deep as it sounds?`,
    ],
    predictive: [
      `"${claim}" is a bet on the future — and like all forecasts, its value depends on what it assumes will stay constant.`,
      `The prediction that ${lowerFirst(claim)} may feel inevitable today. History suggests caution with that feeling.`,
      `"${claim}" projects a trajectory. Whether that trajectory holds depends on forces that are hard to see from here.`,
    ],
    normative: [
      `"${claim}" isn't just a statement of fact — it's a judgment about what matters. That makes it worth unpacking differently.`,
      `The assertion that ${lowerFirst(claim)} reflects a set of priorities. Whether those priorities are the right ones depends on who's asking.`,
      `"${claim}" presents a conclusion wrapped in values. The values themselves are where the real conversation begins.`,
    ],
    nuanced: [
      `"${claim}" tries to hold competing ideas in tension — and the question is whether it resolves them fairly.`,
      `This claim — "${claim}" — acknowledges complexity. But acknowledging a tradeoff and resolving it well are different things.`,
      `"${claim}" weighs competing considerations. The balance it strikes may look different depending on what you prioritize.`,
    ],
    general: [
      `The claim that "${claim}" sounds simple, but it carries more complexity than it first appears.`,
      `"${claim}" is easy to accept at face value — which is exactly why it's worth examining more closely.`,
      `"${claim}" feels intuitive. Whether it actually holds up is a different question.`,
    ],
  };

  const generalOpeners = [
    `At first glance, "${claim}" looks straightforward. A closer look reveals several layers beneath it.`,
    `"${claim}" reads like a clear conclusion, but it leaves a number of important questions open.`,
    `On the surface, "${claim}" seems obvious. Looking closer, it becomes more conditional.`,
    `"${claim}" is the kind of idea that feels right until you start unpacking it.`,
    `This statement — "${claim}" — compresses a lot of assumptions into a single line.`,
    `"${claim}" sounds definitive, but its validity depends on factors that aren't immediately visible.`,
  ];

  // Combine type-specific with general — type-specific come first for higher selection weight
  const openers = [...typeOpeners[type], ...generalOpeners];

  // Strip classification to its core description — remove sentence-like prefixes
  const classCore = a.classification
    .replace(/\.+$/, "")
    .replace(/^(This is primarily |This reads as |This is |A |An |The claim makes )/i, "")
    .replace(/^(a |an )/i, "")
    .trim();
  const classDesc = classCore.charAt(0).toLowerCase() + classCore.slice(1);

  const classNotes = [
    `Structurally, this is a ${classDesc}.`,
    `The analysis identifies this as a ${classDesc}.`,
    `In terms of reasoning, this registers as a ${classDesc}.`,
    `As a piece of reasoning, it reads as a ${classDesc}.`,
    `It functions as a ${classDesc}.`,
  ];

  return `${pick(openers, s, 0)} ${pick(classNotes, s, 1)}`;
}

// --- Assumptions ---

function buildAssumptionsParagraph(a: AnalysisResult, s: number, type: ClaimType): string {
  if (a.assumptions.length === 0) {
    return "The claim appears to rest on no obvious assumptions, though that in itself may indicate unstated premises worth surfacing.";
  }

  const typeIntros: Record<ClaimType, string[]> = {
    causal: [
      "Any causal claim carries assumptions about mechanism — and this one is no exception.",
      "To accept this cause-and-effect story, you have to accept a few dependencies that aren't stated.",
      "The causal chain here depends on several links holding — each one an assumption.",
    ],
    predictive: [
      "Predictions always bet on assumptions about the future — here are this one's.",
      "The forecast embedded in this claim depends on several things going right that may not.",
      "This prediction could still prove correct, but it rests on assumptions about what stays constant.",
    ],
    normative: [
      "Value judgments carry assumptions about what matters — and this one is no different.",
      "Before agreeing with the judgment here, it's worth seeing what framework it takes for granted.",
      "The 'should' in this claim rests on a definition of good that isn't explicitly defended.",
    ],
    nuanced: [
      "The claim acknowledges complexity, but still rests on assumptions about how to resolve it.",
      "Even a balanced-sounding argument has to take some things for granted — this one included.",
      "The tradeoff framing assumes the two sides can be compared cleanly — which is itself an assumption.",
    ],
    general: [
      "What does this claim assume to be true?",
      "This claim depends on several unstated assumptions.",
      "Under the surface, this claim takes a few things for granted.",
    ],
  };

  const generalIntros = [
    "To accept this claim, you have to accept a few underlying assumptions.",
    "Much of this claim rests on ideas that aren't stated outright.",
    "This claim leans on several assumptions that aren't immediately obvious.",
    "Hidden beneath this claim are a number of implicit beliefs.",
    "The reasoning behind this claim depends on several things being true.",
    "This claim works only if certain assumptions hold.",
    "To make sense of this claim, you have to accept a few unspoken premises.",
  ];

  const intros = [...typeIntros[type], ...generalIntros];
  const lines: string[] = [pick(intros, s, 0)];

  // Type-aware connectors for weaving assumptions into prose
  const typeConnectors: Record<ClaimType, string[]> = {
    causal: ["Mechanistically,", "In terms of the causal chain,", "At the level of mechanism,"],
    predictive: ["Looking ahead,", "On the trajectory side,", "In terms of what this bets on,"],
    normative: ["At the values level,", "In terms of priorities,", "On the question of what matters,"],
    nuanced: ["On one side of the tradeoff,", "In terms of the balance,", "Weighing the competing factors,"],
    general: ["What's more,", "Layered on top of that,", "Additionally,"],
  };

  if (a.assumptions.length === 1) {
    const singles = [
      `The central one: ${lowerFirst(a.assumptions[0])}`,
      `Most notably, ${lowerFirst(a.assumptions[0])}`,
      `At its core, ${lowerFirst(a.assumptions[0])}`,
    ];
    lines.push(pick(singles, s, 1));
  } else if (a.assumptions.length === 2) {
    const pairStarts = [
      `First, ${lowerFirst(a.assumptions[0])}`,
      `To begin with, ${lowerFirst(a.assumptions[0])}`,
      `One key assumption: ${lowerFirst(a.assumptions[0])}`,
    ];
    const pairBridges = [
      `Beyond that, ${lowerFirst(a.assumptions[1])}`,
      `Equally important, ${lowerFirst(a.assumptions[1])}`,
      `And underpinning that, ${lowerFirst(a.assumptions[1])}`,
    ];
    lines.push(pick(pairStarts, s, 2));
    lines.push(pick(pairBridges, s, 3));
  } else {
    const firstPhrases = [
      `For one, ${lowerFirst(a.assumptions[0])}`,
      `Start here: ${lowerFirst(a.assumptions[0])}`,
      `The first thing taken for granted — ${lowerFirst(a.assumptions[0])}`,
    ];
    lines.push(pick(firstPhrases, s, 4));

    const connectors = [...typeConnectors[type], "There's also the assumption that", "Compounding this,"];
    lines.push(`${pick(connectors, s, 5)} ${lowerFirst(a.assumptions[1])}`);

    if (a.assumptions.length === 3) {
      const thirdPhrases = [
        `And perhaps most subtly, ${lowerFirst(a.assumptions[2])}`,
        `Less obvious but equally important, ${lowerFirst(a.assumptions[2])}`,
        `Underneath it all, ${lowerFirst(a.assumptions[2])}`,
      ];
      lines.push(pick(thirdPhrases, s, 6));
    } else {
      lines.push(`Beyond these, ${lowerFirst(a.assumptions[2])}`);
    }
  }

  return lines.join(" ");
}

// --- Variables ---

function buildVariablesParagraph(a: AnalysisResult, s: number, type: ClaimType): string {
  if (a.variables.length === 0) {
    return "No obvious variables stand out, though the real-world application of this claim would inevitably depend on context.";
  }

  const typeIntros: Record<ClaimType, string[]> = {
    causal: [
      "Whether this cause produces this effect depends on conditions the claim doesn't specify.",
      "The causal link here is sensitive to factors that could strengthen or sever it entirely.",
      "The mechanism only operates under certain conditions — and those conditions aren't guaranteed.",
    ],
    predictive: [
      "The prediction's accuracy depends on variables that are themselves hard to predict.",
      "Several moving parts could accelerate, delay, or derail this forecast.",
      "The trajectory could shift if any of these factors changes faster or slower than expected.",
    ],
    normative: [
      "The judgment holds under some conditions and collapses under others.",
      "Whether this 'should' translates into good advice depends on whose circumstances you consider.",
      "The values behind this judgment don't exist in a vacuum — they interact with real-world conditions.",
    ],
    nuanced: [
      "The tradeoff resolves differently depending on which variables dominate.",
      "Both sides of this tension are real — what changes is which one matters more in a given situation.",
      "The balance shifts depending on conditions the claim treats as settled.",
    ],
    general: [
      "Whether this holds depends heavily on context.",
      "The outcome shifts depending on a few key factors.",
      "Several variables could change how this plays out.",
    ],
  };

  const generalIntros = [
    "This claim doesn't operate in a vacuum — context matters.",
    "How this plays out depends on factors the claim doesn't fully address.",
    "The strength of this claim changes depending on the situation.",
    "What happens here depends on conditions outside the claim itself.",
    "The result varies depending on how the surrounding factors line up.",
    "This claim lands differently depending on context.",
    "The outcome is sensitive to factors the claim doesn't specify.",
  ];

  const intros = [...typeIntros[type], ...generalIntros];
  const lines: string[] = [pick(intros, s, 0)];

  const varList = a.variables.slice(0, 4);
  if (varList.length <= 2) {
    const twoVarPhrases = [
      `In particular, ${varList.map(v => v.toLowerCase()).join(" and ")} could meaningfully affect the outcome.`,
      `Specifically, ${varList.map(v => v.toLowerCase()).join(" and ")} are the pivot points.`,
      `The key variables: ${varList.map(v => v.toLowerCase()).join(", and ")}.`,
    ];
    lines.push(pick(twoVarPhrases, s, 1));
  } else {
    const last = varList[varList.length - 1].toLowerCase();
    const rest = varList.slice(0, -1).map(v => v.toLowerCase()).join(", ");
    const multiVarPhrases = [
      `Factors like ${rest}, and ${last} could all shift the conclusion.`,
      `Among the variables that matter: ${rest}, and ${last}.`,
      `Consider ${rest}, and ${last} — each one could change how this plays out.`,
      `The outcome depends on ${rest}, and ${last}.`,
    ];
    lines.push(pick(multiVarPhrases, s, 2));
  }

  return lines.join(" ");
}

// --- Perspectives ---

function buildPerspectivesParagraph(a: AnalysisResult, s: number, type: ClaimType): string {
  if (a.perspectives.length === 0) {
    return "Reasonable people could disagree about this claim, though the specific lines of argument are not immediately obvious from the text alone.";
  }

  const typeIntros: Record<ClaimType, string[]> = {
    causal: [
      "The causal story here has both supporters and skeptics — and both sides have reason.",
      "Whether you find the mechanism convincing depends on how much weight you give to the available evidence.",
      "The evidence for this causal link is read very differently depending on your starting assumptions.",
    ],
    predictive: [
      "Predictions invite disagreement by nature — this one is no different.",
      "The debate here is less about whether change is coming than about its pace, scale, and shape.",
      "Forecasts like this one split observers into those who see inevitability and those who see uncertainty.",
    ],
    normative: [
      "This isn't just a factual dispute — it's a disagreement about values.",
      "Where you land on this depends less on evidence than on what you think matters most.",
      "The disagreement here reflects competing ideas about what we should prioritize, not competing facts.",
    ],
    nuanced: [
      "The claim tries to hold both sides — but the balance isn't universally accepted.",
      "Even a nuanced position has its critics, and the objections here are worth hearing.",
      "The tradeoff may be real, but how much weight each side deserves is where the real argument begins.",
    ],
    general: [
      "There are reasonable arguments on both sides.",
      "Different perspectives interpret this differently.",
      "This is where disagreement becomes meaningful.",
    ],
  };

  const generalIntros = [
    "People looking at the same claim can reach very different conclusions.",
    "This claim invites both support and skepticism for good reasons.",
    "There's no single way to interpret this claim.",
    "Depending on your perspective, this can look either compelling or flawed.",
    "This is the point where interpretations begin to diverge.",
    "Support and criticism both have a case here.",
    "The same claim can feel obvious to one person and questionable to another.",
  ];

  const intros = [...typeIntros[type], ...generalIntros];
  const lines: string[] = [pick(intros, s, 0)];

  // Type-aware transition pairs
  const forTransitions: Record<ClaimType, string[]> = {
    causal: ["Those who accept the mechanism would note that", "Evidence for the causal link suggests that", "In favor of the connection,"],
    predictive: ["Those who see this as likely would point out that", "Believers in this trajectory note that", "The case for this forecast rests on the idea that"],
    normative: ["Those who share these priorities would say", "From within this value framework,", "If you accept the underlying judgment,"],
    nuanced: ["Those who accept the balance as stated might argue that", "On the side the claim favors,", "Weighing in favor of the claim's resolution,"],
    general: ["On one hand,", "From one angle,", "Those sympathetic to the claim might note that"],
  };

  const againstTransitions: Record<ClaimType, string[]> = {
    causal: ["Skeptics of the mechanism would counter that", "Those who doubt the causal link argue that", "Against the claimed connection,"],
    predictive: ["Those more skeptical of the timeline might respond that", "Critics of the forecast would say", "Against this trajectory,"],
    normative: ["Those with different priorities would respond that", "From a competing value framework,", "If you apply a different standard,"],
    nuanced: ["Those who weight the other side more heavily would say", "Against the claim's resolution,", "Tipping the balance the other way,"],
    general: ["On the other hand,", "From another angle,", "Those less convinced might counter that"],
  };

  const laterTransitions = [
    "There's also the view that", "Others might add that", "It's also worth noting that",
    "A further consideration:", "And from yet another angle,",
  ];

  for (let i = 0; i < Math.min(a.perspectives.length, 4); i++) {
    const p = a.perspectives[i];
    if (i === 0) {
      lines.push(`${pick(forTransitions[type], s, 1)} ${lowerFirst(p)}`);
    } else if (i === 1) {
      lines.push(`${pick(againstTransitions[type], s, 2)} ${lowerFirst(p)}`);
    } else {
      lines.push(`${pick(laterTransitions, s, 3 + i)} ${lowerFirst(p)}`);
    }
  }

  return lines.join(" ");
}

// --- Closing ---

function buildClosing(a: AnalysisResult, s: number, type: ClaimType): string {
  const typeBridges: Record<ClaimType, string[]> = {
    causal: ["So does the mechanism hold?", "What, then, should we make of the causal claim?", "Is the cause-and-effect story convincing?"],
    predictive: ["So will it play out this way?", "What should we make of this forecast?", "How confident should we be in this prediction?"],
    normative: ["So is the judgment sound?", "Should we accept the values behind this claim?", "Does the value framework hold up?"],
    nuanced: ["So does the tradeoff resolve the way the claim suggests?", "Is the balance struck here the right one?", "Does the nuance survive scrutiny?"],
    general: ["So what should we take away from this?", "Stepping back, what does this actually tell us?", "Looking at it as a whole, a clearer picture emerges."],
  };

  const generalBridges = [
    "In the end, the strength of this claim depends on what you consider most important.",
    "Taken together, the picture is more conditional than it first appears.",
    "When you pull these threads together, the claim becomes more nuanced.",
    "Seen in full, this claim depends on more than it initially suggests.",
    "The overall picture is more contingent than definitive.",
    "Ultimately, this claim stands or falls based on factors it leaves unstated.",
  ];

  const bridges = [...typeBridges[type], ...generalBridges];

  const typeCodas: Record<ClaimType, string[]> = {
    causal: [
      "The causal link may be real, but it operates within a system of dependencies that the claim itself doesn't acknowledge.",
      "Whether the mechanism holds depends on conditions that deserve their own investigation.",
    ],
    predictive: [
      "The prediction may prove right — but its value lies less in certainty than in how well it maps the forces at play.",
      "Forecasts earn their weight not by being right, but by clarifying what would have to be true for them to hold.",
    ],
    normative: [
      "The judgment here reflects a coherent set of values — but values are chosen, not discovered, and other choices lead to other conclusions.",
      "This isn't a claim you settle with evidence alone. It requires deciding what matters most, and that's a different kind of work.",
    ],
    nuanced: [
      "The tradeoff is real, but how it resolves depends on priorities the claim doesn't fully make explicit.",
      "Acknowledging complexity is a strength — but the final weighting still reflects a choice that not everyone will share.",
    ],
    general: [
      "Claims like this one are rarely as simple as they first appear — and the most honest response is often not agreement or rejection, but a more precise question.",
      "The value of this kind of analysis isn't to settle the debate, but to clarify what the debate is actually about.",
    ],
  };

  const generalCodas = [
    "None of this means the claim is wrong. It means that accepting or rejecting it requires engaging with the specifics it leaves unstated.",
    "This is exactly the kind of claim that benefits from scrutiny — not because it's weak, but because the stakes of getting it right are high.",
    "The point isn't to dismiss the claim, but to understand the conditions under which it earns its weight.",
  ];

  const codas = [...typeCodas[type], ...generalCodas];

  const conclusion = a.conclusion
    .replace(/\b1 things\b/g, "1 thing")
    .replace(/\b1 assumptions\b/g, "1 assumption")
    .replace(/\b1 variables\b/g, "1 variable")
    .replace(/\b1 factors\b/g, "1 factor");

  return `${pick(bridges, s, 0)} ${conclusion} ${pick(codas, s, 1)}`;
}

// --- Utilities ---

function soften(s: string): string {
  return s
    .replace(/\bthe stated factor\b/gi, "the factor in question")
    .replace(/\bthe described effect\b/gi, "the effects being discussed")
    .replace(/\bthe claimed benefit\b/gi, "the benefits at stake")
    .replace(/\bthis argument measurably changed\b/gi, "this factor meaningfully influenced")
    .replace(/\bthe stated factor work firsthand\b/gi, "this approach work firsthand")
    // Deduplicate adjacent repeated phrases (e.g. "this is this is")
    .replace(/\b(this is|this reads as|it reads as|a a|an an|the the)\s+\1\b/gi, "$1")
    // Clean double articles
    .replace(/\ba a\b/g, "a")
    .replace(/\ban an\b/g, "an");
}

function lowerFirst(s: string): string {
  if (!s) return s;
  if (/^[A-Z]{2,}/.test(s)) return s;
  if (/^"/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
