import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

const DEBUG = process.env.NODE_ENV === "development";

function log(message: string): void {
  if (DEBUG) console.log(`[lens-logic] ${message}`);
}

function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

export function isAIAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function isStepForced(step: string): boolean {
  const forced = process.env.LENS_LOGIC_FORCE_FAIL_STEP;
  return !!forced && forced === step;
}

export { log };

export async function promptAI(prompt: string): Promise<string | null> {
  const ai = getClient();
  if (!ai) return null;

  const model = process.env.CLAUDE_MODEL || "claude-haiku-4-5";

  try {
    const response = await ai.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    for (const block of response.content) {
      if (block.type === "text") {
        return block.text;
      }
    }
    log("AI returned no text block");
    return null;
  } catch (err) {
    log(`AI request failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function promptAIJSON<T>(prompt: string): Promise<{ data: T } | { error: string }> {
  const raw = await promptAI(prompt);
  if (raw === null) {
    return { error: isAIAvailable() ? "AI request failed" : "no API key" };
  }

  try {
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim();
    const parsed = JSON.parse(jsonStr) as T;
    return { data: parsed };
  } catch {
    return { error: "invalid JSON" };
  }
}
