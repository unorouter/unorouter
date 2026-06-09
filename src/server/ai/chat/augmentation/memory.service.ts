// Rolling-summary memory (minimal RisuAI supaMemory port). When chat history
// overflows the model context window, the oldest unsummarized chunk is folded
// into a running summary (free-model call) and injected at the top of the prompt
// as a compact system block, so long RPs keep continuity without blowing the
// window. Server computes; the client persists summaryMemory + summaryAnchor via
// the finish-meta writeback channel.

import { freeModelRace } from "@/lib/ai/chat/free-model-race";
import { logger } from "@/lib/utils/logger";
import { retrieveSemantic } from "./semantic-retrieval.service";

// Rolling-summary thresholds: only fold once the conversation is long, and in
// modest chunks so each summary call stays cheap.
const MEMORY_HISTORY_TRIGGER = 20;
const MEMORY_CHUNK_SIZE = 10;

const SUMMARIZE_SYSTEM_PROMPT =
  "Summarize the role-play story so far. Keep characters, relationships, " +
  "key events, and the current situation. Remove redundancy and filler. Write " +
  "a tight third-person recap that another model can use to continue the scene.";

export type RollingSummaryInput = {
  apiKey: string;
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
  // Nothing new to fold.
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
      apiKey: input.apiKey,
      systemPrompt: SUMMARIZE_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 512,
    });
    const summary = result.text.trim();
    if (!summary) return unchanged();
    const anchor = input.priorAnchor + chunk.length;
    logger.debug("Rolling summary updated", {
      context: "stream.memory",
      foldedMessages: chunk.length,
      anchor,
      summaryChars: summary.length,
    });
    return { summary, anchor, memoryBlock: `[Story so far]\n${summary}` };
  } catch (e) {
    logger.warn("Rolling summary failed; continuing without it", {
      context: "stream.memory",
      error: e instanceof Error ? e.message : String(e),
    });
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

type MemorySettings = {
  memoryEnabled?: boolean | null;
  summaryMemory?: string | null;
  summaryAnchor?: number | null;
};

// Opt-in per-conversation memory: rolling summary of overflow history +
// semantic retrieval of relevant lore. Both best-effort; failure leaves the
// prompt unchanged.
export async function buildMemoryContext(
  apiKey: string,
  settings: MemorySettings | undefined,
  history: { role: "user" | "assistant" | "system"; text: string }[],
  lastUserText: string | null,
  loreCandidates: { id: string; text: string }[],
): Promise<MemoryContext> {
  const out: MemoryContext = {
    memoryBlock: "",
    retrievalBlock: "",
    summaryWriteback: null,
  };
  if (!settings?.memoryEnabled) return out;

  if (history.length > MEMORY_HISTORY_TRIGGER) {
    const rolled = await rollSummary({
      apiKey,
      history,
      priorSummary: settings.summaryMemory ?? "",
      priorAnchor: settings.summaryAnchor ?? 0,
      chunkSize: MEMORY_CHUNK_SIZE,
    });
    out.memoryBlock = rolled.memoryBlock;
    if (
      rolled.summary &&
      (rolled.summary !== (settings.summaryMemory ?? "") ||
        rolled.anchor !== (settings.summaryAnchor ?? 0))
    ) {
      out.summaryWriteback = { summary: rolled.summary, anchor: rolled.anchor };
    }
  }

  if (lastUserText && loreCandidates.length > 0) {
    const hits = await retrieveSemantic(apiKey, lastUserText, loreCandidates, {
      topK: 3,
    });
    if (hits.length > 0) {
      out.retrievalBlock = `[Relevant background]\n${hits.map((h) => h.text).join("\n\n")}`;
    }
  }
  return out;
}
