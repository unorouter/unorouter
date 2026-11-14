import type { HistoryTurn } from "@/lib/ai/chat/macros";
import {
  CONTEXT_SAFETY_MARGIN,
  UNKNOWN_MODEL_OUTPUT_CAP,
} from "@/lib/config/constants";
import { parseStringMap } from "@/lib/utils/base";
import {
  hasJanitorScripts,
  hasPerchanceScripts,
  runJanitorScriptsForTurn,
  runPerchanceScriptsForTurn,
} from "@/lib/ai/chat/plugins/engine";
import { countTokens } from "@/lib/ai/chat/tokenizer";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import type { PricingCatalogDetail } from "@/openapi";
import type { LoadedConvContext } from "@/lib/types";
import type { CharacterRow } from "@/lib/db/schema/rows";
import { runStartTriggers } from "../../triggers/run-triggers";
import type { AssemblerDeps, InlayImage } from "../deps";
import { rollSummary } from "@/lib/ai/chat/prompt/rolling-summary";
import {
  assembleForStream,
  assembleFromOverrides,
  type AssembledSystem,
} from "../../prompt/assembler.service";
import { resolveAdapter } from "@/lib/ai/providers/registry";
import {
  collectHistory,
  collectRecentUserTexts,
  dropSummarizedPrefix,
  expandMessageMacros,
  extractLastUserText,
  fitToTokenBudget,
  messageTokens,
  spliceDepthInjections,
  textOf,
  type StreamMessages,
} from "../transforms";
import type { StreamBody } from "../prepare.service";

type MemoryContext = {
  memoryBlock: string;
  retrievalBlock: string;
  summaryWriteback: { summary: string; anchor: number } | null;
};

