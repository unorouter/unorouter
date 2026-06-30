// Rolling-summary memory (RisuAI supaMemory port): oldest unsummarized chunk folds into a running summary injected as a top system block.
// Isomorphic: the free-model race + semantic retrieval are injected (server: getProvider/embeddings; client: the custom provider's models).

import {
  freeModelRace,
  type FreeModelRaceArgs,
} from "@/lib/ai/chat/free-model-race";

const SUMMARIZE_SYSTEM_PROMPT =
  "Summarize the conversation so far. Keep the key facts, decisions, entities, " +
  "and the current state or topic. Remove redundancy and filler. Write a tight, " +
  "neutral recap that another model can use to continue the conversation.";

type FreeModelRaceDeps = Pick<FreeModelRaceArgs, "listFreeModels" | "generate">;

export type RollingSummaryInput = {
  apiKey: string;
  race: FreeModelRaceDeps;
  // Whole role-tagged history (oldest first).
  history: { role: "user" | "assistant" | "system"; text: string }[];
  // Existing running summary + how many leading messages it already covers.
  priorSummary: string;
  priorAnchor: number;
  // How many of the OLDEST not-yet-summarized messages to fold this turn.
  chunkSize: number;
};

export type RollingSummaryResult = {
  // The (possibly extended) summary text, or null when nothing was summarized.
  summary: string | null;
  // New count of messages folded into the summary.
  anchor: number;
  // System memory block to inject at the top of the prompt (empty when none).
  memoryBlock: string;
};

export async function rollSummary(
  input: RollingSummaryInput,
): Promise<RollingSummaryResult> {
  // No-change result: surface the existing summary block as-is.
  const unchanged = (): RollingSummaryResult => ({
    summary: input.priorSummary || null,
    anchor: input.priorAnchor,
    memoryBlock: input.priorSummary
      ? `[Story so far]\n${input.priorSummary}`
      : "",
  });

  const unsummarized = input.history.slice(input.priorAnchor);
  if (unsummarized.length <= input.chunkSize) return unchanged();

  const chunk = unsummarized.slice(0, input.chunkSize);
  const roleName = { user: "User", assistant: "Char", system: "System" };
  const chunkText = chunk
    .map((m) => `${roleName[m.role]}: ${m.text}`)
    .join("\n");
  const prompt = input.priorSummary
    ? `Existing summary:\n${input.priorSummary}\n\nNew messages to fold in:\n${chunkText}`
    : chunkText;

  try {
    const result = await freeModelRace({
      ...input.race,
      systemPrompt: SUMMARIZE_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 512,
    });
    const summary = result.text.trim();
    if (!summary) return unchanged();
    const anchor = input.priorAnchor + chunk.length;
    return { summary, anchor, memoryBlock: `[Story so far]\n${summary}` };
  } catch {
    // Best-effort: summary failure leaves the prompt as-is.
    return unchanged();
  }
}

export type MemoryContext = {
  // "[Story so far]" system block (empty when none).
  memoryBlock: string;
  // "[Relevant background]" semantic-retrieval block (empty when none).
  retrievalBlock: string;
  // New summary + anchor when this turn changed them (client persists).
  summaryWriteback: { summary: string; anchor: number } | null;
};
