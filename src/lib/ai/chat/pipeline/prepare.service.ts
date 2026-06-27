// Text-stream request assembly (chat body into streamText args). Orchestrates the five stages; the
// client transport (runClientStream, default + custom paths) owns the streamText call.
// Isomorphic: all server-secret/data-source touches are injected via AssemblerDeps.

import type { ChatContext, StreamOverrides } from "@/lib/validation/chat";
import type { AssemblerDeps } from "./deps";
import type { StreamMessages } from "./transforms";
import {
  setActiveTokenizer,
  tokenizerRefForModel,
  type TokenizerRef,
} from "@/lib/ai/chat/tokenizer";
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
  globalVars?: string | null;
  speakingCharacterId?: string | null;
  messageTimes?: Record<string, number>;
  // Per-model tokenizer selection for budget counting. Custom path sets it from the selected model's row;
  // the default path omits it (the active tokenizer is inferred from `model`). "auto"/absent == infer.
  tokenizer?: TokenizerRef;
  clientEnv?: {
    viewportW?: number;
    viewportH?: number;
    locale?: string;
    timeZone?: string;
  };
};

export type PreparedChatRequest = Awaited<
  ReturnType<typeof prepareChatRequest>
>;

export async function prepareChatRequest(
  apiKey: string,
  body: StreamBody,
  userId: number,
  deps: AssemblerDeps,
) {
  // Preload the per-model tokenizer BEFORE any counting (history fit / lorebook budget run sync against the
  // module-active tokenizer). Best-effort: a failed load falls back to cl100k/char-4 inside countTokens.
  await setActiveTokenizer(tokenizerRefForModel(body.tokenizer, body.model));

  const { clientCtx, convCtx, effectiveWebSearch, searchSystemMessage } =
    await resolveContext(apiKey, body, userId, deps);

  const modelInfo = deps.getModelInfo(body.model);
  const { messages, luaCodes } = await preprocessMessages(
    body.messages,
    convCtx,
    deps.inlinePdfText,
  );

  const prompt = await assemblePrompt(
    apiKey,
    body,
    convCtx,
    clientCtx,
    messages,
    searchSystemMessage,
    modelInfo,
    deps,
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
      deps.upstreamTarget,
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