type AssembledPrompt = {
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
  convCtx: LoadedConvContext | null,
  messages: StreamMessages,
  searchSystemMessage: string | undefined,
  modelInfo: PricingCatalogDetail | undefined,
  deps: AssemblerDeps,
): Promise<AssembledPrompt> {
  const recentUserTexts = collectRecentUserTexts(messages);
  const bound = convCtx?.boundCharacters ?? [];
  const history = collectHistory(
    messages,
    body.messageTimes,
    body.speakingCharacterId && bound.length > 1
      ? {
          id: body.speakingCharacterId,
          names: Object.fromEntries(
            bound.map((b) => [b.binding.characterId, b.character.name]),
          ),
        }
      : undefined,
  );
  const globalVarsIn = body.globalVars ?? null;

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

  const convSettings = convCtx?.settings;
  const presetDefaults = convCtx?.preset;
  const memorySettings = {
    memoryEnabled: convSettings?.memoryEnabled ?? presetDefaults?.memoryEnabled,
    utilityModel: convSettings?.utilityModel ?? presetDefaults?.utilityModel,
    utilityGroup: convSettings?.utilityModel
      ? null
      : presetDefaults?.utilityGroup,
    summaryMemory: convSettings?.summaryMemory,
    summaryAnchor: convSettings?.summaryAnchor,
  };
  const memory = await buildMemory(
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

  const perchance = await applyPerchanceScripts(convCtx, messages, body);

  const assemblySystem =
    [
      memory.memoryBlock,
      memory.retrievalBlock,
      searchSystemMessage,
      startTrig.extraSystemPrompt,
      perchance.extraSystem,
    ]
      .filter(Boolean)
      .join("\n\n") || undefined;

  const janitorCtx = await applyJanitorScripts(perchance.ctx, messages, body);

  const assembled =
    body.convId && janitorCtx
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
            prefillSupported: resolveAdapter(body.model).roleFlags
              .prefillSupported,
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

  const modelWindow = modelInfo?.metadata?.contextWindow;
  const contextWindow =
    assembled.contextTokens && modelWindow
      ? Math.min(assembled.contextTokens, modelWindow)
      : (assembled.contextTokens ?? modelWindow);
  const outputReserve = contextWindow
    ? Math.min(effectiveMaxOutputTokens, Math.floor(contextWindow / 2))
    : effectiveMaxOutputTokens;
  const reserveTokens =
    (assembled.promptTokens || countTokens(assembled.system)) +
    outputReserve +
    CONTEXT_SAFETY_MARGIN;
  const slicedMessages = fitToTokenBudget(
    countSliced,
    contextWindow,
    reserveTokens,
  );

  const splicedMessages = spliceDepthInjections(
    slicedMessages,
    assembled.authorNote ? [assembled.authorNote] : [],
  );
  const historyMessages = expandMessageMacros(splicedMessages, assembled.vars);

  const historyStats = {
    total: messages.length,
    summaryAnchor,
    afterSummary: unsummarized.length,
    chatMemory: assembled.chatMemory ?? null,
    afterCount: countSliced.length,
    afterBudget: slicedMessages.length,
    droppedBySummary: messages.length - unsummarized.length,
    droppedByChatMemory: unsummarized.length - countSliced.length,
    droppedByBudget: countSliced.length - slicedMessages.length,
    contextWindow: contextWindow ?? null,
    reserveTokens,
    outputReserve,
    systemTokens: assembled.promptTokens || countTokens(assembled.system),
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

async function buildMemory(
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
  history: HistoryTurn[],
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
  const summary = await rollSummary({
    generate: (modelName, opts) =>
      deps.runUtilityLLM(modelName, { ...opts, group: utilityGroup }),
    model: utilityModel,
    history,
    priorSummary: settings.summaryMemory ?? "",
    priorAnchor: settings.summaryAnchor ?? 0,
  });
  if (summary) {
    out.memoryBlock = `[Story so far]\n${summary.summary}`;
    if (
      summary.summary !== (settings.summaryMemory ?? "") ||
      summary.anchor !== (settings.summaryAnchor ?? 0)
    ) {
      out.summaryWriteback = summary;
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
    memoryBlockTokens: countTokens(out.memoryBlock),
  });
  return out;
}

function clampOutputTokens(
  assembled: AssembledSystem,
  modelInfo: PricingCatalogDetail | undefined,
): number {
  const ceiling = modelInfo?.metadata?.maxOutputTokens;
  return Math.min(
    assembled.sampling.maxTokens ?? ceiling ?? UNKNOWN_MODEL_OUTPUT_CAP,
    ceiling ?? Number.POSITIVE_INFINITY,
  );
}

// Perchance code sees the character as roleInstruction (our description) and
// reminderMessage (our post history instructions). Messages it adds that the
// model may see ride along as extra system text for this turn only.
async function applyPerchanceScripts(
  convCtx: LoadedConvContext | null,
  messages: StreamMessages,
  body: StreamBody,
): Promise<{ ctx: LoadedConvContext | null; extraSystem: string }> {
  const none = { ctx: convCtx, extraSystem: "" };
  if (!convCtx) return none;
  const primary = convCtx.boundCharacters[0]?.character;
  if (!primary || !hasPerchanceScripts()) return none;

  const history = messages.flatMap((m) => {
    const content = textOf(m.parts);
    const author =
      m.role === "user" ? "user" : m.role === "assistant" ? "ai" : "system";
    return content ? [{ author, content } as const] : [];
  });
  const result = await runPerchanceScriptsForTurn(
    {
      character: {
        name: primary.name ?? "",
        roleInstruction: primary.description ?? "",
        reminderMessage: primary.postHistoryInstructions ?? "",
      },
      userName: convCtx.persona?.name ?? "",
      messages: history,
    },
    convCtx.boundCharacters.map((b) => b.character.id),
    body.convId ?? "",
  );
  if (!result) return none;
  const extraSystem = result.messages
    .slice(history.length)
    .filter((m) => !m.hiddenFrom?.includes("ai"))
    .map((m) => m.content)
    .join("\n\n");
  return {
    ctx: patchPrimary(convCtx, {
      description: result.roleInstruction,
      postHistoryInstructions: result.reminderMessage,
    }),
    extraSystem,
  };
}

// Returns a CLONED context: user scripts must never mutate the stored conversation.
async function applyJanitorScripts(
  convCtx: LoadedConvContext | null,
  messages: StreamMessages,
  body: StreamBody,
): Promise<LoadedConvContext | null> {
  if (!convCtx) return convCtx;
  const primary = convCtx.boundCharacters[0]?.character;
  if (!primary || !hasJanitorScripts()) return convCtx;

  const texts: { role: string; text: string }[] = [];
  for (const m of messages) {
    const text = textOf(m.parts);
    if (text) texts.push({ role: m.role, text });
  }
  const lastUser = [...texts].reverse().find((t) => t.role === "user");

  const result = await runJanitorScriptsForTurn(
    {
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
        message_created_at: null,
      },
    },
    convCtx.boundCharacters.map((b) => b.character.id),
  );
  if (!result) return convCtx;
  if (
    result.personality === (primary.personality ?? "") &&
    result.scenario === (primary.scenario ?? "") &&
    result.example_dialogs === (primary.exampleMessages ?? "")
  ) {
    return convCtx;
  }

  return patchPrimary(convCtx, {
    personality: result.personality,
    scenario: result.scenario,
    exampleMessages: result.example_dialogs,
  });
}

function patchPrimary(
  convCtx: LoadedConvContext,
  patch: Partial<CharacterRow>,
): LoadedConvContext {
  const boundCharacters = convCtx.boundCharacters.map((b, i) =>
    i === 0 ? { ...b, character: { ...b.character, ...patch } } : b,
  );
  return { ...convCtx, boundCharacters };
}
