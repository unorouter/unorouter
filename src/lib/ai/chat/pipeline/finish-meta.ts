import type { PreparedChatRequest } from "./prepare.service";

export type StreamUsage = {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  durationMs: number;
  tokensPerSecond: number | undefined;
};

export function createMetaCollector() {
  let requestId: string | null = null;
  let responseHeaders: Record<string, string> | null = null;
  let droppedParams: string | null = null;

  return {
    captureHeaders(hdrs: Record<string, string> | null | undefined): void {
      if (!hdrs) return;
      requestId = hdrs["x-oneapi-request-id"] ?? null;
      responseHeaders = hdrs;
      const dropped = hdrs["x-newapi-dropped-params"];
      if (typeof dropped === "string" && dropped.length > 0) {
        droppedParams = dropped;
      }
    },
    get requestId() {
      return requestId;
    },
    get responseHeaders() {
      return responseHeaders;
    },
    get droppedParams() {
      return droppedParams;
    },
  };
}

export type MetaCollector = ReturnType<typeof createMetaCollector>;

export function makeBuildUsage(
  prepared: Pick<PreparedChatRequest, "estimateCost">,
  startedAtMs: number,
  now: () => number,
) {
  return (inputTokens: number, outputTokens: number): StreamUsage => {
    const durationMs = now() - startedAtMs;
    return {
      inputTokens,
      outputTokens,
      cost: prepared.estimateCost(inputTokens, outputTokens),
      durationMs,
      tokensPerSecond:
        outputTokens > 0 && durationMs > 0
          ? outputTokens / (durationMs / 1000)
          : undefined,
    };
  };
}

export function buildFinishMeta(args: {
  prepared: PreparedChatRequest;
  collector: MetaCollector;
  buildUsage: (inputTokens: number, outputTokens: number) => StreamUsage;
  totalUsage: { inputTokens?: number; outputTokens?: number } | undefined;
  speakingCharacterId?: string | null;
  finishReason?: string;
  hasText?: boolean;
}): Record<string, unknown> {
  const prepared = args.prepared;
  const meta: Record<string, unknown> = {};
  // A run that hits the output cap while still reasoning closes cleanly with no
  // text part: no error is raised anywhere, so without this the user gets a
  // blank bubble and nothing to act on.
  if (args.finishReason === "length" && args.hasText === false)
    meta.truncatedBeforeText = true;
  if (args.collector.droppedParams)
    meta.droppedParams = args.collector.droppedParams;
  if (prepared.varsWriteback) meta.vars = prepared.varsWriteback;
  if (prepared.globalVarsWriteback)
    meta.globalVars = prepared.globalVarsWriteback;
  if (prepared.memory.summaryWriteback)
    meta.summary = prepared.memory.summaryWriteback;
  if (prepared.inlayMedia.length > 0) meta.inlayMedia = prepared.inlayMedia;
  if (args.speakingCharacterId)
    meta.speakingCharacterId = args.speakingCharacterId;
  const u = args.buildUsage(
    args.totalUsage?.inputTokens ?? 0,
    args.totalUsage?.outputTokens ?? 0,
  );
  if (u.inputTokens > 0 || u.outputTokens > 0) meta.usage = u;
  meta.debug = {
    ...prepared.debugRequestSnapshot,
    responseHeaders: args.collector.responseHeaders,
    droppedParams: args.collector.droppedParams,
    requestId: args.collector.requestId,
  };
  return meta;
}
