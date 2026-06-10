// Server-side TriggerOps for the V1 lowLevelAccess effects: direct service
// calls (the client modes go through POST /chat/trigger-op instead).

import { parseChatML } from "@/lib/ai/chat/chatml";
import type { TriggerOps } from "@/lib/ai/chat/triggers/types";
import { getProvider } from "@/server/constants";
import { generateText } from "ai";
import { retrieveSemantic } from "./semantic-retrieval.service";

const TRIGGER_LLM_MAX_TOKENS = 1024;

export async function runTriggerLLM(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  const parsed = parseChatML(prompt);
  const messages = parsed ?? [{ role: "user" as const, content: prompt }];
  try {
    const provider = getProvider(apiKey);
    const result = await generateText({
      model: provider.chatModel(model),
      messages,
      maxOutputTokens: TRIGGER_LLM_MAX_TOKENS,
      maxRetries: 1,
    });
    return result.text || "Error: empty response";
  } catch (err) {
    return "Error: " + (err instanceof Error ? err.message : String(err));
  }
}

// Rank `values` by similarity to `source` (Risu HypaProcesser.similaritySearch:
// all candidates, best first).
export async function runTriggerSimilarity(
  apiKey: string,
  source: string,
  values: string[],
): Promise<string[]> {
  const candidates = values
    .filter((v) => v.length > 0)
    .map((text, i) => ({ id: String(i), text }));
  if (candidates.length === 0) return [];
  // minScore -1: Risu similaritySearch returns every candidate ranked.
  const hits = await retrieveSemantic(apiKey, source, candidates, {
    topK: candidates.length,
    minScore: -1,
  });
  return hits.map((h) => h.text);
}

export function makeServerTriggerOps(
  apiKey: string,
  model: string,
): TriggerOps {
  return {
    runLLM: (prompt) => runTriggerLLM(apiKey, model, prompt),
    similarity: (source, values) =>
      runTriggerSimilarity(apiKey, source, values),
    // imgGen + runLua wired by their feature modules; alert is wrapped by
    // runStartTriggers (collected, streamed as data-alert).
  };
}
