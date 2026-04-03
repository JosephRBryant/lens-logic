import type { AnalysisResult } from "./types";
import { isAIAvailable, isStepForced, promptAIJSON, log } from "./ai";
import { analyzeClaimSimulated } from "./simulated";
import { generateArticle } from "./article";
import { generateStrongerClaim, generateWeakerClaim, generateCoreQuestion } from "./transformations";
import { generateCounterargument } from "./counterargument";
import { generateHingesOn, generateBreaksIf, generateHoldsWhen } from "./insight";
import {
  classifyClaimPrompt,
  extractAssumptionsPrompt,
  identifyVariablesPrompt,
  evaluatePerspectivesPrompt,
  generateConclusionPrompt,
} from "./prompts";
import {
  detectTraits,
  extractClaimStructure,
  classifyClaim as classifyClaimDeterministic,
  extractAssumptions as extractAssumptionsDeterministic,
  identifyVariables as identifyVariablesDeterministic,
  evaluatePerspectives as evaluatePerspectivesDeterministic,
  generateConclusion as generateConclusionDeterministic,
} from "./reasoningSteps";

export async function analyzeClaim(claim: string): Promise<AnalysisResult> {
  const traits = detectTraits(claim);
  const structure = extractClaimStructure(claim);
  const simulatedMode = process.env.LENS_LOGIC_SIMULATED_AI === "true";
  const aiEnabled = isAIAvailable();

  log(`--- analyze request ---`);
  log(`AI mode: ${simulatedMode ? "simulated" : aiEnabled ? "enabled" : "disabled (no API key)"}`);

  let result: AnalysisResult;

  if (simulatedMode) {
    log("pipeline: simulated AI mode");
    result = { ...analyzeClaimSimulated(claim, traits, structure), hingesOn: "", breaksIf: "", holdsWhen: "", stronger: "", weaker: "", coreQuestion: "", counterargument: "", article: "" };
    logStepResults(result, "simulated");
  } else if (!aiEnabled) {
    log("pipeline: full deterministic mode");
    result = analyzeClaimDeterministic(claim, traits, structure);
    logStepResults(result, "deterministic");
  } else {
    log("pipeline: AI-enabled mode (per-step fallback)");

    const classification = await aiClassify(claim, traits);
    const assumptions = await aiAssumptions(claim, traits, structure);
    const variables = await aiVariables(claim, traits, structure);
    const perspectives = await aiPerspectives(claim, traits, structure);
    const conclusion = await aiConclusion(
      claim, traits, classification, assumptions, variables,
    );

    result = { claim, classification, assumptions, variables, perspectives, conclusion, hingesOn: "", breaksIf: "", holdsWhen: "", stronger: "", weaker: "", coreQuestion: "", counterargument: "", article: "" };
  }

  result.hingesOn = generateHingesOn(result);
  result.breaksIf = generateBreaksIf(result);
  result.holdsWhen = generateHoldsWhen(result);
  result.stronger = generateStrongerClaim(claim, result);
  result.weaker = generateWeakerClaim(claim, result);
  result.coreQuestion = generateCoreQuestion(claim, result, structure);
  result.counterargument = generateCounterargument(result);
  result.article = generateArticle(result);
  log(`  transformations: stronger/weaker/coreQuestion generated`);
  log(`  article: ${result.article.length} chars`);
  return result;
}

function logStepResults(result: AnalysisResult, mode: string): void {
  log(`  classification [${mode}]: ${result.classification.slice(0, 80)}`);
  log(`  assumptions [${mode}]: ${result.assumptions.length} items`);
  log(`  variables [${mode}]: ${result.variables.length} items`);
  log(`  perspectives [${mode}]: ${result.perspectives.length} items`);
  log(`  conclusion [${mode}]: ${result.conclusion.slice(0, 80)}...`);
}

function analyzeClaimDeterministic(
  claim: string,
  traits: ReturnType<typeof detectTraits>,
  structure: ReturnType<typeof extractClaimStructure>,
): AnalysisResult {
  const classification = classifyClaimDeterministic(claim, traits);
  const assumptions = extractAssumptionsDeterministic(claim, traits, structure);
  const variables = identifyVariablesDeterministic(claim, traits, structure);
  const perspectives = evaluatePerspectivesDeterministic(claim, traits, structure);
  const conclusion = generateConclusionDeterministic(
    claim, traits, classification, assumptions, variables,
  );
  return { claim, classification, assumptions, variables, perspectives, conclusion, hingesOn: "", breaksIf: "", holdsWhen: "", stronger: "", weaker: "", coreQuestion: "", counterargument: "", article: "" };
}

// --- AI-backed steps with per-step fallback and debug logging ---

