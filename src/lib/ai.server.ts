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
  const result = streamText({
    model: lovable.responses("openai/gpt-6-astra"),
    system: `${opts.system}

Return ONLY one JSON object, no prose and no code fences, matching exactly this shape:
${opts.schemaHint}`,
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
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("The AI response could not be read. Please try again.");
  }
}
