import { rollSummary } from "@/lib/ai/chat/context/memory.service";
import type {
  AgentContext,
  AgentDefinition,
  AgentResult,
  AgentRuntime,
  AgentSettings,
} from "../../types";

const HISTORY_TRIGGER = 20;
const CHUNK_SIZE = 10;

type SummarySettings = {
  memoryEnabled?: boolean | null;
  priorSummary?: string | null;
  priorAnchor?: number | null;
  chunkSize?: number;
  historyTrigger?: number;
};

export const summaryAgent: AgentDefinition = {
  id: "summary",
  phase: "pre_generation",
  capabilities: ["inject_context"],
  enabled(ctx: AgentContext, settings: AgentSettings) {
    const s = settings as SummarySettings;
    return (
      !!s.memoryEnabled &&
      ctx.recentMessages.length > (s.historyTrigger ?? HISTORY_TRIGGER)
    );
  },
  async run(
    ctx: AgentContext,
    runtime: AgentRuntime,
    settings: AgentSettings,
  ): Promise<AgentResult> {
    const s = settings as SummarySettings;
    const rolled = await rollSummary({
      apiKey: ctx.apiKey,
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
