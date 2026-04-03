export function classifyClaimPrompt(claim: string): string {
  return `Classify the following claim by its rhetorical type(s) and subject domain(s).

Claim: "${claim}"

Respond with ONLY a JSON object in this exact format, no other text:
{"classification": "a short phrase like 'causal claim in the domain of workplace, productivity'"}`;
}

export function extractAssumptionsPrompt(claim: string): string {
  return `Identify the key assumptions embedded in the following claim. Focus on what the claim takes for granted without stating explicitly.

Claim: "${claim}"

Respond with ONLY a JSON object in this exact format, no other text:
{"assumptions": ["assumption 1", "assumption 2", "assumption 3"]}

Return 2-5 assumptions. Each should be a complete sentence.`;
}

export function identifyVariablesPrompt(claim: string): string {
  return `Identify the key variables or factors that could affect whether the following claim is true or false. Focus on things that might change the outcome.

Claim: "${claim}"

Respond with ONLY a JSON object in this exact format, no other text:
{"variables": ["variable 1", "variable 2", "variable 3"]}

Return 2-5 variables. Each should be a short phrase.`;
}

export function evaluatePerspectivesPrompt(claim: string): string {
  return `Evaluate the following claim from multiple perspectives. Provide viewpoints both for and against the claim.

Claim: "${claim}"

Respond with ONLY a JSON object in this exact format, no other text:
{"perspectives": ["perspective 1", "perspective 2", "perspective 3"]}

Return 2-4 perspectives. Each should be a complete sentence describing a viewpoint.`;
}

export function generateConclusionPrompt(
  claim: string,
  classification: string,
  assumptions: string[],
  variables: string[],
): string {
  return `Given the following analysis of a claim, write a brief concluding assessment (2-3 sentences).

Claim: "${claim}"
Classification: ${classification}
Assumptions: ${assumptions.join("; ")}
Variables: ${variables.join("; ")}

Respond with ONLY a JSON object in this exact format, no other text:
{"conclusion": "Your 2-3 sentence conclusion here."}`;
}
