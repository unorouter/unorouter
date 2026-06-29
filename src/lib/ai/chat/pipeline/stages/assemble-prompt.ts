// Stage 3: build the assembled prompt and budget history. Runs start triggers + memory, assembles, clamps output cap, fits history, expands macros.

import {
  CONTEXT_SAFETY_MARGIN,
  FREE_MODEL_OUTPUT_CAP,
  UNKNOWN_MODEL_OUTPUT_CAP,
} from "@/lib/config/constants";
import { parseStringMap } from "@/lib/utils/base";
import type { ProcessedModel } from "@/lib/api/pricing";
import type { LoadedConvContext } from "@/lib/types";
import { runStartTriggers } from "../../triggers/run-triggers";
import type { AssemblerDeps, InlayImage } from "../deps";
import { type MemoryContext } from "../../context/memory.service";
import { createAgentPipeline } from "@/lib/ai/agents/pipeline";
import { summaryAgent } from "@/lib/ai/agents/builtin/summary/agent";
import type { AgentRuntime } from "@/lib/ai/agents/types";
import {
  assembleForStream,
  assembleFromOverrides,
  type AssembledSystem,
} from "../../prompt/assembler.service";
import { getModelRoleFlags } from "../role-flags";
import {
  collectHistory,
  collectRecentUserTexts,
  dropSummarizedPrefix,
  estimateTokens,
  expandMessageMacros,
  extractLastUserText,
  fitToTokenBudget,
  spliceDepthInjections,
  type StreamMessages,
} from "../transforms";
import type { StreamBody } from "../prepare.service";

export type AssembledPrompt = {
  assembled: AssembledSystem;
  memory: MemoryContext;
  inlayMedia: InlayImage[];
  startAlerts: { kind: string; text: string }[];
  stopRequested: boolean;
  globalVarsIn: string | null;
  triggerVars: Record<string, string>;
  // History sliced + budgeted + depth-spliced + macro-expanded, ready for the template walk.
  historyMessages: StreamMessages;
  effectiveMaxOutputTokens: number;
};

export async function assemblePrompt(
  apiKey: string,
  body: StreamBody,
  convCtx: LoadedConvContext,
  clientCtx: { globalVars?: string | null } | undefined,
  messages: StreamMessages,
  searchSystemMessage: string | undefined,
  modelInfo: ProcessedModel | undefined,
  deps: AssemblerDeps,
): Promise<AssembledPrompt> {
  const recentUserTexts = collectRecentUserTexts(messages);
  const history = collectHistory(messages, body.messageTimes);
  // Global vars ride outside the hashed context; hashing them would bust the cache every setglobalvar turn.
  const globalVarsIn = body.globalVars ?? clientCtx?.globalVars ?? null;

  // start triggers mutate seed vars (persisted via writeback) and may inject a system prompt.
  const triggerVars: Record<string, string> = convCtx
    ? parseStringMap(convCtx.settings.vars)
    : {};
  const inlayMedia: InlayImage[] = [];
  const startTrig = convCtx
    ? await runStartTriggers(
        convCtx,
        triggerVars,
        parseStringMap(globalVarsIn),
        history,
        deps.triggerOps(apiKey, body.model, inlayMedia),
      )
    : { extraSystemPrompt: "", stopSending: false, alerts: [] };

  // Agent settings inherit from the bound preset (Risu subModel/seperateModels parity): conv override ??
  // preset default ?? unset. summaryMemory/summaryAnchor are runtime state, conv-only (never a preset default).
  const convSettings = convCtx?.settings as
    | {
        memoryEnabled?: boolean | null;
        summaryMemory?: string | null;
        summaryAnchor?: number | null;
        utilityModel?: string | null;
      }
    | undefined;
  const presetDefaults = convCtx?.preset as
    | { memoryEnabled?: boolean | null; utilityModel?: string | null }
    | undefined;
  const memorySettings = {
    memoryEnabled: convSettings?.memoryEnabled ?? presetDefaults?.memoryEnabled,
    utilityModel: convSettings?.utilityModel ?? presetDefaults?.utilityModel,
    summaryMemory: convSettings?.summaryMemory,
    summaryAnchor: convSettings?.summaryAnchor,
  };
  const memory = await buildMemoryViaAgent(
    apiKey,
    body,
    deps,
    memorySettings,
    history,
    extractLastUserText(messages),
    (convCtx?.lbEntries ?? [])
      .filter((e) => e.content)
      .map((e) => ({ id: e.id, text: e.content })),
  );

  const assemblySystem =
    [
      memory.memoryBlock,
      memory.retrievalBlock,
      searchSystemMessage,
      startTrig.extraSystemPrompt,
    ]
      .filter(Boolean)
      .join("\n\n") || undefined;

  const assembled =
    body.convId && convCtx
      ? await assembleForStream(
          body.convId,
          recentUserTexts,
          assemblySystem,
          convCtx,
          {
            globalVars: globalVarsIn,
            history,
            seedVars: triggerVars,
            model: body.model,
            maxContext: modelInfo?.metadata.contextWindow,
            speakingCharacterId: body.speakingCharacterId ?? undefined,
            clientEnv: body.clientEnv,
            prefillSupported: getModelRoleFlags(body.model).prefillSupported,
          },
        )
      : assembleFromOverrides(body.overrides, assemblySystem);

  // Summarized messages are cut; the [Story so far] block replaces them (Risu supaMemory).
  const summaryAnchor = memory.memoryBlock
    ? (memory.summaryWriteback?.anchor ?? memorySettings?.summaryAnchor ?? 0)
    : 0;
  const unsummarized =
    summaryAnchor > 0
      ? dropSummarizedPrefix(messages, summaryAnchor)
      : messages;

  // chatMemory is a user-set message COUNT cap; apply it first if set.
  const countSliced =
    assembled.chatMemory > 0
      ? unsummarized.slice(-assembled.chatMemory)
      : unsummarized;

  const effectiveMaxOutputTokens = clampOutputTokens(assembled, modelInfo);

  // Fit to context window, drop oldest first. Reserve = non-history prompt + clamped output cap, capped at half the window.
  const contextWindow = modelInfo?.metadata.contextWindow;
  const outputReserve = contextWindow
    ? Math.min(effectiveMaxOutputTokens, Math.floor(contextWindow / 2))
    : effectiveMaxOutputTokens;
  const reserveTokens =
    (assembled.promptTokens || estimateTokens(assembled.system)) +
    outputReserve +
    CONTEXT_SAFETY_MARGIN;
  const slicedMessages = fitToTokenBudget(
    countSliced,
    contextWindow,
    reserveTokens,
  );

  const depthInjections = assembled.authorNote ? [assembled.authorNote] : [];
  const splicedMessages =
    depthInjections.length > 0
      ? spliceDepthInjections(slicedMessages, depthInjections)
      : slicedMessages;
  const historyMessages = expandMessageMacros(splicedMessages, assembled.vars);

  return {
    assembled,
    memory,
    inlayMedia,
    startAlerts: startTrig.alerts,
    stopRequested: startTrig.stopSending,
    globalVarsIn,
    triggerVars,
    historyMessages,
    effectiveMaxOutputTokens,
  };
}

