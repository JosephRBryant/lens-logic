# Lens & Logic — Build Spec (Claude Code)

## Objective

Build a minimal system that:

1. Accepts a user input (claim or idea)
2. Processes it through a structured reasoning pipeline
3. Outputs:
   - structured reasoning
   - a readable article
   - short-form content (for distribution)

Do not build:
- auth
- subscriptions
- community features
- scaling systems

Focus only on core functionality.

---

## Tech Stack (default unless changed)

- Frontend: Next.js (App Router)
- Backend: Next.js API routes
- Language: TypeScript
- AI: OpenAI or Claude API (configurable)
- Storage: none initially (in-memory or simple JSON)

---

## Phase 1 — Basic Input → Output

### Requirements

Create a simple UI with:
- a textarea input
- a submit button
- an output display section

### Behavior

On submit:
- send input to backend
- backend calls AI with simple prompt
- return response
- render response on page

### Prompt (initial)

Analyze the following claim and explain it clearly:

[USER INPUT]

Return:
- what the claim is saying
- key assumptions
- potential issues or uncertainties

### Deliverable

Working page where user enters text and sees response.

---

## Phase 2 — Structured Reasoning Pipeline

### Goal

Replace single AI call with multi-step pipeline.

### Steps (must be separate functions)

1. classifyClaim(input)
2. extractAssumptions(input)
3. identifyVariables(input)
4. evaluatePerspectives(input)
5. generateConclusion(input)

Each step:
- calls AI
- returns structured data (JSON)

### Output Shape

{
  claim: string,
  classification: string,
  assumptions: string[],
  variables: string[],
  perspectives: string[],
  conclusion: string
}

### Requirements

- Each function is isolated
- Pipeline orchestrates them in order
- Combine results into final object

---

## Phase 3 — Structured UI Output

### Goal

Display structured reasoning clearly

### UI Sections

- Claim
- Classification
- Assumptions
- Variables
- Perspectives
- Conclusion

### Requirements

- Clean layout
- No raw JSON shown to user
- Data mapped to sections

---

## Phase 4 — Article Generation

### Goal

Convert structured reasoning into article

### Input

Structured object from Phase 2

### Prompt

Convert the following structured reasoning into a clear, readable article:

[STRUCTURED DATA]

Requirements:
- natural tone
- logical flow
- no bullet lists unless necessary

### Output

- full article string

### UI

- display article below structured output

---

## Phase 5 — Short-form Content Generation

### Goal

Generate content for distribution

### Outputs

1. Twitter/X thread (3–5 posts)
2. Short summary (1–2 sentences)
3. Headline

### Prompt

From the following reasoning, generate:

1. A short headline
2. A 1–2 sentence summary
3. A 3–5 post Twitter thread

[STRUCTURED DATA]

### UI

Display:
- headline
- summary
- thread (numbered)

---

## Phase 6 — Refactor for Reuse

### Requirements

- All AI calls centralized in one module
- All prompts stored in separate file
- Pipeline logic reusable
- No duplicated logic

---

## Constraints

- Do not over-engineer
- No authentication
- No database yet
- No external integrations
- Keep everything local and testable

---

## Success Criteria

System works if:

- user enters input
- receives structured reasoning
- receives article
- receives short-form content

All in one flow.

---

## Notes for Claude Code

- Prefer simple implementations over abstract patterns
- Keep functions small and readable
- Log intermediate outputs for debugging
- Make prompts easy to modify
