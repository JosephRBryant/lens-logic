import { isNounLike, isAre, smartLower } from "./types";
import type { ClaimTraits, ClaimStructure } from "./types";

export function detectTraits(claim: string): ClaimTraits {
  return {
    isCausal: /\b(cause[sd]?|because|leads? to|results? in|due to|therefore|improves?|reduces?|increases?|affects?|drives?|creates?|produces?|makes?|when)\b/i.test(claim),
    isPredictive: /\b(will|going to|predict|expect|likely|inevitabl[ey]|soon|future|replace|trend|forecast)\b/i.test(claim),
    isNormative: /\b(should|must|ought|need to|have to|wrong|right|better off|moral|no longer|worth)\b/i.test(claim),
    isComparative: /\b(more|less|better|worse|bigger|smaller|greater|fewer|higher|lower)\b[^.!?]*\bthan\b|\bcompared\s+(to|with)\b/i.test(claim),
    isAbsolute: /\b(always|never|every|all|none|no one|everyone|nobody|most|any)\b/i.test(claim),
    hasTradeoff: /\b(but|however|although|though|while|on the other hand|yet|despite|nevertheless|tradeoff|trade-off)\b/i.test(claim),
    isShort: claim.length < 50,
    hasNumbers: /\d/.test(claim),
    isQuestion: claim.endsWith("?"),
    domainWork: /\b(work|remote|employee|employer|office|workplace|hire|hiring|labor|workforce|team)\b/i.test(claim),
    domainTech: /\b(tech|technology|ai|artificial intelligence|automat|software|computer|digital|robot|machine learning|algorithm)\b/i.test(claim),
    domainEducation: /\b(college|university|school|education|degree|student|tuition|learning|graduate|academic)\b/i.test(claim),
    domainEcon: /\b(cost|price|money|econom|market|income|wage|salary|debt|invest|financial|afford|GDP|inflation)\b/i.test(claim),
    domainPolicy: /\b(policy|government|law|regulation|tax|vote|politic|legislation|mandate|ban|reform)\b/i.test(claim),
    domainHealth: /\b(health|medical|mental|exercise|diet|wellbeing|well-being|therapy|disease|drug|treatment)\b/i.test(claim),
    domainProductivity: /\b(productiv|efficien|output|performance|measur|metric|KPI|result)\b/i.test(claim),
  };
}

// Extract directional claim structure: subject → relation → object
export function extractClaimStructure(claim: string): ClaimStructure {
  const cleaned = claim.replace(/[.!?]+$/, "").trim();

  // Relation patterns ordered from most specific (multi-word) to least.
  // Each pattern captures everything before it as subject, and everything after as object.
  const relationPatterns: RegExp[] = [
    // Comparative patterns: "X plays a bigger role in Y than Z", "X matters more than Z"
    /^(.+?)\b((?:plays?|has|have|had|makes?|exerts?)\s+(?:a\s+)?(?:bigger|smaller|larger|greater|lesser|more\s+\w+|less\s+\w+)\s+(?:role|impact|influence|effect|part|contribution)(?:\s+(?:in|on|to|for)\s+\S+(?:\s+\S+)*)?\s+than)\s+(.+)$/i,
    /^(.+?)\b((?:matters?|counts?|contributes?|weighs?)\s+(?:more|less)(?:\s+(?:in|to|for)\s+\S+(?:\s+\S+)*)?\s+than)\s+(.+)$/i,
    // Multi-word verb phrases
    /^(.+?)\b(will not|won't|cannot|can't|does not|doesn't|is no longer|are no longer)\b\s*(.*?)$/i,
    /^(.+?)\b(will (?:likely |probably )?(?:replace|improve|reduce|increase|affect|drive|create|produce|cause|lead to|result in|change|transform|eliminate|disrupt|enable|prevent|destroy|hurt|help|boost|lower|raise|undermine|strengthen|weaken))\b\s*(.*?)$/i,
    /^(.+?)\b(is (?:no longer )?worth|is (?:better|worse|more|less) than|is not worth)\b\s*(.*?)$/i,
    /^(.+?)\b(should (?:not )?(?:be|have|replace|require|include|allow))\b\s*(.*?)$/i,
    // Single relation verbs
    /^(.+?)\b(improves?|reduces?|increases?|affects?|drives?|creates?|produces?|causes?|replaces?|eliminates?|disrupts?|enables?|prevents?|destroys?|hurts?|helps?|boosts?|lowers?|raises?|undermines?|strengthens?|weakens?|transforms?|threatens?|damages?|promotes?|supports?|hinders?|limits?|makes?|ruins?)\b\s*(.*?)$/i,
    // "leads to" / "results in" as a unit
    /^(.+?)\b(leads? to|results? in)\b\s*(.*?)$/i,
    // Linking verb patterns
    /^(.+?)\b(is|are|was|were)\b\s*(.*?)$/i,
  ];

  for (const pattern of relationPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const rawSubject = match[1].trim();
      const relation = match[2].trim().toLowerCase();
      const rawObject = match[3].trim();

      // Clean minor leading/trailing articles and prepositions from subject/object
      const rawSubjClean = cleanNounPhrase(rawSubject);
      const rawObjClean = cleanNounPhrase(rawObject);

      // Only accept if both subject and object are non-trivial
      if (rawSubjClean.length >= 2 && rawObjClean.length >= 2) {
        // Guard against sentence fragments that read badly in templates.
        // If EITHER side is a fragment, both fall back to generic labels so
        // downstream templates never get a misleading half-real pair like
        // "effect of people on the stated outcome".
        const bothClean = isNounLike(rawSubjClean) && isNounLike(rawObjClean);
        const subject = bothClean ? rawSubjClean : "the proposed cause";
        const object = bothClean ? rawObjClean : "the expected outcome";
        const concepts = [rawSubjClean, rawObjClean].filter(Boolean);
        return { subject, relation, object, concepts };
      }
    }
  }

  // Fallback: no clear relation found. Return generic structure.
  const fallbackConcepts = extractFallbackConcepts(cleaned);
  const fbSubj = fallbackConcepts[0] || "";
  const fbObj = fallbackConcepts[1] || "";
  const fbBothClean = !!(fbSubj && fbObj && isNounLike(fbSubj) && isNounLike(fbObj));
  return {
    subject: fbBothClean ? fbSubj : "the proposed cause",
    relation: "",
    object: fbBothClean ? fbObj : "the expected outcome",
    concepts: fallbackConcepts,
  };
}

