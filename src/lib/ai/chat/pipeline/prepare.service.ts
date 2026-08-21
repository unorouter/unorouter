import type { ChatContext, StreamOverrides } from "@/lib/validation/chat";
import type { AssemblerDeps } from "./deps";
import type { StreamMessages } from "./transforms";
import {
  activeTokenizerState,
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
  group?: string | null;
  overrides?: StreamOverrides;
  chatContext?: ChatContext;
  globalVars?: string | null;
  speakingCharacterId?: string | null;
  messageTimes?: Record<string, number>;
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

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException("Aborted", "AbortError");
  }
}

export async function prepareChatRequest(
  apiKey: string,
  body: StreamBody,
  userId: number,
  deps: AssemblerDeps,
  abortSignal?: AbortSignal,
) {
  throwIfAborted(abortSignal);
  // Preset wins over the custom-provider row: one provider serves many models, so its
  // per-model tokenizer is the coarser default. Empty/absent falls through to the
  // model-name inference in tokenizerRefForModel.
  const presetTokenizer = (
    body.chatContext?.preset as { tokenizer?: string } | null | undefined
  )?.tokenizer;
  const activeTokenizer = tokenizerRefForModel(
    (presetTokenizer as TokenizerRef | undefined) || body.tokenizer,
    body.model,
  );
  await setActiveTokenizer(activeTokenizer);
  const tokenizerState = activeTokenizerState();

  throwIfAborted(abortSignal);
  const { clientCtx, convCtx, effectiveWebSearch, searchSystemMessage } =
    await resolveContext(apiKey, body, userId, deps);

  const modelInfo = await deps.getModelInfo(body.model);
  throwIfAborted(abortSignal);
  const { messages, luaCodes } = await preprocessMessages(
    body.messages,
    convCtx,
    deps.inlinePdfText,
  );

  throwIfAborted(abortSignal);
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

  throwIfAborted(abortSignal);
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

  // Built once so the debug snapshot records what actually goes on the wire.
  // The preset sampling above is what the user chose; these are what survived
  // the model's supported-parameter strip, and a rejected request is explained
  // by the second, not the first.
  const wireModelParams = buildModelParams(
    prompt.assembled,
    prompt.effectiveMaxOutputTokens,
    modelInfo,
  );
  const wireProviderOptions = buildProviderOptions(
    prompt.assembled,
    autoFlags,
    modelInfo,
  );

  return {
    modelInfo,
    estimateCost: makeCostEstimator(modelInfo),
    effectiveWebSearch,
    effectiveSystem,
    messagesForUpstream,
    modelParams: wireModelParams,
    providerOptions: wireProviderOptions,
    streamingEnabled: prompt.assembled.streamingEnabled,
    memory: prompt.memory,
    varsWriteback,
    globalVarsWriteback,
    debugRequestSnapshot: buildDebugSnapshot(
      body,
      effectiveSystem,
      messagesForUpstream,
      deps.upstreamTarget,
      prompt.assembled,
      autoFlags,
      modelInfo,
      prompt.historyStats,
      tokenizerState,
      { modelParams: wireModelParams, providerOptions: wireProviderOptions },
    ),
    bodyMutations: buildBodyMutations(
      prompt.assembled,
      autoFlags,
      modelInfo,
      deepSeekReasoningContent,
    ),
    startAlerts: prompt.startAlerts,
    stopRequested: prompt.stopRequested,
    inlayMedia: prompt.inlayMedia,
  };
}