// Memory context via the summary AGENT (rolling summary) + the direct semantic-retrieval call. Produces the
// SAME MemoryContext the old buildMemoryContext did (memoryBlock + retrievalBlock + summaryWriteback); the
// only change is the summarizer now uses the utility model (full context) instead of the small-context free race.
async function buildMemoryViaAgent(
  apiKey: string,
  body: StreamBody,
  deps: AssemblerDeps,
  settings:
    | {
        memoryEnabled?: boolean | null;
        summaryMemory?: string | null;
        summaryAnchor?: number | null;
        utilityModel?: string | null;
      }
    | undefined,
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

  // Utility model honors the full input window (free models truncate). null -> the chat model.
  const utilityModel = settings.utilityModel || body.model;
  const runtime: AgentRuntime = {
    listFreeModels: async () => [utilityModel],
    generate: deps.runUtilityLLM,
  };
  const pipeline = createAgentPipeline(
    [
      {
        def: summaryAgent,
        settings: {
          memoryEnabled: true,
          priorSummary: settings.summaryMemory ?? "",
          priorAnchor: settings.summaryAnchor ?? 0,
        },
      },
    ],
    {
      apiKey,
      convId: body.convId ?? null,
      model: utilityModel,
      recentMessages: history,
      lastUserText,
    },
    runtime,
  );
  const results = await pipeline.preGenerate();
  const summary = results.find((r) => r.type === "summary");
  if (summary && summary.type === "summary") {
    out.memoryBlock = summary.memoryBlock;
    if (
      summary.summary !== (settings.summaryMemory ?? "") ||
      summary.anchor !== (settings.summaryAnchor ?? 0)
    ) {
      out.summaryWriteback = {
        summary: summary.summary,
        anchor: summary.anchor,
      };
    }
  }

  // Semantic retrieval stays a direct call (no agent yet) - same behavior as before.
  if (lastUserText && loreCandidates.length > 0) {
    const hits = await deps.retrieveSemantic(
      apiKey,
      lastUserText,
      loreCandidates,
      {
        topK: 3,
      },
    );
    if (hits.length > 0) {
      out.retrievalBlock = `[Relevant background]\n${hits.map((h) => h.text).join("\n\n")}`;
    }
  }
  return out;
}

// Model maxOutputTokens is a hard ceiling; clamp preset to it + the free cap. Unknown cap falls back to the default cap.
function clampOutputTokens(
  assembled: AssembledSystem,
  modelInfo: ProcessedModel | undefined,
): number {
  const knownCeiling =
    modelInfo?.metadata.maxOutputTokens ?? UNKNOWN_MODEL_OUTPUT_CAP;
  return Math.min(
    assembled.sampling.maxOutputTokens ?? knownCeiling,
    knownCeiling,
    ...(modelInfo?.isFree ? [FREE_MODEL_OUTPUT_CAP] : []),
  );
}
