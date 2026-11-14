import { MAX_TEXT_LEN } from "@/lib/validation/chat";
import {
  freeModelRace,
  type FreeModelRaceArgs,
} from "@/lib/ai/chat/free-model-race";
import type {
  AgentContext,
  AgentDefinition,
  AgentResult,
  AgentRuntime,
} from "../../types";

const HISTORY_TRIGGER = 20;
const CHUNK_SIZE = 10;

const SUMMARIZE_SYSTEM_PROMPT =
  "Summarize the conversation so far. Keep the key facts, decisions, entities, " +
  "and the current state or topic. Remove redundancy and filler. Write a tight, " +
  "neutral recap that another model can use to continue the conversation.";

type RollingSummaryInput = {
  race: Pick<FreeModelRaceArgs, "listFreeModels" | "generate">;
  history: { role: "user" | "assistant" | "system"; text: string }[];
  priorSummary: string;
  priorAnchor: number;
  chunkSize: number;
};

type RollingSummaryResult = {
  summary: string | null;
  anchor: number;
  memoryBlock: string;
};

async function rollSummary(
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

type SummarySettings = {
  memoryEnabled?: boolean | null;
  priorSummary?: string | null;
  priorAnchor?: number | null;
  chunkSize?: number;
  historyTrigger?: number;
};

export const summaryAgent: AgentDefinition<SummarySettings> = {
  id: "summary",
  phase: "pre_generation",
  capabilities: ["inject_context"],
  enabled(ctx: AgentContext, s: SummarySettings) {
    return (
      !!s.memoryEnabled &&
      ctx.recentMessages.length > (s.historyTrigger ?? HISTORY_TRIGGER)
    );
  },
  async run(
    ctx: AgentContext,
    runtime: AgentRuntime,
    s: SummarySettings,
  ): Promise<AgentResult> {
    const rolled = await rollSummary({
      race: {
        listFreeModels: runtime.listFreeModels,
        generate: runtime.generate,
      },
      history: ctx.recentMessages,
      priorSummary: s.priorSummary ?? "",
      priorAnchor: s.priorAnchor ?? 0,
      chunkSize: s.chunkSize ?? CHUNK_SIZE,
    });
    if (!rolled.summary) return { type: "noop" };
    return {
      type: "summary",
      summary: rolled.summary,
      anchor: rolled.anchor,
      memoryBlock: rolled.memoryBlock,
    };
  },
};