function cleanNounPhrase(phrase: string): string {
  return smartLower(
    phrase
      // Remove leading articles/prepositions
      .replace(/^(the|a|an|that|this|its|their|our|your|his|her)\s+/i, "")
      // Remove trailing conjunctions or dangling prepositions
      .replace(/\s+(and|or|but|for|to|in|on|at|of|by|with)$/i, "")
      .trim()
  );
}

function extractFallbackConcepts(text: string): string[] {
  // Simple fallback: split on common structural words, keep phrases in order
  const stopWords = new Set([
    "is", "are", "was", "were", "will", "would", "could", "can", "may",
    "might", "shall", "do", "does", "did", "has", "have", "had", "be",
    "been", "being", "the", "a", "an", "that", "this", "and", "or", "but",
    "however", "although", "because", "therefore", "for", "of", "in", "on",
    "at", "to", "from", "by", "with", "into", "about", "between", "through",
    "than", "as", "if", "when", "where", "it", "its", "not", "no",
  ]);

  const words = text.split(/\s+/);
  const phrases: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    const lower = word.toLowerCase().replace(/[,;:]/g, "");
    if (stopWords.has(lower) || lower.length < 2) {
      if (current.length > 0) {
        phrases.push(smartLower(current.join(" ")));
        current = [];
      }
    } else {
      current.push(word);
    }
  }
  if (current.length > 0) {
    phrases.push(smartLower(current.join(" ")));
  }

  // Return first 3 in order of appearance (not sorted by length)
  return phrases.slice(0, 3);
}

// Step 1: Classify the claim by rhetorical type and domain
export function classifyClaim(claim: string, traits: ClaimTraits): string {
  const types: string[] = [];
  if (traits.isCausal) types.push("causal");
  if (traits.isPredictive) types.push("predictive");
  if (traits.isNormative) types.push("normative");
  if (traits.isComparative) types.push("comparative");
  if (traits.isAbsolute) types.push("absolute");
  if (traits.hasTradeoff) types.push("nuanced");
  if (traits.isQuestion) types.push("interrogative");

  const domains: string[] = [];
  if (traits.domainWork) domains.push("workplace");
  if (traits.domainTech) domains.push("technology");
  if (traits.domainEducation) domains.push("education");
  if (traits.domainEcon) domains.push("economics");
  if (traits.domainPolicy) domains.push("policy");
  if (traits.domainHealth) domains.push("health");
  if (traits.domainProductivity) domains.push("productivity");

  const typeStr = types.length > 0 ? types.join(", ") : "general";
  const domainStr = domains.length > 0 ? domains.join(", ") : "general";

  return `${typeStr} claim in the domain of ${domainStr}`;
}

