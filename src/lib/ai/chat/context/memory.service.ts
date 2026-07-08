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
  history: { role: "user" | "assistant" | "system"; text: string }[];
  priorSummary: string;
  priorAnchor: number;
  chunkSize: number;
};

export type RollingSummaryResult = {
  summary: string | null;
  anchor: number;
  memoryBlock: string;
};

export async function rollSummary(
  input: RollingSummaryInput,
): Promise<RollingSummaryResult> {
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
    return unchanged();
  }
}

export type MemoryContext = {
  memoryBlock: string;
  retrievalBlock: string;
  summaryWriteback: { summary: string; anchor: number } | null;
};
