    // Stage 3: build the assembled prompt and budget history. Runs start triggers + memory, assembles the template, clamps the output cap, fits history, splices depth injections, expands macros.

import {
  CONTEXT_SAFETY_MARGIN,
  FREE_MODEL_OUTPUT_CAP,
  UNKNOWN_MODEL_OUTPUT_CAP,
} from "@/lib/config/constants";
import { parseStringMap } from "@/lib/utils/base";
import type { ProcessedModel } from "@/lib/api/pricing";
import type { LoadedConvContext } from "@/lib/types";
import { runStartTriggers } from "../../triggers/run-triggers";
import { makeServerTriggerOps } from "../../triggers/trigger-ops";
import type { InlayImage } from "../../media/inlay.service";
import {
  buildMemoryContext,
  type MemoryContext,
} from "../../context/memory.service";
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
        makeServerTriggerOps(apiKey, body.model, inlayMedia),
      )
    : { extraSystemPrompt: "", stopSending: false, alerts: [] };

  const memorySettings = convCtx?.settings as
    | {
        memoryEnabled?: boolean | null;
        summaryMemory?: string | null;
        summaryAnchor?: number | null;
      }
    | undefined;
  const memory = await buildMemoryContext(
    apiKey,
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

      // Fit to context window, drop oldest first. Reserve = non-history prompt + clamped output cap, output reserve capped at half the window.
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

  const depthInjections = [
    ...assembled.atDepthEntries,
    ...(assembled.authorNote ? [assembled.authorNote] : []),
  ];
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

    // Model maxOutputTokens is a hard ceiling; clamp preset to it + the free cap. Unknown cap falls back to UNKNOWN_MODEL_OUTPUT_CAP.
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