// Step 2: Extract assumptions embedded in the claim
export function extractAssumptions(claim: string, traits: ClaimTraits, structure: ClaimStructure): string[] {
  const assumptions: string[] = [];
  const subject = structure.subject;
  const object = structure.object;

  if (traits.isCausal) {
    if (traits.domainWork || traits.domainProductivity) {
      assumptions.push(`It assumes ${subject} directly affects ${object}, independent of management, culture, or role type.`);
    } else if (traits.domainHealth) {
      assumptions.push(`It assumes ${subject} ${isAre(subject) === "are" ? "have" : "has"} a direct health effect on ${object}, controlling for genetics, lifestyle, and environment.`);
    } else if (traits.domainTech) {
      assumptions.push(`It assumes ${subject} works as described and is adopted widely enough to produce the claimed effect on ${object}.`);
    } else {
      assumptions.push(`It assumes a direct cause-and-effect relationship between ${subject} and ${object}.`);
    }
    assumptions.push(`It assumes the link between ${subject} and ${object} is not confounded by unmentioned variables.`);
  }

  if (traits.isPredictive) {
    if (traits.domainTech) {
      assumptions.push(`It assumes the current pace of development around ${subject} will continue without major regulatory or technical barriers.`);
    } else if (traits.domainEcon) {
      assumptions.push(`It assumes current economic conditions affecting ${subject} will persist into the future.`);
    } else if (traits.domainWork) {
      assumptions.push(`It assumes labor market trends related to ${subject} will follow the predicted trajectory.`);
    } else {
      assumptions.push(`It assumes current trends affecting ${subject} will continue without major disruption.`);
    }
    assumptions.push(`It assumes a specific timeline for changes to ${object}, which may not be stated explicitly.`);
  }

  if (traits.isNormative) {
    if (traits.domainEducation) {
      assumptions.push(`It assumes a particular definition of what makes ${subject} worthwhile — likely financial return — while other measures of value may apply.`);
    } else if (traits.domainPolicy) {
      assumptions.push(`It assumes a shared set of goals regarding ${subject}, though different stakeholders may prioritize differently.`);
    } else if (traits.domainEcon) {
      assumptions.push(`It assumes economic cost or benefit is the primary criterion for evaluating ${subject}.`);
    } else {
      assumptions.push(`It assumes a shared value framework for judging whether ${subject} ${isAre(subject)} right, good, or worthwhile.`);
    }
    assumptions.push(`It assumes the criteria for judging ${subject} are clear and agreed upon.`);
  }

  if (traits.isComparative) {
    if (traits.domainEcon || traits.domainEducation) {
      assumptions.push(`It assumes the costs and benefits of ${subject} are measured consistently against the alternative.`);
    } else if (traits.domainHealth) {
      assumptions.push(`It assumes the health outcomes related to ${subject} are compared under similar conditions.`);
    } else {
      assumptions.push(`It assumes ${subject} and the comparison target are measured on the same basis and scale.`);
    }
  }

  if (traits.isAbsolute) {
    if (traits.domainWork) {
      assumptions.push(`The generalization assumes ${subject} affects all workers, roles, and industries the same way.`);
    } else if (traits.domainTech) {
      assumptions.push(`It assumes ${subject} applies uniformly, ignoring variation across industries and adoption stages.`);
    } else {
      assumptions.push(`The absolute language assumes there are zero exceptions to the pattern described about ${subject}.`);
    }
  }

  if (traits.hasTradeoff) {
    assumptions.push("The claim acknowledges competing considerations but assumes one clearly outweighs the other.");
  }
  if (traits.hasNumbers) {
    assumptions.push("It assumes the cited figures are accurate, current, and representative.");
  }
  if (traits.isQuestion) {
    assumptions.push("The question embeds assumptions that constrain the expected answer.");
  }
  if (traits.isShort) {
    assumptions.push("The brevity leaves important context and qualifications unstated.");
  }
  if (traits.domainProductivity && !traits.isCausal) {
    assumptions.push("It assumes productivity is well-defined and measurable in this context.");
  }
  if (traits.domainEducation && !traits.isNormative && !traits.isComparative) {
    assumptions.push("It assumes a particular model of education without specifying alternatives.");
  }

  if (assumptions.length === 0) {
    assumptions.push("The claim assumes the reader shares the same context and definitions for key terms.");
    assumptions.push("It presumes the underlying evidence is accurate and complete.");
  } else if (assumptions.length === 1) {
    assumptions.push("The claim assumes the reader shares the same context and definitions for key terms.");
  }

  return assumptions;
}