async function aiClassify(
  claim: string,
  traits: ReturnType<typeof detectTraits>,
): Promise<string> {
  if (isStepForced("classification")) {
    log("  classification: forced failure → deterministic");
    return classifyClaimDeterministic(claim, traits);
  }

  const result = await promptAIJSON<{ classification: string }>(
    classifyClaimPrompt(claim),
  );

  if ("error" in result) {
    log(`  classification: fallback → deterministic (${result.error})`);
    return classifyClaimDeterministic(claim, traits);
  }

  const { data } = result;
  if (typeof data.classification === "string" && data.classification.length > 0) {
    log(`  classification: AI ✓ → "${data.classification.slice(0, 60)}"`);
    return data.classification;
  }

  log("  classification: fallback → deterministic (invalid response shape)");
  return classifyClaimDeterministic(claim, traits);
}

async function aiAssumptions(
  claim: string,
  traits: ReturnType<typeof detectTraits>,
  structure: ReturnType<typeof extractClaimStructure>,
): Promise<string[]> {
  if (isStepForced("assumptions")) {
    log("  assumptions: forced failure → deterministic");
    return extractAssumptionsDeterministic(claim, traits, structure);
  }

  const result = await promptAIJSON<{ assumptions: string[] }>(
    extractAssumptionsPrompt(claim),
  );

  if ("error" in result) {
    log(`  assumptions: fallback → deterministic (${result.error})`);
    return extractAssumptionsDeterministic(claim, traits, structure);
  }

  const { data } = result;
  if (Array.isArray(data.assumptions) && data.assumptions.length > 0
    && data.assumptions.every((a) => typeof a === "string")) {
    log(`  assumptions: AI ✓ → ${data.assumptions.length} items`);
    return data.assumptions;
  }

  log("  assumptions: fallback → deterministic (invalid response shape)");
  return extractAssumptionsDeterministic(claim, traits, structure);
}

async function aiVariables(
  claim: string,
  traits: ReturnType<typeof detectTraits>,
  structure: ReturnType<typeof extractClaimStructure>,
): Promise<string[]> {
  if (isStepForced("variables")) {
    log("  variables: forced failure → deterministic");
    return identifyVariablesDeterministic(claim, traits, structure);
  }

  const result = await promptAIJSON<{ variables: string[] }>(
    identifyVariablesPrompt(claim),
  );

  if ("error" in result) {
    log(`  variables: fallback → deterministic (${result.error})`);
    return identifyVariablesDeterministic(claim, traits, structure);
  }

  const { data } = result;
  if (Array.isArray(data.variables) && data.variables.length > 0
    && data.variables.every((v) => typeof v === "string")) {
    log(`  variables: AI ✓ → ${data.variables.length} items`);
    return data.variables;
  }

  log("  variables: fallback → deterministic (invalid response shape)");
  return identifyVariablesDeterministic(claim, traits, structure);
}

async function aiPerspectives(
  claim: string,
  traits: ReturnType<typeof detectTraits>,
  structure: ReturnType<typeof extractClaimStructure>,
): Promise<string[]> {
  if (isStepForced("perspectives")) {
    log("  perspectives: forced failure → deterministic");
    return evaluatePerspectivesDeterministic(claim, traits, structure);
  }

  const result = await promptAIJSON<{ perspectives: string[] }>(
    evaluatePerspectivesPrompt(claim),
  );

  if ("error" in result) {
    log(`  perspectives: fallback → deterministic (${result.error})`);
    return evaluatePerspectivesDeterministic(claim, traits, structure);
  }

  const { data } = result;
  if (Array.isArray(data.perspectives) && data.perspectives.length > 0
    && data.perspectives.every((p) => typeof p === "string")) {
    log(`  perspectives: AI ✓ → ${data.perspectives.length} items`);
    return data.perspectives;
  }

  log("  perspectives: fallback → deterministic (invalid response shape)");
  return evaluatePerspectivesDeterministic(claim, traits, structure);
}

async function aiConclusion(
  claim: string,
  traits: ReturnType<typeof detectTraits>,
  classification: string,
  assumptions: string[],
  variables: string[],
): Promise<string> {
  if (isStepForced("conclusion")) {
    log("  conclusion: forced failure → deterministic");
    return generateConclusionDeterministic(claim, traits, classification, assumptions, variables);
  }

  const result = await promptAIJSON<{ conclusion: string }>(
    generateConclusionPrompt(claim, classification, assumptions, variables),
  );

  if ("error" in result) {
    log(`  conclusion: fallback → deterministic (${result.error})`);
    return generateConclusionDeterministic(claim, traits, classification, assumptions, variables);
  }

  const { data } = result;
  if (typeof data.conclusion === "string" && data.conclusion.length > 0) {
    log(`  conclusion: AI ✓ → "${data.conclusion.slice(0, 60)}..."`);
    return data.conclusion;
  }

  log("  conclusion: fallback → deterministic (invalid response shape)");
  return generateConclusionDeterministic(claim, traits, classification, assumptions, variables);
}
