import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export type AiMessage = { role: "user" | "assistant" | "system"; content: string };

function getGateway() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

/**
 * Runs a Lovable AI call that must return one JSON object.
 * Always streams (reasoning models can run for minutes) and is consumed server-side.
 */
export async function runJson<T>(opts: {
  system: string;
  messages: AiMessage[];
  schemaHint: string;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  const lovable = getGateway();
  let lastError: unknown = null;

  // Reasoning models occasionally emit truncated or malformed JSON. A single bad
  // roll must never surface to a participant mid-interview, so retry quietly.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = streamText({
        model: lovable.responses("openai/gpt-6-astra"),
        system: `${opts.system}

Return ONLY one JSON object, no prose and no code fences, matching exactly this shape:
${opts.schemaHint}

The JSON must be complete and valid: every string closed, every brace closed. Keep string values short.`,
        messages: opts.messages,
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: opts.effort ?? "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });

      const text = await result.text;
      return parseJson<T>(text);
    } catch (error) {
      lastError = error;
    }
  }

  console.error("runJson failed after 3 attempts", lastError);
  throw new Error("That didn't go through. Your answer is saved — please try again.");
}


export function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* fall through to repair */
      }
    }
    if (start >= 0) {
      const repaired = repairTruncatedJson(cleaned.slice(start));
      if (repaired) return JSON.parse(repaired) as T;
    }
    throw new Error("The AI response could not be read. Please try again.");
  }
}

/** Closes an unterminated string and any open braces/brackets on a cut-off object. */
function repairTruncatedJson(fragment: string): string | null {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  for (const ch of fragment) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    if (ch === "}" || ch === "]") stack.pop();
  }
  let out = fragment.trimEnd();
  if (inString) out += '"';
  out = out.replace(/,\s*$/, "");
  // A dangling `"key":` with no value cannot be repaired meaningfully.
  if (/:\s*$/.test(out)) return null;
  while (stack.length) {
    out += stack.pop() === "{" ? "}" : "]";
  }
  try {
    JSON.parse(out);
    return out;
  } catch {
    return null;
  }
}

