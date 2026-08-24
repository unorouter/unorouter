import {
  CONTEXT_SAFETY_MARGIN,
  FREE_MODEL_OUTPUT_CAP,
  UNKNOWN_MODEL_OUTPUT_CAP,
} from "@/lib/config/constants";
import { parseStringMap } from "@/lib/utils/base";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import type { PricingCatalogDetail } from "@/openapi";
import type { LoadedConvContext } from "@/lib/types";
import { runStartTriggers } from "../../triggers/run-triggers";
import type { AssemblerDeps, InlayImage } from "../deps";
import { type MemoryContext } from "../../context/memory.service";
import { createAgentPipeline, resolveAgent } from "@/lib/ai/agents/pipeline";
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
  messageTokens,
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
  historyMessages: StreamMessages;
  effectiveMaxOutputTokens: number;
  historyStats: Record<string, unknown>;
};

export async function assemblePrompt(
  apiKey: string,
  body: StreamBody,
  convCtx: LoadedConvContext,
  clientCtx: { globalVars?: string | null } | undefined,
  messages: StreamMessages,
  searchSystemMessage: string | undefined,
  modelInfo: PricingCatalogDetail | undefined,
  deps: AssemblerDeps,
): Promise<AssembledPrompt> {
  const recentUserTexts = collectRecentUserTexts(messages);
  const history = collectHistory(messages, body.messageTimes);
  const globalVarsIn = body.globalVars ?? clientCtx?.globalVars ?? null;

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

  const convSettings = convCtx?.settings as
    | {
        memoryEnabled?: boolean | null;
        summaryMemory?: string | null;
        summaryAnchor?: number | null;
        utilityModel?: string | null;
      }
    | undefined;
  const presetDefaults = convCtx?.preset as
    | {
        memoryEnabled?: boolean | null;
        utilityModel?: string | null;
        utilityGroup?: string | null;
      }
    | undefined;
  const memorySettings = {
    memoryEnabled: convSettings?.memoryEnabled ?? presetDefaults?.memoryEnabled,
    utilityModel: convSettings?.utilityModel ?? presetDefaults?.utilityModel,
    // The preset's lane only applies to the model the preset pinned.
    utilityGroup: convSettings?.utilityModel
      ? null
      : presetDefaults?.utilityGroup,
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

  const janitorCtx = await applyJanitorScripts(convCtx, messages, body);

  const assembled =
    body.convId && convCtx
      ? await assembleForStream(
          body.convId,
          recentUserTexts,
          assemblySystem,
          janitorCtx,
          {
            globalVars: globalVarsIn,
            history,
            seedVars: triggerVars,
            model: body.model,
            maxContext: modelInfo?.metadata?.contextWindow,
            speakingCharacterId: body.speakingCharacterId ?? undefined,
            clientEnv: body.clientEnv,
            prefillSupported: getModelRoleFlags(body.model).prefillSupported,
          },
        )
      : assembleFromOverrides(body.overrides, assemblySystem);

  const summaryAnchor = memory.memoryBlock
    ? (memory.summaryWriteback?.anchor ?? memorySettings?.summaryAnchor ?? 0)
    : 0;
  const unsummarized =
    summaryAnchor > 0
      ? dropSummarizedPrefix(messages, summaryAnchor)
      : messages;

  const countSliced =
    assembled.chatMemory > 0
      ? unsummarized.slice(-assembled.chatMemory)
      : unsummarized;

  const effectiveMaxOutputTokens = clampOutputTokens(assembled, modelInfo);

  const contextWindow = modelInfo?.metadata?.contextWindow;
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

  const historyStats = {
    total: messages.length,
    summaryAnchor,
    afterSummary: unsummarized.length,
    chatMemory: assembled.chatMemory ?? null,
    afterCount: countSliced.length,
    afterBudget: slicedMessages.length,
    // Split per stage: a summary rollup and a budget slice are indistinguishable
    // from the counts above, and both read as "it forgot things" in a report.
    droppedBySummary: messages.length - unsummarized.length,
    droppedByChatMemory: unsummarized.length - countSliced.length,
    droppedByBudget: countSliced.length - slicedMessages.length,
    contextWindow: contextWindow ?? null,
    reserveTokens,
    outputReserve,
    systemTokens: assembled.promptTokens || estimateTokens(assembled.system),
    historyTokens: slicedMessages.reduce((n, m) => n + messageTokens(m), 0),
  };

  logChatDebug("assembly.history", historyStats);

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
    historyStats,
  };
}

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
        utilityGroup?: string | null;
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

  const utilityModel = settings.utilityModel || body.model;
  const utilityGroup = settings.utilityModel ? settings.utilityGroup : null;
  const runtime: AgentRuntime = {
    listFreeModels: async () => [utilityModel],
    generate: (modelName, opts) =>
      deps.runUtilityLLM(modelName, { ...opts, group: utilityGroup }),
  };
  const pipeline = createAgentPipeline(
    [
      resolveAgent(summaryAgent, {
        memoryEnabled: true,
        priorSummary: settings.summaryMemory ?? "",
        priorAnchor: settings.summaryAnchor ?? 0,
      }),
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
    logChatDebug("memory.retrieval", {
      candidates: loreCandidates.length,
      hits: hits.length,
      hitIds: hits.map((h) => h.id),
    });
  }
  logChatDebug("memory.summary", {
    enabled: true,
    historyLen: history.length,
    priorAnchor: settings.summaryAnchor ?? 0,
    newAnchor: out.summaryWriteback?.anchor ?? null,
    memoryBlockTokens: estimateTokens(out.memoryBlock),
  });
  return out;
}

