import type { HistoryTurn } from "@/lib/ai/chat/macros";
import { MAX_TEXT_LEN } from "@/lib/validation/chat";
import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";

const HISTORY_TRIGGER = 20;
const CHUNK_SIZE = 10;

const SUMMARIZE_SYSTEM_PROMPT =
  "Summarize the conversation so far. Keep the key facts, decisions, entities, " +
  "and the current state or topic. Remove redundancy and filler. Write a tight, " +
  "neutral recap that another model can use to continue the conversation.";

// Folds the oldest unsummarized chunk into the running summary; null when there
// is no summary yet and nothing to fold.
export async function rollSummary(input: {
  generate: FreeModelGenerate;
  model: string;
  history: HistoryTurn[];
  priorSummary: string;
  priorAnchor: number;
}): Promise<{ summary: string; anchor: number } | null> {
  if (input.history.length <= HISTORY_TRIGGER) return null;
  const unchanged = input.priorSummary
    ? { summary: input.priorSummary, anchor: input.priorAnchor }
    : null;

  const unsummarized = input.history.slice(input.priorAnchor);
  if (unsummarized.length <= CHUNK_SIZE) return unchanged;

  const chunk = unsummarized.slice(0, CHUNK_SIZE);
  const roleName = { user: "User", assistant: "Char", system: "System" };
  // Clipped to the utility route's limit: past it the 422 is swallowed below
  // and the summary silently stops advancing.
  const chunkText = chunk
    .map((m) => `${roleName[m.role]}: ${m.text}`)
    .join("\n")
    .slice(-(MAX_TEXT_LEN - input.priorSummary.length - 2_000));
  const prompt = input.priorSummary
    ? `Existing summary:\n${input.priorSummary}\n\nNew messages to fold in:\n${chunkText}`
    : chunkText;

  try {
    const result = await input.generate(input.model, {
      systemPrompt: SUMMARIZE_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 512,
    });
    const summary = result.text.trim();
    if (!summary) return unchanged;
    return { summary, anchor: input.priorAnchor + chunk.length };
  } catch {
    return unchanged;
  }
}