// Step 3: Identify key variables that could affect the claim's validity
export function identifyVariables(claim: string, traits: ClaimTraits, structure: ClaimStructure): string[] {
  const variables: string[] = [];
  const subject = structure.subject;
  const object = structure.object;

  // Domain-specific variables
  if (traits.domainWork) {
    variables.push("Industry and sector differences");
    variables.push("Role type, seniority level, and job function");
    if (traits.isCausal || traits.isPredictive) {
      variables.push("Management practices and organizational culture");
    }
  }
  if (traits.domainTech) {
    variables.push("Rate and unevenness of technology adoption");
    variables.push("Regulatory environment and policy responses");
    if (traits.isPredictive) {
      variables.push("Historical accuracy of similar technology predictions");
    }
  }
  if (traits.domainEducation) {
    variables.push("Field of study and institution selectivity");
    variables.push("Regional job market conditions");
    if (traits.isNormative || traits.isComparative) {
      variables.push("Student debt load and family financial context");
    }
  }
  if (traits.domainEcon) {
    variables.push("Economic cycle timing and market conditions");
    variables.push("Income distribution and demographic differences");
  }
  if (traits.domainPolicy) {
    variables.push("Political and institutional context");
    variables.push("Implementation feasibility and enforcement capacity");
  }
  if (traits.domainHealth) {
    variables.push("Individual genetic and lifestyle variation");
    variables.push("Access to healthcare and socioeconomic status");
  }
  if (traits.domainProductivity) {
    variables.push("How productivity is defined and measured");
    variables.push("Baseline conditions and comparison period");
  }

  // Trait-specific variables
  if (traits.isCausal && variables.length < 4) {
    variables.push(`Potential confounding factors not mentioned in the claim about ${subject}`);
  }
  if (traits.isPredictive) {
    // Predictions hinge on pace, resistance, and scope — add these regardless of
    // domain because domain variables alone often miss what makes a prediction fragile.
    if (variables.length < 5) {
      variables.push(`Whether the current trajectory of ${subject} is compounding or approaching a ceiling`);
    }
    if (variables.length < 5) {
      variables.push(`Institutional, regulatory, or cultural resistance that could slow or redirect ${subject}`);
    }
    if (variables.length < 5 && object !== "the expected outcome") {
      variables.push(`Whether "${object}" means full displacement or gradual restructuring — the scope changes the timeline`);
    }
    if (variables.length < 5) {
      variables.push(`Cost, infrastructure, and accessibility barriers to widespread adoption of ${subject}`);
    }
  }
  if (traits.isComparative && variables.length < 4) {
    variables.push(`Selection of comparison groups and metrics for evaluating ${subject}`);
  }
  if (traits.hasNumbers) {
    variables.push("Data source, sample size, and methodology");
  }

  // Fallback — claim-specific rather than generic
  if (variables.length === 0) {
    variables.push(`What exactly counts as "${subject}" — the definition shapes the conclusion`);
    variables.push("Who this applies to — age, background, and circumstances likely change the result");
    variables.push("Whether this has been tested in controlled settings or is based on informal observation");
    variables.push("The timeframe being considered — short-term and long-term effects may differ");
  }
  if (variables.length < 3) {
    variables.push("How the outcome is being measured — different metrics could tell different stories");
    variables.push("Whether the effect persists across different populations and settings");
  }

  return variables;
}