function clampOutputTokens(
  assembled: AssembledSystem,
  modelInfo: PricingCatalogDetail | undefined,
): number {
  const ceiling = modelInfo?.metadata?.maxOutputTokens;
  return Math.min(
    assembled.sampling.maxOutputTokens ?? ceiling ?? UNKNOWN_MODEL_OUTPUT_CAP,
    ceiling ?? Number.POSITIVE_INFINITY,
    ...(modelInfo?.is_free ? [FREE_MODEL_OUTPUT_CAP] : []),
  );
}

// JanitorAI-compat scripts may rewrite ONLY the primary character's personality,
// scenario and example_dialogs, for this turn only: the override rides a cloned
// context so the stored conversation is never mutated.
async function applyJanitorScripts(
  convCtx: LoadedConvContext,
  messages: StreamMessages,
  body: StreamBody,
): Promise<LoadedConvContext> {
  if (typeof window === "undefined" || !convCtx) return convCtx;
  const primary = convCtx.boundCharacters[0]?.character as
    | {
        name?: string | null;
        exampleMessages?: string | null;
        personality?: string | null;
        scenario?: string | null;
        description?: string | null;
        firstMessage?: string | null;
      }
    | undefined;
  if (!primary) return convCtx;

  const { hasJanitorScripts, runJanitorScriptsForTurn } =
    await import("@/lib/ai/chat/plugins/engine");
  if (!hasJanitorScripts()) return convCtx;

  const texts: { role: string; text: string }[] = [];
  for (const m of messages) {
    if (!Array.isArray(m.parts)) continue;
    const text = m.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    if (text) texts.push({ role: m.role, text });
  }
  const lastUser = [...texts].reverse().find((t) => t.role === "user");

  const result = await runJanitorScriptsForTurn({
    character: {
      name: primary.name ?? "",
      chat_name: primary.name ?? "",
      example_dialogs: primary.exampleMessages ?? "",
      personality: primary.personality ?? "",
      scenario: primary.scenario ?? "",
      description: primary.description ?? "",
      first_message: primary.firstMessage ?? "",
    },
    chat: {
      last_message: lastUser?.text ?? "",
      lastMessage: lastUser?.text ?? "",
      message_count: texts.length,
      last_messages: texts.slice(-20).map((t) => ({ message: t.text })),
      user_name: convCtx.persona?.name ?? "",
      conversation_id: body.convId ?? "",
      // StreamMessages is Omit<UIMessage,"id">, so there is no id to key
      // body.messageTimes by until real ids are plumbed through.
      message_created_at: null,
    },
  });
  if (!result) return convCtx;
  if (
    result.personality === (primary.personality ?? "") &&
    result.scenario === (primary.scenario ?? "") &&
    result.example_dialogs === (primary.exampleMessages ?? "")
  ) {
    return convCtx;
  }

  const boundCharacters = convCtx.boundCharacters.map((b, i) =>
    i === 0
      ? {
          ...b,
          character: {
            ...b.character,
            personality: result.personality,
            scenario: result.scenario,
            exampleMessages: result.example_dialogs,
          },
        }
      : b,
  );
  return { ...convCtx, boundCharacters };
}
