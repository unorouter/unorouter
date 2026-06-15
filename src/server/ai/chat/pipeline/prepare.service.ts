    // Text-stream request assembly (chat body into streamText args). Orchestrates the five stages; stream.service.ts owns the streamText call.

import { getPricingSummary } from "@/lib/api/pricing-cache";
import type { ChatContext, StreamOverrides } from "@/lib/validation/chat";
import type { StreamMessages } from "./transforms";
import { resolveContext } from "./stages/resolve-context";
import { preprocessMessages } from "./stages/preprocess";
import { assemblePrompt } from "./stages/assemble-prompt";
import { transformRoles } from "./stages/role-transform";
import {
  buildBodyMutations,
  buildDebugSnapshot,
  buildModelParams,
  buildProviderOptions,
  buildWritebacks,
  makeCostEstimator,
} from "./stages/build-body";

export type StreamBody = {
  model: string;
  messages: StreamMessages;
  convId?: string | null;
  webSearch?: boolean;
  // Billing/routing group sent upstream as X-Group; null/absent == "auto".
  group?: string | null;
  overrides?: StreamOverrides;
  chatContext?: ChatContext;
  chatContextHash?: string;
  globalVars?: string | null;
  speakingCharacterId?: string | null;
  messageTimes?: Record<string, number>;
  clientEnv?: {
    viewportW?: number;
    viewportH?: number;
    locale?: string;
    timeZone?: string;
  };
};

export async function prepareChatRequest(
  apiKey: string,
  body: StreamBody,
  request: Request,
  userId: number,
) {
  const { clientCtx, convCtx, effectiveWebSearch, searchSystemMessage } =
    await resolveContext(apiKey, body, request, userId);

  const modelInfo = (await getPricingSummary()).byName.get(body.model);
  const { messages, luaCodes } = await preprocessMessages(
    body.messages,
    convCtx,
  );

  const prompt = await assemblePrompt(
    apiKey,
    body,
    convCtx,
    clientCtx,
    messages,
    searchSystemMessage,
    modelInfo,
  );

  const {
    messagesForUpstream,
    effectiveSystem,
    deepSeekReasoningContent,
    autoFlags,
  } = await transformRoles(
    body.model,
    prompt.assembled,
    prompt.historyMessages,
    luaCodes,
  );

  const { varsWriteback, globalVarsWriteback } = buildWritebacks(
    prompt.assembled,
    convCtx?.settings.vars,
    prompt.globalVarsIn,
  );

  return {
    modelInfo,
    estimateCost: makeCostEstimator(modelInfo),
    effectiveWebSearch,
    effectiveSystem,
    messagesForUpstream,
    modelParams: buildModelParams(
      prompt.assembled,
      prompt.effectiveMaxOutputTokens,
    ),
    providerOptions: buildProviderOptions(
      prompt.assembled,
      autoFlags,
      modelInfo,
    ),
    streamingEnabled: prompt.assembled.streamingEnabled,
    memory: prompt.memory,
    varsWriteback,
    globalVarsWriteback,
    debugRequestSnapshot: buildDebugSnapshot(
      body,
      effectiveSystem,
      messagesForUpstream,
    ),
    bodyMutations: buildBodyMutations(
      prompt.assembled,
      autoFlags,
      modelInfo,
      deepSeekReasoningContent,
    ),
    // start-trigger showAlert frames (normal/error), streamed as transient data-alert parts.
    startAlerts: prompt.startAlerts,
    // V1 stop effect: a start trigger requested the prompt not be sent.
    stopRequested: prompt.stopRequested,
    // runImgGen results: client persists these media rows from finish-meta.
    inlayMedia: prompt.inlayMedia,
  };
}