// Step 4: Evaluate perspectives for and against the claim
export function evaluatePerspectives(claim: string, traits: ClaimTraits, structure: ClaimStructure): string[] {
  const perspectives: string[] = [];
  const subject = structure.subject;
  const object = structure.object;

  if (traits.isCausal) {
    if (traits.domainWork || traits.domainProductivity) {
      perspectives.push(`Supporters may cite studies linking ${subject} to measurable gains in ${object}.`);
      perspectives.push(`Critics may argue that ${object} depends on too many variables to attribute to ${subject} alone.`);
    } else if (traits.domainHealth) {
      perspectives.push(`Proponents may point to clinical or epidemiological evidence supporting the link between ${subject} and ${object}.`);
      perspectives.push(`Skeptics may note that ${object} ${isAre(object)} multi-factorial and hard to attribute to ${subject} alone.`);
    } else if (traits.domainTech) {
      perspectives.push(`Advocates may cite early data showing ${subject}'s effect on ${object}.`);
      perspectives.push(`Critics may argue ${subject}'s effect is context-dependent and doesn't generalize.`);
    } else {
      perspectives.push(`Supporters may point to evidence linking ${subject} to ${object}.`);
      perspectives.push(`Critics may argue the relationship between ${subject} and ${object} is correlational, not causal.`);
    }
  }

  if (traits.isPredictive) {
    if (traits.domainTech) {
      perspectives.push(`Optimists may see the prediction about ${subject} as supported by current momentum in the technology sector.`);
      perspectives.push(`Skeptics may note that predictions about ${subject} frequently overestimate the pace of change.`);
    } else if (traits.domainWork) {
      perspectives.push(`Some analysts may see shifts related to ${subject} as inevitable given current trends.`);
      perspectives.push(`Others may argue that policy intervention and adaptation will moderate the impact of ${subject}.`);
    } else {
      perspectives.push(`Those who agree may see the trend around ${subject} as already underway and likely to continue.`);
      perspectives.push(`Those who disagree may point to historical cases where similar predictions about ${subject} did not materialize.`);
    }
  }

  if (traits.isNormative) {
    if (traits.domainEducation) {
      perspectives.push(`Those who agree may emphasize rising costs and uncertain financial returns of ${subject}.`);
      perspectives.push(`Those who disagree may point to non-financial benefits of ${subject}: personal growth, social mobility, and civic participation.`);
    } else if (traits.domainPolicy) {
      perspectives.push(`Supporters may frame the position on ${subject} as necessary for the public good.`);
      perspectives.push(`Opponents may argue the position on ${subject} imposes costs on specific groups or limits individual freedom.`);
    } else {
      perspectives.push(`Those who share the underlying values may find the claim about ${subject} self-evident.`);
      perspectives.push(`Those with different values may reject the premise about ${subject} entirely.`);
    }
  }

  if (traits.isComparative) {
    if (traits.domainEcon || traits.domainEducation) {
      perspectives.push(`One side may select cost metrics for ${subject} that favor their conclusion.`);
      perspectives.push(`The other side may use different timeframes or benefit categories that lead to the opposite conclusion about ${subject}.`);
    } else {
      perspectives.push(`Different stakeholders may weight the criteria for evaluating ${subject} differently.`);
      perspectives.push(`The framing of the comparison around ${subject} may favor one side over the other.`);
    }
  }

  if (traits.isAbsolute) {
    perspectives.push("The broad claim may resonate with people who see a clear pattern in their experience.");
    perspectives.push("Those aware of exceptions may see the absolute framing as an oversimplification.");
  }

  if (traits.hasTradeoff) {
    perspectives.push("The acknowledged tension suggests the author has considered opposing views, which may increase credibility.");
    perspectives.push("However, the resolution of the tradeoff may still be one-sided or insufficiently justified.");
  }

  if (perspectives.length === 0) {
    perspectives.push("Supporters of this view may find the reasoning straightforward and well-grounded.");
    perspectives.push("Critics may argue that the claim oversimplifies or omits relevant considerations.");
  }

  return perspectives;
}

// Step 5: Generate a conclusion based on all prior analysis
export function generateConclusion(
  claim: string,
  traits: ClaimTraits,
  classification: string,
  assumptions: string[],
  variables: string[],
): string {
  const parts: string[] = [];

  if (traits.isCausal) {
    parts.push("The causal link here may be real, but it only holds if the mechanism is genuine and the confounders are accounted for.");
  }
  if (traits.isPredictive) {
    parts.push("The prediction could prove correct, but its credibility depends on timing, pace, and whether the underlying trend is structural or temporary.");
  }
  if (traits.isNormative) {
    parts.push("The judgment reflects a particular set of values — coherent within its own framework, but not the only framework available.");
  }
  if (traits.isComparative) {
    parts.push("The comparison is only as strong as the consistency of what's being measured and who's being compared.");
  }
  if (traits.isAbsolute) {
    parts.push("The broad framing overstates the case — the claim is likely true in some situations and false in others.");
  }
  if (traits.hasTradeoff) {
    parts.push("The tradeoff is real, but how it resolves depends on priorities the claim doesn't fully make explicit.");
  }

  if (parts.length === 0) {
    parts.push("This claim isn't wrong on its face, but its strength depends on assumptions and conditions it doesn't make explicit.");
  }

  parts.push("Whether you accept it should depend on how well its premises match the specific situation you're evaluating.");

  return parts.join(" ");
}
